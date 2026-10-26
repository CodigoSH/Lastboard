package api_test

import (
	"encoding/json"
	"net/http"
	"testing"
)

// A restore replaces everything, so a file it cannot use must be refused before
// anything is touched, with a reason the screen can show. Each case below is a
// file somebody could really pick: one cut short by a failed download, one that
// is not a backup at all, one that would leave the instance without its
// administrator, and one from a newer Lastboard whose additions this one would
// drop without a word.
func TestARestoreRefusesAFileItCannotUseAndKeepsTheData(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "keeper", "password", "admin")
	if _, err := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 1, 1, 2, 2, '{"widgetId":"clock"}')`); err != nil {
		t.Fatal(err)
	}
	cookie := loginAndGetCookie(t, server, "keeper", "password")
	good := downloadBackup(t, server.URL, cookie, "GET", "")

	with := func(change func(map[string]any)) []byte {
		m := map[string]any{}
		if err := json.Unmarshal(good, &m); err != nil {
			t.Fatal(err)
		}
		change(m)
		out, _ := json.Marshal(m)
		return out
	}

	cases := []struct {
		name string
		file []byte
		key  string
	}{
		{"cut short", good[:len(good)/2], "error.invalid_backup_format"},
		{"not a backup", []byte("PK\x03\x04 a zip, not a backup"), "error.invalid_backup_format"},
		{"empty object", []byte(`{}`), "error.invalid_backup_format"},
		{"no administrator", with(func(m map[string]any) {
			for _, u := range m["users"].([]any) {
				u.(map[string]any)["role"] = "user"
			}
		}), "error.invalid_backup_format"},
		{"newer Lastboard", with(func(m map[string]any) { m["version"] = "v99.0.0" }), "backup.newer_version"},
	}
	countItems := func() int {
		var n int
		db.QueryRow(`SELECT COUNT(*) FROM items`).Scan(&n)
		return n
	}
	before := countItems()

	for _, c := range cases {
		code, body := restoreBackup(t, server.URL, cookie, c.file, "")
		if code != http.StatusBadRequest || body != c.key {
			t.Errorf("%s: %d %q, want 400 %q", c.name, code, body, c.key)
		}
		if n := countItems(); n != before {
			t.Fatalf("%s: the refused restore changed the data: %d items, had %d", c.name, n, before)
		}
		var admins int
		db.QueryRow(`SELECT COUNT(*) FROM users WHERE username = 'keeper' AND role = 'admin'`).Scan(&admins)
		if admins != 1 {
			t.Fatalf("%s: the administrator is gone after a refused restore", c.name)
		}
	}

	// The same file, untouched, still restores: the refusals are about the file.
	if code, body := restoreBackup(t, server.URL, cookie, good, ""); code != http.StatusOK {
		t.Errorf("the good backup: %d %s", code, body)
	}
}

// A pre-release or a development build of the same version is not newer: the
// check reads only major.minor.patch, so a build stamped by git describe
// (v1.9.4-50-g0eaa05f) does not refuse the backups of the release it follows.
func TestABackupOfTheSameVersionIsNotNewer(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "keeper", "password", "admin")
	cookie := loginAndGetCookie(t, server, "keeper", "password")
	good := downloadBackup(t, server.URL, cookie, "GET", "")
	var m map[string]any
	if err := json.Unmarshal(good, &m); err != nil {
		t.Fatal(err)
	}
	current, _ := m["version"].(string)
	m["version"] = current + "-Beta.07"
	file, _ := json.Marshal(m)
	if code, body := restoreBackup(t, server.URL, cookie, file, ""); code != http.StatusOK {
		t.Errorf("a pre-release of %s: %d %s", current, code, body)
	}
}
