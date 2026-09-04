package internal_test

import (
	"go/build"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The layers are clean today and nothing keeps them that way.
//
// internal/core holds the domain and internal/platform the machinery under it;
// neither knows the web exists, which is exactly right. But an architecture
// nobody checks decays: one `import "net/http"` in core/dashboard on a Tuesday
// afternoon and the separation starts leaking, and no reviewer would catch it.
//
// So it is checked. The rule is small enough to state in a sentence: core and
// platform may not reach for the transport, and platform may not reach upwards.
func TestLayersDoNotReachWhereTheyShouldNot(t *testing.T) {
	const module = "git.codigosh.com/CodigoSH/Lastboard/"

	// Package prefix → what it is not allowed to import.
	rules := map[string][]string{
		"core":     {"net/http", module + "internal/web", module + "internal/platform"},
		"platform": {"net/http", module + "internal/web", module + "internal/core"},
	}

	root, err := filepath.Abs(".")
	if err != nil {
		t.Fatal(err)
	}

	checked := 0
	for layer, forbidden := range rules {
		layerDir := filepath.Join(root, layer)
		if _, err := os.Stat(layerDir); err != nil {
			t.Fatalf("internal/%s is missing — this test is out of date, not the code", layer)
		}

		err := filepath.Walk(layerDir, func(path string, info os.FileInfo, err error) error {
			if err != nil || !info.IsDir() {
				return err
			}
			pkg, err := build.ImportDir(path, 0)
			if err != nil {
				// A directory with no Go files in it is not a problem.
				if _, ok := err.(*build.NoGoError); ok {
					return nil
				}
				return err
			}
			checked++
			// TestGoFiles are excluded on purpose: a test may reach for httptest
			// to exercise something without the package itself depending on it.
			for _, imp := range pkg.Imports {
				for _, bad := range forbidden {
					if imp == bad || strings.HasPrefix(imp, bad+"/") {
						rel, _ := filepath.Rel(root, path)
						t.Errorf("internal/%s imports %s — that layer is not allowed to know about it", rel, imp)
					}
				}
			}
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}
	}

	if checked == 0 {
		t.Fatal("no packages were inspected — the walk is broken, not the code")
	}
	t.Logf("%d packages checked across core and platform", checked)
}
