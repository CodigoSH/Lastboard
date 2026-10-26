package api_test

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

const (
	proxyAddr  = "10.0.0.2:41000"
	strangerIP = "10.0.0.9:41000"
	logoutURL  = "https://auth.example.lan/logout"
)

// proxyServer builds the handlers with signing in through a proxy set as the
// operator would set it, and returns a function that sends one request.
func proxyServer(t *testing.T, on bool) (*database.DB, func(method, path, from, user string, cookies []*http.Cookie) *httptest.ResponseRecorder) {
	t.Helper()
	if on {
		t.Setenv("AUTH_PROXY_HEADER", "Remote-User")
		t.Setenv("AUTH_PROXY_TRUSTED", "10.0.0.2")
		t.Setenv("AUTH_PROXY_LOGOUT_URL", logoutURL)
	}
	tmp, err := os.CreateTemp("", "lastboard_authproxy_*.db")
	if err != nil {
		t.Fatal(err)
	}
	tmp.Close()
	db, err := database.InitDB(tmp.Name())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close(); os.Remove(tmp.Name()) })

	protect := middleware.AuthRequired(db.DB, testSecret)
	auth := api.NewAuthHandler(db.DB, testSecret)
	auth.AuthProxy = middleware.LoadAuthProxy()
	users := api.NewUserHandler(db.DB)
	mux := http.NewServeMux()
	mux.Handle("POST /api/login", http.HandlerFunc(auth.Login))
	mux.Handle("GET /api/me", protect(http.HandlerFunc(users.GetMe)))
	mux.Handle("POST /api/thing", protect(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) })))
	mux.Handle("POST /logout", protect(http.HandlerFunc(auth.Logout)))

	return db, func(method, path, from, user string, cookies []*http.Cookie) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, nil)
		req.RemoteAddr = from
		if user != "" {
			req.Header.Set("Remote-User", user)
		}
		for _, c := range cookies {
			req.AddCookie(c)
			if c.Name == "csrf_token" {
				req.Header.Set("X-CSRF-Token", c.Value)
			}
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)
		return w
	}
}

func meName(t *testing.T, w *httptest.ResponseRecorder) string {
	t.Helper()
	var me struct{ Username string }
	json.Unmarshal(w.Body.Bytes(), &me)
	return me.Username
}

func count(db *sql.DB, query string) int {
	var n int
	db.QueryRow(query).Scan(&n)
	return n
}

// From the proxy, naming an account that exists: signed in, with an ordinary
// stored session, and no password or code asked.
func TestTheProxySignsInTheAccountItNames(t *testing.T) {
	db, send := proxyServer(t, true)
	createUser(t, db.DB, "ana", "anapass123", "user")

	w := send("GET", "/api/me", proxyAddr, "ana", nil)
	if w.Code != http.StatusOK || meName(t, w) != "ana" {
		t.Fatalf("GET /api/me from the proxy as ana = %d %s", w.Code, w.Body.String())
	}
	if n := count(db.DB, `SELECT COUNT(*) FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.username = 'ana'`); n != 1 {
		t.Fatalf("ana has %d stored sessions, want 1", n)
	}
	// The next request carries the cookie: the same session, not another.
	again := send("GET", "/api/me", proxyAddr, "ana", w.Result().Cookies())
	if again.Code != http.StatusOK || count(db.DB, `SELECT COUNT(*) FROM sessions`) != 1 {
		t.Errorf("a second request = %d and %d sessions, want 200 and 1", again.Code, count(db.DB, `SELECT COUNT(*) FROM sessions`))
	}
}

// The header means nothing from anybody but the proxy — not even from someone
// claiming, in X-Forwarded-For, to be it.
func TestOnlyTheProxyIsBelieved(t *testing.T) {
	db, send := proxyServer(t, true)
	createUser(t, db.DB, "ana", "anapass123", "admin")
	t.Setenv("TRUST_PROXY", "true")

	if w := send("GET", "/api/me", strangerIP, "ana", nil); w.Code != http.StatusUnauthorized {
		t.Errorf("the header from another address = %d, want 401", w.Code)
	}
	req := httptest.NewRequest("GET", "/api/me", nil)
	req.RemoteAddr = strangerIP
	req.Header.Set("Remote-User", "ana")
	req.Header.Set("X-Forwarded-For", "10.0.0.2")
	rec := httptest.NewRecorder()
	middleware.AuthRequired(db.DB, testSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })).ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("the header with a forged X-Forwarded-For = %d, want 401", rec.Code)
	}
	if n := count(db.DB, `SELECT COUNT(*) FROM sessions`); n != 0 {
		t.Errorf("%d sessions were opened", n)
	}
}

