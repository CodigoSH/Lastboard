package web

import (
	"context"
	"os"
	"regexp"
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
