package api

import (
	"archive/tar"
	"compress/gzip"
	"context"
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
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"database/sql"

	"git.codigosh.com/CodigoSH/Lastboard/internal/version"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

// updateInProgress is what a second update is told while one is already running.
const updateInProgress = "notifier.update_in_progress"

type UpdateHandler struct {
	DB *sql.DB

	// latest replaces the call to the forge in tests; nil means the forge.
	latest func(beta bool) (tag string, notes string, err error)
	// docker replaces the container check in tests: the CI runs in a
	// container, where the real check would skip what a test is asking about.
	docker func() bool

	// updating is set while an update runs. Two at once would both replace the
	// same binary, so a second is refused until the first ends.
	updating atomic.Bool
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
	// CheckError is set when the release server could not be asked. Without
	// it, a failed check answered exactly like "nothing newer" and the panel
	// said "You're up to date" to somebody whose server could not look.
	CheckError string `json:"check_error,omitempty"`
}

// inContainer says whether replacing the binary would achieve anything.
//
// Inside a container it would not: the image is what comes back on the next
// restart, so an in-place update lasts exactly until something restarts the
// container and then silently reverts.
func inContainer() bool { return inContainerUnder("/") }

// inContainerUnder is inContainer against a root that a test can build.
//
// Each engine leaves its own mark: Docker writes /.dockerenv and Podman
// /run/.containerenv. The cgroup of the first process does not name the engine
// under cgroup v2, the default on every current distribution, so it is only a
// fallback for older hosts.
func inContainerUnder(root string) bool {
	for _, mark := range []string{".dockerenv", "run/.containerenv"} {
		if _, err := os.Stat(filepath.Join(root, mark)); err == nil {
			return true
		}
	}
	if cgroup, err := os.ReadFile(filepath.Join(root, "proc/1/cgroup")); err == nil {
		text := string(cgroup)
		return strings.Contains(text, "docker") || strings.Contains(text, "containerd") ||
			strings.Contains(text, "kubepods")
	}
	return false
}

func (h *UpdateHandler) CheckUpdate(w http.ResponseWriter, r *http.Request) {
	// 1. Check if Docker
	isDocker := false
	if h.docker != nil {
		isDocker = h.docker()
	} else {
		isDocker = inContainer()
	}

	w.Header().Set("Content-Type", "application/json")

	// 2. If ?beta= param present, do full Forgejo check server-side (avoids CORS).
	// A container is asked too: it cannot install the update itself, but its
	// owner still needs to be told there is one, to pull the new image.
	betaParam := r.URL.Query().Get("beta")
	checkError := ""
	if betaParam != "" {
		beta := betaParam == "true"
		fetch := h.fetchLatestRelease
		if h.latest != nil {
			fetch = h.latest
		}
		latest, releaseNotes, err := fetch(beta)
		if err != nil {
			slog.Warn("Update check failed", "error", err)
			checkError = "settings.update_check_failed"
		} else {
			isNewer := compareVersions(latest, version.Current)
			if isNewer {
				goos := runtime.GOOS
				goarch := runtime.GOARCH
				// There is no binary to download for a container: the image is
				// what changes.
				assetUrl := ""
				if !isDocker {
					assetName := "lastboard-" + goos + "-" + goarch + ".tar.gz"
					assetUrl = "https://git.codigosh.com/CodigoSH/Lastboard/releases/download/" + latest + "/" + assetName
				}
				json.NewEncoder(w).Encode(UpdateResponse{
					Available:      true,
					CurrentVersion: version.Current,
					LatestVersion:  latest,
					ReleaseNotes:   releaseNotes,
					AssetUrl:       assetUrl,
					IsDocker:       isDocker,
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
		CheckError:     checkError,
	})
}

// announceUpdate tells the connected browsers a newer version exists. It waits
// for room in the hub's queue only as long as the server is running: a send
// that could not be abandoned would hold this goroutine for good at shutdown.
func announceUpdate(ctx context.Context, hub *Hub, latest string) {
	msg := WSMessage{
		Type:    "update_available",
		Payload: map[string]string{"latest_version": latest},
	}
	select {
	case hub.broadcast <- msg:
	case <-ctx.Done():
	}
}

// CheckForUpdatesBackground runs a periodic loop to check for updates and notify via WS
func (h *UpdateHandler) CheckForUpdatesBackground(ctx context.Context, hub *Hub) {
	// Initial check after 30s to allow system to settle
	if !sleep(ctx, 30*time.Second) {
		return
	}

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
			announceUpdate(ctx, hub, latest)
		}
	}

	// First run
	check()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			check()
		}
	}
}