// A name with no account opens nothing and makes nothing.
func TestTheProxyNeverMakesAnAccount(t *testing.T) {
	db, send := proxyServer(t, true)
	createUser(t, db.DB, "ana", "anapass123", "user")
	before := count(db.DB, `SELECT COUNT(*) FROM users`)
	if w := send("GET", "/api/me", proxyAddr, "mallory", nil); w.Code != http.StatusUnauthorized {
		t.Errorf("an unknown name = %d, want 401", w.Code)
	}
	if after := count(db.DB, `SELECT COUNT(*) FROM users`); after != before {
		t.Errorf("accounts went from %d to %d", before, after)
	}
}

// When the proxy signs somebody else in on the same browser, the session that
// browser carries is not theirs and is not used.
func TestWhenTheProxyChangesWhoItIsTheSessionFollows(t *testing.T) {
	db, send := proxyServer(t, true)
	createUser(t, db.DB, "ana", "anapass123", "user")
	createUser(t, db.DB, "luis", "luispass123", "user")
	anas := send("GET", "/api/me", proxyAddr, "ana", nil).Result().Cookies()

	w := send("GET", "/api/me", proxyAddr, "luis", anas)
	if w.Code != http.StatusOK || meName(t, w) != "luis" {
		t.Fatalf("ana's cookie with the proxy naming luis = %d as %q, want luis", w.Code, meName(t, w))
	}
	// A write cannot change who it is: it is refused, not carried out as ana.
	if w := send("POST", "/api/thing", proxyAddr, "luis", anas); w.Code != http.StatusUnauthorized {
		t.Errorf("a write with ana's session while the proxy names luis = %d, want 401", w.Code)
	}
}

// A write never opens a session: its CSRF token belongs to a session it came with.
func TestAWriteDoesNotSignIn(t *testing.T) {
	db, send := proxyServer(t, true)
	createUser(t, db.DB, "ana", "anapass123", "user")
	if w := send("POST", "/api/thing", proxyAddr, "ana", nil); w.Code != http.StatusUnauthorized {
		t.Errorf("a write without a session = %d, want 401", w.Code)
	}
	if n := count(db.DB, `SELECT COUNT(*) FROM sessions`); n != 0 {
		t.Errorf("a write opened %d sessions", n)
	}
}

// Signing out from behind the proxy goes on to the proxy's sign-out; signing
// out anywhere else does not.
func TestSigningOutBehindTheProxyGoesToItsSignOut(t *testing.T) {
	db, send := proxyServer(t, true)
	createUser(t, db.DB, "ana", "anapass123", "user")
	cookies := send("GET", "/api/me", proxyAddr, "ana", nil).Result().Cookies()
	w := send("POST", "/logout", proxyAddr, "ana", cookies)
	if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), logoutURL) {
		t.Errorf("signing out behind the proxy = %d %s, want its sign-out address", w.Code, w.Body.String())
	}

	// A password sign-in from elsewhere signs out to the sign-in page.
	login := httptest.NewRequest("POST", "/api/login", strings.NewReader(`{"username":"ana","password":"anapass123"}`))
	login.RemoteAddr = strangerIP
	lw := httptest.NewRecorder()
	api.NewAuthHandler(db.DB, testSecret).Login(lw, login)
	w = send("POST", "/logout", strangerIP, "", lw.Result().Cookies())
	if w.Code != http.StatusOK || strings.Contains(w.Body.String(), "logout_url") {
		t.Errorf("signing out elsewhere = %d %s, want no proxy address", w.Code, w.Body.String())
	}
}

// Not set up, the header is only a header.
func TestWithoutTheSettingTheHeaderIsIgnored(t *testing.T) {
	db, send := proxyServer(t, false)
	createUser(t, db.DB, "ana", "anapass123", "user")
	if w := send("GET", "/api/me", proxyAddr, "ana", nil); w.Code != http.StatusUnauthorized {
		t.Errorf("the header with signing in through a proxy off = %d, want 401", w.Code)
	}
}
