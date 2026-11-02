package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"sort"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

/*
What the status page asks of the monitor beyond one service's history: how every
service did over the last week and month, how the fleet's response moved, and
every outage across services. All of it comes from the same checks the rest of
the monitor keeps, and is scoped to the caller's own bookmarks.
*/

// overviewWindow is what one row of the overview carries about longer windows.
type overviewWindow struct {
	Uptime7d  float64
	Uptime30d float64
	AvgMs24h  *int
}

// OverviewWindows reads, for every monitored item of a user, the uptime over
// seven and thirty days and the mean response of the last day. Three grouped
// queries over the covering index: the database counts, no row comes back
// except the totals.
func (s *MonitorStore) OverviewWindows(userID int, now time.Time) (map[int]overviewWindow, error) {
	out := map[int]overviewWindow{}
	ensure := func(id int) overviewWindow {
		w, ok := out[id]
		if !ok {
			w = overviewWindow{Uptime7d: -1, Uptime30d: -1}
		}
		return w
	}
	uptime := func(window time.Duration, set func(*overviewWindow, float64)) error {
		since := now.Add(-window).UTC().Format("2006-01-02 15:04:05")
		rows, err := s.DB.Query(
			`SELECT c.item_id, COUNT(*), COALESCE(SUM(c.up), 0)
			 FROM monitor_checks c JOIN items i ON i.id = c.item_id
			 WHERE i.user_id = ? AND c.checked_at >= ?
			 GROUP BY c.item_id`, userID, since)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var id, total, up int
			if err := rows.Scan(&id, &total, &up); err != nil {
				return err
			}
			w := ensure(id)
			if total > 0 {
				set(&w, float64(up)/float64(total)*100)
			}
			out[id] = w
		}
		return rows.Err()
	}
	if err := uptime(7*24*time.Hour, func(w *overviewWindow, v float64) { w.Uptime7d = v }); err != nil {
		return nil, err
	}
	if err := uptime(monitorRetentionDays*24*time.Hour, func(w *overviewWindow, v float64) { w.Uptime30d = v }); err != nil {
		return nil, err
	}

	since := now.Add(-24 * time.Hour).UTC().Format("2006-01-02 15:04:05")
	rows, err := s.DB.Query(
		`SELECT c.item_id, AVG(c.latency_ms)
		 FROM monitor_checks c JOIN items i ON i.id = c.item_id
		 WHERE i.user_id = ? AND c.checked_at >= ? AND c.up = 1 AND c.latency_ms IS NOT NULL
		 GROUP BY c.item_id`, userID, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id int
		var avg sql.NullFloat64
		if err := rows.Scan(&id, &avg); err != nil {
			return nil, err
		}
		w := ensure(id)
		if avg.Valid {
			v := int(avg.Float64 + 0.5)
			w.AvgMs24h = &v
		}
		out[id] = w
	}
	return out, rows.Err()
}

// trendPoints is how many buckets the fleet's chart is drawn in, whatever the range.
const trendPoints = 60

// trendPoint is one bucket of the fleet's response: the mean and the slowest of
// the checks that answered in it, and the share that answered. Both latencies
// are null where nothing answered.
type trendPoint struct {
	At       time.Time `json:"at"`
	MeanMs   *int      `json:"mean_ms"`
	MaxMs    *int      `json:"max_ms"`
	UptimePc *float64  `json:"uptime_pct"` // null where nothing was checked
}

type trendResponse struct {
	Range  string       `json:"range"`
	Points []trendPoint `json:"points"`
}

