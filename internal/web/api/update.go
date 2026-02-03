package api

import (
	"archive/tar"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"

	"database/sql"

	"github.com/codigosh/Kashboard/internal/version"
	"github.com/codigosh/Kashboard/internal/web/middleware"
)

type UpdateHandler struct {
	DB *sql.DB
}

func NewUpdateHandler(db *sql.DB) *UpdateHandler {
	return &UpdateHandler{DB: db}
}

type ReleaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadUrl string `json:"browser_download_url"`
}

type GithubRelease struct {
	TagName string         `json:"tag_name"`
	Name    string         `json:"name"`
	Body    string         `json:"body"`
	Assets  []ReleaseAsset `json:"assets"`
}

type UpdateResponse struct {
	Available      bool   `json:"available"`
	CurrentVersion string `json:"current_version"`
	LatestVersion  string `json:"latest_version"`
	ReleaseNotes   string `json:"release_notes"`
	AssetUrl       string `json:"asset_url"`
	IsDocker       bool   `json:"is_docker"`
}

func (h *UpdateHandler) CheckUpdate(w http.ResponseWriter, r *http.Request) {
	// 1. Check if Docker
	isDocker := false
	if _, err := os.Stat("/.dockerenv"); err == nil {
		isDocker = true
	}

	// 2. Fetch Latest Release from GitHub
	resp, err := http.Get("https://api.github.com/repos/codigosh/Kashboard/releases/latest")
	if err != nil {
		http.Error(w, "Failed to fetch releases", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// If 404/403 (rate limit), just return current info
		json.NewEncoder(w).Encode(UpdateResponse{
			Available:      false,
			CurrentVersion: version.Current,
			IsDocker:       isDocker,
		})
		return
	}

	var release GithubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		http.Error(w, "Invalid GitHub response", http.StatusInternalServerError)
		return
	}

	// 3. Compare Versions
	updateAvailable := isNewerVersion(release.TagName, version.Current)

	// 4. Find matching asset
	targetAsset := ""
	osName := runtime.GOOS
	archName := runtime.GOARCH

	// Expected naming: dashboard-linux-amd64.tar.gz or similar
	searchSuffix := fmt.Sprintf("%s-%s.tar.gz", osName, archName)

	for _, asset := range release.Assets {
		if strings.Contains(strings.ToLower(asset.Name), searchSuffix) {
			targetAsset = asset.BrowserDownloadUrl
			break
		}
	}

	json.NewEncoder(w).Encode(UpdateResponse{
		Available:      updateAvailable,
		CurrentVersion: version.Current,
		LatestVersion:  release.TagName,
		ReleaseNotes:   release.Body,
		AssetUrl:       targetAsset,
		IsDocker:       isDocker,
	})
}

