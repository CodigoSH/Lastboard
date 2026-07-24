package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// MonitorCheck is one recorded probe of a monitored bookmark. LatencyMs is nil
// when the check failed (the service was down), and StatusCode is 0 when no HTTP
// response came back.
type MonitorCheck struct {
	ItemID     int       `json:"item_id"`
	CheckedAt  time.Time `json:"checked_at"`
	Up         bool      `json:"up"`
	LatencyMs  *int      `json:"latency_ms"`
	StatusCode int       `json:"status_code"`
}

// MonitorStore is the data-access layer for the append-only monitor_checks
// history. The monitor IS the bookmark (item_id), so the table's FK cascade
// prunes an item's history when the bookmark is deleted.
type MonitorStore struct {
	DB *sql.DB
}

// NewMonitorStore wraps a database handle for monitoring history access.
func NewMonitorStore(db *sql.DB) *MonitorStore {
	return &MonitorStore{DB: db}
}

// Record appends one check result. latencyMs must be nil when up is false.
func (s *MonitorStore) Record(itemID int, up bool, latencyMs *int, statusCode int) error {
	_, err := s.DB.Exec(
		`INSERT INTO monitor_checks (item_id, up, latency_ms, status_code) VALUES (?, ?, ?, ?)`,
		itemID, up, latencyMs, statusCode,
	)
	return err
}

// Prune deletes checks older than the retention window and returns how many
// rows were removed. Meant to run on a daily tick.
func (s *MonitorStore) Prune(days int) (int64, error) {
	res, err := s.DB.Exec(
		`DELETE FROM monitor_checks WHERE checked_at < datetime('now', ?)`,
		fmt.Sprintf("-%d days", days),
	)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// MonitoredItem is a bookmark opted into status checking: its id (the monitor
// key) and the URL to probe.
type MonitoredItem struct {
	ID  int
	URL string
}

// MonitoredItems lists every bookmark with statusCheck enabled in its content
// blob and a non-empty URL — the set the scheduler probes each cycle.
func (s *MonitorStore) MonitoredItems() ([]MonitoredItem, error) {
	rows, err := s.DB.Query(
		`SELECT id, url, content FROM items
		 WHERE type = 'bookmark' AND url IS NOT NULL AND url != ''`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []MonitoredItem
	for rows.Next() {
		var id int
		var u string
		var content sql.NullString
		if err := rows.Scan(&id, &u, &content); err != nil {
			return nil, err
		}
		if !content.Valid {
			continue
		}
		var c struct {
			StatusCheck bool `json:"statusCheck"`
		}
		if json.Unmarshal([]byte(content.String), &c) == nil && c.StatusCheck {
			out = append(out, MonitoredItem{ID: id, URL: u})
		}
	}
	return out, rows.Err()
}

// MonitorHandler exposes the global monitoring configuration to the frontend.
// The mode/interval live in system_settings (server-wide, not per-user); the
// scheduler reads them each cycle.
type MonitorHandler struct {
	DB    *sql.DB
	store *MonitorStore
}

// NewMonitorHandler builds the monitoring settings handler.
func NewMonitorHandler(db *sql.DB) *MonitorHandler {
	return &MonitorHandler{DB: db, store: NewMonitorStore(db)}
}

type monitorSettings struct {
	Mode        string `json:"mode"`         // off | tab | background
	IntervalSec int    `json:"interval_sec"` // probe cadence for background mode
}

// GetSettings returns the current monitoring configuration, filling defaults
// when unset (mode "tab" = today's frontend-driven behavior).
func (h *MonitorHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	mode := h.getSetting("monitoring_mode")
	if mode == "" {
		mode = "tab"
	}
	interval, _ := strconv.Atoi(h.getSetting("monitoring_interval_sec"))
	if interval <= 0 {
		interval = monitorDefaultIntervalSec
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(monitorSettings{Mode: mode, IntervalSec: interval})
}

// UpdateSettings persists the monitoring configuration. Admin-only, since the
// mode is a server-wide setting affecting all users.
func (h *MonitorHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	if !isAdminUser(h.DB, r) {
		http.Error(w, "error.forbidden", http.StatusForbidden)
		return
	}
	var s monitorSettings
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, "error.invalid_input", http.StatusBadRequest)
		return
	}
	switch s.Mode {
	case "off", "tab", "background":
	default:
		http.Error(w, "error.invalid_input", http.StatusBadRequest)
		return
	}
	if s.IntervalSec < monitorMinIntervalSec {
		s.IntervalSec = monitorMinIntervalSec
	}
	h.setSetting("monitoring_mode", s.Mode)
	h.setSetting("monitoring_interval_sec", strconv.Itoa(s.IntervalSec))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

func (h *MonitorHandler) getSetting(key string) string {
	var v sql.NullString
	if err := h.DB.QueryRow(
		`SELECT value FROM system_settings WHERE key = ?`, key).Scan(&v); err != nil {
		return ""
	}
	if v.Valid {
		return v.String
	}
	return ""
}

func (h *MonitorHandler) setSetting(key, value string) {
	if _, err := h.DB.Exec(
		`INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)`, key, value); err != nil {
		slog.Error("monitor: persisting setting failed", "key", key, "error", err)
	}
}

// probeTimed checks a URL and reports whether it is up, the round-trip latency
// (nil when down), and the observed HTTP status code (0 when no response came
// back). It mirrors probeURL's up/down semantics — HTTP <500, or a TCP connect
// fallback, counts as up — and additionally captures timing and status.
func probeTimed(rawUrl string) (bool, *int, int) {
	start := time.Now()

	u, err := url.Parse(rawUrl)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		return false, nil, 0
	}
	hostname := u.Hostname()
	pinnedIP, err := resolveHostCached(hostname)
	if err != nil {
		return false, nil, 0
	}

	statusCode := 0
	req, _ := http.NewRequest("HEAD", rawUrl, nil)
	if resp, err := healthClient.Do(req); err == nil {
		statusCode = resp.StatusCode
		resp.Body.Close()
		if statusCode < 500 {
			ms := int(time.Since(start).Milliseconds())
			return true, &ms, statusCode
		}
	}

	// TCP fallback: covers services that reject HEAD or answered 5xx but are
	// still listening.
	port := u.Port()
	if port == "" {
		if u.Scheme == "https" {
			port = "443"
		} else {
			port = "80"
		}
	}
	if conn, err := net.DialTimeout("tcp", net.JoinHostPort(pinnedIP, port), 2*time.Second); err == nil {
		conn.Close()
		ms := int(time.Since(start).Milliseconds())
		return true, &ms, statusCode
	}
	return false, nil, statusCode
}

// Recent returns up to limit checks for one item, newest first. It backs the
// history view (F4) and seeds the alert state machine (F5) on startup.
func (s *MonitorStore) Recent(itemID, limit int) ([]MonitorCheck, error) {
	rows, err := s.DB.Query(
		`SELECT item_id, checked_at, up, latency_ms, status_code
		 FROM monitor_checks
		 WHERE item_id = ?
		 ORDER BY checked_at DESC, id DESC
		 LIMIT ?`,
		itemID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []MonitorCheck
	for rows.Next() {
		var c MonitorCheck
		var up int
		var latency sql.NullInt64
		if err := rows.Scan(&c.ItemID, &c.CheckedAt, &up, &latency, &c.StatusCode); err != nil {
			return nil, err
		}
		c.Up = up != 0
		if latency.Valid {
			v := int(latency.Int64)
			c.LatencyMs = &v
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
