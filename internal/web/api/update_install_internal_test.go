package api

import (
	"bytes"
	"database/sql"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

// fakeBinary writes a script that answers -version as a Lastboard binary of that version would (or not at all).
func fakeBinary(t *testing.T, path, answer string, exitCode int) {
	t.Helper()
	script := "#!/bin/sh\necho \"" + answer + "\"\nexit " + strconv.Itoa(exitCode) + "\n"
	if err := os.WriteFile(path, []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}
}

// walDatabase is a database in a file, in WAL mode, with rows that are still only in the log.
func walDatabase(t *testing.T, dir string) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", "file:"+filepath.Join(dir, "lastboard.db")+"?_pragma=journal_mode(WAL)")
	if err != nil {
		t.Fatal(err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { db.Close() })
	for _, q := range []string{`CREATE TABLE t(v TEXT)`, `INSERT INTO t VALUES ('one'), ('two'), ('three')`} {
		if _, err := db.Exec(q); err != nil {
			t.Fatal(err)
		}
	}
	return db
}

func read(t *testing.T, path string) string {
	t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func exists(path string) bool {
	_, err := os.Lstat(path)
	return err == nil
}

// The new binary replaces the running one only after it ran here and the database was copied; the one it replaces
// stays beside it as .old, and nothing is left staged.
func TestAnUpdateInstallsOnlyABinaryThatRunsAndAfterCopyingTheDatabase(t *testing.T) {
	dir := t.TempDir()
	current := filepath.Join(dir, "lastboard")
	fakeBinary(t, current, "Lastboard v1.0.0", 0)
	extracted := filepath.Join(t.TempDir(), "new-binary")
	fakeBinary(t, extracted, "Lastboard v2.0.0", 0)
	os.Chmod(extracted, 0o644) // as it comes out of the archive: not executable yet

	h := &UpdateHandler{DB: walDatabase(t, dir)}
	if f := h.installBinary(extracted, current); f != nil {
		t.Fatalf("install failed: %+v", f)
	}
	if !strings.Contains(read(t, current), "v2.0.0") {
		t.Error("the running binary was not replaced")
	}
	if !strings.Contains(read(t, current+".old"), "v1.0.0") {
		t.Error("the binary it replaced was not kept as .old")
	}
	if info, _ := os.Stat(current); info.Mode().Perm() != 0o700 {
		t.Errorf("the new binary is %v, want 0700", info.Mode().Perm())
	}
	if exists(current + ".new") {
		t.Error("the staged binary was left behind")
	}

	// The copy holds the rows that were only in the WAL: a copy of the file alone would not.
	copies, _ := filepath.Glob(filepath.Join(dir, "lastboard.db.backup-*"))
	if len(copies) != 1 {
		t.Fatalf("copies of the database: %v, want one", copies)
	}
	copyPath := copies[0]
	copyDB, err := sql.Open("sqlite", "file:"+copyPath+"?mode=ro")
	if err != nil {
		t.Fatal(err)
	}
	defer copyDB.Close()
	var n int
	if err := copyDB.QueryRow(`SELECT count(*) FROM t`).Scan(&n); err != nil || n != 3 {
		t.Errorf("the copy of the database has %d rows (%v), want 3", n, err)
	}
	if info, _ := os.Stat(copyPath); info.Mode().Perm() != 0o600 {
		t.Errorf("the copy is %v, want 0600: it holds every account's data", info.Mode().Perm())
	}
}

// A binary that does not run on this machine (another architecture, a damaged file) stops the update before
// anything is touched: the running binary stays, and nothing is left behind.
func TestABinaryThatDoesNotRunHereIsNotInstalled(t *testing.T) {
	for name, bad := range map[string]struct {
		answer string
		code   int
	}{
		"it fails":             {"exec format error", 1},
		"it is something else": {"busybox v1.36", 0},
	} {
		t.Run(name, func(t *testing.T) {
			dir := t.TempDir()
			current := filepath.Join(dir, "lastboard")
			fakeBinary(t, current, "Lastboard v1.0.0", 0)
			extracted := filepath.Join(t.TempDir(), "new-binary")
			fakeBinary(t, extracted, bad.answer, bad.code)

			h := &UpdateHandler{DB: walDatabase(t, dir)}
			f := h.installBinary(extracted, current)
			if f == nil || f.key != "notifier.update_binary_unusable" || f.detail != updateUnchanged {
				t.Fatalf("got %+v, want the binary refused and nothing changed", f)
			}
			if !strings.Contains(read(t, current), "v1.0.0") {
				t.Error("the running binary was touched")
			}
			for _, left := range []string{current + ".new", current + ".old"} {
				if exists(left) {
					t.Errorf("%s was left behind", filepath.Base(left))
				}
			}
			if copies, _ := filepath.Glob(filepath.Join(dir, "lastboard.db.backup-*")); len(copies) != 0 {
				t.Errorf("the database was copied for an update that did not happen: %v", copies)
			}
		})
	}
}

// If the database cannot be copied, the update stops with the running binary untouched.
func TestAnUpdateStopsWhenTheDatabaseCannotBeCopied(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("root writes into a read-only directory anyway")
	}
	dir := t.TempDir()
	current := filepath.Join(t.TempDir(), "lastboard")
	fakeBinary(t, current, "Lastboard v1.0.0", 0)
	extracted := filepath.Join(t.TempDir(), "new-binary")
	fakeBinary(t, extracted, "Lastboard v2.0.0", 0)
	db := walDatabase(t, dir)
	if err := os.Chmod(dir, 0o500); err != nil { // the copy goes beside the database, which is now not writable
		t.Fatal(err)
	}
	t.Cleanup(func() { os.Chmod(dir, 0o700) })

	h := &UpdateHandler{DB: db}
	f := h.installBinary(extracted, current)
	if f == nil || f.key != "notifier.update_backup_failed" || f.detail != updateUnchanged {
		t.Fatalf("got %+v, want the update stopped for the copy", f)
	}
	if !strings.Contains(read(t, current), "v1.0.0") || exists(current+".new") || exists(current+".old") {
		t.Error("the running binary was touched, or something was left behind")
	}
}

// A copy is taken before each update and only the newest are kept: each is as large as the database. The install
// script names its copies the same way, and they count as one set.
func TestOnlyTheNewestCopiesOfTheDatabaseAreKept(t *testing.T) {
	dir := t.TempDir()
	dbFile := filepath.Join(dir, "lastboard.db")
	base := time.Now().Add(-time.Hour)
	for i, tag := range []string{"v1", "v2", "v3", "v4", "v5"} {
		p := dbFile + ".backup-" + tag
		os.WriteFile(p, []byte(tag), 0o600)
		at := base.Add(time.Duration(i) * time.Minute)
		os.Chtimes(p, at, at)
	}
	other := filepath.Join(dir, "lastboard.db-wal")
	os.WriteFile(other, []byte("not a copy"), 0o600)

	pruneDatabaseCopies(dbFile, 3)
	for tag, want := range map[string]bool{"v1": false, "v2": false, "v3": true, "v4": true, "v5": true} {
		if got := exists(dbFile + ".backup-" + tag); got != want {
			t.Errorf("copy %s kept=%v, want %v", tag, got, want)
		}
	}
	if !exists(other) {
		t.Error("a file that is not a copy was removed")
	}
}

// Two copies taken within the same second share a name: the second replaces the first instead of failing on it.
func TestACopyTakenTwiceInOneSecondReplacesTheFirst(t *testing.T) {
	dir := t.TempDir()
	db := walDatabase(t, dir)
	for i := 0; i < 2; i++ {
		if err := backupDatabase(db); err != nil {
			t.Fatalf("copy %d: %v", i+1, err)
		}
	}
	if copies, _ := filepath.Glob(filepath.Join(dir, "lastboard.db.backup-*")); len(copies) == 0 || len(copies) > 2 {
		t.Errorf("copies: %v", copies)
	}
}

// The copy taken before an update is checked page by page before the update goes on: one whose pages are damaged
// (a disk that failed while it was written) is refused, one cut short is refused, and a whole one is accepted.
func TestACopyWithDamagedPagesIsRefusedAndAWholeOneIsAccepted(t *testing.T) {
	dir := t.TempDir()
	db := walDatabase(t, dir)
	for i := 0; i < 20000; i++ {
		if _, err := db.Exec(`INSERT INTO t VALUES (?)`, strings.Repeat("row-", 30)+strconv.Itoa(i)); err != nil {
			t.Fatal(err)
		}
	}
	whole := filepath.Join(dir, "whole.db")
	if _, err := db.Exec(`VACUUM INTO ?`, whole); err != nil {
		t.Fatal(err)
	}
	if err := checkDatabaseCopy(whole); err != nil {
		t.Fatalf("a whole copy was refused: %v", err)
	}

	raw, err := os.ReadFile(whole)
	if err != nil {
		t.Fatal(err)
	}
	const page = 4096
	middle := (len(raw) / page / 2) * page
	for name, damage := range map[string]func([]byte) []byte{
		"a page of data written as zeros":  func(b []byte) []byte { copy(b[middle:middle+page], make([]byte, page)); return b },
		"the header of a page overwritten": func(b []byte) []byte { copy(b[middle:middle+16], bytes.Repeat([]byte{0xff}, 16)); return b },
		"the file cut short":               func(b []byte) []byte { return b[:len(b)/2] },
	} {
		damaged := filepath.Join(dir, "damaged.db")
		if err := os.WriteFile(damaged, damage(append([]byte(nil), raw...)), 0o600); err != nil {
			t.Fatal(err)
		}
		if err := checkDatabaseCopy(damaged); err == nil {
			t.Errorf("%s: the copy was accepted", name)
		}
	}
}
