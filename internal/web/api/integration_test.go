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

	"github.com/CodigoSH/Lastboard/internal/platform/database"
	"github.com/CodigoSH/Lastboard/internal/web/api"
	"github.com/CodigoSH/Lastboard/internal/web/middleware"
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
	mux.Handle("POST /api/system/restore", protect(http.HandlerFunc(systemHandler.RestoreBackup)))
	mux.Handle("GET /api/dashboard", protect(http.HandlerFunc(dashHandler.GetDashboard)))

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
	// Make sure the admin is user_id 1 to be superadmin

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
