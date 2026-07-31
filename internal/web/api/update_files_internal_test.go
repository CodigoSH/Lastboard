package api

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Characterization tests for the update pipeline's file helpers: download the
// asset, check it against checksums.txt, and pull the binary out of the
// archive. These run entirely on temp files and a local test server — the
// swap-and-re-exec step that follows them is deliberately left alone.

// tarEntry is one member of a test archive. Order matters: the extractor takes
// the first entry that matches, so tests spell the order out explicitly.
type tarEntry struct {
	name string
	body string
	dir  bool
}

// tarGz builds a gzipped tar in memory so a test can describe its archive inline.
func tarGz(t *testing.T, entries ...tarEntry) []byte {
	t.Helper()
	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gz)

	for _, e := range entries {
		if e.dir {
			if err := tw.WriteHeader(&tar.Header{
				Name: e.name, Typeflag: tar.TypeDir, Mode: 0o755,
			}); err != nil {
				t.Fatalf("write dir header: %v", err)
			}
			continue
		}
		if err := tw.WriteHeader(&tar.Header{
			Name: e.name, Typeflag: tar.TypeReg, Mode: 0o755, Size: int64(len(e.body)),
		}); err != nil {
			t.Fatalf("write header: %v", err)
		}
		if _, err := tw.Write([]byte(e.body)); err != nil {
			t.Fatalf("write body: %v", err)
		}
	}
	if err := tw.Close(); err != nil {
		t.Fatalf("close tar: %v", err)
	}
	if err := gz.Close(); err != nil {
		t.Fatalf("close gzip: %v", err)
	}
	return buf.Bytes()
}

// writeArchive puts a built archive on disk and returns its path.
func writeArchive(t *testing.T, dir string, entries ...tarEntry) string {
	t.Helper()
	path := filepath.Join(dir, "release.tar.gz")
	if err := os.WriteFile(path, tarGz(t, entries...), 0o600); err != nil {
		t.Fatalf("write archive: %v", err)
	}
	return path
}

// ── downloadFile ──────────────────────────────────────────────────────────────

func TestDownloadFile_WritesBody(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("binary-payload"))
	}))
	defer srv.Close()

	h := &UpdateHandler{}
	dest := filepath.Join(t.TempDir(), "asset")
	if err := h.downloadFile(srv.URL, dest); err != nil {
		t.Fatalf("downloadFile: %v", err)
	}

	got, err := os.ReadFile(dest)
	if err != nil {
		t.Fatalf("read dest: %v", err)
	}
	if string(got) != "binary-payload" {
		t.Errorf("downloaded %q, want %q", got, "binary-payload")
	}
}

func TestDownloadFile_RejectsBadStatus(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "gone", http.StatusNotFound)
	}))
	defer srv.Close()

	h := &UpdateHandler{}
	err := h.downloadFile(srv.URL, filepath.Join(t.TempDir(), "asset"))
	if err == nil {
		t.Fatal("expected an error for a 404 response")
	}
	if !strings.Contains(err.Error(), "bad status") {
		t.Errorf("error = %v, want it to mention the bad status", err)
	}
}

func TestDownloadFile_FailsWhenDestUnwritable(t *testing.T) {
	h := &UpdateHandler{}
	dest := filepath.Join(t.TempDir(), "missing-dir", "asset")
	if err := h.downloadFile("http://127.0.0.1:1/never-reached", dest); err == nil {
		t.Fatal("expected an error when the destination cannot be created")
	}
}

// ── verifyChecksum ────────────────────────────────────────────────────────────

// writeWithChecksums drops a binary and a checksums.txt in a temp dir. When
// realHash is false the file is listed under a hash that does not match.
func writeWithChecksums(t *testing.T, content string, realHash bool, extraLines ...string) (string, string) {
	t.Helper()
	dir := t.TempDir()
	binPath := filepath.Join(dir, "lastboard")
	if err := os.WriteFile(binPath, []byte(content), 0o600); err != nil {
		t.Fatalf("write binary: %v", err)
	}

	sum := sha256.Sum256([]byte(content))
	hash := hex.EncodeToString(sum[:])
	if !realHash {
		hash = strings.Repeat("0", len(hash))
	}

	lines := append([]string{}, extraLines...)
	lines = append(lines, hash+"  lastboard-linux-amd64.tar.gz")
	sumPath := filepath.Join(dir, "checksums.txt")
	if err := os.WriteFile(sumPath, []byte(strings.Join(lines, "\n")+"\n"), 0o600); err != nil {
		t.Fatalf("write checksums: %v", err)
	}
	return binPath, sumPath
}

func TestVerifyChecksum_AcceptsMatchingHash(t *testing.T) {
	binPath, sumPath := writeWithChecksums(t, "release-bytes", true)
	if err := (&UpdateHandler{}).verifyChecksum(binPath, sumPath); err != nil {
		t.Errorf("expected the checksum to verify, got %v", err)
	}
}

func TestVerifyChecksum_FindsHashAmongOtherLines(t *testing.T) {
	binPath, sumPath := writeWithChecksums(t, "release-bytes", true,
		strings.Repeat("a", 64)+"  lastboard-linux-arm64.tar.gz",
		strings.Repeat("b", 64)+"  something-else.tar.gz",
	)
	if err := (&UpdateHandler{}).verifyChecksum(binPath, sumPath); err != nil {
		t.Errorf("expected the checksum to verify among several lines, got %v", err)
	}
}

