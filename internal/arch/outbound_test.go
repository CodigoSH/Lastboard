// Package arch holds rules about the shape of the codebase — things that are
// true today, that nothing in the compiler or the test suite would notice
// stopping being true, and that somebody promised in writing.
package arch

import (
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"
)

// Every file allowed to open a connection to the outside, and why.
//
// docs/security/overview.md makes three promises that rest entirely on this
// list: that loading a dashboard "reports nothing to a CDN — neither your
// address nor, by way of the icons requested, which services you run", that the
// update path talks to git.codigosh.com with "no intermediaries or third-party
// services involved", and that "no IP addresses, user identifiers, or telemetry
// are collected at any point".
//
// Nothing enforced any of that. The compiler is happy for any file to make a
// request, no test would notice, and the promise has already been broken once:
// icons were stored locally only when a bookmark was saved, so a board built
// earlier went on asking a CDN for them on every paint, while the security page
// said it did not — until a migration at startup fixed it.
//
// Adding a file here is the moment to ask what it talks to and whether the page
// above still tells the truth.
var mayReachTheNetwork = map[string]string{
	// The services the user asked us to watch. Their addresses are the user's
	// own, typed by the user, which is the whole point of a dashboard.
	"internal/web/api/dashboard_handler.go": "status checks for the bookmarks the user marked",
	"internal/web/api/monitor.go":           "the 24/7 monitor probing those same services",

	// Somewhere to send an alert when one of them falls over. The destination is
	// the administrator's own ntfy, gotify or webhook.
	"internal/web/api/monitor_notify.go": "outage alerts to the administrator's own channel",

	// A widget the user configured, fetching the URL the user gave it.
	"internal/web/api/widget.go": "the API widget, against the endpoint its owner configured",
	// Server Health reading another machine: the Glances, Netdata or JSON
	// endpoint its owner typed in. It went unlisted until this test learned
	// NewRequestWithContext, which is the call it makes.
	"internal/web/api/remote_stats_client.go": "Server Health, against the machine its owner configured",

	// The user's own Docker daemon, over a unix socket or their own host.
	"internal/web/api/docker_client.go": "the Docker widget, against the user's own daemon",

	// The one that fetches from a third party, and the one the CDN promise is
	// about: it runs once, when somebody picks an icon, and never again while a
	// board is rendered.
	"internal/web/api/icons.go": "downloading a chosen icon once, so rendering never asks anyone",

	// The update path. It checks the host itself before downloading anything —
	// see the parsedURL.Host comparison — which is what makes the "no
	// intermediaries" sentence true rather than merely intended.
	"internal/web/api/update.go": "releases from git.codigosh.com, host-checked before download",

	// The operator's own hypervisor, at the address they typed, with a token
	// they minted. Same shape as the Docker widget one line up: it is the
	// machine underneath their services, not a third party — nothing about a
	// board's contents leaves, and the credential never reaches the browser.
	"internal/web/api/proxmox_client.go": "the Proxmox integration, against the operator's own host",

	// The dialer every one of the files above connects through. It opens no
	// connection of its own and names no host: it exists to refuse the cloud
	// metadata services at the moment of connecting, which a check on a URL
	// cannot do.
	"internal/web/util/outbound.go": "the protected dialer all outbound connections use",

	// A separate binary, run by the container to ask the server whether it is
	// alive. It dials its own port.
	"cmd/healthcheck/main.go": "the container health check, dialling this instance",
}

// outboundCalls reports the standard-library calls that open, or build
// something that can open, a connection.
func outboundCalls(file *ast.File) []string {
	var found []string

	ast.Inspect(file, func(n ast.Node) bool {
		selector, ok := n.(*ast.SelectorExpr)
		if !ok {
			return true
		}
		pkg, ok := selector.X.(*ast.Ident)
		if !ok {
			return true
		}

		name := pkg.Name + "." + selector.Sel.Name
		switch pkg.Name {
		case "http":
			switch selector.Sel.Name {
			case "Client", "DefaultClient", "Get", "Post", "PostForm", "Head", "NewRequest", "NewRequestWithContext":
				found = append(found, name)
			}
		case "net":
			if strings.HasPrefix(selector.Sel.Name, "Dial") {
				found = append(found, name)
			}
		}
		return true
	})

	sort.Strings(found)
	return found
}