func (h *UpdateHandler) PerformUpdate(w http.ResponseWriter, r *http.Request) {
	// Verify Admin
	if !h.isAdmin(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// 1. Get Asset URL from request
	var req struct {
		AssetUrl string `json:"asset_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if !strings.HasPrefix(req.AssetUrl, "https://github.com/codigosh/Kashboard/releases/") {
		http.Error(w, "Invalid asset URL", http.StatusBadRequest)
		return
	}

	tmpFile := filepath.Join(os.TempDir(), "dashboard_update.tar.gz")

	// 2. Download Binary
	if err := h.downloadFile(req.AssetUrl, tmpFile); err != nil {
		http.Error(w, "Download failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 3. Download and verify checksum (mandatory)
	checksumUrl := strings.ReplaceAll(req.AssetUrl, filepath.Base(req.AssetUrl), "checksums.txt")
	checksumFile := filepath.Join(os.TempDir(), "checksums.txt")

	if err := h.downloadFile(checksumUrl, checksumFile); err != nil {
		http.Error(w, "Failed to download checksums.txt", http.StatusInternalServerError)
		return
	}

	if err := h.verifyChecksum(tmpFile, checksumFile); err != nil {
		http.Error(w, "Checksum verification failed", http.StatusInternalServerError)
		return
	}

	// 5. Extract (if tar.gz)
	binaryPath := filepath.Join(os.TempDir(), "dashboard_new")
	if err := h.extractTarGz(tmpFile, binaryPath); err != nil {
		// Attempt direct binary fallback if not tar.gz? No, follow strict requirement.
		http.Error(w, "Extraction failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 6. Atomic Swap (Robust)
	currentExe, err := os.Executable()
	if err != nil {
		http.Error(w, "Could not determine executable path", http.StatusInternalServerError)
		return
	}

	// Resolve symlinks just in case
	realCurrentExe, err := filepath.EvalSymlinks(currentExe)
	if err == nil {
		currentExe = realCurrentExe
	}

	oldExe := currentExe + ".old"
	os.Remove(oldExe) // clear previous backup if any

	// Move current to old
	if err := h.moveFile(currentExe, oldExe); err != nil {
		http.Error(w, "Failed to backup current binary: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Move new to current
	if err := h.moveFile(binaryPath, currentExe); err != nil {
		// Rollback attempt
		h.moveFile(oldExe, currentExe)
		http.Error(w, "Failed to install new binary: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := os.Chmod(currentExe, 0755); err != nil {
		http.Error(w, "Failed to set permissions", http.StatusInternalServerError)
		return
	}

	// 7. Restart
	go func() {
		time.Sleep(1 * time.Second) // Give HTTP request time to finish
		h.restartSelf(currentExe)
	}()

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Update installed. Restarting..."})
}

// moveFile tries os.Rename, falls back to Copy+Delete for cross-device
func (h *UpdateHandler) moveFile(src, dst string) error {
	err := os.Rename(src, dst)
	if err == nil {
		return nil
	}

	// Check if cross-device error (syscall.EXDEV)
	// Or just try copy anyway if rename failed

	// Open Source
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	// Create Dest
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	// Copy
	if _, err = io.Copy(out, in); err != nil {
		return err
	}

	// Persist Permissions
	si, err := os.Stat(src)
	if err == nil {
		os.Chmod(dst, si.Mode())
	}

	// Close files before removing source
	in.Close()
	out.Close()

	return os.Remove(src)
}

// Helpers

func (h *UpdateHandler) isAdmin(r *http.Request) bool {
	username := middleware.GetUserFromContext(r)
	if username == "" {
		return false
	}

	var role string
	err := h.DB.QueryRow("SELECT role FROM users WHERE username = ?", username).Scan(&role)
	if err != nil {
		fmt.Printf("Error checking role for %s: %v\n", username, err)
		return false
	}

	rLower := strings.ToLower(role)
	return rLower == "admin" || rLower == "administrator"
}

func (h *UpdateHandler) downloadFile(url string, dest string) error {
	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	_, err = io.Copy(out, resp.Body)
	return err
}

func (h *UpdateHandler) verifyChecksum(binaryPath, checksumPath string) error {
	// Calculate SHA256 of binary
	f, err := os.Open(binaryPath)
	if err != nil {
		return err
	}
	defer f.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, f); err != nil {
		return err
	}
	localHash := hex.EncodeToString(hasher.Sum(nil))

	// Read checksums.txt
	content, err := os.ReadFile(checksumPath)
	if err != nil {
		return err
	}

	// Search for the checksum in the checksum file
	// We rely on the fact that we trust the GitHub release URL.
	// If the hash of our download exists in the trusted checksums.txt, it's valid.

	if strings.Contains(string(content), localHash) {
		return nil
	}

	return fmt.Errorf("checksum mismatch. Local: %s", localHash)
}

func (h *UpdateHandler) extractTarGz(archivePath, destPath string) error {
	file, err := os.Open(archivePath)
	if err != nil {
		return err
	}
	defer file.Close()

	gzr, err := gzip.NewReader(file)
	if err != nil {
		return err
	}
	defer gzr.Close()

	tr := tar.NewReader(gzr)

	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		// We look for the main binary. Usually named 'dashboard' or 'kashboard'.
		// We'll extract the first executable regular file we find.
		if header.Typeflag == tar.TypeReg {
			// Extract
			out, err := os.Create(destPath)
			if err != nil {
				return err
			}
			if _, err := io.Copy(out, tr); err != nil {
				out.Close()
				return err
			}
			out.Close()
			return nil // Found and extracted one file.
		}
	}
	return fmt.Errorf("no binary found in archive")
}

func (h *UpdateHandler) restartSelf(exePath string) {
	env := os.Environ()
	args := os.Args

	if err := syscall.Exec(exePath, args, env); err != nil {
		fmt.Printf("Failed to restart: %v\n", err)
	}
}

// isNewerVersion returns true if candidate is strictly newer than current.
// Versions may be v-prefixed (e.g. "v1.2.3").
func isNewerVersion(candidate, current string) bool {
	parse := func(v string) (int, int, int) {
		v = strings.TrimPrefix(v, "v")
		parts := strings.SplitN(v, ".", 3)
		get := func(i int) int {
			if i >= len(parts) {
				return 0
			}
			n, _ := strconv.Atoi(parts[i])
			return n
		}
		return get(0), get(1), get(2)
	}

	cMaj, cMin, cPat := parse(candidate)
	curMaj, curMin, curPat := parse(current)

	if cMaj != curMaj {
		return cMaj > curMaj
	}
	if cMin != curMin {
		return cMin > curMin
	}
	return cPat > curPat
}
