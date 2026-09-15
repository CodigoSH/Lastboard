package database

import (
	"database/sql"
	"encoding/json"
	"testing"
)

// legacyProxmox puts a database back into the shape 1.8.0-Beta.05 left it in:
// one host in four settings keys, icons keyed "node|vmid", and a bookmark tied
// to a machine by vmid alone. InitDB has already migrated, so the flag is
// cleared and the old shape written underneath it.
func legacyProxmox(t *testing.T, db *sql.DB, icons map[string]string, bookmark string) {
	t.Helper()
	set := func(k, v string) {
		if _, err := db.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)`, k, v); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := db.Exec(`DELETE FROM system_settings WHERE key IN (?, 'proxmox_hosts')`, proxmoxMigratedKey); err != nil {
		t.Fatal(err)
	}
	set("proxmox_enabled", "1")
	set("proxmox_url", "https://192.168.1.10:8006")
	set("proxmox_token_id", "lastboard@pve!lastboard")
	set("proxmox_token_secret", "a-secret")
	set("proxmox_insecure", "1")
	if icons != nil {
		blob, _ := json.Marshal(icons)
		set("proxmox_icons", string(blob))
	}
	if bookmark != "" {
		// items.user_id has a foreign key, so the owner has to exist first.
		if _, err := db.Exec(
			`INSERT OR IGNORE INTO users (id, username, password, role) VALUES (1, 'probe', 'x', 'admin')`,
		); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(
			`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'bookmark', 0, 0, 1, 1, ?)`, bookmark,
		); err != nil {
			t.Fatal(err)
		}
	}
}

func settingValue(t *testing.T, db *sql.DB, key string) string {
	t.Helper()
	var v string
	_ = db.QueryRow(`SELECT value FROM system_settings WHERE key = ?`, key).Scan(&v)
	return v
}

func TestTheSingleHostBecomesAListOfOne(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	legacyProxmox(t, db, nil, "")

	if err := migrateProxmoxToManyHosts(db); err != nil {
		t.Fatalf("migration failed: %v", err)
	}

	var hosts []migratedHost
	if err := json.Unmarshal([]byte(settingValue(t, db, "proxmox_hosts")), &hosts); err != nil {
		t.Fatalf("the host list is not readable: %v", err)
	}
	if len(hosts) != 1 {
		t.Fatalf("want one host carried over, got %d", len(hosts))
	}
	h := hosts[0]
	if h.ID != LegacyHostID {
		t.Errorf("the carried host must keep the id everything else was migrated to; got %q", h.ID)
	}
	// The secret travels with it. Losing it would silently disconnect an
	// instance that was working a moment earlier.
	if h.URL != "https://192.168.1.10:8006" || h.TokenID != "lastboard@pve!lastboard" || h.Secret != "a-secret" {
		t.Errorf("the connection did not survive intact: %+v", h)
	}
	if !h.Enabled || !h.Insecure {
		t.Errorf("enabled and insecure were dropped: %+v", h)
	}
}

func TestAnInstanceThatNeverConnectedProxmoxGetsNoHost(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	if _, err := db.Exec(`DELETE FROM system_settings WHERE key = ?`, proxmoxMigratedKey); err != nil {
		t.Fatal(err)
	}

	if err := migrateProxmoxToManyHosts(db); err != nil {
		t.Fatalf("migration failed: %v", err)
	}

	var hosts []migratedHost
	if err := json.Unmarshal([]byte(settingValue(t, db, "proxmox_hosts")), &hosts); err != nil {
		t.Fatalf("the host list is not readable: %v", err)
	}
	// A host made of empty strings would draw a broken entry in the settings
	// list for every instance that never used the feature.
	if len(hosts) != 0 {
		t.Fatalf("want no hosts, got %d: %+v", len(hosts), hosts)
	}
}

func TestChosenIconsGainTheHostTheyMeant(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	legacyProxmox(t, db, map[string]string{"pve|106": "/api/icons/abc", "pve|110": "/api/icons/def"}, "")

	if err := migrateProxmoxToManyHosts(db); err != nil {
		t.Fatalf("migration failed: %v", err)
	}

	var icons map[string]string
	if err := json.Unmarshal([]byte(settingValue(t, db, "proxmox_icons")), &icons); err != nil {
		t.Fatalf("the icons are not readable: %v", err)
	}
	if got := icons[LegacyHostID+"|pve|106"]; got != "/api/icons/abc" {
		t.Errorf("want the icon re-keyed under its host, got %q (keys: %v)", got, icons)
	}
	if _, stale := icons["pve|106"]; stale {
		t.Error("the old key is still there, so the same machine now has two icons")
	}
}

func TestRunningTwiceDoesNotPrefixTwice(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	legacyProxmox(t, db, map[string]string{"pve|106": "/api/icons/abc"}, "")

	if err := migrateProxmoxToManyHosts(db); err != nil {
		t.Fatal(err)
	}
	// Clearing the flag is what a half-finished run would leave behind, and it
	// is the state that turns an idempotent-looking migration into a corrupter.
	if _, err := db.Exec(`DELETE FROM system_settings WHERE key = ?`, proxmoxMigratedKey); err != nil {
		t.Fatal(err)
	}
	if err := migrateProxmoxToManyHosts(db); err != nil {
		t.Fatal(err)
	}

	var icons map[string]string
	if err := json.Unmarshal([]byte(settingValue(t, db, "proxmox_icons")), &icons); err != nil {
		t.Fatal(err)
	}
	if _, doubled := icons[LegacyHostID+"|"+LegacyHostID+"|pve|106"]; doubled {
		t.Error("the key was prefixed a second time")
	}
	if got := icons[LegacyHostID+"|pve|106"]; got != "/api/icons/abc" {
		t.Errorf("the icon moved somewhere unexpected: %v", icons)
	}
}

func TestABookmarkTiedToAMachineLearnsWhichHost(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	legacyProxmox(t, db, nil, `{"label":"Plex","url":"http://10.0.0.7","proxmox":{"vmid":106,"node":"pve"}}`)

	if err := migrateProxmoxToManyHosts(db); err != nil {
		t.Fatalf("migration failed: %v", err)
	}

	var content string
	if err := db.QueryRow(`SELECT content FROM items WHERE type = 'bookmark' LIMIT 1`).Scan(&content); err != nil {
		t.Fatal(err)
	}
	var obj map[string]any
	if err := json.Unmarshal([]byte(content), &obj); err != nil {
		t.Fatalf("the bookmark stopped being readable: %v", err)
	}
	px, ok := obj["proxmox"].(map[string]any)
	if !ok {
		t.Fatal("the link disappeared from the bookmark")
	}
	if px["host"] != LegacyHostID {
		t.Errorf("want the link assigned to %q, got %v", LegacyHostID, px["host"])
	}
	// What the operator actually chose has to survive untouched.
	if px["vmid"] != float64(106) || px["node"] != "pve" {
		t.Errorf("the machine it pointed at changed: %v", px)
	}
	if obj["label"] != "Plex" {
		t.Errorf("the rest of the bookmark was damaged: %v", obj)
	}
}

func TestABookmarkWithNoLinkIsLeftAlone(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	const plain = `{"label":"Jellyfin","url":"http://10.0.0.8"}`
	legacyProxmox(t, db, nil, plain)

	if err := migrateProxmoxToManyHosts(db); err != nil {
		t.Fatal(err)
	}

	var content string
	if err := db.QueryRow(`SELECT content FROM items WHERE type = 'bookmark' LIMIT 1`).Scan(&content); err != nil {
		t.Fatal(err)
	}
	if content != plain {
		t.Errorf("a bookmark that names no machine was rewritten:\n got %s\nwant %s", content, plain)
	}
}

func TestAnUnreadableBookmarkDoesNotStopTheMigration(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()
	// Valid enough to be selected by the LIKE, not valid JSON.
	legacyProxmox(t, db, nil, `{"label":"broken","proxmox":`)

	if err := migrateProxmoxToManyHosts(db); err != nil {
		t.Fatalf("one damaged bookmark aborted the whole migration: %v", err)
	}
	if settingValue(t, db, proxmoxMigratedKey) != "1" {
		t.Error("the migration did not record itself, so it will run again every start")
	}
}
