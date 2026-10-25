package arch

import (
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"path/filepath"
	"strings"
	"testing"
)

// The clients that may follow a redirect anywhere, and why. Every other client
// carries a credential somewhere — a key in a header, a token its transport adds —
// and must say CheckRedirect: util.KeepToOrigin, or a redirect to another server
// takes the credential there (see internal/web/util/redirect.go).
//
// Adding a file here is the moment to check that its requests carry nothing that
// belongs to the person who configured them.
var mayFollowRedirectsAnywhere = map[string]string{
	// Status checks send nothing but the request. A service behind a sign-in page
	// answers with a redirect to its provider, on another host, and is still up.
	"internal/web/api/dashboard_handler.go": "status checks carry no credential",
	// Icon sources hand a picked icon over between their own hosts.
	"internal/web/api/icons.go": "icon downloads carry no credential",
	// Releases are downloaded from git.codigosh.com, with no credential of the
	// user's, and the update path checks the host before it trusts a download.
	"internal/web/api/update.go": "release downloads carry no credential and are host-checked",
}

func TestEveryClientWithACredentialKeepsRedirectsToItsOrigin(t *testing.T) {
	root := filepath.Join("..", "..")
	clients := 0
	seen := map[string]bool{}

	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		relative, _ := filepath.Rel(root, path)
		relative = filepath.ToSlash(relative)
		if d.IsDir() {
			switch relative {
			case ".git", "node_modules", "web", "docs", "bin", "deploy":
				return fs.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}
		parsed, err := parser.ParseFile(token.NewFileSet(), path, nil, 0)
		if err != nil {
			return err
		}
		ast.Inspect(parsed, func(n ast.Node) bool {
			lit, ok := n.(*ast.CompositeLit)
			if !ok {
				return true
			}
			sel, ok := lit.Type.(*ast.SelectorExpr)
			if !ok {
				return true
			}
			if pkg, ok := sel.X.(*ast.Ident); !ok || pkg.Name+"."+sel.Sel.Name != "http.Client" {
				return true
			}
			clients++
			if _, exempt := mayFollowRedirectsAnywhere[relative]; exempt {
				seen[relative] = true
				return true
			}
			policy := ""
			for _, el := range lit.Elts {
				kv, ok := el.(*ast.KeyValueExpr)
				if !ok {
					continue
				}
				if key, ok := kv.Key.(*ast.Ident); ok && key.Name == "CheckRedirect" {
					if s, ok := kv.Value.(*ast.SelectorExpr); ok {
						if p, ok := s.X.(*ast.Ident); ok {
							policy = p.Name + "." + s.Sel.Name
						}
					}
				}
			}
			if policy != "util.KeepToOrigin" {
				t.Errorf("%s builds an http.Client without CheckRedirect: util.KeepToOrigin: a redirect to another server would take its credentials there", relative)
			}
			return true
		})
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	// A walk that finds no client is reading the wrong tree, and would pass forever.
	if clients < 8 {
		t.Fatalf("found %d http.Client literals; this test is reading the wrong tree", clients)
	}
	for file := range mayFollowRedirectsAnywhere {
		if !seen[file] {
			t.Errorf("%s is on the list of clients that may follow redirects anywhere and no longer builds one: take it off", file)
		}
	}
}
