package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
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
// key), display name and the URL to probe.
type MonitoredItem struct {
	ID   int
	Name string
	URL  string
}

// MonitoredItems lists every bookmark with statusCheck enabled — the set the
// scheduler probes each cycle. Both the flag and the URL live in the content
// JSON blob (the items.url column is unused for bookmarks), so parse them there.
func (s *MonitorStore) MonitoredItems() ([]MonitoredItem, error) {
	return s.monitoredItems(0)
}

// MonitoredItemsForUser is MonitoredItems scoped to one owner, for the overview.
func (s *MonitorStore) MonitoredItemsForUser(userID int) ([]MonitoredItem, error) {
	return s.monitoredItems(userID)
}

func (s *MonitorStore) monitoredItems(userID int) ([]MonitoredItem, error) {
	query := `SELECT id, content FROM items WHERE type = 'bookmark' AND content IS NOT NULL`
	args := []any{}
	if userID > 0 {
		query += ` AND user_id = ?`
		args = append(args, userID)
	}
	rows, err := s.DB.Query(query, args...)
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
			Label       string `json:"label"`
		}
		if json.Unmarshal([]byte(content.String), &c) == nil && c.StatusCheck && c.URL != "" {
			out = append(out, MonitoredItem{ID: id, Name: c.Label, URL: c.URL})
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
	Mode          string `json:"mode"`         // off | tab | background
	IntervalSec   int    `json:"interval_sec"` // probe cadence for background mode
	AlertsEnabled bool   `json:"alerts_enabled"`
	NotifyType    string `json:"notify_type"` // none | ntfy | gotify | webhook
	NotifyURL     string `json:"notify_url"`
	// NotifyToken is write-only: it arrives when the admin types one and is never
	// sent back. The page learns that one is saved from NotifyHasToken, as the
	// Proxmox secret does, so the credential does not sit in a field on screen
	// after saving.
	NotifyToken      string `json:"notify_token,omitempty"`
	NotifyHasToken   bool   `json:"notify_has_token"`
	ClearNotifyToken bool   `json:"clear_notify_token,omitempty"` // write-only: remove the saved token
	FailThreshold    int    `json:"fail_threshold"`               // consecutive fails before a down alert
}

// resolveNotifyToken is the token a save leaves behind. Nothing typed keeps the
// saved one: the page does not know it, and a browser that has not reloaded
// since the token stopped being sent sends the whole form back with an empty
// field, which must not wipe it.
func resolveNotifyToken(stored, sent string, clear bool) string {
	if clear {
		return ""
	}
	if sent != "" {
		return sent
	}
	return stored
}

