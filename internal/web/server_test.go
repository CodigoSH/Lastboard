package web

import (
	"context"
	htmltemplate "html/template"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
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

	file, err := os.CreateTemp(t.TempDir(), "demo_*.db")
	if err != nil {
		t.Fatal(err)
	}
	file.Close()

	db, err := database.InitDB(file.Name())
	if err != nil {
		t.Fatalf("init db: %v", err)
	}
	defer db.Close()

	server := NewServer(db.DB)

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
	file, err := os.CreateTemp(t.TempDir(), "index_*.db")
	if err != nil {
		t.Fatal(err)
	}
	file.Close()

	db, err := database.InitDB(file.Name())
	if err != nil {
		t.Fatalf("init db: %v", err)
	}
	defer db.Close()

	server := NewServer(db.DB)

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