// The list above is the whole mechanism, so it has to be exactly right: nothing
// missing from it, and nothing left in it that no longer belongs.
func TestOnlyTheListedFilesReachTheNetwork(t *testing.T) {
	root := filepath.Join("..", "..")

	reaching := map[string][]string{}
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		relative, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		relative = filepath.ToSlash(relative)

		if d.IsDir() {
			// By path, not by name: `web` at the top is the frontend, while
			// `internal/web` is most of the server — and skipping by name
			// skipped both, which made this test pass by finding nothing.
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
		if calls := outboundCalls(parsed); len(calls) > 0 {
			reaching[relative] = calls
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walking the tree: %v", err)
	}
	if len(reaching) == 0 {
		t.Fatal("found nothing that opens a connection; this test is reading the wrong tree")
	}

	for file, calls := range reaching {
		if _, allowed := mayReachTheNetwork[file]; !allowed {
			t.Errorf("\n%s opens a connection to the outside (%s) and is not on the list.\n\n"+
				"docs/security/overview.md promises that loading a dashboard tells no CDN\n"+
				"anything, that updates come from git.codigosh.com with nothing in between,\n"+
				"and that nothing is collected. If this call keeps all three true, add the\n"+
				"file to mayReachTheNetwork in this test with the reason. If it does not,\n"+
				"the page needs changing before the code does.",
				file, strings.Join(calls, ", "))
		}
	}

	for file := range mayReachTheNetwork {
		if _, still := reaching[file]; !still {
			t.Errorf("\n%s is on the list of files allowed to reach the network and no longer "+
				"opens a connection.\n\nDrop it: a list that keeps names nobody checks stops "+
				"being read.", file)
		}
	}
}

// The update path names exactly one host, and the security page says so: "The
// web installer and in-app update mechanism communicate directly with our
// self-hosted Forgejo instance (git.codigosh.com). There are no intermediaries
// or third-party services involved in the update path."
//
// update.go checks the host of an asset URL before downloading it, which is
// what makes that sentence true. This catches the other direction: a second
// host appearing in the file at all, which is how an intermediary would arrive
// — a mirror, a CDN in front of the releases, a status endpoint.
func TestTheUpdatePathNamesOneHost(t *testing.T) {
	source, err := os.ReadFile(filepath.Join("..", "web", "api", "update.go"))
	if err != nil {
		t.Fatal(err)
	}

	hosts := map[string]bool{}
	for _, match := range regexp.MustCompile(`https?://([a-zA-Z0-9.-]+)`).FindAllSubmatch(source, -1) {
		hosts[string(match[1])] = true
	}
	if len(hosts) == 0 {
		t.Fatal("no hosts found in update.go; this test is reading the wrong file")
	}

	for host := range hosts {
		if host != "git.codigosh.com" {
			t.Errorf("\nupdate.go names %q.\n\n"+
				"docs/security/overview.md says the update path involves no intermediaries\n"+
				"and no third-party services. Either that stopped being true, or the page\n"+
				"needs to say what else is involved.", host)
		}
	}
}

// Where the block on cloud metadata lives is the dialer, so every connection has
// to be made by it. This reads the source for the two ways around it: opening a
// connection (or building a dialer) by hand, and building a transport that does
// not say how to dial and so falls back to the standard one.
//
// cmd/healthcheck dials this instance's own port and has nothing to protect.
func TestEveryOutboundConnectionGoesThroughTheProtectedDialer(t *testing.T) {
	root := filepath.Join("..", "..")
	exempt := map[string]bool{
		"internal/web/util/outbound.go": true, // it is the dialer
		"cmd/healthcheck/main.go":       true,
	}

	files, transports := 0, 0
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
		if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") || exempt[relative] {
			return nil
		}
		parsed, err := parser.ParseFile(token.NewFileSet(), path, nil, 0)
		if err != nil {
			return err
		}
		files++
		ast.Inspect(parsed, func(n ast.Node) bool {
			switch x := n.(type) {
			case *ast.CallExpr:
				if sel, ok := x.Fun.(*ast.SelectorExpr); ok {
					if pkg, ok := sel.X.(*ast.Ident); ok && pkg.Name == "net" && strings.HasPrefix(sel.Sel.Name, "Dial") {
						t.Errorf("%s calls net.%s: connect through util.NewDialer, which refuses the metadata services", relative, sel.Sel.Name)
					}
				}
			case *ast.CompositeLit:
				sel, ok := x.Type.(*ast.SelectorExpr)
				if !ok {
					return true
				}
				pkg, ok := sel.X.(*ast.Ident)
				if !ok {
					return true
				}
				switch pkg.Name + "." + sel.Sel.Name {
				case "net.Dialer":
					t.Errorf("%s builds a net.Dialer: use util.NewDialer, which refuses the metadata services", relative)
				case "http.Client":
					// A client with no Transport uses the standard one and its
					// standard dialer. The update path is the one exception: it
					// only talks to the host it has checked, git.codigosh.com.
					if relative == "internal/web/api/update.go" {
						return true
					}
					hasTransport := false
					for _, el := range x.Elts {
						if kv, ok := el.(*ast.KeyValueExpr); ok {
							if key, ok := kv.Key.(*ast.Ident); ok && key.Name == "Transport" {
								hasTransport = true
							}
						}
					}
					if !hasTransport {
						t.Errorf("%s builds an http.Client with no Transport: it would use the standard dialer, which does not refuse the metadata services", relative)
					}
				case "http.Transport":
					transports++
					has := false
					for _, el := range x.Elts {
						if kv, ok := el.(*ast.KeyValueExpr); ok {
							if key, ok := kv.Key.(*ast.Ident); ok && key.Name == "DialContext" {
								has = true
							}
						}
					}
					if !has {
						t.Errorf("%s builds an http.Transport without DialContext: it would use the standard dialer, which does not refuse the metadata services", relative)
					}
				}
			}
			return true
		})
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if files < 20 || transports < 4 {
		t.Fatalf("read %d files and found %d transports: this test is reading the wrong tree", files, transports)
	}
}
