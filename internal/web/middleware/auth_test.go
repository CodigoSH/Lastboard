package middleware

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
	_ "modernc.org/sqlite"
)

func newAuthTestDB(t *testing.T) (*sql.DB, []byte) {
	t.Helper()
	db, err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("init db: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	secret := []byte("test_secret_key_12345678901234567890123456789012")
	return db.DB, secret
}

// okHandler records that the protected handler was reached and echoes the
// resolved identity from the context.
func okHandler(reached *bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		*reached = true
		w.WriteHeader(http.StatusOK)
		_ = GetUserFromContext(r)
	})
}

// This middleware used to carry its own list of public paths, and this test
// asserted the list worked. The list was the problem: everything under /dist/
// and /styles/ passed, including paths with no file behind them, which fall
// back to the application shell — so asking for an asset that did not exist
// served the page to a caller with no session.
//
// Public is now decided where a route is registered, by not wrapping it in this
// middleware. Nothing reaches here and gets waved through.
func TestAuthRequired_HasNoListOfPublicPaths(t *testing.T) {
	db, secret := newAuthTestDB(t)
	paths := []string{
		"/login", "/setup", "/api/login", "/api/setup",
		"/dist/app.js", "/styles/x.css",
		// The ones that used to serve the shell to anyone who asked.
		"/dist/there-is-no-such-file.js", "/styles/nor-this-one.css",
	}
	for _, path := range paths {
		reached := false
		h := AuthRequired(db, secret)(okHandler(&reached))
		req := httptest.NewRequest(http.MethodGet, path, nil)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)
		if reached {
			t.Errorf("%s reached the handler with no session; this middleware must not "+
				"exempt anything by path", path)
		}
	}
}

func TestAuthRequired_NoCookie(t *testing.T) {
	db, secret := newAuthTestDB(t)

	// API path → 401
	reached := false
	h := AuthRequired(db, secret)(okHandler(&reached))
	req := httptest.NewRequest(http.MethodGet, "/api/dashboard/items", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if reached || w.Code != http.StatusUnauthorized {
		t.Fatalf("API without cookie: want 401 and no handler, got %d reached=%v", w.Code, reached)
	}

	// Page path → redirect to /login
	reached = false
	req = httptest.NewRequest(http.MethodGet, "/", nil)
	w = httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if reached || w.Code != http.StatusFound {
		t.Fatalf("page without cookie: want 302 redirect, got %d reached=%v", w.Code, reached)
	}
}

func TestAuthRequired_InvalidToken(t *testing.T) {
	db, secret := newAuthTestDB(t)
	reached := false
	h := AuthRequired(db, secret)(okHandler(&reached))
	req := httptest.NewRequest(http.MethodGet, "/api/dashboard/items", nil)
	req.AddCookie(&http.Cookie{Name: "session_token", Value: "garbage.token"})
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if reached || w.Code != http.StatusUnauthorized {
		t.Fatalf("invalid token: want 401, got %d reached=%v", w.Code, reached)
	}
}

func TestAuthRequired_DeletedUser(t *testing.T) {
	db, secret := newAuthTestDB(t)
	// Valid token for a user that does not exist in the DB.
	token := util.SignToken("ghost", secret, time.Now().Add(time.Hour))
	reached := false
	h := AuthRequired(db, secret)(okHandler(&reached))
	req := httptest.NewRequest(http.MethodGet, "/api/dashboard/items", nil)
	req.AddCookie(&http.Cookie{Name: "session_token", Value: token})
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if reached || w.Code != http.StatusUnauthorized {
		t.Fatalf("deleted user: want 401, got %d reached=%v", w.Code, reached)
	}
}

func TestAuthRequired_ValidGET(t *testing.T) {
	db, secret := newAuthTestDB(t)
	if _, err := db.Exec("INSERT INTO users (username, password, role) VALUES ('alice','x','admin')"); err != nil {
		t.Fatal(err)
	}
	token := util.SignToken("alice", secret, time.Now().Add(time.Hour))
	reached := false
	h := AuthRequired(db, secret)(okHandler(&reached))
	req := httptest.NewRequest(http.MethodGet, "/api/dashboard/items", nil)
	req.AddCookie(&http.Cookie{Name: "session_token", Value: token})
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if !reached || w.Code != http.StatusOK {
		t.Fatalf("valid GET: want 200 and handler reached, got %d reached=%v", w.Code, reached)
	}
}

func TestAuthRequired_CSRF(t *testing.T) {
	db, secret := newAuthTestDB(t)
	if _, err := db.Exec("INSERT INTO users (username, password, role) VALUES ('alice','x','admin')"); err != nil {
		t.Fatal(err)
	}
	token := util.SignToken("alice", secret, time.Now().Add(time.Hour))

	// POST without CSRF header → 403
	reached := false
	h := AuthRequired(db, secret)(okHandler(&reached))
	req := httptest.NewRequest(http.MethodPost, "/api/dashboard/item", nil)
	req.AddCookie(&http.Cookie{Name: "session_token", Value: token})
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "abc"})
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if reached || w.Code != http.StatusForbidden {
		t.Fatalf("POST missing CSRF header: want 403, got %d reached=%v", w.Code, reached)
	}

	// POST with matching CSRF cookie + header → passes
	reached = false
	req = httptest.NewRequest(http.MethodPost, "/api/dashboard/item", nil)
	req.AddCookie(&http.Cookie{Name: "session_token", Value: token})
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "abc"})
	req.Header.Set("X-CSRF-Token", "abc")
	w = httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if !reached || w.Code != http.StatusOK {
		t.Fatalf("POST with matching CSRF: want 200, got %d reached=%v", w.Code, reached)
	}

	// POST with mismatched CSRF → 403
	reached = false
	req = httptest.NewRequest(http.MethodPost, "/api/dashboard/item", nil)
	req.AddCookie(&http.Cookie{Name: "session_token", Value: token})
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "abc"})
	req.Header.Set("X-CSRF-Token", "different")
	w = httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if reached || w.Code != http.StatusForbidden {
		t.Fatalf("POST with mismatched CSRF: want 403, got %d reached=%v", w.Code, reached)
	}
}

