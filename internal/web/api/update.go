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
	"strings"
	"syscall"
	"time"

	"database/sql"

	"github.com/CodigoSH/Lastboard/internal/version"
	"github.com/CodigoSH/Lastboard/internal/web/middleware"
)

type UpdateHandler struct {
	DB *sql.DB
}

func NewUpdateHandler(db *sql.DB) *UpdateHandler {
	return &UpdateHandler{DB: db}
}

type UpdateResponse struct {
	Available      bool   `json:"available"`
	CurrentVersion string `json:"current_version"`
	LatestVersion  string `json:"latest_version"`
	ReleaseNotes   string `json:"release_notes"`
	AssetUrl       string `json:"asset_url"`
	IsDocker       bool   `json:"is_docker"`
	Os             string `json:"os"`
	Arch           string `json:"arch"`
}

func (h *UpdateHandler) CheckUpdate(w http.ResponseWriter, r *http.Request) {
	// 1. Check if Docker
	isDocker := false
	if _, err := os.Stat("/.dockerenv"); err == nil {
		isDocker = true
	}

	// 2. Return System Info
	json.NewEncoder(w).Encode(UpdateResponse{
		Available:      false, // Handled by frontend or background ws
		CurrentVersion: version.Current,
		IsDocker:       isDocker,
		Os:             runtime.GOOS,
		Arch:           runtime.GOARCH,
	})
}

// CheckForUpdatesBackground runs a periodic loop to check for updates and notify via WS
func (h *UpdateHandler) CheckForUpdatesBackground(hub *Hub) {
	// Initial check after 30s to allow system to settle
	time.Sleep(30 * time.Second)

	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	check := func() {
		// We check for both stable and beta since we don't know user prefs here
		// We'll notify if ANY newer version is available, frontend will filter based on user prefs.
		latest, err := h.fetchLatestVersionFromProxy()
		if err != nil {
			log.Printf("[Update] Background check failed: %v", err)
			return
		}

		if latest != "" && latest != version.Current {
			log.Printf("[Update] New version detected: %s (Current: %s). Broadcasting...", latest, version.Current)
			hub.broadcast <- WSMessage{
				Type: "update_available",
				Payload: map[string]string{
					"latest_version": latest,
				},
			}
		}
	}

	// First run
	check()

	for range ticker.C {
		check()
	}
}

func (h *UpdateHandler) fetchLatestVersionFromProxy() (string, error) {
	// Check Stable first
	proxyUrl := "https://api-updates.codigosh.com/api/v1/check-update?beta=true"
	resp, err := http.Get(proxyUrl)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("proxy returned status %d", resp.StatusCode)
	}

	var data struct {
		LatestVersion string `json:"latest_version"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", err
	}

	return data.LatestVersion, nil
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
	if err != nil || parsedURL.Host != "github.com" || !strings.HasPrefix(path.Clean(parsedURL.Path), "/CodigoSH/Lastboard/releases/") {
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
		log.Printf("Failed to restart: %v. Exiting to allow supervisor to restart.", err)
		os.Exit(0)
	}
}
