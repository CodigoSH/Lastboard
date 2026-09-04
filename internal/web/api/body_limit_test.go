package api_test

import (
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"strings"
	"testing"
)

// A handler that decodes a request body without capping it first reads whatever
// the caller sends, for as long as they keep sending. There is a backstop in
// middleware.LimitBody, but 16 MiB is a ceiling, not a limit: a handler
// expecting a password should not accept sixteen megabytes of one.
//
// Four handlers had already been written without a cap, and nothing said so.
// This says so.
func TestEveryHandlerCapsTheBodyItReads(t *testing.T) {
	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatal(err)
	}

	fset := token.NewFileSet()
	inspected := 0

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
			if !ok || fn.Body == nil {
				continue
			}
			inspected++

			var reads, caps bool
			ast.Inspect(fn.Body, func(n ast.Node) bool {
				call, ok := n.(*ast.CallExpr)
				if !ok {
					return true
				}
				switch name := calledName(call); name {
				case "http.MaxBytesReader":
					caps = true
				case "r.ParseMultipartForm", "r.FormFile", "r.ParseForm":
					// These consume the body too, and ParseMultipartForm's
					// argument only bounds what is held in memory.
					reads = true
				}
				for _, arg := range call.Args {
					if expr(arg) == "r.Body" {
						reads = true
					}
				}
				return true
			})

			if reads && !caps {
				t.Errorf("%s: %s reads the request body without an http.MaxBytesReader; "+
					"give it one sized to what it actually expects",
					path, fn.Name.Name)
			}
		}
	}

	if inspected == 0 {
		t.Fatal("no functions were inspected — the scan is broken, not the code")
	}
	t.Logf("%d functions inspected", inspected)
}

// calledName renders the function being called as "pkg.Fn" or "recv.Method",
// and "" for anything more involved than that.
func calledName(call *ast.CallExpr) string {
	sel, ok := call.Fun.(*ast.SelectorExpr)
	if !ok {
		return ""
	}
	return expr(sel)
}

func expr(node ast.Expr) string {
	sel, ok := node.(*ast.SelectorExpr)
	if !ok {
		return ""
	}
	ident, ok := sel.X.(*ast.Ident)
	if !ok {
		return ""
	}
	return ident.Name + "." + sel.Sel.Name
}