// releaseCacheTTL keeps the answer of the release server for a few minutes: the
// check now runs when an administrator opens Lastboard, in as many tabs as they
// have, and the forge need not be asked each time.
const releaseCacheTTL = 10 * time.Minute

type cachedRelease struct {
	at    time.Time
	tag   string
	notes string
}

var (
	releaseCacheMu sync.Mutex
	releaseCache   = map[bool]cachedRelease{}
)

func (h *UpdateHandler) fetchLatestRelease(beta bool) (tagName string, releaseNotes string, err error) {
	releaseCacheMu.Lock()
	if c, ok := releaseCache[beta]; ok && time.Since(c.at) < releaseCacheTTL {
		releaseCacheMu.Unlock()
		return c.tag, c.notes, nil
	}
	releaseCacheMu.Unlock()
	tag, notes, err := h.fetchLatestReleaseUncached(beta)
	if err == nil {
		releaseCacheMu.Lock()
		releaseCache[beta] = cachedRelease{at: time.Now(), tag: tag, notes: notes}
		releaseCacheMu.Unlock()
	}
	return tag, notes, err
}

// releaseAPIBase and releaseClient are variables so a test can point the lookup
// at a server that never answers. The client has a time limit: the default one
// waits forever, and a forge that took the connection and said nothing held the
// check open for every browser asking whether an update exists.
var (
	releaseAPIBase = "https://git.codigosh.com/api/v1/repos/CodigoSH/Lastboard"
	releaseClient  = &http.Client{Timeout: 15 * time.Second}
)

