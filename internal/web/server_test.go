package web

import (
	"context"
	htmltemplate "html/template"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	_ "modernc.org/sqlite"
)

// These loops used to be launched with a bare `go` and never waited for, so a
// restart could land in the middle of one — the icon migration and the monitor
// scheduler both write to the database. Shutdown now waits for them, which is
// only worth anything if every one of them actually stops when asked.
//
// A loop that ignores the cancellation makes this test time out rather than
// fail quietly at three in the morning on somebody's docker restart.
func TestBackgroundTasksStopWhenTheContextIsCancelled(t *testing.T) {
	file, err := os.CreateTemp(t.TempDir(), "shutdown_*.db")
	if err != nil {
		t.Fatal(err)
	}
	file.Close()

	db, err := database.InitDB(file.Name())
	if err != nil {
		t.Fatalf("init db: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithCancel(context.Background())
	server := NewServer(db.DB)

	var background sync.WaitGroup
	server.StartBackground(ctx, &background)

	// Let them reach their waiting points before pulling the rug.
	time.Sleep(50 * time.Millisecond)
	cancel()

	stopped := make(chan struct{})
	go func() {
		background.Wait()
		close(stopped)
	}()

	select {
	case <-stopped:
	case <-time.After(5 * time.Second):
		t.Fatal("a background task did not return within 5s of cancellation; " +
			"shutdown would hang on it, or give up and cut it off mid-write")
	}
}

func TestDirectionOf(t *testing.T) {
	cases := map[string]string{
		"ar": "rtl", "fa": "rtl", "ur": "rtl", "he": "rtl",
		"en": "ltr", "es": "ltr", "ja": "ltr", "": "ltr",
		// Region subtags and case must not change the answer.
		"ar-EG": "rtl", "AR": "rtl", "en-GB": "ltr",
	}
	for language, want := range cases {
		if got := directionOf(language); got != want {
			t.Errorf("directionOf(%q) = %q, want %q", language, got, want)
		}
	}
}

// The server decides the direction for the first paint and the frontend decides
// it again whenever the language changes. Two lists, and a language added to
// one and forgotten in the other would show up as a page that loads
// right-to-left and then flips, or the reverse — the kind of thing nobody
// notices until an Arabic-speaking user reports it.
func TestBothDirectionListsAgree(t *testing.T) {
	source, err := os.ReadFile("../../web/src/services/i18n.helpers.ts")
	if err != nil {
		t.Skipf("frontend sources not available: %v", err)
	}

	match := regexp.MustCompile(`rightToLeft = new Set\(\[([^\]]*)\]\)`).FindSubmatch(source)
	if match == nil {
		t.Fatal("could not find the rightToLeft set in i18n.helpers.ts; if it was renamed, this test needs updating")
	}

	frontend := map[string]bool{}
	for _, quoted := range regexp.MustCompile(`'([a-z-]+)'`).FindAllSubmatch(match[1], -1) {
		frontend[string(quoted[1])] = true
	}
	if len(frontend) == 0 {
		t.Fatal("parsed no languages out of the frontend list")
	}

	for language := range frontend {
		if directionOf(language) != "rtl" {
			t.Errorf("the frontend treats %q as right-to-left and the server does not", language)
		}
	}
	for _, language := range []string{"ar", "fa", "ur", "he"} {
		if !frontend[language] {
			t.Errorf("the server treats %q as right-to-left and the frontend does not", language)
		}
	}
}

// newTestServer returns a server on an empty database. Pass withUser when the
// page under test is one that only exists once somebody has an account: /login
// redirects to /setup on a fresh install, and /setup redirects to /login once
// it is done, so a test that ignores this asserts against a redirect body.
func newTestServer(t *testing.T, withUser bool) *Server {
	t.Helper()

	file, err := os.CreateTemp(t.TempDir(), "server_*.db")
	if err != nil {
		t.Fatal(err)
	}
	file.Close()

	db, err := database.InitDB(file.Name())
	if err != nil {
		t.Fatalf("init db: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	if withUser {
		if _, err := db.DB.Exec(
			"INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')",
			"probe", "not-a-real-hash",
		); err != nil {
			t.Fatalf("seed user: %v", err)
		}
	}

	return NewServer(db.DB)
}

// The demo page is the one index.html render nobody is logged in for, so it is
// also the one no manual pass ever opens. When index.html grew `lang` and `dir`
// the dashboard handler was updated and the demo one was not, and because a
// missing field is a template *execution* error the page died mid-tag: 28 bytes
// of HTML, status 200 already on the wire, and a blank screen. Shipped in two
// releases before anyone hit it.
//
// Rendering it end to end is what catches that class of mistake — the error
// only exists at execution, so nothing short of executing it will do.
func TestDemoPageRendersCompletely(t *testing.T) {
	t.Setenv("DEMO_ONLY", "true")

	server := newTestServer(t, false)

	rec := httptest.NewRecorder()
	server.Router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/demo", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /demo = %d, want 200", rec.Code)
	}

	body := rec.Body.String()
	for _, want := range []string{`lang="en"`, `dir="ltr"`, "<app-topbar", "</html>"} {
		if !strings.Contains(body, want) {
			t.Errorf("demo page is missing %q — it stopped at %d bytes:\n%s",
				want, len(body), body)
		}
	}
}

// Every field index.html asks for has to exist on the value it is rendered
// with, in both of its shapes. Adding a `{{.Whatever}}` to the template without
// a field to match it takes the page down at request time and at no other
// moment: it compiles, it parses, and it only fails once someone loads it.
func TestIndexTemplateRendersWithBothPageShapes(t *testing.T) {
	server := newTestServer(t, false)

	tmpl, err := htmltemplate.ParseFS(server.assets, "index.html")
	if err != nil {
		t.Fatalf("parse index.html: %v", err)
	}

	cases := map[string]indexPageData{
		"dashboard": newIndexPageData("Lastboard", "dark-mode", "es", false, "test-nonce"),
		"demo":      newIndexPageData("Lastboard", "dark-mode", "", true, "test-nonce"),
		"rtl":       newIndexPageData("Lastboard", "", "ar", false, "test-nonce"),
	}

	for name, data := range cases {
		t.Run(name, func(t *testing.T) {
			var out strings.Builder
			if err := tmpl.Execute(&out, data); err != nil {
				t.Fatalf("index.html does not render for the %s page: %v", name, err)
			}
			if !strings.Contains(out.String(), "</html>") {
				t.Errorf("%s page stopped early, at %d bytes", name, out.Len())
			}
		})
	}
}

// The login and setup pages are painted before anyone has logged in, so the
// stored language the frontend reads is not available to the server: without
// this, every visitor was served a page claiming to be in English, and Arabic,
// Persian and Urdu got a left-to-right first paint before the bundle flipped it.
func TestPreferredLanguage(t *testing.T) {
	available := []string{"ar", "de", "en", "es", "fr", "ja"}

	cases := map[string]string{
		"":                        "en",
		"es":                      "es",
		"es-ES":                   "es", // a region matches on its base
		"ES-es":                   "es", // and case does not matter
		"ar-EG,ar;q=0.9":          "ar", // right-to-left resolves too
		"pt-BR,pt;q=0.9,en;q=0.8": "en", // first shipped one down the list
		"nl,fi":                   "en", // nothing shipped: English
		"en;q=0.4,de;q=0.9":       "de", // quality wins over order
		"de;q=0,es":               "es", // q=0 means "not acceptable"
		"*":                       "en", // a wildcard names no language
		"fr;q=nonsense,ja":        "ja", // an unparseable q is skipped
		"  es-ES , en ":           "es", // whitespace around the tags
	}

	for header, want := range cases {
		if got := preferredLanguage(header, available); got != want {
			t.Errorf("preferredLanguage(%q) = %q, want %q", header, got, want)
		}
	}
}

// The list of shipped languages is read from the locale files rather than
// written out again, so it cannot drift from what actually ships.
func TestShippedLocalesMatchTheLocaleFiles(t *testing.T) {
	server := newTestServer(t, false)

	if len(server.locales) < 20 {
		t.Errorf("only %d locales found (%v); twenty ship with the app",
			len(server.locales), server.locales)
	}
	for _, want := range []string{"en", "es", "ar", "fa", "ur", "zh"} {
		if !slices.Contains(server.locales, want) {
			t.Errorf("%q is missing from the shipped locales: %v", want, server.locales)
		}
	}
	// Every right-to-left language the server knows about has to be one it ships,
	// or the direction list is describing something that is not there.
	for _, code := range server.locales {
		if directionOf(code) == "rtl" && !slices.Contains([]string{"ar", "fa", "ur", "he"}, code) {
			t.Errorf("%q reports rtl but is not in the direction list", code)
		}
	}
}

// Both pre-auth pages render, and they say what language they are in. They have
// their own handlers and their own data, so neither is covered by the tests for
// the dashboard: this is the same shape of mistake that blanked the demo page.
func TestPreAuthPagesDeclareTheirLanguage(t *testing.T) {
	// /login only renders once an account exists; /setup only before that.
	for page, withUser := range map[string]bool{"/login": true, "/setup": false} {
		t.Run(page, func(t *testing.T) {
			server := newTestServer(t, withUser)

			request := httptest.NewRequest(http.MethodGet, page, nil)
			request.Header.Set("Accept-Language", "ar-EG,ar;q=0.9,en;q=0.5")
			rec := httptest.NewRecorder()
			server.Router.ServeHTTP(rec, request)

			if rec.Code != http.StatusOK {
				t.Fatalf("GET %s = %d, want 200", page, rec.Code)
			}
			body := rec.Body.String()
			for _, want := range []string{`lang="ar"`, `dir="rtl"`, "</html>"} {
				if !strings.Contains(body, want) {
					t.Errorf("%s is missing %q (%d bytes)", page, want, len(body))
				}
			}
		})
	}
}

// An installed app that opens without a session lands on the login page, so the
// status bar takes its colour from there. There is no account row to read yet,
// but the visitor's own cookie says which theme they last used.
func TestPreAuthPagesDeclareTheThemeColour(t *testing.T) {
	for _, tc := range []struct {
		cookie string
		want   string
	}{
		{"dark", panelDark},
		{"light", panelLight},
		{"", panelDark},         // first visit: the default everywhere else
		{"nonsense", panelDark}, // anything unrecognised is not light
	} {
		name := tc.cookie
		if name == "" {
			name = "(no cookie)"
		}
		t.Run(name, func(t *testing.T) {
			for page, withUser := range map[string]bool{"/login": true, "/setup": false} {
				server := newTestServer(t, withUser)
				request := httptest.NewRequest(http.MethodGet, page, nil)
				if tc.cookie != "" {
					request.AddCookie(&http.Cookie{Name: "lastboard_theme", Value: tc.cookie})
				}
				rec := httptest.NewRecorder()
				server.Router.ServeHTTP(rec, request)

				if rec.Code != http.StatusOK {
					t.Fatalf("GET %s = %d, want 200", page, rec.Code)
				}
				want := `content="` + tc.want + `"`
				if !strings.Contains(rec.Body.String(), want) {
					t.Errorf("%s with theme cookie %q does not declare %s", page, tc.cookie, want)
				}
			}
		})
	}
}

// The login page is where someone installs Lastboard from on a phone, because
// that is the page they land on with no session. Without the manifest linked
// there, the browser has nothing to install and falls back to a bookmark.
func TestLoginPageLinksTheManifest(t *testing.T) {
	server := newTestServer(t, true)

	rec := httptest.NewRecorder()
	server.Router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/login", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /login = %d, want 200", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), `rel="manifest"`) {
		t.Error("the login page does not link the web app manifest")
	}
}

