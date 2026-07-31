package api_test

import (
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

func setupSystemServer(t *testing.T) (*httptest.Server, *database.DB, func()) {
	t.Helper()

	tmp, err := os.CreateTemp("", "lastboard_sys_test_*.db")
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
	systemHandler := api.NewSystemHandler(db.DB)

	mux.Handle("POST /api/login", http.HandlerFunc(authHandler.Login))
	mux.Handle("GET /api/system/backup", protect(http.HandlerFunc(systemHandler.DownloadBackup)))
	mux.Handle("POST /api/system/reset", protect(http.HandlerFunc(systemHandler.FactoryReset)))

	server := httptest.NewServer(mux)
	cleanup := func() {
		server.Close()
		db.Close()
		os.Remove(tmp.Name())
	}
	return server, db, cleanup
}

// ── FactoryReset ──────────────────────────────────────────────────────────────

func TestFactoryReset_NonAdminForbidden(t *testing.T) {
	server, db, cleanup := setupSystemServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "adminpass", "admin")
	createUser(t, db.DB, "bob", "password", "user")
	s := doLogin(t, server.URL, "bob", "password")

	body := `{"password":"password"}`
	req, _ := http.NewRequest("POST", server.URL+"/api/system/reset", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 for non-admin, got %d", resp.StatusCode)
	}
}

func TestFactoryReset_WrongPassword(t *testing.T) {
	server, db, cleanup := setupSystemServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "adminpass", "admin")
	s := doLogin(t, server.URL, "admin", "adminpass")

	body := `{"password":"wrongpass"}`
	req, _ := http.NewRequest("POST", server.URL+"/api/system/reset", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401 for wrong password, got %d", resp.StatusCode)
	}
}

func TestFactoryReset_SecondAdminForbidden(t *testing.T) {
	server, db, cleanup := setupSystemServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "adminpass", "admin")
	createUser(t, db.DB, "admin2", "adminpass", "admin")
	s := doLogin(t, server.URL, "admin2", "adminpass")

	body := `{"password":"adminpass"}`
	req, _ := http.NewRequest("POST", server.URL+"/api/system/reset", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected 403 for second admin, got %d", resp.StatusCode)
	}
}

// ── DownloadBackup ────────────────────────────────────────────────────────────

func TestDownloadBackup_AdminGetsJSON(t *testing.T) {
	server, db, cleanup := setupSystemServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	s := doLogin(t, server.URL, "admin", "password")

	req, _ := http.NewRequest("GET", server.URL+"/api/system/backup", nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var backup map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&backup); err != nil {
		t.Fatalf("backup is not valid JSON: %v", err)
	}
	if backup["users"] == nil {
		t.Error("backup JSON missing 'users' field")
	}
}

func TestDownloadBackup_NonAdminForbidden(t *testing.T) {
	server, db, cleanup := setupSystemServer(t)
	defer cleanup()

	createUser(t, db.DB, "admin", "password", "admin")
	createUser(t, db.DB, "bob", "password", "user")
	s := doLogin(t, server.URL, "bob", "password")

	req, _ := http.NewRequest("GET", server.URL+"/api/system/backup", nil)
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