// GetSettings returns the current monitoring configuration, filling defaults
// when unset (mode "tab" = today's frontend-driven behavior).
//
// Everyone authenticated may read it — the top bar and the history drawer need
// the mode to know whether the server is probing — but the notification
// destination and its token are admin-only. They are the admin's credentials
// for their own ntfy/gotify channel: handing them to every account lets anyone
// publish into it and, on ntfy and gotify, subscribe and read the alerts of
// every service the admin watches.
func (h *MonitorHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	mode := h.getSetting("monitoring_mode")
	if mode == "" {
		mode = "tab"
	}
	interval, _ := strconv.Atoi(h.getSetting("monitoring_interval_sec"))
	if interval <= 0 {
		interval = monitorDefaultIntervalSec
	}
	threshold, _ := strconv.Atoi(h.getSetting("monitoring_fail_threshold"))
	if threshold < 1 {
		threshold = 1
	}
	notifyType := h.getSetting("monitoring_notify_type")
	if notifyType == "" {
		notifyType = "none"
	}
	settings := monitorSettings{
		Mode:          mode,
		IntervalSec:   interval,
		AlertsEnabled: h.getSetting("monitoring_alerts_enabled") == "1",
		NotifyType:    notifyType,
		FailThreshold: threshold,
	}
	// The type is not a secret — the interface says "alerts go to ntfy" to
	// anyone — but where they go and with what credential is.
	if isAdminUser(h.DB, r) {
		settings.NotifyURL = h.getSetting("monitoring_notify_url")
		settings.NotifyHasToken = h.getSetting("monitoring_notify_token") != ""
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

// UpdateSettings persists the monitoring configuration. Admin-only, since the
// mode is a server-wide setting affecting all users.
func (h *MonitorHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	if !isAdminUser(h.DB, r) {
		http.Error(w, "error.forbidden", http.StatusForbidden)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
	var s monitorSettings
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	switch s.Mode {
	case "off", "tab", "background":
	default:
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	switch s.NotifyType {
	case "", "none", "ntfy", "gotify", "webhook":
	default:
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	if s.IntervalSec < monitorMinIntervalSec {
		s.IntervalSec = monitorMinIntervalSec
	}
	if s.FailThreshold < 1 {
		s.FailThreshold = 1
	}
	if s.NotifyType == "" {
		s.NotifyType = "none"
	}
	h.setSetting("monitoring_mode", s.Mode)
	h.setSetting("monitoring_interval_sec", strconv.Itoa(s.IntervalSec))
	h.setSetting("monitoring_alerts_enabled", boolTo01(s.AlertsEnabled))
	h.setSetting("monitoring_notify_type", s.NotifyType)
	h.setSetting("monitoring_notify_url", s.NotifyURL)
	token := resolveNotifyToken(h.getSetting("monitoring_notify_token"), s.NotifyToken, s.ClearNotifyToken)
	h.setSetting("monitoring_notify_token", token)
	h.setSetting("monitoring_fail_threshold", strconv.Itoa(s.FailThreshold))
	// What goes back is what is saved, without the credential.
	s.NotifyToken, s.ClearNotifyToken, s.NotifyHasToken = "", false, token != ""

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

func boolTo01(b bool) string {
	if b {
		return "1"
	}
	return "0"
}

// TestNotify sends a one-off test alert using the config in the request body
// (so it can be tried before saving). Admin-only.
func (h *MonitorHandler) TestNotify(w http.ResponseWriter, r *http.Request) {
	if !isAdminUser(h.DB, r) {
		http.Error(w, "error.forbidden", http.StatusForbidden)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
	var s monitorSettings
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	// A test sent without a token uses the saved one: the page never has it.
	token := resolveNotifyToken(h.getSetting("monitoring_notify_token"), s.NotifyToken, false)
	cfg := notifyConfig{Enabled: true, Type: s.NotifyType, URL: s.NotifyURL, Token: token}
	if !cfg.active() {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	if err := sendNotification(cfg, "Lastboard", "Test notification", true); err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"ok": true})
}

// incident is a contiguous down period that shows in the queried window. Its
// start is the outage's own, even when that is before the window began (see
// incidentsFor). End is nil while the outage is still going on.
type incident struct {
	Start       time.Time  `json:"start"`
	End         *time.Time `json:"end"`
	DurationSec int        `json:"duration_sec"`
}

// heartbeatBucket is one recent check in the heartbeat strip: green up / red
// down, with its timestamp. The strip shows the most recent beats
// (Uptime-Kuma style), not time buckets, so it always reads dense and solid.
type heartbeatBucket struct {
	Status string    `json:"status"` // up | down
	At     time.Time `json:"at"`
}

type historyResponse struct {
	Range     string            `json:"range"`
	Current   *MonitorCheck     `json:"current"`    // latest check, or null if no data
	UptimePct float64           `json:"uptime_pct"` // 0..100, -1 when no data
	Total     int               `json:"total"`
	Checks    []MonitorCheck    `json:"checks"` // oldest-first
	Incidents []incident        `json:"incidents"`
	Heartbeat []heartbeatBucket `json:"heartbeat"`
	Stats     MonitorStats      `json:"stats"`
}

// bucketBeats folds a window of checks into exactly n buckets spanning
// since..now, oldest first, so the strip reads as the range the user asked for.
//
// It replaces a version that returned the most recent n checks instead. That is
// the same thing only while the window holds n checks or fewer: at one check
// every five minutes, forty of them are the last three hours, so picking 7d or
// 30d moved the numbers above the strip and left the strip itself showing the
// same three hours. Measured before the change: 24h, 7d and 30d all returned
// 3.2 hours of beats.
//
// Buckets with no checks come back as "empty" rather than being dropped, or a
// gap in the history would silently shorten the window instead of showing as
// the hole it is.
func bucketBeats(checks []MonitorCheck, since, now time.Time, n int) []heartbeatBucket {
	if n <= 0 || !now.After(since) {
		return []heartbeatBucket{}
	}
	width := now.Sub(since) / time.Duration(n)
	if width <= 0 {
		return []heartbeatBucket{}
	}

	total := make([]int, n)
	failed := make([]int, n)
	for _, c := range checks {
		offset := c.CheckedAt.Sub(since)
		if offset < 0 {
			continue
		}
		i := int(offset / width)
		if i >= n {
			// A check stamped at or after now lands in the last bucket rather
			// than off the end.
			i = n - 1
		}
		total[i]++
		if !c.Up {
			failed[i]++
		}
	}

	out := make([]heartbeatBucket, 0, n)
	for i := 0; i < n; i++ {
		st := "empty"
		switch {
		case total[i] == 0:
			// Say nothing rather than guess: a gap is not an outage.
		case failed[i] == 0:
			st = "up"
		case failed[i] == total[i]:
			st = "down"
		default:
			// Some failed and some did not. Over thirty days a bucket is
			// eighteen hours wide, so painting it fully down for one failed
			// check told the reader the service was gone all day while the
			// figure beside it said 99.9%. Painting it up would hide the
			// outage, which is worse. This is the third answer status pages
			// give, and the only honest one.
			st = "partial"
		}
		out = append(out, heartbeatBucket{Status: st, At: since.Add(time.Duration(i) * width)})
	}
	return out
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

// widenStart moves an incident's start earlier and recomputes its length from
// that start to its end, or to now while it is still going on.
func widenStart(inc incident, start, now time.Time) incident {
	end := now
	if inc.End != nil {
		end = *inc.End
	}
	inc.Start = start
	inc.DurationSec = int(end.Sub(start).Seconds())
	return inc
}

// incidentsFor summarises a window of checks, then gives the first outage its
// real start when it began before the window did. Only the first can be cut:
// every later one starts inside the window by construction.
func (h *MonitorHandler) incidentsFor(itemID int, checks []MonitorCheck, now time.Time) (float64, []incident) {
	uptime, incidents := summarizeHistory(checks, now)
	if len(incidents) > 0 && len(checks) > 0 && !checks[0].Up {
		if start, ok, err := h.store.OutageStart(itemID, checks[0].CheckedAt); err == nil && ok {
			incidents[0] = widenStart(incidents[0], start, now)
		}
	}
	return uptime, incidents
}

// GetHistory returns the availability history for one owned bookmark over the
// requested range: the raw checks (for heartbeat + latency chart), uptime %,
// the current status, and the list of outages.
func (h *MonitorHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r)
	itemID, err := strconv.Atoi(r.URL.Query().Get("item_id"))
	if err != nil || itemID <= 0 {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	var one int
	if h.DB.QueryRowContext(r.Context(), `SELECT 1 FROM items WHERE id = ? AND user_id = ?`, itemID, userID).Scan(&one) != nil {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}

	now := time.Now()
	label, since := rangeSince(r.URL.Query().Get("range"), now)
	checks, err := h.store.History(itemID, since)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	uptime, incidents := h.incidentsFor(itemID, checks, now)
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
		Heartbeat: bucketBeats(checks, since, now, 40),
	}
	if stats, err := h.store.Stats(itemID, now); err == nil {
		resp.Stats = stats
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

type overviewRow struct {
	ItemID    int               `json:"item_id"`
	Name      string            `json:"name"`
	Status    string            `json:"status"` // up | down | none
	UptimePct float64           `json:"uptime_pct"`
	LatencyMs *int              `json:"latency_ms"`
	Heartbeat []heartbeatBucket `json:"heartbeat"`
}

// GetOverview returns a 24h status summary for every monitored bookmark the user
// owns — the status-page view. Each row carries current status, uptime %, latency
// and a compact heartbeat, and rows link to the detail drawer by item_id.
func (h *MonitorHandler) GetOverview(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r)
	items, err := h.store.MonitoredItemsForUser(userID)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	now := time.Now()
	since := now.Add(-24 * time.Hour)

	stats, err := h.store.OverviewStats(userID, since)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	rows := make([]overviewRow, 0, len(items))
	for _, it := range items {
		// A service with no checks in the window keeps the "never measured"
		// shape the client already handles: status none and uptime -1.
		row := overviewRow{
			ItemID:    it.ID,
			Name:      it.Name,
			Status:    "none",
			UptimePct: -1,
			Heartbeat: []heartbeatBucket{},
		}
		if st, ok := stats[it.ID]; ok && st.Total > 0 {
			row.UptimePct = float64(st.Up) / float64(st.Total) * 100
			row.Status = "down"
			if st.LastUp {
				row.Status = "up"
			}
			row.LatencyMs = st.LastLatency
			if st.Beats != nil {
				row.Heartbeat = st.Beats
			}
		}
		rows = append(rows, row)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rows)
}

// ClearHistory deletes recorded history: for one owned monitor when item_id is
// given, otherwise for all of the user's monitors.
func (h *MonitorHandler) ClearHistory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r)
	var deleted int64
	var err error

	if idStr := r.URL.Query().Get("item_id"); idStr != "" {
		itemID, convErr := strconv.Atoi(idStr)
		if convErr != nil || itemID <= 0 {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		var one int
		if h.DB.QueryRowContext(r.Context(), `SELECT 1 FROM items WHERE id = ? AND user_id = ?`, itemID, userID).Scan(&one) != nil {
			http.Error(w, "error.not_found", http.StatusNotFound)
			return
		}
		deleted, err = h.store.ClearItem(itemID)
	} else {
		deleted, err = h.store.ClearAllForUser(userID)
	}
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"ok": true, "deleted": deleted})
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
	// This one runs unattended every cycle for as long as the bookmark exists,
	// so it is the last place that should be allowed to reach the instance
	// metadata service — see util.IsCloudMetadataHost.
	if util.IsCloudMetadataHost(u.Hostname()) {
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

// MonitorStats are the fixed-window figures shown in the detail stat cards,
// independent of the selected chart range. Uptime is -1 when the window has no
// data; AvgMs24h is nil when there were no successful checks in 24h.
type MonitorStats struct {
	AvgMs24h  *int    `json:"avg_ms_24h"`
	Uptime24h float64 `json:"uptime_24h"`
	Uptime7d  float64 `json:"uptime_7d"`
	Uptime30d float64 `json:"uptime_30d"`
}

// Stats computes the uptime windows and 24h average latency for one item.
func (s *MonitorStore) Stats(itemID int, now time.Time) (MonitorStats, error) {
	uptime := func(dur time.Duration) (float64, error) {
		since := now.Add(-dur).UTC().Format("2006-01-02 15:04:05")
		var total, up int
		if err := s.DB.QueryRow(
			`SELECT COUNT(*), COALESCE(SUM(up), 0) FROM monitor_checks WHERE item_id = ? AND checked_at >= ?`,
			itemID, since).Scan(&total, &up); err != nil {
			return -1, err
		}
		if total == 0 {
			return -1, nil
		}
		return float64(up) / float64(total) * 100, nil
	}

	var st MonitorStats
	var err error
	if st.Uptime24h, err = uptime(24 * time.Hour); err != nil {
		return st, err
	}
	if st.Uptime7d, err = uptime(7 * 24 * time.Hour); err != nil {
		return st, err
	}
	if st.Uptime30d, err = uptime(30 * 24 * time.Hour); err != nil {
		return st, err
	}

	since := now.Add(-24 * time.Hour).UTC().Format("2006-01-02 15:04:05")
	var avg sql.NullFloat64
	if err := s.DB.QueryRow(
		`SELECT AVG(latency_ms) FROM monitor_checks WHERE item_id = ? AND checked_at >= ? AND up = 1 AND latency_ms IS NOT NULL`,
		itemID, since).Scan(&avg); err == nil && avg.Valid {
		v := int(avg.Float64 + 0.5)
		st.AvgMs24h = &v
	}
	return st, nil
}

// ClearItem deletes all recorded history for one monitor. Returns rows removed.
func (s *MonitorStore) ClearItem(itemID int) (int64, error) {
	res, err := s.DB.Exec(`DELETE FROM monitor_checks WHERE item_id = ?`, itemID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// ClearAllForUser deletes the recorded history of every monitor the user owns.
func (s *MonitorStore) ClearAllForUser(userID int) (int64, error) {
	res, err := s.DB.Exec(
		`DELETE FROM monitor_checks WHERE item_id IN (SELECT id FROM items WHERE user_id = ?)`, userID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
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

// overviewBeats is how many heartbeat bars a row shows.
const overviewBeats = 30

// overviewStat is one row's worth of summary, computed by the database rather
// than by reading every check into memory.
type overviewStat struct {
	Total       int
	Up          int
	LastUp      bool
	LastLatency *int
	Beats       []heartbeatBucket // oldest first, at most overviewBeats
}

// OverviewStats summarises every monitored item of a user in two queries.
//
// The overview used to call History() once per service, which read the whole
// 24h window — 1.440 rows per service at a 60s interval — only to keep an
// average and the last 30 checks. Measured on a seeded database: 50 services at
// a 30s interval meant 144.000 rows and ~400 ms per call. Fine for a page
// opened now and then, not for a widget that refreshes.
//
// Both queries join items so they can be scoped by user without building an
// IN list: no placeholder juggling, and no ceiling on how many monitors a user
// may have. Items that are no longer monitored come back too and are ignored by
// the caller, which is cheaper than filtering them here.
func (s *MonitorStore) OverviewStats(userID int, since time.Time) (map[int]*overviewStat, error) {
	sinceStr := since.UTC().Format("2006-01-02 15:04:05")
	stats := make(map[int]*overviewStat)

	// 1. Uptime, as a count — the database never hands us the rows themselves.
	rows, err := s.DB.Query(
		`SELECT c.item_id, COUNT(*), COALESCE(SUM(c.up), 0)
		 FROM monitor_checks c
		 JOIN items i ON i.id = c.item_id
		 WHERE i.user_id = ? AND c.checked_at >= ?
		 GROUP BY c.item_id`,
		userID, sinceStr,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var itemID, total, up int
		if err := rows.Scan(&itemID, &total, &up); err != nil {
			return nil, err
		}
		stats[itemID] = &overviewStat{Total: total, Up: up}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// 2. The last N checks per item, for the heartbeat and the current status.
	//
	// One query per item, deliberately. The obvious "avoid the N+1" move is a
	// single ROW_NUMBER() OVER (PARTITION BY item_id) — it was written that way
	// first and measured: 104 ms against a 50-service database, because the
	// window has to rank the whole 24h window before discarding all but 30 rows
	// per service. These bounded lookups walk the index backwards and stop at 30:
	// 0,7 ms for the same 50 services, 150x faster.
	//
	// The lesson worth keeping: the cost was never the number of queries, it was
	// asking for rows nobody would read.
	for itemID := range stats {
		beats, lastUp, lastLatency, err := s.recentBeats(itemID, sinceStr)
		if err != nil {
			return nil, err
		}
		st := stats[itemID]
		st.Beats = beats
		st.LastUp = lastUp
		st.LastLatency = lastLatency
	}
	return stats, nil
}

// recentBeats returns the newest overviewBeats checks of one item, oldest first,
// plus the status and latency of the most recent one.
func (s *MonitorStore) recentBeats(itemID int, sinceStr string) ([]heartbeatBucket, bool, *int, error) {
	rows, err := s.DB.Query(
		`SELECT checked_at, up, latency_ms
		 FROM monitor_checks
		 WHERE item_id = ? AND checked_at >= ?
		 ORDER BY checked_at DESC, id DESC
		 LIMIT ?`,
		itemID, sinceStr, overviewBeats,
	)
	if err != nil {
		return nil, false, nil, err
	}
	defer rows.Close()

	// Newest first out of the database; reversed below so the bars read
	// left-to-right in time.
	var newestFirst []heartbeatBucket
	var lastUp bool
	var lastLatency *int

	for rows.Next() {
		var checkedAt time.Time
		var up int
		var latency sql.NullInt64
		if err := rows.Scan(&checkedAt, &up, &latency); err != nil {
			return nil, false, nil, err
		}
		status := "up"
		if up == 0 {
			status = "down"
		}
		if len(newestFirst) == 0 { // the first row is the most recent check
			lastUp = up != 0
			if latency.Valid {
				v := int(latency.Int64)
				lastLatency = &v
			}
		}
		newestFirst = append(newestFirst, heartbeatBucket{Status: status, At: checkedAt})
	}
	if err := rows.Err(); err != nil {
		return nil, false, nil, err
	}

	beats := make([]heartbeatBucket, 0, len(newestFirst))
	for i := len(newestFirst) - 1; i >= 0; i-- {
		beats = append(beats, newestFirst[i])
	}
	return beats, lastUp, lastLatency, nil
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

// OutageStart finds where an outage that is already under way at `before`
// really began: the earliest failed check after the last successful one before
// it. ok is false when the check just before `before` succeeded, i.e. nothing
// carries over that edge.
//
// It exists because an incident list built from one window alone cuts every
// outage at the window's start. The same outage read as starting at a different
// time and lasting a different length depending on whether 24 hours, 7 days or
// 30 days were asked for - which is a statement about the question, not about
// the outage. It can still only reach back as far as the retention keeps.
func (s *MonitorStore) OutageStart(itemID int, before time.Time) (time.Time, bool, error) {
	b := before.UTC().Format("2006-01-02 15:04:05")
	rows, err := s.DB.Query(
		`SELECT item_id, checked_at, up, latency_ms, status_code
		 FROM monitor_checks
		 WHERE item_id = ? AND up = 0 AND checked_at < ?
		   AND checked_at > COALESCE(
		       (SELECT MAX(checked_at) FROM monitor_checks
		         WHERE item_id = ? AND up = 1 AND checked_at < ?), '')
		 ORDER BY checked_at ASC, id ASC
		 LIMIT 1`,
		itemID, b, itemID, b,
	)
	if err != nil {
		return time.Time{}, false, err
	}
	defer rows.Close()
	found, err := scanChecks(rows)
	if err != nil || len(found) == 0 {
		return time.Time{}, false, err
	}
	return found[0].CheckedAt, true, nil
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
