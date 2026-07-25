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

	"github.com/CodigoSH/Lastboard/internal/web/middleware"
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

// MonitoredItems lists every bookmark with statusCheck enabled — the set the
// scheduler probes each cycle. Both the flag and the URL live in the content
// JSON blob (the items.url column is unused for bookmarks), so parse them there.
func (s *MonitorStore) MonitoredItems() ([]MonitoredItem, error) {
	rows, err := s.DB.Query(
		`SELECT id, content FROM items
		 WHERE type = 'bookmark' AND content IS NOT NULL`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []MonitoredItem
	for rows.Next() {
		var id int
		var content sql.NullString
		if err := rows.Scan(&id, &content); err != nil {
			return nil, err
		}
		if !content.Valid {
			continue
		}
		var c struct {
			StatusCheck bool   `json:"statusCheck"`
			URL         string `json:"url"`
		}
		if json.Unmarshal([]byte(content.String), &c) == nil && c.StatusCheck && c.URL != "" {
			out = append(out, MonitoredItem{ID: id, URL: c.URL})
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

// incident is a contiguous down period within the queried window. End is nil
// while the outage is still ongoing at the end of the window.
type incident struct {
	Start       time.Time  `json:"start"`
	End         *time.Time `json:"end"`
	DurationSec int        `json:"duration_sec"`
}

type historyResponse struct {
	Range     string         `json:"range"`
	Current   *MonitorCheck  `json:"current"`    // latest check, or null if no data
	UptimePct float64        `json:"uptime_pct"` // 0..100, -1 when no data
	Total     int            `json:"total"`
	Checks    []MonitorCheck `json:"checks"` // oldest-first
	Incidents []incident     `json:"incidents"`
}

// rangeSince maps a range label to its start time, clamped to the 30-day
// retention window. Unknown labels fall back to 24h.
func rangeSince(label string, now time.Time) (string, time.Time) {
	switch label {
	case "7d":
		return "7d", now.Add(-7 * 24 * time.Hour)
	case "30d":
		return "30d", now.Add(-monitorRetentionDays * 24 * time.Hour)
	default:
		return "24h", now.Add(-24 * time.Hour)
	}
}

// summarizeHistory computes the uptime percentage and the list of outages from
// an oldest-first slice of checks. now bounds the duration of an ongoing outage.
func summarizeHistory(checks []MonitorCheck, now time.Time) (uptimePct float64, incidents []incident) {
	if len(checks) == 0 {
		return -1, nil
	}
	up := 0
	var start *time.Time
	for _, c := range checks {
		if c.Up {
			up++
			if start != nil {
				end := c.CheckedAt
				incidents = append(incidents, incident{
					Start: *start, End: &end,
					DurationSec: int(end.Sub(*start).Seconds()),
				})
				start = nil
			}
		} else if start == nil {
			s := c.CheckedAt
			start = &s
		}
	}
	if start != nil { // still down at the end of the window
		incidents = append(incidents, incident{
			Start: *start, End: nil,
			DurationSec: int(now.Sub(*start).Seconds()),
		})
	}
	return float64(up) / float64(len(checks)) * 100, incidents
}

// GetHistory returns the availability history for one owned bookmark over the
// requested range: the raw checks (for heartbeat + latency chart), uptime %,
// the current status, and the list of outages.
func (h *MonitorHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r)
	itemID, err := strconv.Atoi(r.URL.Query().Get("item_id"))
	if err != nil || itemID <= 0 {
		http.Error(w, "error.invalid_input", http.StatusBadRequest)
		return
	}
	var one int
	if h.DB.QueryRow(`SELECT 1 FROM items WHERE id = ? AND user_id = ?`, itemID, userID).Scan(&one) != nil {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}

	now := time.Now()
	label, since := rangeSince(r.URL.Query().Get("range"), now)
	checks, err := h.store.History(itemID, since)
	if err != nil {
		http.Error(w, "error.internal", http.StatusInternalServerError)
		return
	}

	uptime, incidents := summarizeHistory(checks, now)
	// Return empty arrays (not null) so the JSON contract stays consistent.
	if checks == nil {
		checks = []MonitorCheck{}
	}
	if incidents == nil {
		incidents = []incident{}
	}
	var current *MonitorCheck
	if n := len(checks); n > 0 {
		current = &checks[n-1]
	}
	resp := historyResponse{
		Range:     label,
		Current:   current,
		UptimePct: uptime,
		Total:     len(checks),
		Checks:    checks,
		Incidents: incidents,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
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

	return scanChecks(rows)
}

// History returns the checks for one item recorded at or after since, oldest
// first — the order the heartbeat bars and latency sparkline consume.
func (s *MonitorStore) History(itemID int, since time.Time) ([]MonitorCheck, error) {
	rows, err := s.DB.Query(
		`SELECT item_id, checked_at, up, latency_ms, status_code
		 FROM monitor_checks
		 WHERE item_id = ? AND checked_at >= ?
		 ORDER BY checked_at ASC, id ASC`,
		itemID, since.UTC().Format("2006-01-02 15:04:05"),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanChecks(rows)
}

// scanChecks reads MonitorCheck rows, decoding the nullable latency and the
// integer-stored boolean.
func scanChecks(rows *sql.Rows) ([]MonitorCheck, error) {
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