func (h *UpdateHandler) fetchLatestReleaseUncached(beta bool) (tagName string, releaseNotes string, err error) {
	var fetchURL string
	if beta {
		fetchURL = releaseAPIBase + "/releases?limit=1"
	} else {
		fetchURL = releaseAPIBase + "/releases/latest"
	}

	resp, err := releaseClient.Get(fetchURL)
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

// Steps of an update, in the order they are performed. The client draws one
// timeline entry per step, so these ids are part of the contract with the UI.
const (
	StepDownload  = "download"
	StepSignature = "signature"
	StepChecksum  = "checksum"
	StepExtract   = "extract"
	StepInstall   = "install"
	StepRestart   = "restart"
)

// Status values a step can report.
const (
	StatusRunning = "running"
	StatusOK      = "ok"
	StatusSkipped = "skipped"
	StatusError   = "error"
)

// UpdateEvent is one progress notification streamed to the client.
// Error and Detail carry i18n keys, never prose: the UI translates them.
type UpdateEvent struct {
	Step   string `json:"step"`
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
	Detail string `json:"detail,omitempty"`
}

// runUpdate performs the update, reporting every step through emit. It returns
// the failing event, or nil once the new binary is installed and only the
// restart is left.
//
// Splitting this out of the handler is what lets the same sequence answer both
// a streaming client (an event per step) and a plain one (a single status at
// the end): the handler decides how to report, this decides what happens.
func (h *UpdateHandler) runUpdate(assetURL string, parsedURL *url.URL, emit func(UpdateEvent)) (currentExe string, failure *UpdateEvent) {
	fail := func(step, key, detail string) (string, *UpdateEvent) {
		ev := UpdateEvent{Step: step, Status: StatusError, Error: key, Detail: detail}
		emit(ev)
		return "", &ev
	}

	if !h.updating.CompareAndSwap(false, true) {
		return fail(StepDownload, updateInProgress, "")
	}
	defer h.updating.Store(false)

	// 1. Download the release archive and the checksums that describe it.
	emit(UpdateEvent{Step: StepDownload, Status: StatusRunning})

	// Everything this run writes lives in a directory of its own, removed with
	// the run: fixed names in the shared temp directory let two runs, or a
	// leftover from a crash, hand each other a half-written file.
	workDir, err := os.MkdirTemp("", "lastboard-update-*")
	if err != nil {
		slog.Error("Update failed: could not create a working directory", "error", err)
		return fail(StepDownload, "notifier.update_download_failed", "")
	}
	defer os.RemoveAll(workDir)

	tmpFile := filepath.Join(workDir, "release.tar.gz")

	if err := h.downloadFile(assetURL, tmpFile); err != nil {
		slog.Error("Update failed: could not download binary", "asset_url", assetURL, "tmp_file", tmpFile, "error", err)
		return fail(StepDownload, "notifier.update_download_failed", "")
	}

	checksumCopy := *parsedURL
	checksumCopy.Path = path.Dir(parsedURL.Path) + "/checksums.txt"
	checksumURL := checksumCopy.String()
	checksumFile := filepath.Join(workDir, "checksums.txt")

	if err := h.downloadFile(checksumURL, checksumFile); err != nil {
		slog.Error("Update failed: could not download checksums.txt", "checksum_url", checksumURL, "error", err)
		return fail(StepDownload, "notifier.update_download_failed", "")
	}
	emit(UpdateEvent{Step: StepDownload, Status: StatusOK})

	// 2. Verify the checksums.txt signature when release signing is enabled.
	// This decouples trust from the download server: a compromised release host
	// cannot forge checksums.txt without the private signing key. When signing is
	// configured the signature is MANDATORY — a missing .sig aborts the update
	// instead of falling back to checksum-only, so a tampered host cannot strip
	// the signature to weaken the check. The release pipeline signs every
	// published release, so this only rejects genuinely unsigned artifacts.
	if util.SigningConfigured() {
		emit(UpdateEvent{Step: StepSignature, Status: StatusRunning})

		sigCopy := *parsedURL
		sigCopy.Path = path.Dir(parsedURL.Path) + "/checksums.txt.sig"
		sigFile := filepath.Join(workDir, "checksums.txt.sig")

		if err := h.downloadFile(sigCopy.String(), sigFile); err != nil {
			slog.Error("Update failed: checksums.txt.sig missing; refusing to install an unsigned release", "error", err)
			return fail(StepSignature, "notifier.update_signature_failed", "")
		}
		checksumData, err := os.ReadFile(checksumFile)
		if err != nil {
			slog.Error("Update failed: could not read checksums.txt for signature check", "error", err)
			return fail(StepSignature, "notifier.update_signature_failed", "")
		}
		sigData, err := os.ReadFile(sigFile)
		if err != nil {
			slog.Error("Update failed: could not read checksums.txt.sig", "error", err)
			return fail(StepSignature, "notifier.update_signature_failed", "")
		}
		if err := util.VerifyReleaseSignature(checksumData, strings.TrimSpace(string(sigData))); err != nil {
			slog.Error("Update failed: checksums.txt signature invalid", "error", err)
			return fail(StepSignature, "notifier.update_signature_failed", "")
		}
		slog.Info("Update: checksums.txt signature verified")
		emit(UpdateEvent{Step: StepSignature, Status: StatusOK})
	} else {
		// Reported rather than hidden: the user should see that this build has
		// no signing key configured, not a step that silently disappears.
		emit(UpdateEvent{Step: StepSignature, Status: StatusSkipped})
	}

	// 3. Verify the archive against the (now trusted) checksums.
	emit(UpdateEvent{Step: StepChecksum, Status: StatusRunning})
	if err := h.verifyChecksum(tmpFile, checksumFile, path.Base(parsedURL.Path)); err != nil {
		slog.Error("Update failed: checksum verification failed", "asset_url", assetURL, "error", err)
		return fail(StepChecksum, "notifier.update_checksum_failed", "")
	}
	emit(UpdateEvent{Step: StepChecksum, Status: StatusOK})

	// Resolve current executable path (needed for binary name matching and atomic swap)
	currentExe, err = os.Executable()
	if err != nil {
		slog.Error("Update failed: could not determine executable path", "error", err)
		return fail(StepExtract, "notifier.update_install_failed", "")
	}
	if realExe, err := filepath.EvalSymlinks(currentExe); err == nil {
		currentExe = realExe
	}

	// 4. Extract
	emit(UpdateEvent{Step: StepExtract, Status: StatusRunning})
	binaryPath := filepath.Join(workDir, "new-binary")
	if err := h.extractTarGz(tmpFile, binaryPath, filepath.Base(currentExe)); err != nil {
		slog.Error("Update failed: could not extract binary from archive", "error", err)
		return fail(StepExtract, "notifier.update_extract_failed", "")
	}
	emit(UpdateEvent{Step: StepExtract, Status: StatusOK})

	// 5. Atomic swap
	emit(UpdateEvent{Step: StepInstall, Status: StatusRunning})
	oldExe := currentExe + ".old"
	os.Remove(oldExe) // clear previous backup if any

	// Move current to old
	if err := h.moveFile(currentExe, oldExe); err != nil {
		slog.Error("Update failed: could not back up current binary", "current_exe", currentExe, "error", err)
		return fail(StepInstall, "notifier.update_install_failed", "notifier.update_rolled_back")
	}

	// Move new to current
	if err := h.moveFile(binaryPath, currentExe); err != nil {
		// Rollback attempt — the two outcomes are very different for whoever is
		// watching, so they are reported apart instead of as one generic failure.
		if rbErr := h.moveFile(oldExe, currentExe); rbErr != nil {
			slog.Error("Update install failed AND rollback failed — binary may be missing",
				"install_error", err, "rollback_error", rbErr, "old_exe", oldExe, "current_exe", currentExe)
			return fail(StepInstall, "notifier.update_install_failed", "notifier.update_rollback_failed")
		}
		slog.Error("Update failed: could not install new binary (rolled back)", "current_exe", currentExe, "error", err)
		return fail(StepInstall, "notifier.update_install_failed", "notifier.update_rolled_back")
	}

	if err := os.Chmod(currentExe, 0700); err != nil {
		slog.Error("Update failed: could not set permissions on new binary", "current_exe", currentExe, "error", err)
		return fail(StepInstall, "notifier.update_install_failed", "")
	}
	emit(UpdateEvent{Step: StepInstall, Status: StatusOK})

	return currentExe, nil
}

func (h *UpdateHandler) PerformUpdate(w http.ResponseWriter, r *http.Request) {
	// Verify first admin only
	if !isAdminUser(h.DB, r) {
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
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
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

	// A client that asks for the stream gets one event per step; anyone else
	// gets the single final status this endpoint has always returned.
	flusher, canFlush := w.(http.Flusher)
	streaming := canFlush && strings.Contains(r.Header.Get("Accept"), "text/event-stream")

	if !streaming {
		currentExe, failure := h.runUpdate(req.AssetUrl, parsedURL, func(UpdateEvent) {})
		if failure != nil {
			status := http.StatusInternalServerError
			if failure.Error == updateInProgress {
				status = http.StatusConflict
			}
			http.Error(w, failure.Error, status)
			return
		}
		h.scheduleRestart(currentExe)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "notifier.update_verified"})
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	// Tell reverse proxies not to buffer, or the whole point of streaming is lost.
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	emit := func(ev UpdateEvent) {
		payload, err := json.Marshal(ev)
		if err != nil {
			return
		}
		fmt.Fprintf(w, "data: %s\n\n", payload)
		flusher.Flush()
	}

	currentExe, failure := h.runUpdate(req.AssetUrl, parsedURL, emit)
	if failure != nil {
		return
	}

	// The restart is announced but never confirmed from here: this process is
	// about to be replaced. The client closes the step by polling until the new
	// version answers.
	emit(UpdateEvent{Step: StepRestart, Status: StatusRunning})
	h.scheduleRestart(currentExe)
}

// scheduleRestart re-executes the freshly installed binary, leaving enough time
// for the response to reach the client first.
func (h *UpdateHandler) scheduleRestart(currentExe string) {
	go func() {
		time.Sleep(1 * time.Second)
		h.restartSelf(currentExe)
	}()
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

	// One byte more than the limit is read, to tell a file that ends there from
	// one that goes on.
	n, err := io.Copy(out, io.LimitReader(resp.Body, maxDownloadBytes+1))
	if err != nil {
		return err
	}
	if n > maxDownloadBytes {
		return fmt.Errorf("download too large: more than %d bytes", maxDownloadBytes)
	}
	return nil
}

// maxDownloadBytes is the most one update file may weigh. A variable so a test
// can use a small one.
var maxDownloadBytes int64 = 200 * 1024 * 1024

// verifyChecksum checks the downloaded archive against the line of checksums.txt
// that names it. The hash alone is not enough: the file lists every platform's
// archive, and one of them must not pass for another.
func (h *UpdateHandler) verifyChecksum(binaryPath, checksumPath, assetName string) error {
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

	for _, line := range strings.Split(strings.TrimSpace(string(content)), "\n") {
		fields := strings.Fields(line)
		if len(fields) >= 2 && fields[0] == localHash && strings.TrimPrefix(fields[1], "*") == assetName {
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
