package api_test

import (
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"strings"
	"testing"
)

// A read started for a request nobody is waiting for any more still occupies
// SQLite, which has one writer and does not care that the browser has gone. A
// handler holding a request already has the thing that says when to stop, so it
// should pass it.
//
// Writes are deliberately not covered: cancelling an Exec halfway through a
// sequence of them can leave records half-written, which is worse than the
// orphaned query it would avoid.
func TestHandlersReadWithTheRequestContext(t *testing.T) {
	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatal(err)
	}

	fset := token.NewFileSet()
	checked := 0

	for _, path := range files {
		if strings.HasSuffix(path, "_test.go") {
			continue
		}
		file, err := parser.ParseFile(fset, path, nil, 0)
		if err != nil {
			t.Fatalf("parsing %s: %v", path, err)
		}

		for _, decl := range file.Decls {
			fn, ok := decl.(*ast.FuncDecl)
			if !ok || fn.Body == nil || !takesRequest(fn) {
				continue
			}
			checked++

			ast.Inspect(fn.Body, func(n ast.Node) bool {
				call, ok := n.(*ast.CallExpr)
				if !ok {
					return true
				}
				sel, ok := call.Fun.(*ast.SelectorExpr)
				if !ok {
					return true
				}
				if sel.Sel.Name != "Query" && sel.Sel.Name != "QueryRow" {
					return true
				}
				// r.URL.Query() is a different thing entirely.
				if inner, ok := sel.X.(*ast.SelectorExpr); ok && inner.Sel.Name == "URL" {
					return true
				}
				t.Errorf("%s: %s reads the database with %s; it has the request, so use %sContext(r.Context(), …) "+
					"and the read stops when the caller does",
					path, fn.Name.Name, sel.Sel.Name, sel.Sel.Name)
				return true
			})
		}
	}

	if checked == 0 {
		t.Fatal("no handlers were inspected — the scan is broken, not the code")
	}
	t.Logf("%d handlers inspected", checked)
}

// takesRequest reports whether fn has an *http.Request parameter named r.
func takesRequest(fn *ast.FuncDecl) bool {
	if fn.Type.Params == nil {
		return false
	}
	for _, param := range fn.Type.Params.List {
		star, ok := param.Type.(*ast.StarExpr)
		if !ok {
			continue
		}
		sel, ok := star.X.(*ast.SelectorExpr)
		if !ok || sel.Sel.Name != "Request" {
			continue
		}
		for _, name := range param.Names {
			if name.Name == "r" {
				return true
			}
		}
	}
	return false
}
