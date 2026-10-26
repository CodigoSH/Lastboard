package api_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

// A session secret for the handlers under test. Changing your own password
// re-issues this browser's cookie, so the handler needs one to sign with.
// userSession holds both cookies needed for authenticated requests.
type userSession struct {
	sessionCookie *http.Cookie
	csrfCookie    *http.Cookie
}

func (s *userSession) attach(req *http.Request) {
	req.AddCookie(s.sessionCookie)
	if s.csrfCookie != nil {
		req.AddCookie(s.csrfCookie)
		req.Header.Set("X-CSRF-Token", s.csrfCookie.Value)
	}
}

// setupFullServer creates a test server with auth + user-management routes.
func setupFullServer(t *testing.T) (*httptest.Server, *database.DB, func()) {
	t.Helper()

	tmp, err := os.CreateTemp("", "lastboard_user_test_*.db")
	if err != nil {
		t.Fatalf("temp file: %v", err)
	}
	tmp.Close()

	db, err := database.InitDB(tmp.Name())
	if err != nil {
		t.Fatalf("InitDB: %v", err)
	}

	mux := http.NewServeMux()
	protect := middleware.AuthRequired(db.DB, testSecret)

	authHandler := api.NewAuthHandler(db.DB, testSecret)
	userHandler := api.NewUserHandler(db.DB)
	updateHandler := api.NewUpdateHandler(db.DB)

	mux.Handle("POST /api/login", http.HandlerFunc(authHandler.Login))
	mux.Handle("GET /api/me", protect(http.HandlerFunc(userHandler.GetMe)))
	mux.Handle("GET /api/users", protect(http.HandlerFunc(userHandler.GetUsers)))
	mux.Handle("POST /api/users", protect(http.HandlerFunc(userHandler.CreateUser)))
	mux.Handle("PUT /api/users", protect(http.HandlerFunc(userHandler.UpdateUser)))
	mux.Handle("POST /api/users/delete", protect(http.HandlerFunc(userHandler.DeleteUser)))
	mux.Handle("POST /api/user/change-password", protect(http.HandlerFunc(userHandler.ChangePassword)))
	mux.Handle("POST /api/user/update-profile", protect(http.HandlerFunc(userHandler.UpdateProfile)))
	mux.Handle("POST /api/user/preferences", protect(http.HandlerFunc(userHandler.UpdatePreferences)))
	mux.Handle("POST /api/system/update/perform", protect(http.HandlerFunc(updateHandler.PerformUpdate)))

	server := httptest.NewServer(mux)

	cleanup := func() {
		server.Close()
		db.Close()
		os.Remove(tmp.Name())
	}
	return server, db, cleanup
}

// doLogin logs in and returns both session and CSRF cookies.
func doLogin(t *testing.T, serverURL, username, password string) *userSession {
	t.Helper()
	body := fmt.Sprintf(`{"username":%q,"password":%q}`, username, password)
	resp, err := http.Post(serverURL+"/api/login", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("login request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("login failed with status %d", resp.StatusCode)
	}
	s := &userSession{}
	for _, c := range resp.Cookies() {
		switch c.Name {
		case "session_token":
			s.sessionCookie = c
		case "csrf_token":
			s.csrfCookie = c
		}
	}
	if s.sessionCookie == nil {
		t.Fatal("no session_token cookie after login")
	}
	return s
}

// ── GetMe ─────────────────────────────────────────────────────────────────────

func TestGetMe_ReturnsOwnData(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "admin")
	s := doLogin(t, server.URL, "alice", "password")

	req, _ := http.NewRequest("GET", server.URL+"/api/me", nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var body map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&body)
	if body["username"] != "alice" {
		t.Errorf("username = %v, want alice", body["username"])
	}
	if body["is_admin"] != true {
		t.Errorf("is_admin = %v, want true for first admin", body["is_admin"])
	}
}

func TestGetMe_SecondAdminNotFirstAdmin(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "first", "password", "admin")
	createUser(t, db.DB, "second", "password", "admin")
	s := doLogin(t, server.URL, "second", "password")

	req, _ := http.NewRequest("GET", server.URL+"/api/me", nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	var body map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&body)
	if body["is_admin"] != false {
		t.Errorf("second admin is_admin = %v, want false", body["is_admin"])
	}
}

