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

func TestAuthRequired_SkipList(t *testing.T) {
	db, secret := newAuthTestDB(t)
	for _, path := range []string{"/login", "/setup", "/api/login", "/api/setup", "/dist/app.js", "/styles/x.css"} {
		reached := false
		h := AuthRequired(db, secret)(okHandler(&reached))
		req := httptest.NewRequest(http.MethodGet, path, nil)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)
		if !reached {
			t.Errorf("path %s should skip auth and reach the handler", path)
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
