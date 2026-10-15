package database

import (
	"database/sql"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

// widgetAt stores a widget owned by a user who speaks the given language and
// returns its id.
func widgetAt(t *testing.T, db *sql.DB, user int, language, content string) int {
	t.Helper()
	if _, err := db.Exec(
		`INSERT OR IGNORE INTO users (id, username, password, role, language) VALUES (?, ?, 'x', 'user', ?)`,
		user, "u"+language, language,
	); err != nil {
		t.Fatal(err)
	}
	res, err := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'widget', 0, 0, 3, 2, ?)`, user, content)
	if err != nil {
		t.Fatal(err)
	}
	id, _ := res.LastInsertId()
	return int(id)
}

func widgetFields(t *testing.T, db *sql.DB, id int) map[string]any {
	t.Helper()
	var content string
	if err := db.QueryRow(`SELECT content FROM items WHERE id = ?`, id).Scan(&content); err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal([]byte(content), &m); err != nil {
		t.Fatalf("content is not JSON any more: %v (%s)", err, content)
	}
	return m
}

// unflag puts the database back where an upgrade finds it: the widgets as the
// last version wrote them and the flag not yet set. InitDB has already run it.
func unflag(t *testing.T, db *sql.DB) {
	t.Helper()
	if _, err := db.Exec(`DELETE FROM system_settings WHERE key = ?`, widgetTitlesKey); err != nil {
		t.Fatal(err)
	}
}

func TestAWidgetWithNoTitleKeepsTheNameItDrew(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	unflag(t, db)

	dockerBlank := widgetAt(t, db, 1, "en", `{"widgetId":"docker","title":"","refreshSec":30}`)
	dockerAbsent := widgetAt(t, db, 1, "en", `{"widgetId":"docker","hosts":[]}`)
	proxmox := widgetAt(t, db, 1, "en", `{"widgetId":"proxmox","title":"   "}`)
	monitorEs := widgetAt(t, db, 2, "es", `{"widgetId":"monitor","items":[3,4]}`)
	monitorJa := widgetAt(t, db, 3, "ja", `{"widgetId":"monitor","title":""}`)

	if err := migrateWidgetTitles(db); err != nil {
		t.Fatal(err)
	}

	for id, want := range map[int]string{
		dockerBlank: "Docker", dockerAbsent: "Docker", proxmox: "Proxmox",
		monitorEs: "Monitorización", monitorJa: "監視",
	} {
		if got := widgetFields(t, db, id)["title"]; got != want {
			t.Errorf("widget %d: title %v, want %q", id, got, want)
		}
	}

	// The rest of the content is carried over, not rebuilt.
	f := widgetFields(t, db, dockerBlank)
	if f["refreshSec"] != float64(30) || f["widgetId"] != "docker" {
		t.Errorf("the other fields did not survive: %v", f)
	}
	if items, _ := widgetFields(t, db, monitorEs)["items"].([]any); len(items) != 2 {
		t.Errorf("the selected services did not survive: %v", items)
	}
}

// An account whose language is one the interface does not ship, or none at all, reads English.
func TestAnUnknownLanguageFallsBackToEnglish(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	unflag(t, db)

	odd := widgetAt(t, db, 4, "xx", `{"widgetId":"monitor"}`)
	none := widgetAt(t, db, 5, "", `{"widgetId":"monitor"}`)
	if err := migrateWidgetTitles(db); err != nil {
		t.Fatal(err)
	}
	for _, id := range []int{odd, none} {
		if got := widgetFields(t, db, id)["title"]; got != "Monitoring" {
			t.Errorf("widget %d: title %v, want Monitoring", id, got)
		}
	}
}

func TestATitleSomebodyChoseIsNotTouched(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	unflag(t, db)

	id := widgetAt(t, db, 1, "en", `{"widgetId":"docker","title":"Server room"}`)
	other := widgetAt(t, db, 1, "en", `{"widgetId":"clock","city":"Madrid"}`)
	api := widgetAt(t, db, 1, "en", `{"widgetId":"api","url":"https://x"}`)
	bookmark := widgetAt(t, db, 1, "en", `{"widgetId":"docker","title":["not text"]}`)

	if err := migrateWidgetTitles(db); err != nil {
		t.Fatal(err)
	}
	if got := widgetFields(t, db, id)["title"]; got != "Server room" {
		t.Errorf("a title that was typed became %v", got)
	}
	if _, has := widgetFields(t, db, other)["title"]; has {
		t.Error("a widget that never had a heading was given one")
	}
	if _, has := widgetFields(t, db, api)["title"]; has {
		t.Error("the API widget drew its title only when it had one: it must not be given one")
	}
	if _, isList := widgetFields(t, db, bookmark)["title"].([]any); !isList {
		t.Error("a title that is not text was overwritten")
	}
}

// Clearing the title is the way to have no pill. If the pass ran on every start
// the name would come back each time the server restarted.
func TestAClearedTitleStaysCleared(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	unflag(t, db)

	id := widgetAt(t, db, 1, "en", `{"widgetId":"proxmox"}`)
	if err := migrateWidgetTitles(db); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`UPDATE items SET content = ? WHERE id = ?`, `{"widgetId":"proxmox"}`, id); err != nil {
		t.Fatal(err)
	}
	if err := migrateWidgetTitles(db); err != nil {
		t.Fatal(err)
	}
	if _, has := widgetFields(t, db, id)["title"]; has {
		t.Error("the second pass gave the name back to a widget its owner had cleared")
	}
}

// A restore of a backup from before the change brings widgets in the old shape,
// and the flag is already set by then: the restore calls the pass itself.
func TestTheRestoreOfAnOldBackupGivesTheTitlesToo(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	if got := settingValue(t, db, widgetTitlesKey); got != "1" {
		t.Fatalf("InitDB must have run the pass already, flag is %q", got)
	}
	id := widgetAt(t, db, 1, "de", `{"widgetId":"monitor"}`)

	n, err := GiveWidgetsTheirTitles(db)
	if err != nil || n != 1 {
		t.Fatalf("changed %d, err %v", n, err)
	}
	if got := widgetFields(t, db, id)["title"]; got != "Überwachung" {
		t.Errorf("title %v", got)
	}
	if n, _ := GiveWidgetsTheirTitles(db); n != 0 {
		t.Errorf("running it again changed %d widgets", n)
	}
}

// monitorTitles is a copy of what the locale files say, and a copy drifts.
func TestTheMonitorNamesAreTheOnesTheInterfaceShips(t *testing.T) {
	files, err := filepath.Glob(filepath.Join("..", "..", "..", "web", "public", "locales", "*.json"))
	if err != nil || len(files) == 0 {
		t.Fatalf("no locale files found (%v): this test is reading the wrong tree", err)
	}
	if len(files) != len(monitorTitles) {
		t.Errorf("%d locales ship and %d languages are listed", len(files), len(monitorTitles))
	}
	for _, f := range files {
		raw, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		var d map[string]string
		if err := json.Unmarshal(raw, &d); err != nil {
			t.Fatal(err)
		}
		code := filepath.Base(f)
		code = code[:len(code)-len(".json")]
		if monitorTitles[code] != d["widget.monitor.name"] {
			t.Errorf("%s: the interface says %q and the migration writes %q", code, d["widget.monitor.name"], monitorTitles[code])
		}
		for _, key := range []string{"widget.docker.name", "widget.proxmox.name"} {
			want := map[string]string{"widget.docker.name": "Docker", "widget.proxmox.name": "Proxmox"}[key]
			if d[key] != want {
				t.Errorf("%s: %s is %q and the migration assumes %q", code, key, d[key], want)
			}
		}
	}
}
