package api

import (
	"archive/tar"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path"
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

	// 2. Check User Preference for Beta Updates
	username := middleware.GetUserFromContext(r)
	var betaUpdates bool
	if username != "" {
		_ = h.DB.QueryRow("SELECT COALESCE(beta_updates, 0) FROM users WHERE username = ?", username).Scan(&betaUpdates)
	}

	var release GithubRelease

	// 3. Fetch Release Info
	// If Beta Updates enabled: Fetch list of releases (includes pre-releases) and pick first
	// If Beta Updates disabled: Fetch 'latest' (excludes pre-releases)
	if betaUpdates {
		resp, err := http.Get("https://api.github.com/repos/codigosh/Kashboard/releases?per_page=1")
		if err != nil {
			http.Error(w, "Failed to fetch releases", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			json.NewEncoder(w).Encode(UpdateResponse{Available: false, CurrentVersion: version.Current, IsDocker: isDocker})
			return
		}

		var releases []GithubRelease
		if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil || len(releases) == 0 {
			http.Error(w, "Invalid GitHub response", http.StatusInternalServerError)
			return
		}
		release = releases[0] // Newest release (stable or beta)

	} else {
		resp, err := http.Get("https://api.github.com/repos/codigosh/Kashboard/releases/latest")
		if err != nil {
			http.Error(w, "Failed to fetch releases", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			json.NewEncoder(w).Encode(UpdateResponse{Available: false, CurrentVersion: version.Current, IsDocker: isDocker})
			return
		}

		if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
			http.Error(w, "Invalid GitHub response", http.StatusInternalServerError)
			return
		}
	}

	// 4. Compare Versions
	updateAvailable := isNewerVersion(release.TagName, version.Current)

	// 5. Find matching asset
	targetAsset := ""
	osName := runtime.GOOS
	archName := runtime.GOARCH
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
		http.Error(w, "auth.unauthorized", http.StatusForbidden)
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

	parsedURL, err := url.Parse(req.AssetUrl)
	if err != nil || parsedURL.Host != "github.com" || !strings.HasPrefix(path.Clean(parsedURL.Path), "/codigosh/Kashboard/releases/") {
		http.Error(w, "Invalid asset URL", http.StatusBadRequest)
		return
	}

	tmpFile := filepath.Join(os.TempDir(), "dashboard_update.tar.gz")
	defer os.Remove(tmpFile)

	// 2. Download Binary
	if err := h.downloadFile(req.AssetUrl, tmpFile); err != nil {
		http.Error(w, "notifier.update_failed", http.StatusInternalServerError)
		return
	}

	// 3. Download and verify checksum (mandatory)
	checksumCopy := *parsedURL
	checksumCopy.Path = path.Dir(parsedURL.Path) + "/checksums.txt"
	checksumUrl := checksumCopy.String()
	checksumFile := filepath.Join(os.TempDir(), "checksums.txt")
	defer os.Remove(checksumFile)

	if err := h.downloadFile(checksumUrl, checksumFile); err != nil {
		http.Error(w, "Failed to download checksums.txt", http.StatusInternalServerError)
		return
	}

	if err := h.verifyChecksum(tmpFile, checksumFile); err != nil {
		http.Error(w, "notifier.update_failed", http.StatusInternalServerError)
		return
	}

	// Resolve current executable path (needed for binary name matching and atomic swap)
	currentExe, err := os.Executable()
	if err != nil {
		http.Error(w, "Could not determine executable path", http.StatusInternalServerError)
		return
	}
	if realExe, err := filepath.EvalSymlinks(currentExe); err == nil {
		currentExe = realExe
	}

	// 5. Extract
	binaryPath := filepath.Join(os.TempDir(), "dashboard_new")
	defer os.Remove(binaryPath)
	if err := h.extractTarGz(tmpFile, binaryPath, filepath.Base(currentExe)); err != nil {
		http.Error(w, "Extraction failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 6. Atomic Swap
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
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "notifier.update_verified"})
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

	// Persist to disk before closing
	if err = out.Sync(); err != nil {
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
		log.Printf("Error checking role for %s: %v", username, err)
		return false
	}

	return strings.ToLower(role) == "admin"
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

	_, err = io.Copy(out, io.LimitReader(resp.Body, 200*1024*1024))
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

	// Verify by exact match against one of the lines in the trusted checksums.txt
	for _, line := range strings.Split(strings.TrimSpace(string(content)), "\n") {
		fields := strings.Fields(line)
		if len(fields) >= 1 && fields[0] == localHash {
			return nil
		}
	}

	return fmt.Errorf("checksum mismatch. Local: %s", localHash)
}

func (h *UpdateHandler) extractTarGz(archivePath, destPath, expectedName string) error {
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

		if header.Typeflag != tar.TypeReg {
			continue
		}
		// Match the expected binary name; skip other files in the archive
		if expectedName != "" && filepath.Base(header.Name) != expectedName {
			continue
		}

		out, err := os.Create(destPath)
		if err != nil {
			return err
		}
		if _, err := io.Copy(out, tr); err != nil {
			out.Close()
			return err
		}
		out.Close()
		return nil
	}
	return fmt.Errorf("binary '%s' not found in archive", expectedName)
}

func (h *UpdateHandler) restartSelf(exePath string) {
	env := os.Environ()
	args := os.Args

	if err := syscall.Exec(exePath, args, env); err != nil {
		log.Printf("Failed to restart: %v", err)
	}
}

// isNewerVersion compares two version strings (SemVer compliantish).
// Handles:
// - Standard: v1.0.0 vs v1.0.1
// - Beta: v1.1.0-beta1 vs v1.1.0-beta2
// - Stability: v1.1.0-beta vs v1.1.0 (Stable is always newer than its own beta)
func isNewerVersion(candidate, current string) bool {
	// Helper to parse "1.2.3-beta.1" -> (1, 2, 3, "beta.1")
	parse := func(v string) (int, int, int, string) {
		v = strings.TrimPrefix(v, "v")
		parts := strings.SplitN(v, "-", 2)
		main := parts[0]
		suffix := ""
		if len(parts) > 1 {
			suffix = parts[1]
		}

		nums := strings.Split(main, ".")
		get := func(i int) int {
			if i >= len(nums) {
				return 0
			}
			n, _ := strconv.Atoi(nums[i])
			return n
		}
		return get(0), get(1), get(2), suffix
	}

	cMaj, cMin, cPat, cSuf := parse(candidate)
	curMaj, curMin, curPat, curSuf := parse(current)

	// 1. Compare Core Numbers
	if cMaj != curMaj {
		return cMaj > curMaj
	}
	if cMin != curMin {
		return cMin > curMin
	}
	if cPat != curPat {
		return cPat > curPat
	}

	// 2. Compare Suffixes (Pre-releases)
	// If core versions are equal:
	// - No suffix (Stable) > Suffix (Beta/Alpha)
	// - Suffix vs Suffix: lexicographical compare (beta2 > beta1)

	if cSuf == "" && curSuf != "" {
		return true // Candidate is stable, current is beta -> Update!
	}
	if cSuf != "" && curSuf == "" {
		return false // Candidate is beta, current is stable -> Don't update (downgrade)
	}
	if cSuf != "" && curSuf != "" {
		// Both are betas/pre-releases. Compare them.
		// e.g. "beta2" > "beta1"
		return cSuf > curSuf
	}

	// Identical versions
	return false
}
