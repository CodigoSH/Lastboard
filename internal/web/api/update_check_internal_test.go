package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// TestAFailedCheckIsNotUpToDate.
//
// A release server that could not be asked used to be answered exactly like
// one that had nothing newer — available false, latest equal to current — and
// the panel told the operator "You're up to date". The answer now says the
// check failed, and a check that worked says nothing of the kind.
func TestAFailedCheckIsNotUpToDate(t *testing.T) {
	check := func(latest func(bool) (string, string, error)) UpdateResponse {
		h := &UpdateHandler{latest: latest, docker: func() bool { return false }}
		rec := httptest.NewRecorder()
		h.CheckUpdate(rec, httptest.NewRequest(http.MethodGet, "/api/system/update/check?beta=true", nil))
		var out UpdateResponse
		if err := json.NewDecoder(rec.Body).Decode(&out); err != nil {
			t.Fatal(err)
		}
		return out
	}

	failed := check(func(bool) (string, string, error) { return "", "", errors.New("no route to host") })
	if failed.CheckError != "settings.update_check_failed" || failed.Available {
		t.Errorf("a check that could not reach the forge answered %+v", failed)
	}

	reached := check(func(bool) (string, string, error) { return "v0.0.1", "", nil })
	if reached.CheckError != "" {
		t.Errorf("a check that reached the forge reported %q", reached.CheckError)
	}
}

// A person pressing "Check for updates" wants to know now, not what the server
// remembered a few minutes ago. The ordinary lookups share one answer for ten
// minutes; the press asks the release server again — though pressing it over and
// over does not hammer the forge: within a few seconds of the last forced lookup
// the answer it brought is reused.
func TestPressingCheckForUpdatesAsksTheForgeAgain(t *testing.T) {
	tag := "v9.0.0-Beta.01"
	asked := 0
	forge := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		asked++
		json.NewEncoder(w).Encode([]map[string]string{{"tag_name": tag, "body": "notes"}})
	}))
	defer forge.Close()

	oldBase := releaseAPIBase
	releaseAPIBase = forge.URL
	releaseCacheMu.Lock()
	releaseCache = map[bool]cachedRelease{}
	releaseForced = map[bool]time.Time{}
	releaseCacheMu.Unlock()
	defer func() {
		releaseAPIBase = oldBase
		releaseCacheMu.Lock()
		releaseCache = map[bool]cachedRelease{}
		releaseForced = map[bool]time.Time{}
		releaseCacheMu.Unlock()
	}()

	h := &UpdateHandler{docker: func() bool { return false }}
	latest := func(query string) string {
		rec := httptest.NewRecorder()
		h.CheckUpdate(rec, httptest.NewRequest(http.MethodGet, "/api/system/update/check?"+query, nil))
		var out UpdateResponse
		if err := json.NewDecoder(rec.Body).Decode(&out); err != nil {
			t.Fatal(err)
		}
		return out.LatestVersion
	}

	if got := latest("beta=true"); got != "v9.0.0-Beta.01" {
		t.Fatalf("first lookup: %q", got)
	}
	tag = "v9.0.0-Beta.02" // published after the server last asked

	if got := latest("beta=true"); got != "v9.0.0-Beta.01" || asked != 1 {
		t.Errorf("an ordinary lookup should reuse the answer: got %q after %d requests", got, asked)
	}
	if got := latest("beta=true&fresh=1"); got != "v9.0.0-Beta.02" || asked != 2 {
		t.Errorf("the press should ask again: got %q after %d requests", got, asked)
	}
	// What the press found is what everybody gets from then on.
	if got := latest("beta=true"); got != "v9.0.0-Beta.02" || asked != 2 {
		t.Errorf("an ordinary lookup after the press: got %q after %d requests", got, asked)
	}
	// Pressing again straight away reuses it instead of asking the forge again.
	if got := latest("beta=true&fresh=1"); got != "v9.0.0-Beta.02" || asked != 2 {
		t.Errorf("a second press within seconds: got %q after %d requests, want no new request", got, asked)
	}
}