// Trend returns how the response of every monitored service of the caller moved
// over the range, in trendPoints buckets spanning since..now, oldest first.
func (s *MonitorStore) Trend(userID int, since, now time.Time) ([]trendPoint, error) {
	width := now.Sub(since) / trendPoints
	if width <= 0 {
		return []trendPoint{}, nil
	}
	sinceStr := since.UTC().Format("2006-01-02 15:04:05")
	rows, err := s.DB.Query(
		`SELECT CAST((CAST(strftime('%s', c.checked_at) AS INTEGER) - ?) / ? AS INTEGER) AS b,
		        COUNT(*), COALESCE(SUM(c.up), 0),
		        AVG(CASE WHEN c.up = 1 THEN c.latency_ms END),
		        MAX(CASE WHEN c.up = 1 THEN c.latency_ms END)
		 FROM monitor_checks c JOIN items i ON i.id = c.item_id
		 WHERE i.user_id = ? AND c.checked_at >= ?
		 GROUP BY b`,
		since.Unix(), int64(width.Seconds()), userID, sinceStr)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	points := make([]trendPoint, trendPoints)
	for i := range points {
		points[i].At = since.Add(time.Duration(i) * width)
	}
	for rows.Next() {
		var b, total, up int
		var mean, max sql.NullFloat64
		if err := rows.Scan(&b, &total, &up, &mean, &max); err != nil {
			return nil, err
		}
		if b < 0 {
			continue
		}
		if b >= trendPoints {
			b = trendPoints - 1
		}
		p := &points[b]
		if mean.Valid {
			v := int(mean.Float64 + 0.5)
			p.MeanMs = &v
		}
		if max.Valid {
			v := int(max.Float64)
			p.MaxMs = &v
		}
		if total > 0 {
			pc := float64(up) / float64(total) * 100
			p.UptimePc = &pc
		}
	}
	return points, rows.Err()
}

// GetTrend answers GET /api/monitor/trend?range=24h|7d|30d.
func (h *MonitorHandler) GetTrend(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r)
	now := time.Now()
	label, since := rangeSince(r.URL.Query().Get("range"), now)
	points, err := h.store.Trend(userID, since, now)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trendResponse{Range: label, Points: points})
}

// serviceIncident is an outage with the service it happened to.
type serviceIncident struct {
	ItemID int    `json:"item_id"`
	Name   string `json:"name"`
	incident
}

// incidentsAcross lists every outage of every monitored service of a user that
// shows in the window since..now, the most recent first. One pass over the
// window in item order, handing each item's checks to the same summary one
// service's history uses: the two cannot disagree.
func (h *MonitorHandler) incidentsAcross(ctx context.Context, userID int, since, now time.Time) ([]serviceIncident, error) {
	items, err := h.store.MonitoredItemsForUser(userID)
	if err != nil {
		return nil, err
	}
	names := make(map[int]string, len(items))
	for _, it := range items {
		names[it.ID] = it.Name
	}

	rows, err := h.DB.QueryContext(ctx,
		`SELECT c.item_id, c.checked_at, c.up, c.latency_ms, c.status_code
		 FROM monitor_checks c JOIN items i ON i.id = c.item_id
		 WHERE i.user_id = ? AND c.checked_at >= ?
		 ORDER BY c.item_id, c.checked_at, c.id`, userID, since.UTC().Format("2006-01-02 15:04:05"))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []serviceIncident{}
	flush := func(id int, checks []MonitorCheck) {
		if len(checks) == 0 {
			return
		}
		if _, ok := names[id]; !ok {
			return // no longer monitored
		}
		_, incs := h.incidentsFor(id, checks, now)
		for _, inc := range incs {
			out = append(out, serviceIncident{ItemID: id, Name: names[id], incident: inc})
		}
	}
	var current int
	var checks []MonitorCheck
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
		if c.ItemID != current {
			flush(current, checks)
			current, checks = c.ItemID, nil
		}
		checks = append(checks, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	flush(current, checks)

	sort.Slice(out, func(i, j int) bool { return out[i].Start.After(out[j].Start) })
	return out, nil
}

// GetIncidents answers GET /api/monitor/incidents?range=24h|7d|30d. An outage
// keeps its own start and length whatever range is asked, as it does in one
// service's history.
func (h *MonitorHandler) GetIncidents(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r)
	now := time.Now()
	label, since := rangeSince(r.URL.Query().Get("range"), now)
	out, err := h.incidentsAcross(r.Context(), userID, since, now)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"range": label, "incidents": out})
}
