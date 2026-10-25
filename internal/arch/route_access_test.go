package arch

import (
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"testing"
)

// Every route behind protect must say what it needs: need(access.X, handler) for
// a permission, anyAccount(handler) for what every signed-in account may do.
//
// Without this, a route added tomorrow as protect(http.HandlerFunc(h)) would be
// open to every member — including one the administrator restricted to looking
// at a board — and nothing would say so. The one exception is the page itself,
// which is not an API and decides nothing.
func TestEveryProtectedRouteSaysWhatItNeeds(t *testing.T) {
	path := filepath.Join("..", "web", "server.go")
	file, err := parser.ParseFile(token.NewFileSet(), path, nil, 0)
	if err != nil {
		t.Fatal(err)
	}

	routes := 0
	ast.Inspect(file, func(n ast.Node) bool {
		call, ok := n.(*ast.CallExpr)
		if !ok {
			return true
		}
		if fn, ok := call.Fun.(*ast.Ident); !ok || fn.Name != "protect" || len(call.Args) != 1 {
			return true
		}
		routes++
		inner, ok := call.Args[0].(*ast.CallExpr)
		if !ok {
			t.Errorf("protect(%s): wrap it in need(...) or anyAccount(...)", exprString(call.Args[0]))
			return true
		}
		switch fn := inner.Fun.(type) {
		case *ast.Ident:
			switch fn.Name {
			case "anyAccount":
				return true
			case "need":
				// The permission is a named capability, never something computed.
				if len(inner.Args) != 2 {
					t.Errorf("need takes a capability and a handler")
					return true
				}
				if sel, ok := inner.Args[0].(*ast.SelectorExpr); !ok || exprString(sel.X) != "access" {
					t.Errorf("need(%s, …): name a capability from the access package", exprString(inner.Args[0]))
				}
				return true
			}
		case *ast.SelectorExpr:
			// protect(http.HandlerFunc(s.serveIndex)): the page, not an API.
			if exprString(fn) == "http.HandlerFunc" && len(inner.Args) == 1 && exprString(inner.Args[0]) == "s.serveIndex" {
				return true
			}
		}
		t.Errorf("protect(%s): a protected route must be need(access.X, …) or anyAccount(…)", exprString(call.Args[0]))
		return true
	})

	// Reading the wrong file, or none, would pass forever.
	if routes < 50 {
		t.Fatalf("found %d protected routes in %s; this test is reading the wrong file", routes, path)
	}
}

// exprString renders the small expressions this test looks at.
func exprString(e ast.Expr) string {
	switch x := e.(type) {
	case *ast.Ident:
		return x.Name
	case *ast.SelectorExpr:
		return exprString(x.X) + "." + x.Sel.Name
	case *ast.CallExpr:
		return exprString(x.Fun) + "(…)"
	}
	return "?"
}