// The colour the status bar wears is written down in three places: these Go
// constants, the PANEL record in ThemeService.ts, and --panel in theme.css.
// Three hand-written copies of one fact drift, and the failure is quiet — an
// installed app with a strip above its top bar in a colour that bar stopped
// using. This holds all three to each other.
func TestPanelColoursMatchTheStylesheetAndTheFrontend(t *testing.T) {
	stylesheet, err := os.ReadFile("../../web/styles/theme.css")
	if err != nil {
		t.Skipf("frontend sources not available: %v", err)
	}

	// The first --panel inside each block. `[^}]` keeps the match from running
	// past the end of its rule; these blocks are plain declarations.
	panelIn := func(selector string) string {
		re := regexp.MustCompile(`(?s)` + selector + `\s*\{[^}]*?--panel:\s*(#[0-9a-fA-F]{3,8})`)
		m := re.FindSubmatch(stylesheet)
		if m == nil {
			t.Fatalf("could not find --panel under %s in theme.css; if it was renamed, this test needs updating", selector)
		}
		return strings.ToLower(string(m[1]))
	}

	if got := panelIn(`\.dark-mode`); got != panelDark {
		t.Errorf("the dark theme paints its panel %s, the server declares %s", got, panelDark)
	}
	if got := panelIn(`:root`); got != panelLight {
		t.Errorf("the light theme paints its panel %s, the server declares %s", got, panelLight)
	}

	service, err := os.ReadFile("../../web/src/services/ThemeService.ts")
	if err != nil {
		t.Skipf("frontend sources not available: %v", err)
	}
	for theme, want := range map[string]string{"dark": panelDark, "light": panelLight} {
		re := regexp.MustCompile(theme + `:\s*'(#[0-9a-fA-F]{3,8})'`)
		m := re.FindSubmatch(service)
		if m == nil {
			t.Errorf("ThemeService.ts declares no panel colour for the %s theme", theme)
			continue
		}
		if got := strings.ToLower(string(m[1])); got != want {
			t.Errorf("ThemeService.ts uses %s for the %s theme, the server declares %s", got, theme, want)
		}
	}
}

