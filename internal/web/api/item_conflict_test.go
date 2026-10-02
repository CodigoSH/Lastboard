package api_test

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
)

// patchItem sends an update the way the interface does and returns the status
// and the body.
func patchItem(t *testing.T, serverURL string, s *userSession, id int64, body string) (int, string) {
	t.Helper()
	req, _ := http.NewRequest("PATCH", fmt.Sprintf("%s/api/dashboard/item/%d", serverURL, id), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	out, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, strings.TrimSpace(string(out))
}

// The note a person edits on one device is the note they see on the next. A
// save that was made from an older copy must not silently replace a newer one:
// that is how a note was lost.
func TestASaveFromAnOlderCopyDoesNotOverwriteANewerNote(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "user")
	var alice int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&alice)
	res, _ := db.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'widget', 1, 1, 2, 2, ?)`,
		alice, `{"widgetId":"notepad","text":"first"}`)
	id, _ := res.LastInsertId()
	s := doLogin(t, server.URL, "alice", "password")

	stored := func() string {
		var c string
		db.DB.QueryRow(`SELECT json_extract(content, '$.text') FROM items WHERE id = ?`, id).Scan(&c)
		return c
	}

	// Device B saves while device A still holds "first".
	if code, _ := patchItem(t, server.URL, s, id, `{"content":"{\"widgetId\":\"notepad\",\"text\":\"written on B\"}","expected":{"text":"first"}}`); code != http.StatusOK {
		t.Fatalf("a save whose base is current was refused: %d", code)
	}
	if stored() != "written on B" {
		t.Fatalf("the current save did not land: %q", stored())
	}

	// Device A, still on "first", saves its own edit.
	code, msg := patchItem(t, server.URL, s, id, `{"content":"{\"widgetId\":\"notepad\",\"text\":\"written on A\"}","expected":{"text":"first"}}`)
	if code != http.StatusConflict || msg != "error.conflict" {
		t.Errorf("a save from an older copy answered %d %q, want 409 error.conflict", code, msg)
	}
	if stored() != "written on B" {
		t.Errorf("the older copy overwrote the newer note: %q", stored())
	}

	// Without the guard an update is what it always was.
	if code, _ := patchItem(t, server.URL, s, id, `{"content":"{\"widgetId\":\"notepad\",\"text\":\"forced\"}"}`); code != http.StatusOK || stored() != "forced" {
		t.Errorf("an unguarded save changed behaviour: %d %q", code, stored())
	}
}

// Only the fields named are compared: the appearance of the widget may change
// on one device while a note is edited on another.
func TestOnlyTheGuardedFieldIsCompared(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "user")
	var alice int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&alice)
	res, _ := db.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'widget', 1, 1, 2, 2, ?)`,
		alice, `{"widgetId":"notepad","text":"same","color":"red"}`)
	id, _ := res.LastInsertId()
	s := doLogin(t, server.URL, "alice", "password")

	if code, _ := patchItem(t, server.URL, s, id, `{"content":"{\"widgetId\":\"notepad\",\"text\":\"edited\",\"color\":\"blue\"}","expected":{"text":"same"}}`); code != http.StatusOK {
		t.Errorf("a change elsewhere in the content refused a note that had not moved: %d", code)
	}
}

func TestAGuardCanExpectAFieldToBeAbsent(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "user")
	var alice int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&alice)
	res, _ := db.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'widget', 1, 1, 2, 2, ?)`,
		alice, `{"widgetId":"notepad"}`)
	id, _ := res.LastInsertId()
	s := doLogin(t, server.URL, "alice", "password")

	if code, _ := patchItem(t, server.URL, s, id, `{"content":"{\"widgetId\":\"notepad\",\"text\":\"x\"}","expected":{"text":null}}`); code != http.StatusOK {
		t.Errorf("expecting an absent field on a note with none: %d", code)
	}
	if code, _ := patchItem(t, server.URL, s, id, `{"content":"{\"widgetId\":\"notepad\",\"text\":\"y\"}","expected":{"text":null}}`); code != http.StatusConflict {
		t.Errorf("expecting an absent field on a note that has one: %d, want 409", code)
	}
}

// The field name goes into the statement, so only plain names are let in.
func TestAGuardRefusesAFieldNameThatIsNotAName(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "user")
	var alice int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&alice)
	res, _ := db.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'widget', 1, 1, 2, 2, ?)`,
		alice, `{"widgetId":"notepad","text":"a"}`)
	id, _ := res.LastInsertId()
	s := doLogin(t, server.URL, "alice", "password")

	for _, name := range []string{`text') OR 1=1 --`, `a.b`, `$`, ``, strings.Repeat("a", 40)} {
		body := fmt.Sprintf(`{"content":"{\"widgetId\":\"notepad\",\"text\":\"b\"}","expected":{%q:"a"}}`, name)
		if code, _ := patchItem(t, server.URL, s, id, body); code != http.StatusBadRequest {
			t.Errorf("field %q answered %d, want 400", name, code)
		}
	}
	// A guard with nothing to guard is a malformed request, not a free pass.
	if code, _ := patchItem(t, server.URL, s, id, `{"x":3,"expected":{"text":"a"}}`); code != http.StatusBadRequest {
		t.Errorf("a guard without a content change answered %d, want 400", code)
	}
}

// Somebody else's note is not found, guard or not; it is never a "conflict",
// which would tell them it exists.
func TestAGuardedSaveOnAnotherUsersItemIsNotFound(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "user")
	createUser(t, db.DB, "bob", "password", "user")
	var alice int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&alice)
	res, _ := db.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'widget', 1, 1, 2, 2, ?)`,
		alice, `{"widgetId":"notepad","text":"alice's"}`)
	id, _ := res.LastInsertId()
	bob := doLogin(t, server.URL, "bob", "password")

	if code, _ := patchItem(t, server.URL, bob, id, `{"content":"{\"widgetId\":\"notepad\",\"text\":\"mine\"}","expected":{"text":"alice's"}}`); code != http.StatusNotFound {
		t.Errorf("another user's item answered %d, want 404", code)
	}
}
