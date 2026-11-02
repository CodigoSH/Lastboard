package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

/*
One service's history without its checks.

The panel of a service on the status page needs a chart of sixty points, the
outages, the figures and the latest lines of its checks. Sending every check of
the range so the browser can fold them into those sixty points was 4 MB for a
service checked each minute over thirty days (43,000 rows), asked for again at
each refresh. With ?lite=1 the database folds them and the answer is a few
kilobytes; the rest of the checks, for whoever wants to read them all, come by
pages from GET /api/monitor/checks. Without ?lite=1 the answer is the old one,
for a browser that has not reloaded since.
*/

const (
	// historyBuckets is how many points the service's chart is drawn in, as the page folds it.
	historyBuckets = 60
	// recentChecks is how many lines the checks tab shows before it offers the rest.
	recentChecks = 15
	// checksPageDefault and checksPageMax bound a page of GET /api/monitor/checks.
	checksPageDefault = 300
	checksPageMax     = 1000
)

// latencyPoint is one bucket of a service's response: the mean of the checks that
// answered in it, or null when none did.
type latencyPoint struct {
	At     time.Time `json:"at"`
	MeanMs *float64  `json:"mean_ms"`
}

// WindowCounts is how many checks a service has had since a moment and how many passed.
func (s *MonitorStore) WindowCounts(itemID int, since time.Time) (total, up int, err error) {
	err = s.DB.QueryRow(
		`SELECT COUNT(*), COALESCE(SUM(up), 0) FROM monitor_checks WHERE item_id = ? AND checked_at >= ?`,
		itemID, since.UTC().Format("2006-01-02 15:04:05")).Scan(&total, &up)
	return
}

// LatencySeries folds the response of a service since..now into n buckets, oldest
// first, the way the page folds a list of checks: the mean of those that answered,
// null where none did. The database does the folding.
func (s *MonitorStore) LatencySeries(itemID int, since, now time.Time, n int) ([]latencyPoint, error) {
	if n <= 0 {
		return []latencyPoint{}, nil
	}
	width := int64(now.Sub(since).Seconds()) / int64(n)
	if width <= 0 {
		return []latencyPoint{}, nil
	}
	rows, err := s.DB.Query(
		`SELECT CAST((CAST(strftime('%s', checked_at) AS INTEGER) - ?) / ? AS INTEGER) AS b, AVG(latency_ms)
		   FROM monitor_checks
		  WHERE item_id = ? AND checked_at >= ? AND up = 1 AND latency_ms IS NOT NULL
		  GROUP BY b`,
		since.Unix(), width, itemID, since.UTC().Format("2006-01-02 15:04:05"))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]latencyPoint, n)
	for i := range out {
		out[i].At = since.Add(time.Duration(int64(i)*width) * time.Second)
	}
	for rows.Next() {
		var b int
		var mean sql.NullFloat64
		if err := rows.Scan(&b, &mean); err != nil {
			return nil, err
		}
		if b < 0 {
			continue
		}
		if b >= n {
			b = n - 1
		}
		if mean.Valid {
			v := mean.Float64
			out[b].MeanMs = &v
		}
	}
	return out, rows.Err()
}

// RecentChecks is the newest checks of a service since a moment, newest first.
func (s *MonitorStore) RecentChecks(itemID int, since time.Time, limit int) ([]MonitorCheck, error) {
	rows, err := s.DB.Query(
		`SELECT item_id, checked_at, up, latency_ms, status_code
		   FROM monitor_checks
		  WHERE item_id = ? AND checked_at >= ?
		  ORDER BY checked_at DESC, id DESC LIMIT ?`,
		itemID, since.UTC().Format("2006-01-02 15:04:05"), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanChecks(rows)
}

// checksCursor is where the next page of checks begins: the moment and the id of
// the last check of the page before, which together are unique and ordered.
func checksCursor(at time.Time, id int64) string {
	return fmt.Sprintf("%s|%d", at.UTC().Format("2006-01-02 15:04:05"), id)
}

func parseChecksCursor(s string) (string, int64, bool) {
	at, id, ok := strings.Cut(s, "|")
	if !ok {
		return "", 0, false
	}
	n, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return "", 0, false
	}
	if _, err := time.Parse("2006-01-02 15:04:05", at); err != nil {
		return "", 0, false
	}
	return at, n, true
}