// The theme travels as a choice, and three things have to follow from it at
// once: the class the page is served with, the colour the status bar takes, and
// whether the page needs the scrap of script that asks the device. They are
// built in one place so none can be set without the others.
func TestThemeChoiceDecidesClassColourAndWhoAsksTheDevice(t *testing.T) {
	for theme, want := range map[string]struct {
		class         string
		colour        string
		followsSystem bool
	}{
		"dark":  {"dark-mode", panelDark, false},
		"light": {"", panelLight, false},
		// Served dark because that is the default everywhere; a device that
		// disagrees is corrected before the stylesheet is parsed.
		"system": {"dark-mode", panelDark, true},
		// A row from before any of this existed, or one written by hand.
		"":         {"dark-mode", panelDark, false},
		"nonsense": {"dark-mode", panelDark, false},
	} {
		name := theme
		if name == "" {
			name = "(empty)"
		}
		t.Run(name, func(t *testing.T) {
			data := newIndexPageData("Lastboard", theme, "en", false, "n")
			if data.ThemeClass != want.class {
				t.Errorf("class %q, want %q", data.ThemeClass, want.class)
			}
			if data.ThemeColor != want.colour {
				t.Errorf("colour %q, want %q", data.ThemeColor, want.colour)
			}
			if data.FollowsSystem != want.followsSystem {
				t.Errorf("FollowsSystem %v, want %v", data.FollowsSystem, want.followsSystem)
			}
		})
	}
}

