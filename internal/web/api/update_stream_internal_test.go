package api

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// runUpdate reports one event per step, and the UI draws its timeline from that
// sequence — so the order of the steps and the i18n key each failure carries are
// a contract, not an implementation detail. These tests pin the reachable part
// of it: everything up to the signature gate. Past that point an update needs an
// archive signed with the private release key, which by design does not exist
// here, and the remaining steps would swap the running binary.

// collect runs an update against a fake release server and returns the events as
// "step:status" strings, plus the failing event.
func collect(t *testing.T, assetURL string) ([]string, *UpdateEvent) {
	t.Helper()
	parsed, err := url.Parse(assetURL)
	if err != nil {
		t.Fatalf("parse asset url: %v", err)
	}
	h := NewUpdateHandler(nil)

	var seen []string
	_, failure := h.runUpdate(assetURL, parsed, func(ev UpdateEvent) {
		seen = append(seen, ev.Step+":"+ev.Status)
	})
	return seen, failure
}

// releaseServer serves the files of a fake release. A path mapped to an empty
// body is answered with 404 so a test can make one specific file go missing.
func releaseServer(t *testing.T, files map[string]string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, ok := files[r.URL.Path]
		if !ok || body == "" {
			http.NotFound(w, r)
			return
		}
		w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestRunUpdate_ReportsDownloadFailureOnMissingArchive(t *testing.T) {
	srv := releaseServer(t, map[string]string{})

	seen, failure := collect(t, srv.URL+"/releases/download/v9.9.9/lastboard.tar.gz")

	if want := []string{"download:running", "download:error"}; !equal(seen, want) {
		t.Errorf("events = %v, want %v", seen, want)
	}
	if failure == nil || failure.Error != "notifier.update_download_failed" {
		t.Errorf("failure = %+v, want notifier.update_download_failed", failure)
	}
}

// checksums.txt is fetched inside the download step, so losing it fails there
// rather than in a later one — otherwise the timeline would blame verification
// for a network problem.
func TestRunUpdate_MissingChecksumsFailsTheDownloadStep(t *testing.T) {
	srv := releaseServer(t, map[string]string{
		"/releases/download/v9.9.9/lastboard.tar.gz": "not-a-real-archive",
	})

	seen, failure := collect(t, srv.URL+"/releases/download/v9.9.9/lastboard.tar.gz")

	if want := []string{"download:running", "download:error"}; !equal(seen, want) {
		t.Errorf("events = %v, want %v", seen, want)
	}
	if failure == nil || failure.Step != StepDownload {
		t.Errorf("failure step = %+v, want %s", failure, StepDownload)
	}
}

// With both downloads in place the run reaches the signature gate. This build
// embeds a release public key, so an unsigned release must be refused there and
// never reach checksum verification or the binary swap.
func TestRunUpdate_RefusesAnUnsignedRelease(t *testing.T) {
	srv := releaseServer(t, map[string]string{
		"/releases/download/v9.9.9/lastboard.tar.gz": "not-a-real-archive",
		"/releases/download/v9.9.9/checksums.txt":    "0000  lastboard.tar.gz\n",
	})

	seen, failure := collect(t, srv.URL+"/releases/download/v9.9.9/lastboard.tar.gz")

	want := []string{"download:running", "download:ok", "signature:running", "signature:error"}
	if !equal(seen, want) {
		t.Errorf("events = %v, want %v", seen, want)
	}
	if failure == nil || failure.Error != "notifier.update_signature_failed" {
		t.Errorf("failure = %+v, want notifier.update_signature_failed", failure)
	}
}

func TestRunUpdate_RefusesAnInvalidSignature(t *testing.T) {
	srv := releaseServer(t, map[string]string{
		"/releases/download/v9.9.9/lastboard.tar.gz":  "not-a-real-archive",
		"/releases/download/v9.9.9/checksums.txt":     "0000  lastboard.tar.gz\n",
		"/releases/download/v9.9.9/checksums.txt.sig": "bm90LWEtc2lnbmF0dXJl",
	})

	seen, failure := collect(t, srv.URL+"/releases/download/v9.9.9/lastboard.tar.gz")

	if len(seen) == 0 || !strings.HasSuffix(seen[len(seen)-1], ":error") {
		t.Fatalf("expected the run to end in an error, got %v", seen)
	}
	if failure == nil || failure.Step != StepSignature {
		t.Errorf("failure = %+v, want a %s failure", failure, StepSignature)
	}
}

func equal(got, want []string) bool {
	if len(got) != len(want) {
		return false
	}
	for i := range got {
		if got[i] != want[i] {
			return false
		}
	}
	return true
}
