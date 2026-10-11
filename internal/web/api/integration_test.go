package api_test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
	"golang.org/x/crypto/bcrypt"
)

var testSecret = []byte("super-secret-key-for-integration-tests")

// Helper function to setup the test server with in-memory SQLite
func setupTestServer(t *testing.T) (*httptest.Server, *sql.DB, func()) {
	// Create a real temporary file for SQLite to avoid connection pool :memory: isolation issues
	tmpFile, err := os.CreateTemp("", "lastboard_integration_*.db")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	tmpFile.Close()

	// Initialize DB with the temporary file
	db, err := database.InitDB(tmpFile.Name())
	if err != nil {
		t.Fatalf("Failed to init DB: %v", err)
	}

	mux := http.NewServeMux()

	// Handlers
	authHandler := api.NewAuthHandler(db.DB, testSecret)
	systemHandler := api.NewSystemHandler(db.DB)
	dashHandler := api.NewDashboardHandler(db.DB)

	// Auth Middleware
	protect := middleware.AuthRequired(db.DB, testSecret)

	// Routes
	mux.Handle("POST /api/login", http.HandlerFunc(authHandler.Login))
	mux.Handle("GET /api/system/backup", protect(http.HandlerFunc(systemHandler.DownloadBackup)))
	mux.Handle("POST /api/system/backup", protect(http.HandlerFunc(systemHandler.DownloadProtectedBackup)))
	mux.Handle("POST /api/system/restore", protect(http.HandlerFunc(systemHandler.RestoreBackup)))
	mux.Handle("GET /api/dashboard", protect(http.HandlerFunc(dashHandler.GetDashboard)))
	mux.Handle("GET /api/monitor/settings", protect(http.HandlerFunc(api.NewMonitorHandler(db.DB).GetSettings)))
	mux.Handle("GET /api/widget/{id}/secrets", protect(http.HandlerFunc(api.NewWidgetSecretsHandler(db.DB).List)))
	mux.Handle("PUT /api/widget/{id}/secrets", protect(http.HandlerFunc(api.NewWidgetSecretsHandler(db.DB).Update)))
	mux.Handle("POST /api/widget/{id}/api-fetch", protect(http.HandlerFunc(api.NewWidgetAPIHandler(db.DB).Fetch)))
	mux.Handle("GET /api/widget/{id}/remote-stats", protect(http.HandlerFunc(api.NewRemoteStatsHandler(db.DB).Get)))
	mux.Handle("POST /api/widget/remote-stats/test", protect(http.HandlerFunc(api.NewRemoteStatsHandler(db.DB).Test)))
	mux.Handle("POST /api/monitor/settings", protect(http.HandlerFunc(api.NewMonitorHandler(db.DB).UpdateSettings)))

	server := httptest.NewServer(mux)

	cleanup := func() {
		server.Close()
		db.Close()
		os.Remove(tmpFile.Name())
	}

	return server, db.DB, cleanup
}

func createUser(t *testing.T, db *sql.DB, username, password, role string) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}
	_, err = db.Exec("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", username, string(hash), role)
	if err != nil {
		t.Fatalf("Failed to insert user: %v", err)
	}
}

