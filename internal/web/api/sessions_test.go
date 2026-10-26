package api_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

func setupSessionServer(t *testing.T) (*httptest.Server, *database.DB) {
	t.Helper()
	tmp, err := os.CreateTemp("", "lastboard_sessions_*.db")
	if err != nil {
		t.Fatal(err)
	}
	tmp.Close()
	db, err := database.InitDB(tmp.Name())
	if err != nil {
		t.Fatal(err)
	}
	protect := middleware.AuthRequired(db.DB, testSecret)
	auth := api.NewAuthHandler(db.DB, testSecret)
	users := api.NewUserHandler(db.DB)
	sessions := &api.SessionHandler{DB: db.DB}

	mux := http.NewServeMux()
	mux.Handle("POST /api/login", http.HandlerFunc(auth.Login))
	mux.Handle("POST /logout", protect(http.HandlerFunc(auth.Logout)))
	mux.Handle("GET /api/me", protect(http.HandlerFunc(users.GetMe)))
	mux.Handle("POST /api/user/change-password", protect(http.HandlerFunc(users.ChangePassword)))
	mux.Handle("GET /api/sessions", protect(http.HandlerFunc(sessions.List)))
	mux.Handle("DELETE /api/sessions/{id}", protect(http.HandlerFunc(sessions.Close)))
	mux.Handle("POST /api/sessions/close-others", protect(http.HandlerFunc(sessions.CloseOthers)))
	server := httptest.NewServer(mux)
	t.Cleanup(func() {
		server.Close()
		db.Close()
		os.Remove(tmp.Name())
	})
	return server, db
}

// call sends a request with the session's cookies and, for a write, its CSRF
// token, and returns the status and the response.
func call(t *testing.T, s *userSession, method, url string) (int, *http.Response) {
	t.Helper()
	req, _ := http.NewRequest(method, url, nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	return resp.StatusCode, resp
}

func listSessions(t *testing.T, s *userSession, base string) []map[string]any {
	t.Helper()
	req, _ := http.NewRequest("GET", base+"/api/sessions", nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("GET /api/sessions = %d", resp.StatusCode)
	}
	var out []map[string]any
	json.NewDecoder(resp.Body).Decode(&out)
	return out
}

// legacyCookie is a session cookie as the versions before sessions were stored
// minted it: the account id and its password generation, signed.
func legacyCookie(t *testing.T, db *database.DB, username string, ttl time.Duration) *userSession {
	t.Helper()
	var id, version int
	if err := db.DB.QueryRow("SELECT id, password_version FROM users WHERE username = ?", username).Scan(&id, &version); err != nil {
		t.Fatal(err)
	}
	token := util.SignToken(util.AccountSessionPayload(id, version), testSecret, time.Now().Add(ttl))
	return &userSession{
		sessionCookie: &http.Cookie{Name: "session_token", Value: token},
		csrfCookie:    &http.Cookie{Name: "csrf_token", Value: "legacy-csrf"},
	}
}

// Signing out ends the session on the server: a copy of the cookie taken
// before — another tab's, or a stolen one — stops working too. Before sessions
// were stored, it kept working until it ran out.
func TestSigningOutEndsACopiedCookieToo(t *testing.T) {
	server, db := setupSessionServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	s := doLogin(t, server.URL, "ana", "anapass123")
	copied := *s

	if code, _ := call(t, s, "POST", server.URL+"/logout"); code != http.StatusOK {
		t.Fatalf("logout = %d", code)
	}
	if code, _ := call(t, &copied, "GET", server.URL+"/api/me"); code != http.StatusUnauthorized {
		t.Fatalf("the copied cookie after signing out = %d, want 401", code)
	}
}

// An account sees where it is signed in, which session is this one, and can
// close another from here.
func TestASessionIsClosedFromAnotherDevice(t *testing.T) {
	server, db := setupSessionServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	laptop := doLogin(t, server.URL, "ana", "anapass123")
	phone := doLogin(t, server.URL, "ana", "anapass123")

	list := listSessions(t, laptop, server.URL)
	if len(list) != 2 {
		t.Fatalf("ana has %d sessions, want 2: %v", len(list), list)
	}
	var phoneID float64
	currents := 0
	for _, s := range list {
		if s["current"] == true {
			currents++
		} else {
			phoneID = s["id"].(float64)
		}
	}
	if currents != 1 || phoneID == 0 {
		t.Fatalf("exactly one session should be marked as this one: %v", list)
	}

	if code, _ := call(t, laptop, "DELETE", fmt.Sprintf("%s/api/sessions/%d", server.URL, int64(phoneID))); code != http.StatusNoContent {
		t.Fatalf("closing the phone's session = %d", code)
	}
	if code, _ := call(t, phone, "GET", server.URL+"/api/me"); code != http.StatusUnauthorized {
		t.Errorf("the phone after its session was closed = %d, want 401", code)
	}
	if code, _ := call(t, laptop, "GET", server.URL+"/api/me"); code != http.StatusOK {
		t.Errorf("the laptop that closed it = %d, want 200", code)
	}
	if n := len(listSessions(t, laptop, server.URL)); n != 1 {
		t.Errorf("after closing one, %d sessions are listed, want 1", n)
	}
}

// Another account's session is not found, not refused: ids say nothing about
// other accounts, and nothing of theirs is closed.
func TestAnAccountCannotCloseAnotherAccountsSession(t *testing.T) {
	server, db := setupSessionServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	createUser(t, db.DB, "luis", "luispass123", "user")
	ana := doLogin(t, server.URL, "ana", "anapass123")
	luis := doLogin(t, server.URL, "luis", "luispass123")
	luisID := int64(listSessions(t, luis, server.URL)[0]["id"].(float64))

	if code, _ := call(t, ana, "DELETE", fmt.Sprintf("%s/api/sessions/%d", server.URL, luisID)); code != http.StatusNotFound {
		t.Errorf("ana closing luis's session = %d, want 404", code)
	}
	if code, _ := call(t, luis, "GET", server.URL+"/api/me"); code != http.StatusOK {
		t.Errorf("luis after ana tried = %d, want 200", code)
	}
}

// "Close all other sessions" ends every other device — including a cookie from
// before sessions were stored that has not been used since, which has no row to
// close — and leaves this one open.
func TestClosingTheOtherSessionsEndsOldCookiesToo(t *testing.T) {
	server, db := setupSessionServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	old := legacyCookie(t, db, "ana", 30*24*time.Hour)
	here := doLogin(t, server.URL, "ana", "anapass123")
	tablet := doLogin(t, server.URL, "ana", "anapass123")

	if code, _ := call(t, here, "POST", server.URL+"/api/sessions/close-others"); code != http.StatusNoContent {
		t.Fatalf("close-others = %d", code)
	}
	for name, s := range map[string]*userSession{"tablet": tablet, "old cookie": old} {
		if code, _ := call(t, s, "GET", server.URL+"/api/me"); code == http.StatusOK {
			t.Errorf("%s after closing the others = 200, want it signed out", name)
		}
	}
	if code, _ := call(t, here, "GET", server.URL+"/api/me"); code != http.StatusOK {
		t.Errorf("the session that closed the others = %d, want 200", code)
	}
}

// A cookie from before sessions were stored keeps working after the update, and
// the first time it is used it becomes a stored session: the browser is handed a
// cookie of the new kind with the same expiry. The requests a page sends at once
// all land on one row. Once that session is closed, the old cookie cannot open
// it again.
func TestAnOldCookieBecomesOneSessionAndStaysClosed(t *testing.T) {
	server, db := setupSessionServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	old := legacyCookie(t, db, "ana", 30*24*time.Hour)

	var wg sync.WaitGroup
	fresh := make([]string, 8)
	for i := range fresh {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			code, resp := call(t, old, "GET", server.URL+"/api/me")
			if code != http.StatusOK {
				t.Errorf("the old cookie after updating = %d, want 200", code)
			}
			for _, c := range resp.Cookies() {
				if c.Name == "session_token" {
					fresh[i] = c.Value
					if c.Expires.IsZero() || c.Expires.After(time.Now().Add(31*24*time.Hour)) {
						t.Errorf("the new cookie runs out at %v, not with the old one", c.Expires)
					}
				}
			}
		}(i)
	}
	wg.Wait()

	var rows int
	db.DB.QueryRow("SELECT COUNT(*) FROM sessions").Scan(&rows)
	if rows != 1 {
		t.Fatalf("eight requests with one old cookie made %d sessions, want 1", rows)
	}
	for i, v := range fresh {
		if v == "" || v != fresh[0] {
			t.Fatalf("request %d was handed %q, want the same new cookie as the rest", i, v)
		}
	}
	payload, err := util.VerifyToken(fresh[0], testSecret)
	if err != nil || !strings.HasPrefix(payload, "$") {
		t.Fatalf("the new cookie is not of the new kind: %q (%v)", payload, err)
	}

	converted := &userSession{
		sessionCookie: &http.Cookie{Name: "session_token", Value: fresh[0]},
		csrfCookie:    old.csrfCookie,
	}
	if code, _ := call(t, converted, "POST", server.URL+"/logout"); code != http.StatusOK {
		t.Fatalf("signing out with the new cookie = %d", code)
	}
	if code, _ := call(t, old, "GET", server.URL+"/api/me"); code != http.StatusUnauthorized {
		t.Errorf("the old cookie after its session was closed = %d, want 401", code)
	}
}

