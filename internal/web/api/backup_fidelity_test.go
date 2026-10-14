package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"testing"
)

// restoreBytes posts a backup file to the real restore endpoint.
func restoreBytes(t *testing.T, serverURL string, cookie *http.Cookie, raw []byte) {
	t.Helper()
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	part, _ := w.CreateFormFile("backup_file", "backup.json")
	part.Write(raw)
	w.Close()
	rr, _ := http.NewRequest("POST", serverURL+"/api/system/restore", &b)
	rr.AddCookie(cookie)
	rr.AddCookie(&http.Cookie{Name: "csrf_token", Value: "test-csrf-token"})
	rr.Header.Set("X-CSRF-Token", "test-csrf-token")
	rr.Header.Set("Content-Type", w.FormDataContentType())
	resp, err := http.DefaultClient.Do(rr)
	if err != nil {
		t.Fatal(err)
	}
	out, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("restore: %d %s", resp.StatusCode, out)
	}
}

// The order a phone shows the bookmarks in is something the person arranged by
// hand, and it lives in its own column. A backup that did not carry it brought
// every bookmark back in the default order.
func TestAPhoneOrderSurvivesABackupAndRestore(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")
	db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content, mobile_order) VALUES
		(1, 'bookmark', 1, 1, 1, 1, '{"label":"first-on-desktop"}', 7),
		(1, 'bookmark', 2, 1, 1, 1, '{"label":"no-phone-order"}', NULL),
		(1, 'bookmark', 3, 1, 1, 1, '{"label":"first-on-phone"}', 0)`)
	cookie := loginAndGetCookie(t, server, "boss", "correcthorse")

	req, _ := http.NewRequest("GET", server.URL+"/api/system/backup", nil)
	req.AddCookie(cookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	resp.Body.Close()

	db.Exec(`DELETE FROM items`)
	restoreBytes(t, server.URL, cookie, raw)

	got := map[string]*int{}
	rows, _ := db.Query(`SELECT json_extract(content, '$.label'), mobile_order FROM items`)
	for rows.Next() {
		var label string
		var order *int
		rows.Scan(&label, &order)
		got[label] = order
	}
	rows.Close()
	if len(got) != 3 {
		t.Fatalf("%d bookmarks came back, want 3: %v", len(got), got)
	}
	if o := got["first-on-desktop"]; o == nil || *o != 7 {
		t.Errorf("first-on-desktop lost its phone order: %v", o)
	}
	if o := got["first-on-phone"]; o == nil || *o != 0 {
		t.Errorf("first-on-phone lost its phone order (0 is a position, not nothing): %v", o)
	}
	if got["no-phone-order"] != nil {
		t.Errorf("a bookmark with no phone order was given one: %d", *got["no-phone-order"])
	}
}

// The restore checks a role in lower case and used to store it as written, so a
// file with "Admin" passed and left an account no query for role = 'admin'
// finds: nobody could administer the instance.
func TestARoleIsStoredInLowerCaseWhateverTheFileSays(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")
	cookie := loginAndGetCookie(t, server, "boss", "correcthorse")

	req, _ := http.NewRequest("GET", server.URL+"/api/system/backup", nil)
	req.AddCookie(cookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	resp.Body.Close()

	var file map[string]any
	if err := json.Unmarshal(raw, &file); err != nil {
		t.Fatal(err)
	}
	file["users"].([]any)[0].(map[string]any)["role"] = "Admin"
	edited, _ := json.Marshal(file)
	restoreBytes(t, server.URL, cookie, edited)

	var role string
	if err := db.QueryRow(`SELECT role FROM users WHERE username = 'boss'`).Scan(&role); err != nil {
		t.Fatal(err)
	}
	if role != "admin" {
		t.Fatalf("role stored as %q, want %q", role, "admin")
	}
}

// A row the backup cannot read is a reason to say so. Skipping it produced a
// file that looked complete and silently lacked the bookmark, which the person
// would only find out about after restoring over the original.
func TestABackupNeverSkipsARowItCannotRead(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")
	db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES
		(1, 'bookmark', 1, 1, 1, 1, '{"label":"fine"}'),
		(1, 'bookmark', 'not-a-number', 1, 1, 1, '{"label":"unreadable"}')`)
	cookie := loginAndGetCookie(t, server, "boss", "correcthorse")

	req, _ := http.NewRequest("GET", server.URL+"/api/system/backup", nil)
	req.AddCookie(cookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("backup of an unreadable row answered %d, want 500; body: %.200s", resp.StatusCode, raw)
	}
}

// A backup file is typed by hand as easily as it is exported, so the dashboard
// background it carries is held to the same rule as one typed into the settings:
// a value that could leave the page's url(…) is dropped, the rest of the restore
// goes ahead.
func TestARestoredBackgroundThatCouldLeaveItsCSSValueIsDropped(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")
	cookie := loginAndGetCookie(t, server, "boss", "correcthorse")

	req, _ := http.NewRequest("GET", server.URL+"/api/system/backup", nil)
	req.AddCookie(cookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	resp.Body.Close()

	var file map[string]any
	if err := json.Unmarshal(raw, &file); err != nil {
		t.Fatal(err)
	}
	file["users"].([]any)[0].(map[string]any)["dashboard_background"] = "https://x.example/a.png) , url(https://evil.example/t.png"
	edited, _ := json.Marshal(file)
	restoreBytes(t, server.URL, cookie, edited)

	var bg string
	db.QueryRow(`SELECT COALESCE(dashboard_background, '') FROM users WHERE username = 'boss'`).Scan(&bg)
	if bg != "" {
		t.Errorf("the restored background kept %q", bg)
	}
}
