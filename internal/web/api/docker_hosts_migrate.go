package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
)

// MigrateDockerHosts moves the hosts each Docker widget kept in its content to
// the account that owns the widget, where the configuration screen and the
// Docker page now read them.
//
// Nothing anybody set is lost: an agent's token comes from the widget's secret
// store (or from the content, for a widget so old it still held it there); the
// same host configured in two widgets becomes one host of the account; and the
// settings the widget kept per host — hidden containers, names, addresses, the
// order — are rewritten to the id the host has in the account. A widget that
// showed every host of its owner shows every host, including the ones added
// later; one that showed some of them keeps showing those.
//
// It needs no flag: a widget that has been moved has no hosts in its content any
// more, so running it again — at the next start, or after restoring a backup
// taken before hosts moved — only moves what has not been moved. It returns how
// many widgets it moved.
func MigrateDockerHosts(db *sql.DB) (int, error) {
	type widget struct {
		id      int
		owner   int
		content map[string]any
		hosts   []map[string]any
	}

	rows, err := db.Query(`SELECT id, user_id, COALESCE(content, '') FROM items
		WHERE type = 'widget' AND content LIKE '%"docker"%' ORDER BY id`)
	if err != nil {
		return 0, fmt.Errorf("docker hosts (read): %w", err)
	}
	var widgets []widget
	for rows.Next() {
		var w widget
		var raw string
		if err := rows.Scan(&w.id, &w.owner, &raw); err != nil {
			rows.Close()
			return 0, fmt.Errorf("docker hosts (scan): %w", err)
		}
		if json.Unmarshal([]byte(raw), &w.content) != nil || w.content["widgetId"] != "docker" {
			continue
		}
		list, ok := w.content["hosts"].([]any)
		if !ok {
			continue
		}
		for _, h := range list {
			if m, ok := h.(map[string]any); ok {
				w.hosts = append(w.hosts, m)
			}
		}
		widgets = append(widgets, w)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, fmt.Errorf("docker hosts (rows): %w", err)
	}
	if len(widgets) == 0 {
		return 0, nil
	}

	str := func(m map[string]any, k string) string { s, _ := m[k].(string); return strings.TrimSpace(s) }

	// One pass per owner: its account list grows as its widgets are read, and a
	// widget's choice of hosts is only known to be "all of them" once every
	// widget of that owner has been read.
	owners := map[int][]int{}
	var order []int
	for i, w := range widgets {
		if _, seen := owners[w.owner]; !seen {
			order = append(order, w.owner)
		}
		owners[w.owner] = append(owners[w.owner], i)
	}

	// What each owner already has, read before the transaction opens: a read on
	// another connection while it holds the write lock would wait for itself.
	settings := NewUserSettings(db)
	existing := map[int][]dockerHost{}
	for _, owner := range order {
		existing[owner] = dockerHostsOf(settings, owner)
	}

	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	for _, owner := range order {
		account := existing[owner]
		used := map[string]bool{}
		for _, e := range account {
			used[e.ID] = true
		}
		chosen := map[int][]string{} // widget index → its hosts, by account id
		remap := map[int]map[string]string{}

		for _, i := range owners[owner] {
			w := widgets[i]
			remap[i] = map[string]string{}
			for _, h := range w.hosts {
				oldID := str(h, "id")
				kind := str(h, "type")
				if kind == "" {
					kind = dockerLocal
				}
				if !validDockerKind(kind) {
					continue
				}
				e := dockerHost{Name: str(h, "name"), Type: kind, URL: str(h, "url"), Enabled: true}
				if kind == dockerLocal {
					e.URL = ""
				} else if bareHost(e.URL) == "" {
					continue
				}
				if kind == dockerAgent {
					e.Token = str(h, "token")
					if e.Token == "" && oldID != "" {
						var token string
						if tx.QueryRow(`SELECT value FROM widget_secrets WHERE item_id = ? AND name = ?`,
							w.id, dockerSecretName(oldID)).Scan(&token) == nil {
							e.Token = token
						}
					}
				}
				if e.Name == "" {
					e.Name = "Docker"
				}

				// The same host, configured in another widget, is the same host of
				// the account: same kind, same address, same token.
				id := ""
				for _, a := range account {
					if a.address() == e.address() {
						id = a.ID
						break
					}
				}
				if id == "" {
					id = oldID
					if id == "" || used[id] {
						id = newDockerHostID()
					}
					e.ID = id
					used[id] = true
					account = append(account, e)
				}
				if oldID != "" {
					remap[i][oldID] = id
				}
				if !hasString(chosen[i], id) {
					chosen[i] = append(chosen[i], id)
				}
			}
		}

		blob, err := json.Marshal(account)
		if err != nil {
			return 0, err
		}
		if _, err := tx.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (?, ?, ?)
			ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value`, owner, dockerHostsKey, string(blob)); err != nil {
			return 0, fmt.Errorf("docker hosts (account %d): %w", owner, err)
		}

		all := make([]string, 0, len(account))
		for _, a := range account {
			all = append(all, a.ID)
		}
		for _, i := range owners[owner] {
			w := widgets[i]
			content := w.content
			delete(content, "hosts")
			if sameSet(chosen[i], all) {
				delete(content, "hostIds")
			} else {
				content["hostIds"] = chosen[i]
			}
			rewriteHostKeys(content, remap[i])
			blob, err := json.Marshal(content)
			if err != nil {
				return 0, err
			}
			if _, err := tx.Exec(`UPDATE items SET content = ? WHERE id = ?`, string(blob), w.id); err != nil {
				return 0, fmt.Errorf("docker hosts (widget %d): %w", w.id, err)
			}
			// The tokens live in the account now.
			if _, err := tx.Exec(`DELETE FROM widget_secrets WHERE item_id = ? AND name LIKE 'docker.%'`, w.id); err != nil {
				return 0, fmt.Errorf("docker hosts (secrets %d): %w", w.id, err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return len(widgets), nil
}

// rewriteHostKeys moves what a widget kept per host from the id the host had in
// the widget to the id it has in the account: the per-container settings, keyed
// "host/container", the order of each host's containers, and the host the
// widget had open.
func rewriteHostKeys(content map[string]any, remap map[string]string) {
	if cfg, ok := content["containerConfig"].(map[string]any); ok {
		next := map[string]any{}
		for key, v := range cfg {
			if slash := strings.IndexByte(key, '/'); slash > 0 {
				if to, ok := remap[key[:slash]]; ok {
					key = to + key[slash:]
				}
			}
			next[key] = v
		}
		content["containerConfig"] = next
	}
	if ord, ok := content["containerOrder"].(map[string]any); ok {
		next := map[string]any{}
		for key, v := range ord {
			if to, ok := remap[key]; ok {
				key = to
			}
			next[key] = v
		}
		content["containerOrder"] = next
	}
	if active, ok := content["activeHost"].(string); ok {
		if to, ok := remap[active]; ok {
			content["activeHost"] = to
		}
	}
}

func hasString(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

func sameSet(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	x := append([]string(nil), a...)
	y := append([]string(nil), b...)
	sort.Strings(x)
	sort.Strings(y)
	for i := range x {
		if x[i] != y[i] {
			return false
		}
	}
	return true
}
