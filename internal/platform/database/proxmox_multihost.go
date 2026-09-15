package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
)

/*
Moving Proxmox from one host to many.

Until 1.8.0 exactly one Proxmox could be connected, so nothing that referred to
a machine had to say *which* Proxmox it meant. Three things were stored that
way, and all three become ambiguous the moment a second one is added:

  - the connection itself, in four separate settings keys;
  - the icon chosen for a machine, keyed "node|vmid";
  - the machine a bookmark is tied to, keyed by vmid inside the bookmark.

Neither half of those keys is unique across clusters. VMIDs restart at 100 in
each one, and "pve" is the node name a default install gives itself — so two
hypervisors sharing both is the ordinary case, not a corner one. Left alone,
the page would name the wrong service as the one that went down, which is the
single failure the whole feature was built to avoid.

So every reference gains a host id, and everything already stored is assigned
to the host that was already there. Its id is fixed and known — "default" —
precisely so this migration can be written: a generated one would have nothing
to match against.

The id is generated and never the name. A name is the operator's to change, and
if the name were the key, renaming a cluster would orphan every icon and every
bookmark link in it.
*/

// LegacyHostID is the id given to the single host that existed before this.
const LegacyHostID = "default"

const proxmoxMigratedKey = "proxmox_multihost_migrated"

type migratedHost struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	URL      string `json:"url"`
	TokenID  string `json:"token_id"`
	Secret   string `json:"secret,omitempty"`
	Insecure bool   `json:"insecure"`
	Enabled  bool   `json:"enabled"`
}

// migrateProxmoxToManyHosts runs exactly once, guarded by a flag.
//
// A flag and not a schema bump: these migrations re-run on every start, and an
// ungated pass would re-prefix keys that already carry a host on the second
// restart. A version bump would also stop an older binary from opening the
// database at all, which is a heavy price for a settings reshape.
func migrateProxmoxToManyHosts(db *sql.DB) error {
	if _, err := db.Exec(
		`CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT)`,
	); err != nil {
		return fmt.Errorf("proxmox hosts (settings table): %w", err)
	}

	var done string
	_ = db.QueryRow(`SELECT value FROM system_settings WHERE key = ?`, proxmoxMigratedKey).Scan(&done)
	if done == "1" {
		return nil
	}

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("proxmox hosts (begin): %w", err)
	}
	defer tx.Rollback() //nolint:errcheck — a committed transaction ignores this.

	get := func(key string) string {
		var v string
		_ = tx.QueryRow(`SELECT value FROM system_settings WHERE key = ?`, key).Scan(&v)
		return v
	}
	set := func(key, value string) error {
		_, e := tx.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)`, key, value)
		return e
	}

	// 1. The connection becomes a list of one. An instance that never connected
	//    anything gets an empty list rather than a host made of blanks.
	url := get("proxmox_url")
	hosts := []migratedHost{}
	if url != "" {
		hosts = append(hosts, migratedHost{
			ID: LegacyHostID, Name: "Proxmox", URL: url,
			TokenID:  get("proxmox_token_id"),
			Secret:   get("proxmox_token_secret"),
			Insecure: get("proxmox_insecure") != "0",
			Enabled:  get("proxmox_enabled") == "1",
		})
	}
	blob, err := json.Marshal(hosts)
	if err != nil {
		return fmt.Errorf("proxmox hosts (encode): %w", err)
	}
	if err := set("proxmox_hosts", string(blob)); err != nil {
		return fmt.Errorf("proxmox hosts (store): %w", err)
	}

	// 2. Chosen icons: "node|vmid" becomes "host|node|vmid". A key that already
	//    has three parts is left alone, so a half-finished run cannot double it.
	if raw := get("proxmox_icons"); raw != "" {
		var icons map[string]string
		if err := json.Unmarshal([]byte(raw), &icons); err == nil {
			moved := make(map[string]string, len(icons))
			for k, v := range icons {
				if countSeparators(k) >= 2 {
					moved[k] = v
					continue
				}
				moved[LegacyHostID+"|"+k] = v
			}
			out, err := json.Marshal(moved)
			if err != nil {
				return fmt.Errorf("proxmox hosts (icons encode): %w", err)
			}
			if err := set("proxmox_icons", string(out)); err != nil {
				return fmt.Errorf("proxmox hosts (icons store): %w", err)
			}
		}
		// Unreadable icon settings are left exactly as found: losing the icons
		// somebody chose is worse than leaving them for the next version.
	}

	// 3. Bookmarks tied to a machine by hand gain the host they meant. The
	//    association lives inside the bookmark's own content, so this is JSON
	//    surgery on user data — done here, on the server, and never in a
	//    browser that may or may not ever open.
	rows, err := tx.Query(`SELECT id, content FROM items WHERE type = 'bookmark' AND content LIKE '%"proxmox"%'`)
	if err != nil {
		return fmt.Errorf("proxmox hosts (read bookmarks): %w", err)
	}
	type patch struct {
		id      int64
		content string
	}
	var patches []patch
	for rows.Next() {
		var id int64
		var content sql.NullString
		if err := rows.Scan(&id, &content); err != nil {
			rows.Close()
			return fmt.Errorf("proxmox hosts (scan bookmark): %w", err)
		}
		if !content.Valid || content.String == "" {
			continue
		}
		var obj map[string]any
		if err := json.Unmarshal([]byte(content.String), &obj); err != nil {
			continue // A bookmark whose content will not parse is left untouched.
		}
		px, ok := obj["proxmox"].(map[string]any)
		if !ok {
			continue
		}
		if _, already := px["host"]; already {
			continue
		}
		px["host"] = LegacyHostID
		obj["proxmox"] = px
		out, err := json.Marshal(obj)
		if err != nil {
			continue
		}
		patches = append(patches, patch{id: id, content: string(out)})
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return fmt.Errorf("proxmox hosts (bookmark rows): %w", err)
	}
	rows.Close()

	for _, p := range patches {
		if _, err := tx.Exec(`UPDATE items SET content = ? WHERE id = ?`, p.content, p.id); err != nil {
			return fmt.Errorf("proxmox hosts (write bookmark %d): %w", p.id, err)
		}
	}

	if err := set(proxmoxMigratedKey, "1"); err != nil {
		return fmt.Errorf("proxmox hosts (recording the migration): %w", err)
	}
	return tx.Commit()
}

func countSeparators(s string) int {
	n := 0
	for _, r := range s {
		if r == '|' {
			n++
		}
	}
	return n
}
