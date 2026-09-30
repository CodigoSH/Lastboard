package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"testing"
)

func downloadBackup(t *testing.T, serverURL string, cookie *http.Cookie, method, body string) []byte {
	t.Helper()
	req, _ := http.NewRequest(method, serverURL+"/api/system/backup", strings.NewReader(body))
	req.AddCookie(cookie)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "test-csrf-token"})
	req.Header.Set("X-CSRF-Token", "test-csrf-token")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	out, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("%s backup: %d %s", method, resp.StatusCode, out)
	}
	return out
}

func restoreBackup(t *testing.T, serverURL string, cookie *http.Cookie, file []byte, password string) (int, string) {
	t.Helper()
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	part, _ := w.CreateFormFile("backup_file", "backup.json")
	part.Write(file)
	if password != "" {
		w.WriteField("password", password)
	}
	w.Close()

	req, _ := http.NewRequest("POST", serverURL+"/api/system/restore", &b)
	req.AddCookie(cookie)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "test-csrf-token"})
	req.Header.Set("X-CSRF-Token", "test-csrf-token")
	req.Header.Set("Content-Type", w.FormDataContentType())
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	out, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, strings.TrimSpace(string(out))
}

const testProxmoxHosts = `[{"id":"h1","name":"lab","url":"https://pve:8006","token_id":"root@pam!lb","secret":"tok-123"}]`

// A protected backup is unreadable without the password, refuses a wrong one
// with a message that says so, and brings back everything — including the
// Proxmox token the plain backup never used to carry.
func TestProtectedBackupRoundTrip(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()

	createUser(t, db, "adminProtected", "password", "admin")
	if _, err := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 1, 1, 2, 2, '{"headers":{"X-Api-Key":"sonarr-key-777"}}')`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('proxmox_hosts', ?)`, testProxmoxHosts); err != nil {
		t.Fatal(err)
	}
	db.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('monitoring_notify_token', 'ntfy-secret-555'), ('monitoring_interval_sec', '45')`)
	cookie := loginAndGetCookie(t, server, "adminProtected", "password")

	sealed := downloadBackup(t, server.URL, cookie, "POST", `{"password":"hunter2 hunter2"}`)
	for _, leak := range []string{"adminProtected", "sonarr-key-777", "tok-123", "ntfy-secret-555"} {
		if bytes.Contains(sealed, []byte(leak)) {
			t.Fatalf("the protected file contains %q in the clear", leak)
		}
	}

	// Lose everything the backup holds.
	db.Exec("DELETE FROM items")
	db.Exec("DELETE FROM system_settings WHERE key IN ('proxmox_hosts', 'monitoring_notify_token', 'monitoring_interval_sec')")

	if code, msg := restoreBackup(t, server.URL, cookie, sealed, ""); code != http.StatusBadRequest || msg != "backup.password_required" {
		t.Errorf("no password: got %d %q", code, msg)
	}
	if code, msg := restoreBackup(t, server.URL, cookie, sealed, "not it"); code != http.StatusUnauthorized || msg != "backup.wrong_password" {
		t.Errorf("wrong password: got %d %q", code, msg)
	}
	var n int
	db.QueryRow("SELECT COUNT(*) FROM items").Scan(&n)
	if n != 0 {
		t.Fatalf("a refused restore still wrote %d items", n)
	}

	if code, msg := restoreBackup(t, server.URL, cookie, sealed, "hunter2 hunter2"); code != http.StatusOK {
		t.Fatalf("right password: got %d %q", code, msg)
	}
	db.QueryRow("SELECT COUNT(*) FROM items").Scan(&n)
	if n != 1 {
		t.Errorf("items after restore: %d, want 1", n)
	}
	var hosts string
	db.QueryRow(`SELECT value FROM system_settings WHERE key = 'proxmox_hosts'`).Scan(&hosts)
	if hosts != testProxmoxHosts {
		t.Errorf("Proxmox hosts after restore = %q, want the token back", hosts)
	}
	for key, want := range map[string]string{"monitoring_notify_token": "ntfy-secret-555", "monitoring_interval_sec": "45"} {
		var got string
		db.QueryRow(`SELECT value FROM system_settings WHERE key = ?`, key).Scan(&got)
		if got != want {
			t.Errorf("%s after restore = %q, want %q", key, got, want)
		}
	}
}

// Without a password the file is what it always was, so a browser that has not
// reloaded since the update still gets a working backup — now with the Proxmox
// hosts in it.
func TestPlainBackupStillWorksAndCarriesProxmox(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()

	createUser(t, db, "adminPlain", "password", "admin")
	db.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('proxmox_hosts', ?)`, testProxmoxHosts)
	cookie := loginAndGetCookie(t, server, "adminPlain", "password")

	for name, file := range map[string][]byte{
		"GET":         downloadBackup(t, server.URL, cookie, "GET", ""),
		"POST, empty": downloadBackup(t, server.URL, cookie, "POST", `{"password":""}`),
	} {
		var parsed struct {
			Encrypted bool              `json:"encrypted"`
			Users     []any             `json:"users"`
			Settings  map[string]string `json:"settings"`
		}
		if err := json.Unmarshal(file, &parsed); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		if parsed.Encrypted || len(parsed.Users) != 1 {
			t.Errorf("%s: not a plain backup (encrypted=%v users=%d)", name, parsed.Encrypted, len(parsed.Users))
		}
		if parsed.Settings["proxmox_hosts"] != testProxmoxHosts {
			t.Errorf("%s: Proxmox hosts missing from the backup", name)
		}
	}
}

// A restore writes the settings the backup format names and nothing else, so a
// crafted file cannot set the session secret.
func TestRestoreIgnoresSettingsItDoesNotCarry(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()

	createUser(t, db, "adminScope", "password", "admin")
	cookie := loginAndGetCookie(t, server, "adminScope", "password")

	file := downloadBackup(t, server.URL, cookie, "GET", "")
	var doc map[string]any
	json.Unmarshal(file, &doc)
	doc["settings"] = map[string]string{"proxmox_icons": `{}`, "session_secret": "attacker-chosen"}
	crafted, _ := json.Marshal(doc)

	if code, msg := restoreBackup(t, server.URL, cookie, crafted, ""); code != http.StatusOK {
		t.Fatalf("restore: %d %q", code, msg)
	}
	var secret string
	db.QueryRow(`SELECT value FROM system_settings WHERE key = 'session_secret'`).Scan(&secret)
	if secret == "attacker-chosen" {
		t.Error("a restore wrote a setting the backup format does not carry")
	}
}