// Only the page that asked for it carries the script, and it has to come before
// the stylesheet or it corrects a page that has already painted — which is the
// flash the server-side stamping exists to avoid.
func TestTheSystemThemeScriptShipsOnlyWhenNeededAndEarlyEnough(t *testing.T) {
	server := newTestServer(t, false)

	page, err := htmltemplate.ParseFS(server.assets, "index.html")
	if err != nil {
		t.Fatalf("parse index.html: %v", err)
	}

	render := func(theme string) string {
		var out strings.Builder
		if err := page.Execute(&out, newIndexPageData("Lastboard", theme, "en", false, "n")); err != nil {
			t.Fatalf("render %s: %v", theme, err)
		}
		return out.String()
	}

	for _, theme := range []string{"dark", "light"} {
		if strings.Contains(render(theme), "prefers-color-scheme") {
			t.Errorf("the %s page asks the device about a theme it was told outright", theme)
		}
	}

	system := render("system")
	script := strings.Index(system, "prefers-color-scheme")
	if script < 0 {
		t.Fatal("the system page does not ask the device anything")
	}
	stylesheet := strings.Index(system, `rel="stylesheet"`)
	if stylesheet < 0 {
		t.Fatal("no stylesheet in index.html; this test is reading the wrong thing")
	}
	if script > stylesheet {
		t.Error("the theme is settled after the stylesheet is linked, so the page paints once in the wrong one first")
	}
}