// Changing a password ends the sessions that were open under the old one. The
// counter was already incremented on every change and read by nobody, so a
// stolen session used to survive the one action a user takes to stop it.
func TestAuthRequired_RejectsASessionFromBeforeAPasswordChange(t *testing.T) {
	db, secret := newAuthTestDB(t)
	if _, err := db.Exec("INSERT INTO users (username, password, role, password_version) VALUES ('alice','x','admin',3)"); err != nil {
		t.Fatal(err)
	}

	// A session minted under the previous password.
	stale := util.SignToken(util.SessionPayload("alice", 2), secret, time.Now().Add(time.Hour))
	reached := false
	h := AuthRequired(db, secret)(okHandler(&reached))
	req := httptest.NewRequest(http.MethodGet, "/api/dashboard/items", nil)
	req.AddCookie(&http.Cookie{Name: "session_token", Value: stale})
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if reached || w.Code != http.StatusUnauthorized {
		t.Fatalf("stale session: want 401 and handler not reached, got %d reached=%v", w.Code, reached)
	}

	// And the session minted under the current one still works.
	current := util.SignToken(util.SessionPayload("alice", 3), secret, time.Now().Add(time.Hour))
	reached = false
	req = httptest.NewRequest(http.MethodGet, "/api/dashboard/items", nil)
	req.AddCookie(&http.Cookie{Name: "session_token", Value: current})
	w = httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if !reached || w.Code != http.StatusOK {
		t.Fatalf("current session: want 200 and handler reached, got %d reached=%v", w.Code, reached)
	}
}

