package api

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

/* ---------------------------------------------------------------------------
 * Installing a verified binary in place of the running one
 *
 * Nothing the running server depends on is touched until the very last step,
 * so every failure before it leaves the installation exactly as it was:
 *
 *  1. The new binary is staged beside the running one. Same directory, so the
 *     final rename is atomic; and not in /tmp, which may forbid running files.
 *  2. It is made executable and run with -version. A binary that cannot start
 *     on this machine (another architecture, a damaged file) stops the update
 *     here, instead of being installed and failing at every restart after.
 *  3. The database is copied beside itself with VACUUM INTO and the copy is
 *     opened and checked. A version that changes the schema leaves the old one
 *     able to come back. Named as the install script names its copies, so the
 *     two share one set: the newest three, however the updates were made.
 *  4. The running binary is kept as .old by a hard link, so it never leaves its
 *     place (a copy where links are not possible).
 *  5. The staged binary is renamed over it: atomic, there is no moment without
 *     a binary at that path.
 * ------------------------------------------------------------------------ */

// Shown when the update stopped before replacing anything.
const updateUnchanged = "notifier.update_unchanged"

// dbBackupsKept is how many copies taken before updates stay beside the database: the newest. Each one is as
// large as the database, and an instance that follows the betas would otherwise keep one per release.
const dbBackupsKept = 3

// installFailure is why the install step failed: the key the screen shows, and a detail.
type installFailure struct{ key, detail string }

// installBinary puts an extracted, verified binary in place of the running one (see above).
func (h *UpdateHandler) installBinary(extracted, currentExe string) *installFailure {
	staged := currentExe + ".new"
	_ = os.Remove(staged)
	if err := h.moveFile(extracted, staged); err != nil {
		slog.Error("Update failed: could not stage the new binary", "staged", staged, "error", err)
		return &installFailure{"notifier.update_install_failed", updateUnchanged}
	}
	discard := func() { _ = os.Remove(staged) }

	// Executable before anything else: a binary installed without the right to run would leave a service that
	// cannot start at its next restart.
	if err := os.Chmod(staged, 0o700); err != nil {
		discard()
		slog.Error("Update failed: could not make the new binary executable", "staged", staged, "error", err)
		return &installFailure{"notifier.update_install_failed", updateUnchanged}
	}
	if err := runsHere(staged); err != nil {
		discard()
		slog.Error("Update failed: the new binary does not run on this machine", "error", err)
		return &installFailure{"notifier.update_binary_unusable", updateUnchanged}
	}
	if h.DB != nil {
		if err := backupDatabase(h.DB); err != nil {
			discard()
			slog.Error("Update failed: could not copy the database before updating", "error", err)
			return &installFailure{"notifier.update_backup_failed", updateUnchanged}
		}
	}

	oldExe := currentExe + ".old"
	_ = os.Remove(oldExe)
	if err := os.Link(currentExe, oldExe); err != nil {
		if err := copyFile(currentExe, oldExe); err != nil {
			discard()
			slog.Error("Update failed: could not keep the current binary", "old_exe", oldExe, "error", err)
			return &installFailure{"notifier.update_install_failed", updateUnchanged}
		}
	}
	if err := os.Rename(staged, currentExe); err != nil {
		discard()
		slog.Error("Update failed: could not put the new binary in place", "current_exe", currentExe, "error", err)
		return &installFailure{"notifier.update_install_failed", updateUnchanged}
	}
	return nil
}

// runsHere runs a binary with -version, which prints the product's name and version and exits before it opens
// anything. Bounded, so a binary that hangs cannot hold the update.
func runsHere(binary string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	out, err := exec.CommandContext(ctx, binary, "-version").Output()
	if err != nil {
		return fmt.Errorf("running it with -version: %w", err)
	}
	if answer := strings.TrimSpace(string(out)); !strings.HasPrefix(answer, "Lastboard ") {
		return fmt.Errorf("it answered %q to -version", clip(answer, 80))
	}
	return nil
}

// dbBackupPrefix names a copy of the database taken before an update, followed by the local date and time: the
// same name the install script gives its copies.
const dbBackupPrefix = ".backup-"

// backupDatabase copies the database beside itself and checks the copy opens whole. VACUUM INTO and not a copy of the file: the database is in WAL mode and in use, and the file alone does
// not hold what is still in the log.
func backupDatabase(db *sql.DB) error {
	var file string
	if err := db.QueryRow(`SELECT file FROM pragma_database_list WHERE name = 'main'`).Scan(&file); err != nil {
		return fmt.Errorf("finding the database file: %w", err)
	}
	if file == "" {
		return fmt.Errorf("the database has no file to copy beside")
	}
	target := file + dbBackupPrefix + time.Now().Format("20060102-150405")
	// Two updates within the same second share a name, and VACUUM INTO refuses a file that exists.
	_ = os.Remove(target)
	if _, err := db.Exec(`VACUUM INTO ?`, target); err != nil {
		_ = os.Remove(target)
		return fmt.Errorf("VACUUM INTO: %w", err)
	}
	if err := checkDatabaseCopy(target); err != nil {
		_ = os.Remove(target)
		return err
	}
	_ = os.Chmod(target, 0o600)
	pruneDatabaseCopies(file, dbBackupsKept)
	slog.Info("Update: database copied before updating", "copy", target)
	return nil
}

// checkDatabaseCopy opens the copy on its own and asks SQLite whether it is whole.
func checkDatabaseCopy(path string) error {
	copyDB, err := sql.Open("sqlite", "file:"+path+"?mode=ro")
	if err != nil {
		return fmt.Errorf("opening the copy: %w", err)
	}
	defer copyDB.Close()
	var result string
	if err := copyDB.QueryRow(`PRAGMA integrity_check`).Scan(&result); err != nil {
		return fmt.Errorf("checking the copy: %w", err)
	}
	if result != "ok" {
		return fmt.Errorf("the copy is not whole: %s", clip(result, 120))
	}
	return nil
}

// pruneDatabaseCopies keeps the newest `keep` copies taken before updates, by this code or by the install script,
// and removes the rest. Only files named as copies are looked at.
func pruneDatabaseCopies(dbFile string, keep int) {
	matches, err := filepath.Glob(dbFile + dbBackupPrefix + "*")
	if err != nil || len(matches) <= keep {
		return
	}
	type dbCopy struct {
		path string
		at   time.Time
	}
	var found []dbCopy
	for _, m := range matches {
		if info, err := os.Lstat(m); err == nil && info.Mode().IsRegular() {
			found = append(found, dbCopy{m, info.ModTime()})
		}
	}
	sort.Slice(found, func(i, j int) bool { return found[i].at.After(found[j].at) })
	for _, f := range found[min(keep, len(found)):] {
		if err := os.Remove(f.path); err != nil {
			slog.Warn("Update: could not remove an old copy of the database", "copy", f.path, "error", err)
		}
	}
}

// copyFile copies src to dst with its permissions, and makes sure the bytes are on disk.
func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	info, err := in.Stat()
	if err != nil {
		return err
	}
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, info.Mode().Perm())
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		_ = os.Remove(dst)
		return err
	}
	if err := out.Sync(); err != nil {
		out.Close()
		_ = os.Remove(dst)
		return err
	}
	return out.Close()
}
