package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"
	"testing"
)

func itoa(n int64) string { return strconv.FormatInt(n, 10) }

// secretReq sends a request as a signed-in user, with the CSRF pair a write needs.
func secretReq(t *testing.T, method, url string, cookie *http.Cookie, body string) (int, string) {
	t.Helper()
	var rdr io.Reader
	if body != "" {
		rdr = strings.NewReader(body)
	}
	req, err := http.NewRequest(method, url, rdr)
	if err != nil {
		t.Fatal(err)
	}
	req.AddCookie(cookie)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "test-csrf-token"})
	req.Header.Set("X-CSRF-Token", "test-csrf-token")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	out, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(out)
}

func TestTheOwnerSetsAndListsWidgetSecretsButNeverReadsThem(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "alice", "correcthorse", "user")
	res, _ := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 0, 0, 1, 1, '{}')`)
	wid, _ := res.LastInsertId()
	url := server.URL + "/api/widget/" + itoa(wid) + "/secrets"
	cookie := loginAndGetCookie(t, server, "alice", "correcthorse")

	code, body := secretReq(t, "PUT", url, cookie, `{"set":{"password":"hunter2-the-secret","header.x-api-key":"k-123"}}`)
	if code != http.StatusOK {
		t.Fatalf("set: %d %s", code, body)
	}
	var names struct{ Names []string }
	json.Unmarshal([]byte(body), &names)
	if strings.Join(names.Names, ",") != "header.x-api-key,password" {
		t.Errorf("names = %v", names.Names)
	}
	if strings.Contains(body, "hunter2") || strings.Contains(body, "k-123") {
		t.Fatalf("the save answer carried a secret: %s", body)
	}

	code, body = secretReq(t, "GET", url, cookie, "")
	if code != http.StatusOK || strings.Contains(body, "hunter2") || strings.Contains(body, "k-123") {
		t.Fatalf("list: %d %s", code, body)
	}

	// The widget's own record, as the board loads it, carries none of it either.
	_, board := secretReq(t, "GET", server.URL+"/api/dashboard", cookie, "")
	if strings.Contains(board, "hunter2") || strings.Contains(board, "k-123") {
		t.Fatal("the board's items carried a widget secret")
	}

	code, body = secretReq(t, "PUT", url, cookie, `{"clear":["password"]}`)
	if code != http.StatusOK || strings.Contains(body, `"password"`) {
		t.Errorf("clear: %d %s", code, body)
	}
}

// Another person's widget cannot be told apart from one that does not exist.
func TestAnotherUsersWidgetSecretsAreNotFound(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "alice", "correcthorse", "user")
	createUser(t, db, "mallory", "correcthorse", "user")
	res, _ := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 0, 0, 1, 1, '{}')`)
	wid, _ := res.LastInsertId()
	res, _ = db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'bookmark', 0, 0, 1, 1, '{}')`)
	bid, _ := res.LastInsertId()
	db.Exec(`INSERT INTO widget_secrets (item_id, name, value) VALUES (?, 'password', 'alice-only')`, wid)

	mallory := loginAndGetCookie(t, server, "mallory", "correcthorse")
	alice := loginAndGetCookie(t, server, "alice", "correcthorse")
	url := server.URL + "/api/widget/" + itoa(wid) + "/secrets"

	for _, m := range []string{"GET", "PUT"} {
		code, body := secretReq(t, m, url, mallory, `{"set":{"password":"stolen"}}`)
		if code != http.StatusNotFound || strings.Contains(body, "alice-only") {
			t.Errorf("%s as another user: %d %s", m, code, body)
		}
	}
	var v string
	db.QueryRow(`SELECT value FROM widget_secrets WHERE item_id = ? AND name = 'password'`, wid).Scan(&v)
	if v != "alice-only" {
		t.Fatalf("another user overwrote the secret: %q", v)
	}

	// A bookmark is not a widget: nothing to keep secret there.
	code, _ := secretReq(t, "PUT", server.URL+"/api/widget/"+itoa(bid)+"/secrets", alice, `{"set":{"password":"x"}}`)
	if code != http.StatusNotFound {
		t.Errorf("secrets on a bookmark: %d", code)
	}
}

func TestWidgetSecretsRefuseBadInput(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "alice", "correcthorse", "user")
	res, _ := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 0, 0, 1, 1, '{}')`)
	wid, _ := res.LastInsertId()
	cookie := loginAndGetCookie(t, server, "alice", "correcthorse")
	url := server.URL + "/api/widget/" + itoa(wid) + "/secrets"
	for label, body := range map[string]string{
		"not json":      `nope`,
		"bad name":      `{"set":{"Bad Name":"x"}}`,
		"empty value":   `{"set":{"password":""}}`,
		"bad clear":     `{"clear":["Bad Name"]}`,
		"wrong type":    `{"set":{"password":5}}`,
		"clear is text": `{"clear":"password"}`,
	} {
		if code, _ := secretReq(t, "PUT", url, cookie, body); code != http.StatusBadRequest {
			t.Errorf("%s: %d, want 400", label, code)
		}
	}
	if code, _ := secretReq(t, "GET", server.URL+"/api/widget/abc/secrets", cookie, ""); code != http.StatusBadRequest {
		t.Errorf("non-numeric id: %d", code)
	}
}

// A restore gives every item a new id; what a widget keeps secret has to follow it.
func TestWidgetSecretsSurviveABackupAndRestore(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin") // id 1, the one who may back up
	res, _ := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 0, 0, 1, 1, '{"widgetId":"x"}')`)
	wid, _ := res.LastInsertId()
	db.Exec(`INSERT INTO widget_secrets (item_id, name, value) VALUES (?, 'password', 'p-1'), (?, 'header.x-api-key', 'k-1')`, wid, wid)
	cookie := loginAndGetCookie(t, server, "boss", "correcthorse")

	req, _ := http.NewRequest("GET", server.URL+"/api/system/backup", nil)
	req.AddCookie(cookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if !bytes.Contains(raw, []byte(`"widget_secrets"`)) || !bytes.Contains(raw, []byte("p-1")) {
		t.Fatalf("the backup does not carry widget secrets: %s", raw)
	}

	// Occupy id 1 with something else, so the restored widget cannot keep its old id by luck.
	db.Exec(`DELETE FROM items`)
	db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'bookmark', 0, 0, 1, 1, '{}')`)

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
	out, _ := io.ReadAll(rresp.Body)
	rresp.Body.Close()
	if rresp.StatusCode != http.StatusOK {
		t.Fatalf("restore: %d %s", rresp.StatusCode, out)
	}

	var newID int64
	if err := db.QueryRow(`SELECT id FROM items WHERE type = 'widget'`).Scan(&newID); err != nil {
		t.Fatalf("the widget did not come back: %v", err)
	}
	got := map[string]string{}
	rows, _ := db.Query(`SELECT name, value FROM widget_secrets WHERE item_id = ?`, newID)
	for rows.Next() {
		var n, v string
		rows.Scan(&n, &v)
		got[n] = v
	}
	rows.Close()
	if got["password"] != "p-1" || got["header.x-api-key"] != "k-1" || len(got) != 2 {
		t.Fatalf("restored secrets = %v (widget id is now %d)", got, newID)
	}
	var stray int
	db.QueryRow(`SELECT COUNT(*) FROM widget_secrets WHERE item_id NOT IN (SELECT id FROM items)`).Scan(&stray)
	if stray != 0 {
		t.Errorf("%d secrets point at no item", stray)
	}
}
