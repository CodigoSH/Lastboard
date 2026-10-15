package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"testing"
)

// restoreWithVersion backs the instance up, rewrites the version the backup says it
// came from, empties the items and restores it, and returns the content of the
// Docker widget that comes back.
func restoreWithVersion(t *testing.T, version string) map[string]any {
	t.Helper()
	server, db, cleanup := setupTestServer(t)
	defer cleanup()

	createUser(t, db, "titles", "password", "admin")
	if _, err := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 1, 1, 4, 3, ?)`,
		`{"widgetId":"docker","title":"","refreshSec":30}`); err != nil {
		t.Fatal(err)
	}
	cookie := loginAndGetCookie(t, server, "titles", "password")

	req, _ := http.NewRequest("GET", server.URL+"/api/system/backup", nil)
	req.AddCookie(cookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var backup map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&backup); err != nil {
		t.Fatal(err)
	}
	backup["version"] = version
	blob, _ := json.Marshal(backup)

	db.Exec("DELETE FROM items")

	var b bytes.Buffer
	writer := multipart.NewWriter(&b)
	part, _ := writer.CreateFormFile("backup_file", "backup.json")
	part.Write(blob)
	writer.Close()
	r, _ := http.NewRequest("POST", server.URL+"/api/system/restore", &b)
	r.AddCookie(cookie)
	r.AddCookie(&http.Cookie{Name: "csrf_token", Value: "test-csrf-token"})
	r.Header.Set("X-CSRF-Token", "test-csrf-token")
	r.Header.Set("Content-Type", writer.FormDataContentType())
	rr, err := http.DefaultClient.Do(r)
	if err != nil {
		t.Fatal(err)
	}
	defer rr.Body.Close()
	if rr.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(rr.Body)
		t.Fatalf("restore: %d %s", rr.StatusCode, body)
	}

	var content string
	if err := db.QueryRow(`SELECT content FROM items WHERE type = 'widget'`).Scan(&content); err != nil {
		t.Fatalf("the widget did not come back: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal([]byte(content), &m); err != nil {
		t.Fatal(err)
	}
	return m
}

func TestRestoringAnOldBackupGivesItsWidgetsTheirTitles(t *testing.T) {
	// A version that cannot be read counts as old: filling in an empty title costs
	// nothing, and leaving the widget without the heading it always had does.
	for _, version := range []string{"v1.9.3", "v1.9.3-Beta.03", "v1.8.4", "v0.9.0", "garbage", ""} {
		m := restoreWithVersion(t, version)
		if m["title"] != "Docker" {
			t.Errorf("a widget from a %q backup came back with title %v", version, m["title"])
		}
		if m["refreshSec"] != float64(30) {
			t.Errorf("%q: its other settings did not survive: %v", version, m)
		}
	}
}

func TestRestoringANewBackupLeavesAClearedTitleCleared(t *testing.T) {
	for _, version := range []string{"v1.9.4-Beta.01", "v1.9.4", "v1.10.0", "v1.10.0-Beta.01", "v2.0.0"} {
		m := restoreWithVersion(t, version)
		if m["title"] != "" {
			t.Errorf("a title its owner had cleared came back as %v from a %q backup", m["title"], version)
		}
	}
}
