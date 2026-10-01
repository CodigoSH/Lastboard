package arch

import (
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// noticeBoundary splits NOTICE's Go section in two: above it, what the
// published binaries contain; below it, what go.mod requires and they do not.
const noticeBoundary = "Required by go.mod and NOT in what we publish"

// noticeModule matches a row of NOTICE's module table: a path, then the
// licence, which starts with a capital (MIT, BSD-3-Clause, Apache-2.0). That is
// what tells a row from prose that happens to start with a path —
// "modernc.org/sqlite is a pure-Go translation…" below the table read as a
// module listed as not shipped. Column spacing is no help: a long path leaves
// a single space before its licence.
var noticeModule = regexp.MustCompile(`(?m)^\s+([a-z0-9.-]+\.[a-z]{2,}/[^\s]+)\s+[A-Z]`)

// goModRequire matches one requirement, inside a block or on its own line.
var goModRequire = regexp.MustCompile(`(?m)^\s*(?:require\s+)?([a-z0-9.-]+\.[a-z]{2,}/[^\s]+)\s+v[^\s]+`)

// linkedModules asks the linker, for every architecture a release is built
// for, which third-party modules end up in the binary. go.mod cannot answer
// that: Go downloads whole modules and the linker keeps only what is imported.
func linkedModules(t *testing.T, root string) map[string]bool {
	t.Helper()
	linked := map[string]bool{}
	for _, arch := range []string{"amd64", "arm64"} {
		cmd := exec.Command("go", "list", "-deps",
			"-f", "{{if .Module}}{{.Module.Path}}{{end}}", "./cmd/lastboard")
		cmd.Dir = root
		cmd.Env = append(os.Environ(), "GOOS=linux", "GOARCH="+arch)
		out, err := cmd.Output()
		if err != nil {
			t.Fatalf("asking the linker for linux/%s: %v", arch, err)
		}
		for _, line := range strings.Split(string(out), "\n") {
			mod := strings.TrimSpace(line)
			if mod != "" && !strings.HasPrefix(mod, "git.codigosh.com/") {
				linked[mod] = true
			}
		}
	}
	if len(linked) == 0 {
		t.Fatal("the linker reported no third-party modules at all: this is asking\n" +
			"about the wrong package, not proof that there are none.")
	}
	return linked
}

// TestTheNoticeSaysWhatIsActuallyLinked.
//
// NOTICE is the file somebody's legal review reads literally, and the one
// nobody remembers to update. gopkg.in/yaml.v3 went into every binary with the
// YAML import and export in July 2026 and was never attributed, while
// golang.org/x/exp stayed listed as compiled in long after it had left.
//
// Three things are refused: a linked module NOTICE does not name above the
// boundary, a module named above the boundary that is not linked, and a module
// named below it that is.
func TestTheNoticeSaysWhatIsActuallyLinked(t *testing.T) {
	root := filepath.Join("..", "..")
	notice, err := os.ReadFile(filepath.Join(root, "NOTICE"))
	if err != nil {
		t.Fatal(err)
	}
	cut := strings.Index(string(notice), noticeBoundary)
	if cut < 0 {
		t.Fatalf("NOTICE no longer contains %q, so this test cannot tell which\n"+
			"half claims to describe the published binaries.", noticeBoundary)
	}
	// The Go section ends where the next numbered section starts.
	goSection := string(notice)[:cut]
	rest := string(notice)[cut:]
	if end := strings.Index(rest, "\n2. "); end >= 0 {
		rest = rest[:end]
	}

	shipped := map[string]bool{}
	for _, m := range noticeModule.FindAllStringSubmatch(goSection, -1) {
		shipped[m[1]] = true
	}
	notShipped := map[string]bool{}
	for _, m := range noticeModule.FindAllStringSubmatch(rest, -1) {
		notShipped[m[1]] = true
	}
	if len(shipped) == 0 {
		t.Fatal("found no modules above the boundary: the NOTICE layout changed\n" +
			"and this test is reading nothing.")
	}

	linked := linkedModules(t, root)
	for mod := range linked {
		if !shipped[mod] {
			t.Errorf("%s is linked into the published binaries and NOTICE does not\n"+
				"list it among what they contain.", mod)
		}
	}
	for mod := range shipped {
		if !linked[mod] {
			t.Errorf("NOTICE lists %s as compiled into the binaries, and the linker\n"+
				"does not keep it. Move it below the boundary, or remove it.", mod)
		}
	}
	for mod := range notShipped {
		if linked[mod] {
			t.Errorf("NOTICE says %s is not in what we publish, and the linker keeps it.", mod)
		}
	}
}

// TestEveryRequiredModuleIsInTheNotice: a module go.mod requires is named
// somewhere in NOTICE, in one half or the other.
func TestEveryRequiredModuleIsInTheNotice(t *testing.T) {
	root := filepath.Join("..", "..")
	goMod, err := os.ReadFile(filepath.Join(root, "go.mod"))
	if err != nil {
		t.Fatal(err)
	}
	notice, err := os.ReadFile(filepath.Join(root, "NOTICE"))
	if err != nil {
		t.Fatal(err)
	}
	required := goModRequire.FindAllStringSubmatch(string(goMod), -1)
	if len(required) == 0 {
		t.Fatal("found no requirements in go.mod: this test is reading the wrong file.")
	}
	named := map[string]bool{}
	for _, m := range noticeModule.FindAllStringSubmatch(string(notice), -1) {
		named[m[1]] = true
	}
	for _, m := range required {
		if !named[m[1]] {
			t.Errorf("%s is required by go.mod and is not named in NOTICE.", m[1])
		}
	}
}
