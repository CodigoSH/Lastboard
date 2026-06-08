package api_test

import (
	"database/sql"
	"net/http"
	"strings"
	"testing"
)

// These are characterization tests: they capture the CURRENT behavior of
// UpdatePreferences so the handler can be refactored later without regressions.
// Each case documents an existing validation branch or side effect.

// postPrefs sends a preferences update body and returns the status code.
func postPrefs(t *testing.T, serverURL string, s *userSession, body string) int {
	t.Helper()
	req, _ := http.NewRequest("POST", serverURL+"/api/user/preferences", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	return resp.StatusCode
}

// prefString reads a single TEXT column for a user.
func prefString(t *testing.T, db *sql.DB, username, column string) string {
	t.Helper()
	var v sql.NullString
	if err := db.QueryRow("SELECT "+column+" FROM users WHERE username=?", username).Scan(&v); err != nil {
		t.Fatalf("read %s: %v", column, err)
	}
	return v.String
}

// prefInt reads a single INTEGER column for a user.
func prefInt(t *testing.T, db *sql.DB, username, column string) int {
	t.Helper()
	var v sql.NullInt64
	if err := db.QueryRow("SELECT "+column+" FROM users WHERE username=?", username).Scan(&v); err != nil {
		t.Fatalf("read %s: %v", column, err)
	}
	return int(v.Int64)
}

func TestUpdatePreferences_ValidFullUpdate(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	body := `{"accent_color":"#ff0000","language":"es","theme":"dark","unit_system":"imperial","widget_min_width":200,"project_name":"My Board","beta_updates":true,"grid_columns":10,"dashboard_background":"#000000"}`
	if code := postPrefs(t, server.URL, s, body); code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}

	if got := prefString(t, db.DB, "alice", "accent_color"); got != "#ff0000" {
		t.Errorf("accent_color = %q, want #ff0000", got)
	}
	if got := prefString(t, db.DB, "alice", "language"); got != "es" {
		t.Errorf("language = %q, want es", got)
	}
	if got := prefString(t, db.DB, "alice", "theme"); got != "dark" {
		t.Errorf("theme = %q, want dark", got)
	}
	if got := prefString(t, db.DB, "alice", "unit_system"); got != "imperial" {
		t.Errorf("unit_system = %q, want imperial", got)
	}
	if got := prefInt(t, db.DB, "alice", "widget_min_width"); got != 200 {
		t.Errorf("widget_min_width = %d, want 200", got)
	}
	if got := prefString(t, db.DB, "alice", "project_name"); got != "My Board" {
		t.Errorf("project_name = %q, want My Board", got)
	}
	if got := prefInt(t, db.DB, "alice", "beta_updates"); got != 1 {
		t.Errorf("beta_updates = %d, want 1", got)
	}
	if got := prefInt(t, db.DB, "alice", "grid_columns_pc"); got != 10 {
		t.Errorf("grid_columns_pc = %d, want 10", got)
	}
}

func TestUpdatePreferences_NamedAccentColorAccepted(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	if code := postPrefs(t, server.URL, s, `{"accent_color":"teal"}`); code != http.StatusOK {
		t.Fatalf("expected 200 for named color, got %d", code)
	}
	if got := prefString(t, db.DB, "alice", "accent_color"); got != "teal" {
		t.Errorf("accent_color = %q, want teal", got)
	}
}

func TestUpdatePreferences_InvalidAccentColor(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	if code := postPrefs(t, server.URL, s, `{"accent_color":"notacolor"}`); code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", code)
	}
}

func TestUpdatePreferences_LanguageTooLong(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	if code := postPrefs(t, server.URL, s, `{"language":"this-is-way-too-long"}`); code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", code)
	}
}

func TestUpdatePreferences_InvalidTheme(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	if code := postPrefs(t, server.URL, s, `{"theme":"neon"}`); code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", code)
	}
}

func TestUpdatePreferences_InvalidUnitSystem(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	if code := postPrefs(t, server.URL, s, `{"unit_system":"kelvin"}`); code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", code)
	}
}

func TestUpdatePreferences_WidgetMinWidthOutOfRange(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	// 10 is below the 50-500 allowed range.
	if code := postPrefs(t, server.URL, s, `{"widget_min_width":10}`); code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", code)
	}
}

func TestUpdatePreferences_ProjectNameTooLong(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	longName := strings.Repeat("a", 65)
	if code := postPrefs(t, server.URL, s, `{"project_name":"`+longName+`"}`); code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", code)
	}
}

// grid_columns is clamped to [3,16] rather than rejected.
func TestUpdatePreferences_GridColumnsClampLow(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	if code := postPrefs(t, server.URL, s, `{"grid_columns":1}`); code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if got := prefInt(t, db.DB, "alice", "grid_columns_pc"); got != 3 {
		t.Errorf("grid_columns_pc = %d, want clamped to 3", got)
	}
}

func TestUpdatePreferences_GridColumnsClampHigh(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	if code := postPrefs(t, server.URL, s, `{"grid_columns":99}`); code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if got := prefInt(t, db.DB, "alice", "grid_columns_pc"); got != 16 {
		t.Errorf("grid_columns_pc = %d, want clamped to 16", got)
	}
}

func TestUpdatePreferences_InvalidBody(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	if code := postPrefs(t, server.URL, s, `{not valid json`); code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", code)
	}
}

// Empty string fields are treated as "not provided" and preserve current values
// (except dashboard_background, which is always written — empty clears it).
func TestUpdatePreferences_EmptyFieldsPreserveCurrent(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	// Seed a known accent color first.
	if code := postPrefs(t, server.URL, s, `{"accent_color":"grape"}`); code != http.StatusOK {
		t.Fatalf("seed failed: %d", code)
	}
	// Now send empty strings — accent should be preserved.
	if code := postPrefs(t, server.URL, s, `{"accent_color":"","language":"","theme":""}`); code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if got := prefString(t, db.DB, "alice", "accent_color"); got != "grape" {
		t.Errorf("accent_color = %q, want preserved grape", got)
	}
}

// project_logo is only updated when explicitly provided (nil = keep current).
func TestUpdatePreferences_LogoTooLarge(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	bigLogo := strings.Repeat("x", 2*1024*1024+1)
	if code := postPrefs(t, server.URL, s, `{"project_logo":"`+bigLogo+`"}`); code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", code)
	}
}