// Changing the password still ends every session of the account, this one
// included, because each one remembers the password generation it began under.
func TestChangingThePasswordEndsEveryStoredSession(t *testing.T) {
	server, db := setupSessionServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	here := doLogin(t, server.URL, "ana", "anapass123")
	other := doLogin(t, server.URL, "ana", "anapass123")

	req, _ := http.NewRequest("POST", server.URL+"/api/user/change-password",
		strings.NewReader(`{"current_password":"anapass123","new_password":"brand-new-pass-1"}`))
	req.Header.Set("Content-Type", "application/json")
	here.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("change-password = %d", resp.StatusCode)
	}
	for name, s := range map[string]*userSession{"this one": here, "the other": other} {
		if code, _ := call(t, s, "GET", server.URL+"/api/me"); code == http.StatusOK {
			t.Errorf("%s after the password changed = 200, want it ended", name)
		}
	}
}

// A cookie of the old kind can only be genuine if it runs out within the month
// it could last after sessions began being stored: no sign-in mints one any
// more. One that runs out later was signed by someone holding the signing
// secret, and is refused — so a month after the update the old way in is shut.
func TestAnOldKindCookieThatOutlivesAnyRealOneIsRefused(t *testing.T) {
	server, db := setupSessionServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	forged := legacyCookie(t, db, "ana", 90*24*time.Hour)
	if code, _ := call(t, forged, "GET", server.URL+"/api/me"); code != http.StatusUnauthorized {
		t.Errorf("an old-kind cookie running out in 90 days = %d, want 401", code)
	}
	var rows int
	db.DB.QueryRow("SELECT COUNT(*) FROM sessions").Scan(&rows)
	if rows != 0 {
		t.Errorf("the refused cookie was converted into %d sessions", rows)
	}
}
