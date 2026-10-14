package api

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"
)

// A server whose archive download waits until the test lets it go, so a test can
// look at the machine while an update is mid-download. Every other path answers
// 404, which ends the run at the download step: nothing is ever installed.
func stalledRelease(t *testing.T) (assetURL *url.URL, started <-chan struct{}, release func()) {
	t.Helper()
	hold := make(chan struct{})
	began := make(chan struct{}, 8)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "release.tar.gz") {
			began <- struct{}{}
			<-hold
		}
		http.NotFound(w, r)
	}))
	var once bool
	release = func() {
		if !once {
			once = true
			close(hold)
		}
	}
	t.Cleanup(func() { release(); srv.Close() })
	u, _ := url.Parse(srv.URL + "/CodigoSH/Lastboard/releases/download/v9/release.tar.gz")
	return u, began, release
}

func runAsync(h *UpdateHandler, u *url.URL) <-chan *UpdateEvent {
	done := make(chan *UpdateEvent, 1)
	go func() {
		_, failure := h.runUpdate(u.String(), u, func(UpdateEvent) {})
		done <- failure
	}()
	return done
}

func waitFor(t *testing.T, ch <-chan struct{}, what string) {
	t.Helper()
	select {
	case <-ch:
	case <-time.After(5 * time.Second):
		t.Fatalf("timed out waiting for %s", what)
	}
}

// Fixed names in the shared temp directory let two runs overwrite each other's
// download. Everything a run writes belongs in a directory of its own, and the
// directory goes away with the run.
func TestAnUpdateKeepsItsFilesInADirectoryOfItsOwn(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("TMPDIR", tmp)
	u, started, release := stalledRelease(t)

	done := runAsync(&UpdateHandler{}, u)
	waitFor(t, started, "the download to start")

	entries, err := os.ReadDir(tmp)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 || !entries[0].IsDir() || !strings.HasPrefix(entries[0].Name(), "lastboard-update-") {
		names := []string{}
		for _, e := range entries {
			names = append(names, e.Name())
		}
		t.Fatalf("an update running should leave one lastboard-update-* directory in the temp dir, found %v", names)
	}

	release()
	if failure := <-done; failure == nil {
		t.Fatal("the run against a server with no checksums should have failed")
	}
	if left, _ := os.ReadDir(tmp); len(left) != 0 {
		t.Errorf("the run left %d entries behind", len(left))
	}
}

// Two updates at once would both replace the same binary. The second is refused
// while the first runs, and a run that ends — failed or not — frees the way.
func TestASecondUpdateIsRefusedWhileOneRuns(t *testing.T) {
	t.Setenv("TMPDIR", t.TempDir())
	u, started, release := stalledRelease(t)
	h := &UpdateHandler{}

	first := runAsync(h, u)
	waitFor(t, started, "the first download to start")

	select {
	case failure := <-runAsync(h, u):
		if failure == nil || failure.Error != "notifier.update_in_progress" {
			t.Fatalf("the second run answered %+v, want notifier.update_in_progress", failure)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("the second run did not return: two updates are running at the same time")
	}

	release()
	<-first

	next := runAsync(h, u)
	select {
	case failure := <-next:
		if failure != nil && failure.Error == "notifier.update_in_progress" {
			t.Fatal("the lock was not released when the first run ended")
		}
	case <-time.After(5 * time.Second):
		t.Fatal("the run after the first did not return")
	}
}