func TestGetMe_Unauthenticated(t *testing.T) {
	server, _, cleanup := setupFullServer(t)
	defer cleanup()

	resp, err := http.Get(server.URL + "/api/me")
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}

// ── GetUsers ──────────────────────────────────────────────────────────────────

func TestGetUsers_AdminSeesAllUsers(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	createUser(t, db.DB, "bob", "password", "user")
	s := doLogin(t, server.URL, "admin", "password")

	req, _ := http.NewRequest("GET", server.URL+"/api/users", nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var users []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&users)
	if len(users) < 1 {
		t.Errorf("expected ≥1 user (excluding self), got %d", len(users))
	}
}

func TestGetUsers_RegularUserForbidden(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	createUser(t, db.DB, "bob", "password", "user")
	s := doLogin(t, server.URL, "bob", "password")

	req, _ := http.NewRequest("GET", server.URL+"/api/users", nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403, got %d", resp.StatusCode)
	}
}

// ── CreateUser ────────────────────────────────────────────────────────────────

func TestCreateUser_Success(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	s := doLogin(t, server.URL, "admin", "password")

	body := `{"username":"newbie","password":"securepass","role":"user"}`
	req, _ := http.NewRequest("POST", server.URL+"/api/users", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201, got %d", resp.StatusCode)
	}
	var count int
	db.DB.QueryRow("SELECT COUNT(*) FROM users WHERE username='newbie'").Scan(&count)
	if count != 1 {
		t.Error("user not created in DB")
	}
}