// The double-submit token only proves the caller could read a cookie and copy
// it into a header. Anything able to write cookies on the domain — a
// compromised subdomain — can set both sides and satisfy it. Sec-Fetch-Site is
// filled in by the browser from the real origins and cannot be set by the page
// making the request, so a write that did not come from this exact origin is
// refused before the token matters.
func TestAuthRequired_RefusesWritesFromAnotherSite(t *testing.T) {
	db, secret := newAuthTestDB(t)
	if _, err := db.Exec("INSERT INTO users (username, password, role) VALUES ('alice','x','admin')"); err != nil {
		t.Fatal(err)
	}
	token := util.SignToken("alice", secret, time.Now().Add(time.Hour))

	// The token pair is perfectly valid in every case here; only the origin
	// the browser reports differs.
	post := func(fetchSite string) (int, bool) {
		reached := false
		h := AuthRequired(db, secret)(okHandler(&reached))
		req := httptest.NewRequest(http.MethodPost, "/api/dashboard/item", nil)
		req.AddCookie(&http.Cookie{Name: "session_token", Value: token})
		req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "abc"})
		req.Header.Set("X-CSRF-Token", "abc")
		if fetchSite != "" {
			req.Header.Set("Sec-Fetch-Site", fetchSite)
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)
		return w.Code, reached
	}

	for _, site := range []string{"cross-site", "same-site"} {
		if code, reached := post(site); reached || code != http.StatusForbidden {
			t.Errorf("a write reported as %q got %d (handler reached=%v), want 403", site, code, reached)
		}
	}

	// The application's own requests, and clients that send no such header at
	// all — an older browser, curl, someone's script — must be unaffected.
	for _, site := range []string{"same-origin", "none", ""} {
		if code, reached := post(site); !reached || code != http.StatusOK {
			t.Errorf("a legitimate write reported as %q got %d (handler reached=%v), want 200",
				site, code, reached)
		}
	}
}

// A session belongs to an account, not to a name. Deleting bob and creating
// another bob must not hand the first bob's cookie the second one's data.
func TestAuthRequired_ASessionDoesNotPassToAnotherAccountWithTheSameName(t *testing.T) {
	db, secret := newAuthTestDB(t)
	res, err := db.Exec("INSERT INTO users (username, password, role) VALUES ('bob','x','user')")
	if err != nil {
		t.Fatal(err)
	}
	oldID, _ := res.LastInsertId()
	oldSession := util.SignToken(util.AccountSessionPayload(int(oldID), 0), secret, time.Now().Add(time.Hour))

	if _, err := db.Exec("DELETE FROM users WHERE id = ?", oldID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec("INSERT INTO users (username, password, role) VALUES ('bob','y','user')"); err != nil {
		t.Fatal(err)
	}

	reached := false
	h := AuthRequired(db, secret)(okHandler(&reached))
	req := httptest.NewRequest(http.MethodGet, "/api/dashboard", nil)
	req.AddCookie(&http.Cookie{Name: "session_token", Value: oldSession})
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	if reached || w.Code != http.StatusUnauthorized {
		t.Fatalf("the old account's session reached the new account: %d reached=%v", w.Code, reached)
	}
}

// ResolveSession is the one place a cookie becomes an account. The login and
// setup pages use it to decide whether to send you on: judging by the signature
// alone sent a session that no longer works to the app, which sent it back to
// the login page, which sent it on again, forever.
func TestResolveSession(t *testing.T) {
	db, secret := newAuthTestDB(t)
	res, err := db.Exec("INSERT INTO users (username, password, role, password_version) VALUES ('alice','x','admin',3)")
	if err != nil {
		t.Fatal(err)
	}
	id, _ := res.LastInsertId()
	exp := time.Now().Add(time.Hour)
	request := func(payload string) *http.Request {
		req := httptest.NewRequest(http.MethodGet, "/login", nil)
		req.AddCookie(&http.Cookie{Name: "session_token", Value: util.SignToken(payload, secret, exp)})
		return req
	}

	cases := []struct {
		name    string
		payload string
		want    error
	}{
		{"current", util.AccountSessionPayload(int(id), 3), nil},
		{"a generation behind", util.AccountSessionPayload(int(id), 2), ErrSessionExpired},
		{"an account that is gone", util.AccountSessionPayload(int(id)+9, 0), ErrInvalidSession},
		{"the former payload, current", util.SessionPayload("alice", 3), nil},
		{"the former payload, behind", util.SessionPayload("alice", 1), ErrSessionExpired},
		{"the former payload, unknown name", util.SessionPayload("ghost", 0), ErrInvalidSession},
	}
	for _, c := range cases {
		s, err := ResolveSession(db, secret, request(c.payload))
		if err != c.want {
			t.Errorf("%s: err = %v, want %v", c.name, err, c.want)
		}
		if c.want == nil && (s.ID != int(id) || s.Username != "alice" || s.Role != "admin") {
			t.Errorf("%s: resolved %+v", c.name, s)
		}
	}
	if _, err := ResolveSession(db, secret, httptest.NewRequest(http.MethodGet, "/login", nil)); err != ErrNoSession {
		t.Errorf("no cookie: err = %v, want ErrNoSession", err)
	}
}
