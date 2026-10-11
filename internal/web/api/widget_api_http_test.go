package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// An upstream that records what it was asked, and answers JSON.
func fakeUpstream(t *testing.T, seen *http.Request) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		*seen = *r.Clone(r.Context())
		w.Write([]byte(`{"n": 7}`))
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestFetchByIDSendsTheStoredCredentialsAndTheBrowserNeverHoldsThem(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "alice", "correcthorse", "user")
	cookie := loginAndGetCookie(t, server, "alice", "correcthorse")
	var seen http.Request
	up := fakeUpstream(t, &seen)

	// A preset widget: templates in the content, the key in the store.
	preset := `{"widgetId":"api","preset":"sabnzbd","url":"` + up.URL + `/api?apikey={{key|url}}&x=1","method":"GET",` +
		`"headers":{"Authorization":"Basic {{key|base64}}","X-Const":"yes"}}`
	res, _ := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 0, 0, 1, 1, ?)`, preset)
	pid, _ := res.LastInsertId()
	db.Exec(`INSERT INTO widget_secrets (item_id, name, value) VALUES (?, 'key', 'a b+c')`, pid)

	code, body := secretReq(t, "POST", server.URL+"/api/widget/"+itoa(pid)+"/api-fetch", cookie, `{"paths":["n"]}`)
	if code != 200 || !strings.Contains(body, `"n":7`) {
		t.Fatalf("preset fetch: %d %s", code, body)
	}
	if seen.URL.RawQuery != "apikey=a%20b%2Bc&x=1" || seen.Header.Get("Authorization") != "Basic YSBiK2M=" || seen.Header.Get("X-Const") != "yes" {
		t.Errorf("upstream saw %q, %v", seen.URL.RawQuery, seen.Header)
	}

	// An advanced widget: names in the content, values in the store.
	adv := `{"widgetId":"api","preset":"","url":"` + up.URL + `/x","method":"GET","secret_headers":["X-Api-Key","Missing"]}`
	res, _ = db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 0, 0, 1, 1, ?)`, adv)
	aid, _ := res.LastInsertId()
	db.Exec(`INSERT INTO widget_secrets (item_id, name, value) VALUES (?, 'header.x-api-key', 'sek-ret')`, aid)
	if code, body = secretReq(t, "POST", server.URL+"/api/widget/"+itoa(aid)+"/api-fetch", cookie, `{"paths":["n"]}`); code != 200 {
		t.Fatalf("advanced fetch: %d %s", code, body)
	}
	if seen.Header.Get("X-Api-Key") != "sek-ret" || seen.Header.Get("Missing") != "" {
		t.Errorf("advanced headers: %v", seen.Header)
	}

	// What the board carries has neither the key nor the secret header.
	_, board := secretReq(t, "GET", server.URL+"/api/dashboard", cookie, "")
	for _, leak := range []string{"a b+c", "a%20b", "sek-ret", "YSBiK2M"} {
		if strings.Contains(board, leak) {
			t.Errorf("the board carries %q", leak)
		}
	}
}

func TestFetchByIDStaysWithItsOwnerAndItsKind(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "alice", "correcthorse", "user")
	createUser(t, db, "mallory", "correcthorse", "user")
	var seen http.Request
	up := fakeUpstream(t, &seen)
	res, _ := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 0, 0, 1, 1, ?)`,
		`{"widgetId":"api","url":"`+up.URL+`","secret_headers":["X-Api-Key"]}`)
	wid, _ := res.LastInsertId()
	db.Exec(`INSERT INTO widget_secrets (item_id, name, value) VALUES (?, 'header.x-api-key', 'alice-only')`, wid)
	res, _ = db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 0, 0, 1, 1, '{"widgetId":"clock"}')`)
	cid, _ := res.LastInsertId()

	mallory := loginAndGetCookie(t, server, "mallory", "correcthorse")
	if code, _ := secretReq(t, "POST", server.URL+"/api/widget/"+itoa(wid)+"/api-fetch", mallory, `{"paths":[]}`); code != http.StatusNotFound {
		t.Errorf("another user's widget: %d", code)
	}
	if seen.Header.Get("X-Api-Key") != "" {
		t.Error("the upstream was called with alice's secret")
	}
	alice := loginAndGetCookie(t, server, "alice", "correcthorse")
	if code, _ := secretReq(t, "POST", server.URL+"/api/widget/"+itoa(cid)+"/api-fetch", alice, `{"paths":[]}`); code != http.StatusNotFound {
		t.Errorf("a widget that is not an API one: %d", code)
	}
}

// A backup written by an earlier version carries the credentials in the widget.
// Restoring it moves them, and the restored board does not carry them.
func TestRestoringAnOldBackupMovesAPIWidgetCredentials(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")
	old := `{"widgetId":"api","preset":"paperless","apiKey":"tok-123","url":"http://h/api/statistics/","headers":{"Authorization":"Token tok-123"}}`
	db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 0, 0, 1, 1, ?)`, old)
	cookie := loginAndGetCookie(t, server, "boss", "correcthorse")

	req, _ := http.NewRequest("GET", server.URL+"/api/system/backup", nil)
	req.AddCookie(cookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if !bytes.Contains(raw, []byte("tok-123")) {
		t.Fatal("test setup: the old-shape backup does not carry the key")
	}
	db.Exec(`DELETE FROM items`)

	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	part, _ := w.CreateFormFile("backup_file", "backup.json")
	part.Write(raw)
	w.Close()
	rr, _ := http.NewRequest("POST", server.URL+"/api/system/restore", &b)
	rr.AddCookie(cookie)
	rr.AddCookie(&http.Cookie{Name: "csrf_token", Value: "test-csrf-token"})
	rr.Header.Set("X-CSRF-Token", "test-csrf-token")
	rr.Header.Set("Content-Type", w.FormDataContentType())
	rresp, err := http.DefaultClient.Do(rr)
	if err != nil {
		t.Fatal(err)
	}
	rresp.Body.Close()
	if rresp.StatusCode != 200 {
		t.Fatalf("restore: %d", rresp.StatusCode)
	}

	var id int
	var content string
	if err := db.QueryRow(`SELECT id, content FROM items WHERE type = 'widget'`).Scan(&id, &content); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(content, "tok-123") {
		t.Errorf("the restored widget still carries the key: %s", content)
	}
	var key string
	db.QueryRow(`SELECT value FROM widget_secrets WHERE item_id = ? AND name = 'key'`, id).Scan(&key)
	if key != "tok-123" {
		t.Errorf("stored key = %q", key)
	}
	var m map[string]any
	json.Unmarshal([]byte(content), &m)
	if h, _ := m["headers"].(map[string]any); h["Authorization"] != "Token {{key}}" {
		t.Errorf("headers = %v", m["headers"])
	}
}
