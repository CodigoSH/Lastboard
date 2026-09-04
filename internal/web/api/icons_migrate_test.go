package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
)

// A 1x1 GIF: the smallest thing that survives the byte sniffing.
var tinyGIF = []byte{
	0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
	0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00,
	0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
	0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
}

// A file, not ":memory:". The migration reads and writes from several
// goroutines at once, and an in-memory SQLite hands each pool connection its
// own private empty database — the second goroutine would find no tables and
// the test would blame the code. A temp file is also what production actually
// uses.
//
// Two owners, because items carry a foreign key to their user and because one
// of the things worth proving is that tidying your board leaves the other one
// alone.
func iconTestDB(t *testing.T) *sql.DB {
	t.Helper()
	wrapper, err := database.InitDB(filepath.Join(t.TempDir(), "icons_test.db"))
	if err != nil {
		t.Fatalf("init test db: %v", err)
	}
	db := wrapper.DB
	t.Cleanup(func() { _ = db.Close() })
	for _, name := range []string{"alice", "bob"} {
		if _, err := db.Exec(
			`INSERT INTO users (username, password, role) VALUES (?, 'x', 'user')`, name,
		); err != nil {
			t.Fatalf("seed user %s: %v", name, err)
		}
	}
	return db
}

func insertItem(t *testing.T, db *sql.DB, userID int, content string) int {
	t.Helper()
	res, err := db.Exec(
		`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'bookmark', 1, 1, 1, 1, ?)`,
		userID, content,
	)
	if err != nil {
		t.Fatalf("insert item: %v", err)
	}
	id, _ := res.LastInsertId()
	return int(id)
}

func readContent(t *testing.T, db *sql.DB, id int) map[string]any {
	t.Helper()
	var raw string
	if err := db.QueryRow(`SELECT content FROM items WHERE id = ?`, id).Scan(&raw); err != nil {
		t.Fatalf("read item %d: %v", id, err)
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		t.Fatalf("item %d content is not JSON: %v", id, err)
	}
	return out
}

// The whole promise of the migration: the icon moves in, and nothing else on
// the bookmark is disturbed.
func TestLocalizeIcons_TouchesOnlyTheIcon(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/gif")
		_, _ = w.Write(tinyGIF)
	}))
	defer srv.Close()

	db := iconTestDB(t)
	id := insertItem(t, db, 1, `{
		"label":"Plex","url":"https://plex.tv","icon":"`+srv.URL+`/plex.gif",
		"iconName":"plex","statusCheck":true,"statusPos":"tr","borderColor":"#ff0000",
		"borderWidth":2,"labelPos":"bottom","visibleTouch":false,"openInNewTab":true
	}`)

	done, failed := LocalizeIcons(context.Background(), db, NewIconHandler(db), nil)
	if done != 1 || failed != 0 {
		t.Fatalf("stored=%d failed=%d, want 1 and 0", done, failed)
	}

	c := readContent(t, db, id)
	icon, _ := c["icon"].(string)
	if len(icon) < len("/api/icons/") || icon[:len("/api/icons/")] != "/api/icons/" {
		t.Errorf("icon = %q, want a stored one", icon)
	}

	// Every other field must have survived the round trip untouched.
	want := map[string]any{
		"label": "Plex", "url": "https://plex.tv", "iconName": "plex",
		"statusCheck": true, "statusPos": "tr", "borderColor": "#ff0000",
		"borderWidth": float64(2), "labelPos": "bottom", "visibleTouch": false,
		"openInNewTab": true,
	}
	for k, v := range want {
		if c[k] != v {
			t.Errorf("%s = %#v, want %#v — the migration changed a field it had no business touching", k, c[k], v)
		}
	}
}

// Anything that is not an http(s) URL is already the user's own, and pulling
// it through the fetcher would be wrong as well as pointless.
func TestLocalizeIcons_LeavesNonRemoteIconsAlone(t *testing.T) {
	db := iconTestDB(t)

	cases := map[string]string{
		"ya guardado": `{"label":"a","icon":"/api/icons/deadbeef"}`,
		"data uri":    `{"label":"b","icon":"data:image/gif;base64,R0lGODlhAQABAAAAACw="}`,
		"emoji":       `{"label":"c","icon":"🚀"}`,
		"vacío":       `{"label":"d","icon":""}`,
		"sin icono":   `{"label":"e"}`,
	}
	ids := map[string]int{}
	before := map[string]map[string]any{}
	for name, content := range cases {
		ids[name] = insertItem(t, db, 1, content)
		before[name] = readContent(t, db, ids[name])
	}

	done, failed := LocalizeIcons(context.Background(), db, NewIconHandler(db), nil)
	if done != 0 || failed != 0 {
		t.Fatalf("stored=%d failed=%d, want nothing to happen", done, failed)
	}
	for name, id := range ids {
		got := readContent(t, db, id)
		if got["icon"] != before[name]["icon"] {
			t.Errorf("%s: icon changed from %#v to %#v", name, before[name]["icon"], got["icon"])
		}
	}
}

