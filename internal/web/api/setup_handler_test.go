package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newSetupRequest(body string) *http.Request {
	return httptest.NewRequest(http.MethodPost, "/api/setup", strings.NewReader(body))
}

func countUsers(t *testing.T, db *sql.DB) int {
	t.Helper()
	var n int
	if err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&n); err != nil {
		t.Fatalf("count users: %v", err)
	}
	return n
}

// TestSetupSystemCreatesFirstAdmin covers the happy path: a clean install
// accepts the payload and provisions an admin.
func TestSetupSystemCreatesFirstAdmin(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	h := NewSetupHandler(db)

	body := `{"username":"admin","password":"sup3rsecret","language":"es","theme":"dark","accent_color":"#2563eb"}`
	rec := httptest.NewRecorder()
	h.SetupSystem(rec, newSetupRequest(body))

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}
	var role string
	if err := db.QueryRow("SELECT role FROM users WHERE username = ?", "admin").Scan(&role); err != nil {
		t.Fatalf("admin not created: %v", err)
	}
	if role != "admin" {
		t.Fatalf("expected role admin, got %q", role)
	}
}

// TestSetupSystemRejectsWhenAlreadyInitialised is the guard that matters: a
// configured instance must refuse and must not create a second user.
func TestSetupSystemRejectsWhenAlreadyInitialised(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	insertUser(t, db, "existing", "admin")
	h := NewSetupHandler(db)

	body := `{"username":"intruder","password":"sup3rsecret","theme":"dark"}`
	rec := httptest.NewRecorder()
	h.SetupSystem(rec, newSetupRequest(body))

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d (%s)", rec.Code, rec.Body.String())
	}
	if n := countUsers(t, db); n != 1 {
		t.Fatalf("expected the user count to stay at 1, got %d", n)
	}
}

// TestSetupSystemShortCircuitsBeforeParsing pins the ordering fix. The body is
// unparseable, so a handler that decoded first would answer 400; answering 403
// proves the "already initialised" check runs before any decoding or bcrypt
// work, which is what keeps this public endpoint cheap to reject.
func TestSetupSystemShortCircuitsBeforeParsing(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	insertUser(t, db, "existing", "admin")
	h := NewSetupHandler(db)

	rec := httptest.NewRecorder()
	h.SetupSystem(rec, newSetupRequest("this is not json at all"))

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 before parsing, got %d (%s)", rec.Code, rec.Body.String())
	}
}

// TestSetupSystemRejectsOversizedBody verifies the MaxBytesReader cap on the
// clean-install path, where the request is actually parsed.
func TestSetupSystemRejectsOversizedBody(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	h := NewSetupHandler(db)

	// 6 MB of padding inside a syntactically valid payload, over the 5 MB cap.
	huge := `{"username":"admin","password":"sup3rsecret","avatar_url":"` +
		strings.Repeat("A", 6*1024*1024) + `"}`
	rec := httptest.NewRecorder()
	h.SetupSystem(rec, newSetupRequest(huge))

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for an oversized body, got %d", rec.Code)
	}
	if n := countUsers(t, db); n != 0 {
		t.Fatalf("no user should have been created, got %d", n)
	}
}

// TestSetupSystemResponseIsJSON guards the success contract the frontend reads.
func TestSetupSystemResponseIsJSON(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	h := NewSetupHandler(db)

	rec := httptest.NewRecorder()
	h.SetupSystem(rec, newSetupRequest(`{"username":"admin","password":"sup3rsecret"}`))

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}
	var out map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("response is not JSON: %v", err)
	}
	if out["status"] != "setup_complete" {
		t.Fatalf("unexpected payload: %v", out)
	}
}
