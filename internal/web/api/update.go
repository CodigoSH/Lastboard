package api

import (
	"archive/tar"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
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

	"github.com/CodigoSH/Lastboard/internal/version"
	"github.com/CodigoSH/Lastboard/internal/web/middleware"
	"github.com/CodigoSH/Lastboard/internal/web/util"
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

	w.Header().Set("Content-Type", "application/json")

	// 2. If ?beta= param present, do full Forgejo check server-side (avoids CORS)
	betaParam := r.URL.Query().Get("beta")
	if betaParam != "" && !isDocker {
		beta := betaParam == "true"
		latest, releaseNotes, err := h.fetchLatestRelease(beta)
		if err != nil {
			slog.Warn("Update check failed", "error", err)
		} else {
			isNewer := compareVersions(latest, version.Current)
			if isNewer {
				goos := runtime.GOOS
				goarch := runtime.GOARCH
				assetName := "lastboard-" + goos + "-" + goarch + ".tar.gz"
				assetUrl := "https://git.codigosh.com/CodigoSH/Lastboard/releases/download/" + latest + "/" + assetName
				json.NewEncoder(w).Encode(UpdateResponse{
					Available:      true,
					CurrentVersion: version.Current,
					LatestVersion:  latest,
					ReleaseNotes:   releaseNotes,
					AssetUrl:       assetUrl,
					IsDocker:       false,
					Os:             goos,
					Arch:           goarch,
				})
				return
			}
		}
	}

	// 3. Return base system info (no update or Docker)
	json.NewEncoder(w).Encode(UpdateResponse{
		Available:      false,
		CurrentVersion: version.Current,
		LatestVersion:  version.Current,
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
		// Fetch latest release (including pre-releases) — frontend filters based on user prefs.
		latest, err := h.fetchLatestVersion()
		if err != nil {
			slog.Warn("Background update check failed", "error", err)
			return
		}

		if latest != "" && latest != version.Current {
			slog.Info("New version detected", "latest", latest, "current", version.Current)
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

func (h *UpdateHandler) fetchLatestRelease(beta bool) (tagName string, releaseNotes string, err error) {
	const base = "https://git.codigosh.com/api/v1/repos/CodigoSH/Lastboard"
	var fetchURL string
	if beta {
		fetchURL = base + "/releases?limit=1"
	} else {
		fetchURL = base + "/releases/latest"
	}

	resp, err := http.Get(fetchURL)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("forgejo returned status %d", resp.StatusCode)
	}

	if beta {
		var releases []struct {
			TagName string `json:"tag_name"`
			Body    string `json:"body"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
			return "", "", err
		}
		if len(releases) == 0 {
			return "", "", fmt.Errorf("no releases found")
		}
		return releases[0].TagName, releases[0].Body, nil
	}

	var release struct {
		TagName string `json:"tag_name"`
		Body    string `json:"body"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return "", "", err
	}
	return release.TagName, release.Body, nil
}

func (h *UpdateHandler) fetchLatestVersion() (string, error) {
	tag, _, err := h.fetchLatestRelease(true)
	return tag, err
}

// compareVersions returns true if v1 > v2 (semver with optional pre-release suffix)
func compareVersions(v1, v2 string) bool {
	clean := func(v string) string { return strings.TrimPrefix(v, "v") }
	c1, c2 := clean(v1), clean(v2)
	p1 := strings.SplitN(c1, "-", 2)
	p2 := strings.SplitN(c2, "-", 2)

	core := func(s string) [3]int {
		var a, b, c int
		if _, err := fmt.Sscanf(s, "%d.%d.%d", &a, &b, &c); err != nil {
			slog.Warn("Failed to parse version core", "value", s, "error", err)
		}
		return [3]int{a, b, c}
	}
	n1, n2 := core(p1[0]), core(p2[0])

	for i := 0; i < 3; i++ {
		if n1[i] > n2[i] {
			return true
		}
		if n1[i] < n2[i] {
			return false
		}
	}

	// Same core: a stable release is newer than any pre-release of it.
	hasSuf1 := len(p1) > 1
	hasSuf2 := len(p2) > 1
	if !hasSuf1 && hasSuf2 {
		return true
	}
	if hasSuf1 && !hasSuf2 {
		return false
	}
	if !hasSuf1 && !hasSuf2 {
		return false
	}
	// Both pre-releases: compare by type, then numerically.
	return comparePreRelease(p1[1], p2[1])
}

// comparePreRelease reports whether pre-release suffix s1 is strictly newer
// than s2. A suffix looks like "Beta.27" or "RC.1": the label is compared
// alphabetically (so "beta" < "rc") and the trailing number numerically, so
// that "Beta.10" correctly sorts AFTER "Beta.9".
func comparePreRelease(s1, s2 string) bool {
	l1, n1 := splitPreRelease(strings.ToLower(s1))
	l2, n2 := splitPreRelease(strings.ToLower(s2))
	if l1 != l2 {
		return l1 > l2
	}
	return n1 > n2
}

// splitPreRelease separates a suffix like "beta.27" into its label ("beta")
// and trailing number (27). If there is no numeric tail, the whole string is
// the label and the number is 0.
func splitPreRelease(s string) (string, int) {
	if i := strings.LastIndex(s, "."); i >= 0 {
		if n, err := strconv.Atoi(s[i+1:]); err == nil {
			return s[:i], n
		}
	}
	return s, 0
}

func (h *UpdateHandler) PerformUpdate(w http.ResponseWriter, r *http.Request) {
	// Verify first admin only
	if !isAdminUser(h.DB, r) {
		http.Error(w, "auth.unauthorized", http.StatusForbidden)
		return
	}
	username := middleware.GetUserFromContext(r)
	var userID int
	if err := h.DB.QueryRow("SELECT id FROM users WHERE username = ?", username).Scan(&userID); err != nil {
		http.Error(w, "auth.unauthorized", http.StatusForbidden)
		return
	}
	if !isFirstAdmin(h.DB, userID) {
		http.Error(w, "auth.unauthorized", http.StatusForbidden)
		return
	}

	// Auto-update replaces the binary in place. When running unprivileged (PUID
	// set, or a non-root service) the binary is usually root-owned and its
	// directory not writable, so bail out early with an actionable message
	// instead of a cryptic permission error mid-swap. The binary can still be
	// updated externally: `docker pull` (Docker) or re-running the install script.
	if exe, err := os.Executable(); err == nil {
		if real, e := filepath.EvalSymlinks(exe); e == nil {
			exe = real
		}
		if e := checkDirWritable(filepath.Dir(exe)); e != nil {
			slog.Warn("Update unavailable: binary directory not writable (unprivileged)", "dir", filepath.Dir(exe), "error", e)
			http.Error(w, "notifier.update_unprivileged", http.StatusForbidden)
			return
		}
	}

	// 1. Get Asset URL from request
	var req struct {
		AssetUrl string `json:"asset_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "notifier.update_failed", http.StatusBadRequest)
		return
	}

	parsedURL, err := url.Parse(req.AssetUrl)
	if err != nil || parsedURL.Host != "git.codigosh.com" || !strings.HasPrefix(path.Clean(parsedURL.Path), "/CodigoSH/Lastboard/releases/") {
		slog.Warn("Update rejected: invalid asset URL", "asset_url", req.AssetUrl)
		http.Error(w, "notifier.update_invalid_url", http.StatusBadRequest)
		return
	}

	tmpFile := filepath.Join(os.TempDir(), "dashboard_update.tar.gz")
	defer os.Remove(tmpFile)

	// 2. Download Binary
	if err := h.downloadFile(req.AssetUrl, tmpFile); err != nil {
		slog.Error("Update failed: could not download binary", "asset_url", req.AssetUrl, "tmp_file", tmpFile, "error", err)
		http.Error(w, "notifier.update_download_failed", http.StatusInternalServerError)
		return
	}

	// 3. Download and verify checksum (mandatory)
	checksumCopy := *parsedURL
	checksumCopy.Path = path.Dir(parsedURL.Path) + "/checksums.txt"
	checksumUrl := checksumCopy.String()
	checksumFile := filepath.Join(os.TempDir(), "checksums.txt")
	defer os.Remove(checksumFile)

	if err := h.downloadFile(checksumUrl, checksumFile); err != nil {
		slog.Error("Update failed: could not download checksums.txt", "checksum_url", checksumUrl, "error", err)
		http.Error(w, "notifier.update_download_failed", http.StatusInternalServerError)
		return
	}

	// 3b. Verify the checksums.txt signature when release signing is enabled.
	// This decouples trust from the download server: a compromised release host
	// cannot forge checksums.txt without the private signing key. When signing is
	// configured the signature is MANDATORY — a missing .sig aborts the update
	// instead of falling back to checksum-only, so a tampered host cannot strip
	// the signature to weaken the check. The release pipeline signs every
	// published release, so this only rejects genuinely unsigned artifacts.
	if util.SigningConfigured() {
		sigCopy := *parsedURL
		sigCopy.Path = path.Dir(parsedURL.Path) + "/checksums.txt.sig"
		sigFile := filepath.Join(os.TempDir(), "checksums.txt.sig")
		defer os.Remove(sigFile)

		if err := h.downloadFile(sigCopy.String(), sigFile); err != nil {
			slog.Error("Update failed: checksums.txt.sig missing; refusing to install an unsigned release", "error", err)
			http.Error(w, "notifier.update_signature_failed", http.StatusInternalServerError)
			return
		}
		checksumData, err := os.ReadFile(checksumFile)
		if err != nil {
			slog.Error("Update failed: could not read checksums.txt for signature check", "error", err)
			http.Error(w, "notifier.update_signature_failed", http.StatusInternalServerError)
			return
		}
		sigData, err := os.ReadFile(sigFile)
		if err != nil {
			slog.Error("Update failed: could not read checksums.txt.sig", "error", err)
			http.Error(w, "notifier.update_signature_failed", http.StatusInternalServerError)
			return
		}
		if err := util.VerifyReleaseSignature(checksumData, strings.TrimSpace(string(sigData))); err != nil {
			slog.Error("Update failed: checksums.txt signature invalid", "error", err)
			http.Error(w, "notifier.update_signature_failed", http.StatusInternalServerError)
			return
		}
		slog.Info("Update: checksums.txt signature verified")
	}

	if err := h.verifyChecksum(tmpFile, checksumFile); err != nil {
		slog.Error("Update failed: checksum verification failed", "asset_url", req.AssetUrl, "error", err)
		http.Error(w, "notifier.update_checksum_failed", http.StatusInternalServerError)
		return
	}

	// Resolve current executable path (needed for binary name matching and atomic swap)
	currentExe, err := os.Executable()
	if err != nil {
		slog.Error("Update failed: could not determine executable path", "error", err)
		http.Error(w, "notifier.update_install_failed", http.StatusInternalServerError)
		return
	}
	if realExe, err := filepath.EvalSymlinks(currentExe); err == nil {
		currentExe = realExe
	}

	// 5. Extract
	binaryPath := filepath.Join(os.TempDir(), "dashboard_new")
	defer os.Remove(binaryPath)
	if err := h.extractTarGz(tmpFile, binaryPath, filepath.Base(currentExe)); err != nil {
		slog.Error("Update failed: could not extract binary from archive", "error", err)
		http.Error(w, "notifier.update_extract_failed", http.StatusInternalServerError)
		return
	}

	// 6. Atomic Swap
	oldExe := currentExe + ".old"
	os.Remove(oldExe) // clear previous backup if any

	// Move current to old
	if err := h.moveFile(currentExe, oldExe); err != nil {
		slog.Error("Update failed: could not back up current binary", "current_exe", currentExe, "error", err)
		http.Error(w, "notifier.update_install_failed", http.StatusInternalServerError)
		return
	}

	// Move new to current
	if err := h.moveFile(binaryPath, currentExe); err != nil {
		// Rollback attempt — surface failure so an operator can recover manually.
		if rbErr := h.moveFile(oldExe, currentExe); rbErr != nil {
			slog.Error("Update install failed AND rollback failed — binary may be missing",
				"install_error", err, "rollback_error", rbErr, "old_exe", oldExe, "current_exe", currentExe)
		} else {
			slog.Error("Update failed: could not install new binary (rolled back)", "current_exe", currentExe, "error", err)
		}
		http.Error(w, "notifier.update_install_failed", http.StatusInternalServerError)
		return
	}

	if err := os.Chmod(currentExe, 0700); err != nil {
		slog.Error("Update failed: could not set permissions on new binary", "current_exe", currentExe, "error", err)
		http.Error(w, "notifier.update_install_failed", http.StatusInternalServerError)
		return
	}

	// 7. Restart
	go func() {
		time.Sleep(1 * time.Second) // Give HTTP request time to finish
		h.restartSelf(currentExe)
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "notifier.update_verified"})
}

// checkDirWritable verifies the process can create files in dir, i.e. it can
// perform the in-place binary swap. Returns an error if the directory is not
// writable (typical when the app runs unprivileged and the binary is root-owned).
func checkDirWritable(dir string) error {
	f, err := os.CreateTemp(dir, ".lb_update_perm")
	if err != nil {
		return err
	}
	name := f.Name()
	f.Close()
	return os.Remove(name)
}

// moveFile tries os.Rename, falls back to Copy+Delete for cross-device
func (h *UpdateHandler) moveFile(src, dst string) error {
	if err := os.Rename(src, dst); err == nil {
		return nil
	}

	in, err := os.Open(src)
	if err != nil {
		return err
	}

	out, err := os.Create(dst)
	if err != nil {
		in.Close()
		return err
	}

	if _, err = io.Copy(out, in); err != nil {
		out.Close()
		in.Close()
		return err
	}

	if err = out.Sync(); err != nil {
		out.Close()
		in.Close()
		return err
	}

	if si, statErr := os.Stat(src); statErr == nil {
		if chmodErr := os.Chmod(dst, si.Mode()); chmodErr != nil {
			slog.Warn("Failed to preserve permissions on copy", "dst", dst, "error", chmodErr)
		}
	}

	if err := out.Close(); err != nil {
		in.Close()
		return err
	}
	if err := in.Close(); err != nil {
		return err
	}

	return os.Remove(src)
}

// Helpers

func (h *UpdateHandler) downloadFile(url string, dest string) error {
	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	client := &http.Client{Timeout: 5 * time.Minute}
	resp, err := client.Get(url)
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

	// Keep track of files found in case we need a fallback
	var firstFile string

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

		fileName := filepath.Base(header.Name)
		if firstFile == "" {
			firstFile = fileName
		}

		// Priority 1: Exact match (current binary name)
		// Priority 2: 'lastboard' (new official name)
		// Priority 3: 'dashboard' (legacy name)
		match := false
		if expectedName != "" && fileName == expectedName {
			match = true
		} else if fileName == "lastboard" {
			match = true
		} else if fileName == "dashboard" {
			match = true
		}

		if !match {
			continue
		}

		out, err := os.Create(destPath)
		if err != nil {
			return err
		}
		// Cap decompression to avoid zip-bomb in a malicious release archive.
		// Lastboard binary is ~30MB; 250MB leaves ample room for future growth.
		const maxBinarySize int64 = 250 * 1024 * 1024
		n, err := io.CopyN(out, tr, maxBinarySize+1)
		if err != nil && err != io.EOF {
			out.Close()
			os.Remove(destPath)
			return err
		}
		if n > maxBinarySize {
			out.Close()
			os.Remove(destPath)
			return fmt.Errorf("binary in archive exceeds %d bytes (possible zip bomb)", maxBinarySize)
		}
		if err := out.Close(); err != nil {
			return err
		}
		return nil
	}
	return fmt.Errorf("binary not found in archive (expected %s, lastboard, or dashboard)", expectedName)
}

func (h *UpdateHandler) restartSelf(exePath string) {
	env := os.Environ()
	args := os.Args

	if err := syscall.Exec(exePath, args, env); err != nil {
		slog.Error("Failed to restart, exiting for supervisor", "error", err)
		os.Exit(0)
	}
}
