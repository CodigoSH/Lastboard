package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
)

// widgetTitlesKey remembers that the titles have been given out.
const widgetTitlesKey = "widget_titles_on_the_border"

// monitorTitles is the name the Monitoring widget drew as its heading, in each of
// the languages the interface ships — web/public/locales, key widget.monitor.name.
// Docker and Proxmox are the same word everywhere. widget_titles_test.go reads the
// locale files and holds the two equal, so a name edited there cannot drift from
// the one written into somebody's board here.
var monitorTitles = map[string]string{
	"ar": "المراقبة", "bn": "পর্যবেক্ষণ", "de": "Überwachung", "el": "Παρακολούθηση",
	"en": "Monitoring", "es": "Monitorización", "fa": "پایش", "fr": "Supervision",
	"hi": "निगरानी", "id": "Pemantauan", "it": "Monitoraggio", "ja": "監視",
	"ko": "모니터링", "nl": "Monitoring", "pl": "Monitorowanie", "pt": "Monitoramento",
	"ru": "Мониторинг", "tr": "İzleme", "ur": "نگرانی", "zh": "监控",
}

// defaultWidgetTitle is what a widget showed as its heading while it had no title of
// its own, or "" for a widget that never had a heading.
func defaultWidgetTitle(widgetID, language string) string {
	switch widgetID {
	case "docker":
		return "Docker"
	case "proxmox":
		return "Proxmox"
	case "monitor":
		if name, ok := monitorTitles[language]; ok {
			return name
		}
		return monitorTitles["en"]
	}
	return ""
}

// migrateWidgetTitles runs exactly once, guarded by a flag.
//
// Docker, Monitoring and Proxmox used to print their name as a heading inside the
// tile when nobody had typed one. The name now goes where every widget's goes — a
// pill on the tile's border, and no pill for no name — so a widget left blank would
// lose a word it has always shown. Each of them is given the name it was drawing,
// in the language of the account that owns it, and from then on it is an ordinary
// title the owner can change or clear.
//
// A flag, because clearing the title is a choice: an ungated pass would put the
// word back on every restart.
func migrateWidgetTitles(db *sql.DB) error {
	if _, err := db.Exec(
		`CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT)`,
	); err != nil {
		return fmt.Errorf("widget titles (settings table): %w", err)
	}
	var done string
	_ = db.QueryRow(`SELECT value FROM system_settings WHERE key = ?`, widgetTitlesKey).Scan(&done)
	if done == "1" {
		return nil
	}
	n, err := GiveWidgetsTheirTitles(db)
	if err != nil {
		return err
	}
	if _, err := db.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, '1')`, widgetTitlesKey); err != nil {
		return fmt.Errorf("widget titles (recording): %w", err)
	}
	if n > 0 {
		slog.Info("widgets given the name they used to draw as a heading", "widgets", n)
	}
	return nil
}

// GiveWidgetsTheirTitles writes the old default name into every Docker, Monitoring
// and Proxmox widget that has no title, and says how many it changed. It is the
// whole migration, without the flag: a restore of a backup taken before the
// change calls it too, because the widgets it brings back are in the old shape.
func GiveWidgetsTheirTitles(db *sql.DB) (int, error) {
	rows, err := db.Query(`SELECT i.id, COALESCE(i.content, ''), COALESCE(u.language, 'en')
		FROM items i LEFT JOIN users u ON u.id = i.user_id
		WHERE i.type = 'widget'
		AND (i.content LIKE '%"docker"%' OR i.content LIKE '%"monitor"%' OR i.content LIKE '%"proxmox"%')`)
	if err != nil {
		return 0, fmt.Errorf("widget titles (read): %w", err)
	}
	type change struct {
		id      int
		content string
	}
	var changes []change
	for rows.Next() {
		var id int
		var content, language string
		if err := rows.Scan(&id, &content, &language); err != nil {
			rows.Close()
			return 0, fmt.Errorf("widget titles (scan): %w", err)
		}
		if next, ok := withDefaultTitle(content, language); ok {
			changes = append(changes, change{id, next})
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return 0, fmt.Errorf("widget titles (rows): %w", err)
	}
	rows.Close()

	if len(changes) == 0 {
		return 0, nil
	}
	tx, err := db.Begin()
	if err != nil {
		return 0, fmt.Errorf("widget titles (begin): %w", err)
	}
	defer tx.Rollback() //nolint:errcheck — a committed transaction ignores this.
	for _, c := range changes {
		if _, err := tx.Exec(`UPDATE items SET content = ? WHERE id = ?`, c.content, c.id); err != nil {
			return 0, fmt.Errorf("widget titles (write): %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("widget titles (commit): %w", err)
	}
	return len(changes), nil
}

// withDefaultTitle returns the content with a title written in, and whether there was
// anything to write. Every other field is carried over as the bytes it was.
func withDefaultTitle(content, language string) (string, bool) {
	var fields map[string]json.RawMessage
	if err := json.Unmarshal([]byte(content), &fields); err != nil {
		return "", false
	}
	var widgetID string
	if err := json.Unmarshal(fields["widgetId"], &widgetID); err != nil {
		return "", false
	}
	name := defaultWidgetTitle(widgetID, language)
	if name == "" {
		return "", false
	}
	var title string
	if raw, has := fields["title"]; has {
		if err := json.Unmarshal(raw, &title); err != nil {
			// A title that is not text is not something to overwrite.
			return "", false
		}
	}
	if strings.TrimSpace(title) != "" {
		return "", false
	}
	blob, err := json.Marshal(name)
	if err != nil {
		return "", false
	}
	fields["title"] = blob
	next, err := json.Marshal(fields)
	if err != nil {
		return "", false
	}
	return string(next), true
}
