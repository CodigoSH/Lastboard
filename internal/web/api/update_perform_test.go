package api_test

import (
	"net/http"
	"strings"
	"testing"
)

// Characterization tests for PerformUpdate's authorization and validation
// guards. The actual download/extract/swap path performs real network and
// filesystem I/O plus a process re-exec, so it is intentionally NOT exercised
// here — only the early guards that reject a request before any side effect.

func postPerform(t *testing.T, serverURL string, s *userSession, body string) int {
	t.Helper()
	return postPerformWithAccept(t, serverURL, s, body, "")
}

func postPerformWithAccept(t *testing.T, serverURL string, s *userSession, body, accept string) int {
	t.Helper()
	req, _ := http.NewRequest("POST", serverURL+"/api/system/update/perform", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if accept != "" {
		req.Header.Set("Accept", accept)
	}
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	return resp.StatusCode
}

func TestPerformUpdate_RegularUserForbidden(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	createUser(t, db.DB, "bob", "password", "user")
	s := doLogin(t, server.URL, "bob", "password")

	if code := postPerform(t, server.URL, s, `{"asset_url":"https://git.codigosh.com/CodigoSH/Lastboard/releases/x"}`); code != http.StatusForbidden {
		t.Errorf("expected 403 for regular user, got %d", code)
	}
}

// Only the first admin (lowest-ID admin) may trigger an update; a second admin
// is rejected with 403.
func TestPerformUpdate_SecondAdminForbidden(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "first", "password", "admin")
	createUser(t, db.DB, "second", "password", "admin")
	s := doLogin(t, server.URL, "second", "password")

	if code := postPerform(t, server.URL, s, `{"asset_url":"https://git.codigosh.com/CodigoSH/Lastboard/releases/x"}`); code != http.StatusForbidden {
		t.Errorf("expected 403 for second admin, got %d", code)
	}
}

// The first admin passes authorization; an asset URL pointing at any host other
// than git.codigosh.com is rejected with 400 before any download happens. This
// guards against SSRF / arbitrary-binary injection through the updater.
func TestPerformUpdate_RejectsForeignAssetHost(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	s := doLogin(t, server.URL, "admin", "password")

	if code := postPerform(t, server.URL, s, `{"asset_url":"https://evil.example.com/CodigoSH/Lastboard/releases/x"}`); code != http.StatusBadRequest {
		t.Errorf("expected 400 for foreign host, got %d", code)
	}
}

// A correct host but a path outside the releases namespace is also rejected.
func TestPerformUpdate_RejectsNonReleasePath(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	s := doLogin(t, server.URL, "admin", "password")

	if code := postPerform(t, server.URL, s, `{"asset_url":"https://git.codigosh.com/CodigoSH/Lastboard/raw/branch/main/install.sh"}`); code != http.StatusBadRequest {
		t.Errorf("expected 400 for non-release path, got %d", code)
	}
}

// A streaming client still gets a plain HTTP error for anything rejected before
// the update starts. Once the stream opens the status line is already 200, so
// swallowing an authorization failure into an event would hide it behind a
// successful-looking response.
func TestPerformUpdate_PreflightErrorsStayHTTPWhenStreaming(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	createUser(t, db.DB, "bob", "password", "user")
	s := doLogin(t, server.URL, "bob", "password")

	code := postPerformWithAccept(t, server.URL, s,
		`{"asset_url":"https://git.codigosh.com/CodigoSH/Lastboard/releases/x"}`, "text/event-stream")
	if code != http.StatusForbidden {
		t.Errorf("expected 403 for regular user asking for the stream, got %d", code)
	}
}

// Same for a rejected asset URL: 400, not a 200 stream carrying an error event.
func TestPerformUpdate_InvalidURLStaysHTTPWhenStreaming(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	s := doLogin(t, server.URL, "admin", "password")

	code := postPerformWithAccept(t, server.URL, s,
		`{"asset_url":"https://evil.example.com/x"}`, "text/event-stream")
	if code != http.StatusBadRequest {
		t.Errorf("expected 400 for foreign host asking for the stream, got %d", code)
	}
}