func TestVerifyChecksum_RejectsMismatch(t *testing.T) {
	binPath, sumPath := writeWithChecksums(t, "release-bytes", false)
	err := (&UpdateHandler{}).verifyChecksum(binPath, sumPath)
	if err == nil {
		t.Fatal("expected a mismatch error")
	}
	if !strings.Contains(err.Error(), "checksum mismatch") {
		t.Errorf("error = %v, want a checksum mismatch", err)
	}
}

func TestVerifyChecksum_FailsWithoutChecksumFile(t *testing.T) {
	binPath, _ := writeWithChecksums(t, "release-bytes", true)
	if err := (&UpdateHandler{}).verifyChecksum(binPath, filepath.Join(t.TempDir(), "nope.txt")); err == nil {
		t.Fatal("expected an error when checksums.txt is missing")
	}
}

// ── extractTarGz ──────────────────────────────────────────────────────────────

func TestExtractTarGz_MatchesTheRunningBinaryName(t *testing.T) {
	dir := t.TempDir()
	archive := writeArchive(t, dir,
		tarEntry{name: "README.md", body: "not a binary"},
		tarEntry{name: "myboard", body: "renamed-binary"},
	)

	dest := filepath.Join(dir, "out")
	if err := (&UpdateHandler{}).extractTarGz(archive, dest, "myboard"); err != nil {
		t.Fatalf("extractTarGz: %v", err)
	}
	if got, _ := os.ReadFile(dest); string(got) != "renamed-binary" {
		t.Errorf("extracted %q, want the binary matching the running name", got)
	}
}

func TestExtractTarGz_FallsBackToLastboard(t *testing.T) {
	dir := t.TempDir()
	archive := writeArchive(t, dir, tarEntry{name: "lastboard", body: "official-name"})

	dest := filepath.Join(dir, "out")
	if err := (&UpdateHandler{}).extractTarGz(archive, dest, "some-other-name"); err != nil {
		t.Fatalf("extractTarGz: %v", err)
	}
	if got, _ := os.ReadFile(dest); string(got) != "official-name" {
		t.Errorf("extracted %q, want the lastboard entry", got)
	}
}

// Installs from before the rename run a binary called "dashboard"; the
// extractor still accepts that name so those instances can keep updating.
func TestExtractTarGz_AcceptsLegacyDashboardName(t *testing.T) {
	dir := t.TempDir()
	archive := writeArchive(t, dir, tarEntry{name: "dashboard", body: "legacy-name"})

	dest := filepath.Join(dir, "out")
	if err := (&UpdateHandler{}).extractTarGz(archive, dest, ""); err != nil {
		t.Fatalf("extractTarGz: %v", err)
	}
	if got, _ := os.ReadFile(dest); string(got) != "legacy-name" {
		t.Errorf("extracted %q, want the dashboard entry", got)
	}
}

// Current behaviour: the first accepted entry wins, in archive order — the
// running binary's name does not outrank an earlier "lastboard" entry. Release
// archives ship exactly one binary, so this never comes up in practice; the
// test pins it down so a future change to that ordering is a deliberate one.
func TestExtractTarGz_TakesTheFirstAcceptedEntry(t *testing.T) {
	dir := t.TempDir()
	archive := writeArchive(t, dir,
		tarEntry{name: "lastboard", body: "official-name"},
		tarEntry{name: "myboard", body: "renamed-binary"},
	)

	dest := filepath.Join(dir, "out")
	if err := (&UpdateHandler{}).extractTarGz(archive, dest, "myboard"); err != nil {
		t.Fatalf("extractTarGz: %v", err)
	}
	if got, _ := os.ReadFile(dest); string(got) != "official-name" {
		t.Errorf("extracted %q, want the first accepted entry in the archive", got)
	}
}

func TestExtractTarGz_MatchesOnBaseNameInsideFolder(t *testing.T) {
	dir := t.TempDir()
	archive := writeArchive(t, dir,
		tarEntry{name: "lastboard-v1.6.0/", dir: true},
		tarEntry{name: "lastboard-v1.6.0/lastboard", body: "nested-binary"},
	)

	dest := filepath.Join(dir, "out")
	if err := (&UpdateHandler{}).extractTarGz(archive, dest, ""); err != nil {
		t.Fatalf("extractTarGz: %v", err)
	}
	if got, _ := os.ReadFile(dest); string(got) != "nested-binary" {
		t.Errorf("extracted %q, want the nested binary", got)
	}
}

func TestExtractTarGz_ErrorsWhenNoBinaryMatches(t *testing.T) {
	dir := t.TempDir()
	archive := writeArchive(t, dir, tarEntry{name: "README.md", body: "not a binary"})

	err := (&UpdateHandler{}).extractTarGz(archive, filepath.Join(dir, "out"), "lastboard-custom")
	if err == nil {
		t.Fatal("expected an error when the archive holds no candidate binary")
	}
	if !strings.Contains(err.Error(), "binary not found") {
		t.Errorf("error = %v, want it to report the missing binary", err)
	}
}

func TestExtractTarGz_RejectsNonGzipInput(t *testing.T) {
	dir := t.TempDir()
	archive := filepath.Join(dir, "release.tar.gz")
	if err := os.WriteFile(archive, []byte("this is not gzip"), 0o600); err != nil {
		t.Fatalf("write archive: %v", err)
	}

	if err := (&UpdateHandler{}).extractTarGz(archive, filepath.Join(dir, "out"), ""); err == nil {
		t.Fatal("expected an error for a non-gzip archive")
	}
}

func TestExtractTarGz_FailsOnMissingArchive(t *testing.T) {
	dir := t.TempDir()
	if err := (&UpdateHandler{}).extractTarGz(
		filepath.Join(dir, "nope.tar.gz"), filepath.Join(dir, "out"), ""); err == nil {
		t.Fatal("expected an error when the archive does not exist")
	}
}