func TestLoginSuccess(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()

	createUser(t, db, "testuser", "correcthorse", "user")

	body := `{"username": "testuser", "password": "correcthorse"}`
	resp, err := http.Post(server.URL+"/api/login", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("Failed to post: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	// Check if session_token cookie is present
	found := false
	for _, cookie := range resp.Cookies() {
		if cookie.Name == "session_token" && cookie.Value != "" {
			found = true
			break
		}
	}
	if !found {
		t.Error("Expected session_token cookie to be set")
	}
}

func TestLoginFailedRateLimit(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()

	createUser(t, db, "rateuser", "correcthorse", "user")

	// 5 failed attempts
	for i := 0; i < 5; i++ {
		body := `{"username": "rateuser", "password": "wrongpassword"}`
		resp, _ := http.Post(server.URL+"/api/login", "application/json", strings.NewReader(body))
		resp.Body.Close()
	}

	// 6th attempt should hit rate limit
	body := `{"username": "rateuser", "password": "wrongpassword"}`
	resp, err := http.Post(server.URL+"/api/login", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("Failed to post: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusTooManyRequests {
		t.Errorf("Expected status 429 Too Many Requests, got %d", resp.StatusCode)
	}

	// Verify DB record
	var count int
	var lockedUntil sql.NullTime
	err = db.QueryRow("SELECT count, locked_until FROM login_attempts WHERE ip = ?", "127.0.0.1").Scan(&count, &lockedUntil)
	if err != nil {
		t.Fatalf("Failed to query DB for login attempts: %v", err)
	}

	if count < 5 {
		t.Errorf("Expected at least 5 failed attempts in DB, got %d", count)
	}
	if !lockedUntil.Valid || lockedUntil.Time.Before(time.Now()) {
		t.Errorf("Expected locked_until to be in the future, got %v", lockedUntil)
	}
}

func TestLoginClearsRateLimitOnSuccess(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()

	createUser(t, db, "clearuser", "correcthorse", "user")

	// 4 failed attempts
	for i := 0; i < 4; i++ {
		body := `{"username": "clearuser", "password": "wrongpassword"}`
		resp, _ := http.Post(server.URL+"/api/login", "application/json", strings.NewReader(body))
		resp.Body.Close()
	}

	// 1 successful attempt
	body := `{"username": "clearuser", "password": "correcthorse"}`
	resp, err := http.Post(server.URL+"/api/login", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("Failed to post: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	// Verify DB record is cleared
	var count int
	err = db.QueryRow("SELECT count FROM login_attempts WHERE ip = ?", "127.0.0.1").Scan(&count)
	if err != sql.ErrNoRows {
		t.Errorf("Expected rate limit record to be deleted, got err %v (count %d)", err, count)
	}
}

func loginAndGetCookie(t *testing.T, server *httptest.Server, username, password string) *http.Cookie {
	body := fmt.Sprintf(`{"username": "%s", "password": "%s"}`, username, password)
	resp, err := http.Post(server.URL+"/api/login", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("Failed to login: %v", err)
	}
	defer resp.Body.Close()

	for _, c := range resp.Cookies() {
		if c.Name == "session_token" {
			return c
		}
	}
	t.Fatalf("Failed to get session_token cookie")
	return nil
}

func TestBackupAndRestore(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()

	createUser(t, db, "adminBackup", "password", "admin")
	// Admin with the lowest ID becomes the first admin (system administrator)

	// Create 2 items
	_, err := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'bookmark', 1, 1, 1, 1, '{}'), (1, 'group', 2, 2, 2, 2, '{}')`)
	if err != nil {
		t.Fatalf("Failed to create items: %v", err)
	}

	cookie := loginAndGetCookie(t, server, "adminBackup", "password")

	// Get Backup
	req, _ := http.NewRequest("GET", server.URL+"/api/system/backup", nil)
	req.AddCookie(cookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("Backup request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 for backup, got %d", resp.StatusCode)
	}

	var backupData map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&backupData); err != nil {
		t.Fatalf("Failed to parse backup JSON: %v", err)
	}
	backupJSON, _ := json.Marshal(backupData)

	// Delete items from DB directly
	db.Exec("DELETE FROM items")

	var count int
	db.QueryRow("SELECT COUNT(*) FROM items").Scan(&count)
	if count != 0 {
		t.Fatalf("Failed to delete items before restore")
	}

	// Restore Backup requires multipart/form-data
	var b bytes.Buffer
	writer := multipart.NewWriter(&b)
	part, err := writer.CreateFormFile("backup_file", "backup.json")
	if err != nil {
		t.Fatalf("Failed to create form file: %v", err)
	}
	part.Write(backupJSON)
	writer.Close()

	reqRestore, _ := http.NewRequest("POST", server.URL+"/api/system/restore", &b)
	reqRestore.AddCookie(cookie)
	reqRestore.AddCookie(&http.Cookie{Name: "csrf_token", Value: "test-csrf-token"})
	reqRestore.Header.Set("X-CSRF-Token", "test-csrf-token")
	reqRestore.Header.Set("Content-Type", writer.FormDataContentType())

	respRestore, err := http.DefaultClient.Do(reqRestore)
	if err != nil {
		t.Fatalf("Restore request failed: %v", err)
	}
	defer respRestore.Body.Close()

	if respRestore.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(respRestore.Body)
		t.Fatalf("Expected 200 for restore, got %d. Body: %s", respRestore.StatusCode, string(respBody))
	}

	// Verify 2 items exist
	db.QueryRow("SELECT COUNT(*) FROM items").Scan(&count)
	if count != 2 {
		t.Errorf("Expected 2 items after restore, got %d", count)
	}
}

// TestRestoreBackup_DashboardsAndParents characterizes the complex restore paths
// that the basic TestBackupAndRestore does not exercise: dashboard remapping,
// parent_id two-pass remapping, and multi-user ownership. It freezes the current
// behavior so a future refactor of RestoreBackup is caught if it diverges.
func TestRestoreBackup_DashboardsAndParents(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()

	createUser(t, db, "adminBackup", "password", "admin") // id 1
	createUser(t, db, "user2", "password", "user")        // id 2

	// Dashboard owned by the admin.
	if _, err := db.Exec(`INSERT INTO dashboards (user_id, name, position, is_default) VALUES (1, 'Main', 0, 1)`); err != nil {
		t.Fatalf("seed dashboard: %v", err)
	}
	var dashID int
	db.QueryRow("SELECT id FROM dashboards WHERE name='Main'").Scan(&dashID)

	// Parent (group) + child (bookmark with parent_id) inside that dashboard.
	res, err := db.Exec(`INSERT INTO items (user_id, dashboard_id, type, x, y, w, h, content) VALUES (1, ?, 'group', 1, 1, 4, 4, '{}')`, dashID)
	if err != nil {
		t.Fatalf("seed parent: %v", err)
	}
	parentID, _ := res.LastInsertId()
	if _, err := db.Exec(`INSERT INTO items (user_id, dashboard_id, parent_id, type, x, y, w, h, content) VALUES (1, ?, ?, 'bookmark', 1, 1, 1, 1, '{}')`, dashID, parentID); err != nil {
		t.Fatalf("seed child: %v", err)
	}
	// An item owned by the second (non-admin) user.
	if _, err := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (2, 'bookmark', 5, 5, 1, 1, '{}')`); err != nil {
		t.Fatalf("seed user2 item: %v", err)
	}

	cookie := loginAndGetCookie(t, server, "adminBackup", "password")

	// Download the backup (real serialization, including owners/dashboards/parent_id).
	req, _ := http.NewRequest("GET", server.URL+"/api/system/backup", nil)
	req.AddCookie(cookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("backup request: %v", err)
	}
	defer resp.Body.Close()
	var backupData map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&backupData)
	backupJSON, _ := json.Marshal(backupData)

	// Wipe everything that the restore must rebuild.
	db.Exec("DELETE FROM items")
	db.Exec("DELETE FROM dashboards")
	db.Exec("DELETE FROM users WHERE username='user2'")

	// Restore.
	var b bytes.Buffer
	writer := multipart.NewWriter(&b)
	part, _ := writer.CreateFormFile("backup_file", "backup.json")
	part.Write(backupJSON)
	writer.Close()

	reqRestore, _ := http.NewRequest("POST", server.URL+"/api/system/restore", &b)
	reqRestore.AddCookie(cookie)
	reqRestore.AddCookie(&http.Cookie{Name: "csrf_token", Value: "test-csrf-token"})
	reqRestore.Header.Set("X-CSRF-Token", "test-csrf-token")
	reqRestore.Header.Set("Content-Type", writer.FormDataContentType())
	respRestore, err := http.DefaultClient.Do(reqRestore)
	if err != nil {
		t.Fatalf("restore request: %v", err)
	}
	defer respRestore.Body.Close()
	if respRestore.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(respRestore.Body)
		t.Fatalf("expected 200 for restore, got %d. Body: %s", respRestore.StatusCode, string(body))
	}

	// Both users restored.
	var userCount int
	db.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)
	if userCount != 2 {
		t.Errorf("expected 2 users after restore, got %d", userCount)
	}

	// Dashboard restored and still owned by the admin.
	var adminID, dashOwner int
	db.QueryRow("SELECT id FROM users WHERE username='adminBackup'").Scan(&adminID)
	if err := db.QueryRow("SELECT user_id FROM dashboards WHERE name='Main'").Scan(&dashOwner); err != nil {
		t.Fatalf("dashboard not restored: %v", err)
	}
	if dashOwner != adminID {
		t.Errorf("dashboard owner = %d, want admin %d", dashOwner, adminID)
	}

	// All three items restored.
	var itemCount int
	db.QueryRow("SELECT COUNT(*) FROM items").Scan(&itemCount)
	if itemCount != 3 {
		t.Errorf("expected 3 items after restore, got %d", itemCount)
	}

	// Child's parent_id remapped to the restored parent (two-pass logic).
	var newParentID int
	db.QueryRow("SELECT id FROM items WHERE type='group'").Scan(&newParentID)
	var childParent sql.NullInt64
	if err := db.QueryRow("SELECT parent_id FROM items WHERE type='bookmark' AND x=1 AND y=1").Scan(&childParent); err != nil {
		t.Fatalf("child item not found: %v", err)
	}
	if !childParent.Valid || int(childParent.Int64) != newParentID {
		t.Errorf("child parent_id = %v, want restored parent %d", childParent, newParentID)
	}

	// Parent item's dashboard_id remapped to the restored dashboard.
	var newDashID int
	db.QueryRow("SELECT id FROM dashboards WHERE name='Main'").Scan(&newDashID)
	var parentDash sql.NullInt64
	db.QueryRow("SELECT dashboard_id FROM items WHERE type='group'").Scan(&parentDash)
	if !parentDash.Valid || int(parentDash.Int64) != newDashID {
		t.Errorf("parent dashboard_id = %v, want restored dashboard %d", parentDash, newDashID)
	}
}