// An icon whose host is gone must cost its bookmark nothing: the URL stays,
// so it still works for anyone who can reach it, and the next run tries again.
func TestLocalizeIcons_KeepsTheUrlWhenTheFetchFails(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	db := iconTestDB(t)
	original := srv.URL + "/gone.png"
	id := insertItem(t, db, 1, `{"label":"Ghost","icon":"`+original+`"}`)

	done, failed := LocalizeIcons(context.Background(), db, NewIconHandler(db), nil)
	if done != 0 || failed != 1 {
		t.Fatalf("stored=%d failed=%d, want 0 and 1", done, failed)
	}
	if got := readContent(t, db, id)["icon"]; got != original {
		t.Errorf("icon = %#v, want the original %q kept", got, original)
	}

	// And it is still counted as outstanding, so the retry has something to do.
	counts, err := CountPendingIcons(db, nil)
	if err != nil {
		t.Fatalf("count: %v", err)
	}
	if counts.Pending != 1 {
		t.Errorf("pending = %d, want 1", counts.Pending)
	}
	if counts.Local != 0 {
		t.Errorf("local = %d, want 0 — nothing was stored", counts.Local)
	}
}

// The button in settings tidies your own board, not everyone's.
func TestLocalizeIcons_ScopesToOneOwner(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/gif")
		_, _ = w.Write(tinyGIF)
	}))
	defer srv.Close()

	db := iconTestDB(t)
	mine := insertItem(t, db, 1, `{"label":"mine","icon":"`+srv.URL+`/a.gif"}`)
	theirs := insertItem(t, db, 2, `{"label":"theirs","icon":"`+srv.URL+`/b.gif"}`)

	me := 1
	done, failed := LocalizeIcons(context.Background(), db, NewIconHandler(db), &me)
	if done != 1 || failed != 0 {
		t.Fatalf("stored=%d failed=%d, want 1 and 0", done, failed)
	}
	if got := readContent(t, db, theirs)["icon"].(string); got[:4] != "http" {
		t.Errorf("another user's bookmark was rewritten: %q", got)
	}
	if got := readContent(t, db, mine)["icon"].(string); got[:11] != "/api/icons/" {
		t.Errorf("my bookmark was not stored: %q", got)
	}

	if c, _ := CountPendingIcons(db, &me); c.Pending != 0 || c.Local != 1 {
		t.Errorf("mine: pending=%d local=%d, want 0 and 1", c.Pending, c.Local)
	}
	if c, _ := CountPendingIcons(db, nil); c.Pending != 1 || c.Local != 1 {
		t.Errorf("everyone: pending=%d local=%d, want 1 and 1 (theirs untouched)", c.Pending, c.Local)
	}
}

// Running it twice must be free — the work list is derived from the data, so
// once the board is done there is nothing left to find.
func TestLocalizeIcons_IsIdempotent(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/gif")
		_, _ = w.Write(tinyGIF)
	}))
	defer srv.Close()

	db := iconTestDB(t)
	insertItem(t, db, 1, `{"label":"a","icon":"`+srv.URL+`/a.gif"}`)
	insertItem(t, db, 1, `{"label":"b","icon":"`+srv.URL+`/a.gif"}`) // same bytes

	if done, failed := LocalizeIcons(context.Background(), db, NewIconHandler(db), nil); done != 2 || failed != 0 {
		t.Fatalf("first run: stored=%d failed=%d, want 2 and 0", done, failed)
	}
	if done, failed := LocalizeIcons(context.Background(), db, NewIconHandler(db), nil); done != 0 || failed != 0 {
		t.Errorf("second run did work: stored=%d failed=%d", done, failed)
	}

	// Content addressing: two bookmarks, one identical image, one row.
	var rows int
	if err := db.QueryRow(`SELECT COUNT(*) FROM icons`).Scan(&rows); err != nil {
		t.Fatalf("count icons: %v", err)
	}
	if rows != 1 {
		t.Errorf("icons table has %d rows, want 1 — identical images should be stored once", rows)
	}
}