// ChecksPage is one page of a service's checks since a moment, newest first, from
// the cursor on (the beginning when it is empty). next is where the following page
// begins, empty on the last.
func (s *MonitorStore) ChecksPage(itemID int, since time.Time, cursor string, limit int) ([]MonitorCheck, string, error) {
	query := `SELECT id, item_id, checked_at, up, latency_ms, status_code
		   FROM monitor_checks
		  WHERE item_id = ? AND checked_at >= ?`
	args := []any{itemID, since.UTC().Format("2006-01-02 15:04:05")}
	if cursor != "" {
		at, id, ok := parseChecksCursor(cursor)
		if !ok {
			return nil, "", fmt.Errorf("bad cursor")
		}
		query += ` AND (checked_at < ? OR (checked_at = ? AND id < ?))`
		args = append(args, at, at, id)
	}
	query += ` ORDER BY checked_at DESC, id DESC LIMIT ?`
	args = append(args, limit+1)
	rows, err := s.DB.Query(query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()
	out := []MonitorCheck{}
	var ids []int64
	for rows.Next() {
		var c MonitorCheck
		var id int64
		var up int
		var latency sql.NullInt64
		if err := rows.Scan(&id, &c.ItemID, &c.CheckedAt, &up, &latency, &c.StatusCode); err != nil {
			return nil, "", err
		}
		c.Up = up != 0
		if latency.Valid {
			v := int(latency.Int64)
			c.LatencyMs = &v
		}
		out = append(out, c)
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}
	next := ""
	if len(out) > limit {
		out, ids = out[:limit], ids[:limit]
		next = checksCursor(out[limit-1].CheckedAt, ids[limit-1])
	}
	return out, next, nil
}

// historyLite answers GET /api/monitor/history?lite=1: the same figures and
// outages as the full answer, the chart already folded into sixty points, and the
// newest checks only. Its checks come oldest first, as the full answer's do.
func (h *MonitorHandler) historyLite(w http.ResponseWriter, r *http.Request, itemID int, label string, since, now time.Time) {
	total, up, err := h.store.WindowCounts(itemID, since)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	uptime := -1.0
	if total > 0 {
		uptime = float64(up) / float64(total) * 100
	}
	incidents, err := h.outagesOfItem(r.Context(), itemID, since, now)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	latency, err := h.store.LatencySeries(itemID, since, now, historyBuckets)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	newest, err := h.store.RecentChecks(itemID, since, recentChecks)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	checks := make([]MonitorCheck, 0, len(newest))
	for i := len(newest) - 1; i >= 0; i-- {
		checks = append(checks, newest[i])
	}
	var current *MonitorCheck
	if len(newest) > 0 {
		current = &newest[0]
	}
	resp := historyResponse{
		Range: label, Current: current, UptimePct: uptime, Total: total,
		Checks: checks, Incidents: incidents, Heartbeat: []heartbeatBucket{},
		Latency: latency, Lite: true,
	}
	if stats, err := h.store.Stats(itemID, now); err == nil {
		resp.Stats = stats
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// GetChecks answers GET /api/monitor/checks?item_id=&range=&limit=&before=: a page
// of one owned service's checks, newest first, and where the next page begins.
func (h *MonitorHandler) GetChecks(w http.ResponseWriter, r *http.Request) {
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
	limit := checksPageDefault
	if v := r.URL.Query().Get("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n <= 0 {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		limit = n
	}
	if limit > checksPageMax {
		limit = checksPageMax
	}
	label, since := rangeSince(r.URL.Query().Get("range"), time.Now())
	checks, next, err := h.store.ChecksPage(itemID, since, r.URL.Query().Get("before"), limit)
	if err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"range": label, "checks": checks, "next": next})
}