func TestDashboardIsolation(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()

	createUser(t, db, "userA", "password", "user")
	createUser(t, db, "userB", "password", "user")

	var userAID int
	db.QueryRow("SELECT id FROM users WHERE username = 'userA'").Scan(&userAID)

	_, err := db.Exec("INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'notepad', 0, 0, 1, 1, '{}')", userAID)
	if err != nil {
		t.Fatalf("Failed to insert item for UserA: %v", err)
	}

	// Login as UserB
	cookie := loginAndGetCookie(t, server, "userB", "password")

	// Get Dashboard for UserB
	req, _ := http.NewRequest("GET", server.URL+"/api/dashboard", nil)
	req.AddCookie(cookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("Failed to get dashboard: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 for dashboard, got %d", resp.StatusCode)
	}

	var result []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("Failed to parse dashboard JSON: %v", err)
	}

	if len(result) != 0 {
		t.Errorf("Expected 0 items for userB, got %d", len(result))
	}
}

// A reverse proxy does not replace X-Forwarded-For, it appends to it: nginx's
// $proxy_add_x_forwarded_for adds the peer to whatever the client already sent.
// So the leftmost entry is written by the client, and reading it means the
// caller chooses their own identity — the lockout counts each fake address
// separately and never fires.
//
// The rightmost entry is the one the proxy in front of us appended, which is
// the only one we have any reason to believe.
func TestLockoutCannotBeEvadedByForgingForwardedFor(t *testing.T) {
	t.Setenv("TRUST_PROXY", "true")

	server, db, cleanup := setupTestServer(t)
	defer cleanup()

	createUser(t, db, "forgeuser", "correcthorse", "user")

	attempt := func(forwarded string) int {
		req, err := http.NewRequest(http.MethodPost, server.URL+"/api/login",
			strings.NewReader(`{"username": "forgeuser", "password": "wrongpassword"}`))
		if err != nil {
			t.Fatal(err)
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Forwarded-For", forwarded)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		return resp.StatusCode
	}

	// One attacker, behind one proxy, inventing a new left-hand address each
	// time. Everything after the comma is what the proxy really saw.
	var last int
	for i := 0; i < 12; i++ {
		last = attempt(fmt.Sprintf("10.1.2.%d, 203.0.113.7", i))
	}

	if last != http.StatusTooManyRequests {
		t.Errorf("after 12 attempts from the same real client the answer was %d; "+
			"the lockout is being evaded by forging the header", last)
	}
}

// The monitoring settings are readable by everyone — the top bar and the
// history drawer need the mode to know whether the server is probing — but the
// destination and its token are the admin's credentials for their own
// ntfy/gotify channel. Handed to every account, anyone could publish into it
// and, on ntfy and gotify, subscribe and read the alerts of every service the
// admin watches.
func TestMonitorSettingsHideTheNotificationCredentialsFromNonAdmins(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()

	if _, err := db.Exec(
		"INSERT INTO system_settings (key, value) VALUES ('monitoring_notify_url', ?), ('monitoring_notify_token', ?), ('monitoring_notify_type', 'ntfy')",
		"https://ntfy.sh/the-admins-private-topic", "tk_secret_bearer_token",
	); err != nil {
		t.Fatal(err)
	}

	createUser(t, db, "boss", "correcthorse", "admin")
	createUser(t, db, "guest", "correcthorse", "user")

	read := func(username string) map[string]any {
		cookie := loginAndGetCookie(t, server, username, "correcthorse")
		req, err := http.NewRequest(http.MethodGet, server.URL+"/api/monitor/settings", nil)
		if err != nil {
			t.Fatal(err)
		}
		req.AddCookie(cookie)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		var out map[string]any
		if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
			t.Fatalf("%s: %v", username, err)
		}
		return out
	}

	admin := read("boss")
	if admin["notify_url"] != "https://ntfy.sh/the-admins-private-topic" || admin["notify_has_token"] != true {
		t.Errorf("the admin can no longer read their own settings: %v", admin)
	}
	// The token itself is never sent back, not even to the admin who saved it.
	if tok, present := admin["notify_token"]; present && tok != "" {
		t.Errorf("the saved token came back in the settings: %v", tok)
	}

	guest := read("guest")
	if guest["notify_url"] != "" || guest["notify_token"] != nil || guest["notify_has_token"] != false {
		t.Errorf("a plain user was handed the notification credentials: url=%q token=%q",
			guest["notify_url"], guest["notify_token"])
	}
	// What they do need still arrives.
	if guest["mode"] == "" || guest["notify_type"] != "ntfy" {
		t.Errorf("a plain user lost the settings they legitimately read: %v", guest)
	}
}