func TestCreateUser_DuplicateUsername(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	createUser(t, db.DB, "existing", "password", "user")
	s := doLogin(t, server.URL, "admin", "password")

	body := `{"username":"existing","password":"securepass","role":"user"}`
	req, _ := http.NewRequest("POST", server.URL+"/api/users", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusConflict {
		t.Errorf("expected 409, got %d", resp.StatusCode)
	}
}

func TestCreateUser_InvalidUsername(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	s := doLogin(t, server.URL, "admin", "password")

	body := `{"username":"x","password":"securepass","role":"user"}`
	req, _ := http.NewRequest("POST", server.URL+"/api/users", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestCreateUser_NonAdminForbidden(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	createUser(t, db.DB, "bob", "password", "user")
	s := doLogin(t, server.URL, "bob", "password")

	body := `{"username":"hax","password":"securepass","role":"user"}`
	req, _ := http.NewRequest("POST", server.URL+"/api/users", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403, got %d", resp.StatusCode)
	}
}

// ── DeleteUser ────────────────────────────────────────────────────────────────

func TestDeleteUser_Success(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	createUser(t, db.DB, "target", "password", "user")
	var targetID int
	db.DB.QueryRow("SELECT id FROM users WHERE username='target'").Scan(&targetID)

	s := doLogin(t, server.URL, "admin", "password")

	body := fmt.Sprintf(`{"id":%d,"admin_password":"password"}`, targetID)
	req, _ := http.NewRequest("POST", server.URL+"/api/users/delete", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var count int
	db.DB.QueryRow("SELECT COUNT(*) FROM users WHERE username='target'").Scan(&count)
	if count != 0 {
		t.Error("user was not deleted")
	}
}

func TestDeleteUser_CannotDeletePrimaryAdmin(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	var adminID int
	db.DB.QueryRow("SELECT id FROM users WHERE username='admin'").Scan(&adminID)

	s := doLogin(t, server.URL, "admin", "password")

	body := fmt.Sprintf(`{"id":%d,"admin_password":"password"}`, adminID)
	req, _ := http.NewRequest("POST", server.URL+"/api/users/delete", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	// Self-deletion is blocked (400) before the isFirstAdmin target check (403),
	// since isAdminUser == isFirstAdmin means only the primary admin reaches this handler.
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400 (cannot delete own account), got %d", resp.StatusCode)
	}
}

// ── ChangePassword ────────────────────────────────────────────────────────────

func TestChangePassword_Success(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "oldpass", "user")
	s := doLogin(t, server.URL, "alice", "oldpass")

	body := `{"current_password":"oldpass","new_password":"newpass123"}`
	req, _ := http.NewRequest("POST", server.URL+"/api/user/change-password", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestChangePassword_WrongCurrent(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "oldpass", "user")
	s := doLogin(t, server.URL, "alice", "oldpass")

	body := `{"current_password":"wrongpass","new_password":"newpass123"}`
	req, _ := http.NewRequest("POST", server.URL+"/api/user/change-password", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", resp.StatusCode)
	}
}

func TestChangePassword_TooShort(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "oldpass", "user")
	s := doLogin(t, server.URL, "alice", "oldpass")

	body := `{"current_password":"oldpass","new_password":"abc"}`
	req, _ := http.NewRequest("POST", server.URL+"/api/user/change-password", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

// ── CSRF protection ───────────────────────────────────────────────────────────

func TestCSRF_PostWithoutTokenRejected(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	body := `{"current_password":"password","new_password":"newpass123"}`
	req, _ := http.NewRequest("POST", server.URL+"/api/user/change-password", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(s.sessionCookie) // session only, no CSRF

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 without CSRF, got %d", resp.StatusCode)
	}
}

// A session belongs to the account that signed in, not to the name it had.
// Delete bob and create another bob, and the first bob's cookie used to open the
// second one's data, because the token said "bob" and nothing more.
func TestASessionBelongsToTheAccountNotTheName(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "bob", "bobsecret1", "user")
	s := doLogin(t, server.URL, "bob", "bobsecret1")

	// What the login stored belongs to the account by id, and the cookie does
	// not carry the name at all.
	var want int
	if err := db.DB.QueryRow("SELECT id FROM users WHERE username = 'bob'").Scan(&want); err != nil {
		t.Fatal(err)
	}
	var owner int
	if err := db.DB.QueryRow("SELECT user_id FROM sessions").Scan(&owner); err != nil || owner != want {
		t.Fatalf("the stored session belongs to %d (%v), want the account id %d", owner, err, want)
	}
	payload, err := util.VerifyToken(s.sessionCookie.Value, testSecret)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(payload, "bob") {
		t.Fatalf("the cookie names the account: %q", payload)
	}

	status := func() int {
		req, _ := http.NewRequest("GET", server.URL+"/api/me", nil)
		s.attach(req)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		return resp.StatusCode
	}
	if got := status(); got != http.StatusOK {
		t.Fatalf("before the account is deleted: %d, want 200", got)
	}

	if _, err := db.DB.Exec("DELETE FROM users WHERE id = ?", want); err != nil {
		t.Fatal(err)
	}
	createUser(t, db.DB, "bob", "another-pass", "user")
	if got := status(); got != http.StatusUnauthorized {
		t.Fatalf("the old account's session on a new account of the same name: %d, want 401", got)
	}
}

// Changing the password ends the session, and the interface says so: "sign in
// again". The handler used to sign a fresh cookie and then, one line later, send
// another that expires it, so the response carried two contradictory cookies of
// the same name and a database read and a signature nobody used.
func TestChangingThePasswordSendsOneInstructionAboutTheSession(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "oldpass", "user")
	s := doLogin(t, server.URL, "alice", "oldpass")

	req, _ := http.NewRequest("POST", server.URL+"/api/user/change-password",
		strings.NewReader(`{"current_password":"oldpass","new_password":"newpass123"}`))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var sessionCookies []*http.Cookie
	for _, c := range resp.Cookies() {
		if c.Name == "session_token" {
			sessionCookies = append(sessionCookies, c)
		}
	}
	if len(sessionCookies) != 1 {
		t.Fatalf("the response sets the session cookie %d times, want once", len(sessionCookies))
	}
	if c := sessionCookies[0]; c.Value != "" || c.MaxAge >= 0 && !c.Expires.Before(time.Now()) {
		t.Fatalf("the one cookie must end the session, got value %q expiring %v", c.Value, c.Expires)
	}

	// And the old session no longer works anywhere.
	me, _ := http.NewRequest("GET", server.URL+"/api/me", nil)
	s.attach(me)
	r2, err := http.DefaultClient.Do(me)
	if err != nil {
		t.Fatal(err)
	}
	r2.Body.Close()
	if r2.StatusCode != http.StatusUnauthorized {
		t.Fatalf("the old session still works after the password changed: %d", r2.StatusCode)
	}
}
