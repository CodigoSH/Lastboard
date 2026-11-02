package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
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
// seven and thirty days and the mean response of the last day.
//
// The uptimes are added up from the hourly counts the database keeps
// (monitor_rollup) and not from the checks: a month of a service checked each
// minute is 43,000 rows, and fifty of them are a pass over two million on every
// refresh. The whole hours come from the counts; the part of an hour at the start
// of the window, which a count cannot split, from the checks themselves, so the
// figure is exact to the second. The latency is its own query over the last day,
// a thirtieth of the checks. The database counts; no row comes back except totals.
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
		since := now.Add(-window).UTC()
		// The first whole hour inside the window: from it on, the counts say it all.
		whole := since.Truncate(time.Hour)
		if whole.Before(since) {
			whole = whole.Add(time.Hour)
		}
		rows, err := s.DB.Query(
			`SELECT item_id, SUM(total), SUM(up) FROM (
			     SELECT r.item_id AS item_id, r.total AS total, r.up AS up
			       FROM monitor_rollup r JOIN items i ON i.id = r.item_id
			      WHERE i.user_id = ? AND r.bucket >= ?
			     UNION ALL
			     SELECT c.item_id, 1, c.up
			       FROM monitor_checks c JOIN items i ON i.id = c.item_id
			      WHERE i.user_id = ? AND c.checked_at >= ? AND c.checked_at < ?
			 ) GROUP BY item_id`,
			userID, whole.Format("2006-01-02 15"),
			userID, since.Format("2006-01-02 15:04:05"), whole.Format("2006-01-02 15:04:05"))
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var id int
			var total, up sql.NullInt64
			if err := rows.Scan(&id, &total, &up); err != nil {
				return err
			}
			w := ensure(id)
			if total.Valid && total.Int64 > 0 {
				set(&w, float64(up.Int64)/float64(total.Int64)*100)
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
	lat, err := s.DB.Query(
		`SELECT c.item_id, AVG(c.latency_ms)
		 FROM monitor_checks c JOIN items i ON i.id = c.item_id
		 WHERE i.user_id = ? AND c.checked_at >= ? AND c.up = 1 AND c.latency_ms IS NOT NULL
		 GROUP BY c.item_id`, userID, since)
	if err != nil {
		return nil, err
	}
	defer lat.Close()
	for lat.Next() {
		var id int
		var avg sql.NullFloat64
		if err := lat.Scan(&id, &avg); err != nil {
			return nil, err
		}
		w := ensure(id)
		if avg.Valid {
			v := int(avg.Float64 + 0.5)
			w.AvgMs24h = &v
		}
		out[id] = w
	}
	return out, lat.Err()
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
// shows in the window since..now, the most recent first. It reads only the failed
// checks and the neighbours of each (see incidentsFromRuns); if that cannot be
// asked it falls back to the full pass, which gives the same answer.
func (h *MonitorHandler) incidentsAcross(ctx context.Context, userID int, since, now time.Time) ([]serviceIncident, error) {
	out, err := h.incidentsFromRuns(ctx, userID, since, now)
	if err != nil {
		return h.incidentsAcrossScan(ctx, userID, since, now)
	}
	return out, nil
}

// timeOf reads a time the database handed back: a time when the column kept its
// declared type, text when it came out of an aggregate.
func timeOf(v any) (time.Time, bool) {
	switch x := v.(type) {
	case time.Time:
		return x.UTC(), true
	case string:
		for _, layout := range []string{"2006-01-02 15:04:05", time.RFC3339Nano, "2006-01-02T15:04:05Z"} {
			if t, err := time.ParseInLocation(layout, x, time.UTC); err == nil {
				return t, true
			}
		}
	}
	return time.Time{}, false
}

// incidentsFromRuns finds the outages without reading the checks that passed.
// An outage is a run of failed checks, so it begins at a failed check whose
// previous check passed (or that has none), and ends at the first check that
// passes after it. Those are two index seeks for each outage, and the failed
// checks themselves come from a partial index of only them.
//
// The answer is the one the full pass gives, down to the cut ends: an outage that
// was already under way when the window began is shown from its real start, with
// the code the first failing check of the window got back.
func (h *MonitorHandler) incidentsFromRuns(ctx context.Context, userID int, since, now time.Time) ([]serviceIncident, error) {
	items, err := h.store.MonitoredItemsForUser(userID)
	if err != nil {
		return nil, err
	}
	sinceStr := since.UTC().Format("2006-01-02 15:04:05")
	out := []serviceIncident{}
	add := func(it MonitoredItem, start time.Time, end *time.Time, code int) {
		inc := incident{Start: start, End: end, StatusCode: code}
		if end != nil {
			inc.DurationSec = int(end.Sub(start).Seconds())
		} else {
			inc.DurationSec = int(now.Sub(start).Seconds())
		}
		out = append(out, serviceIncident{ItemID: it.ID, Name: it.Name, incident: inc})
	}
	for _, it := range items {
		rows, err := h.DB.QueryContext(ctx,
			`SELECT d.checked_at, d.status_code,
			        (SELECT MIN(u.checked_at) FROM monitor_checks u INDEXED BY idx_monitor_checks_item_up
			          WHERE u.item_id = d.item_id AND u.up = 1 AND u.checked_at > d.checked_at)
			   FROM monitor_checks d INDEXED BY idx_monitor_checks_down
			  WHERE d.item_id = ? AND d.up = 0 AND d.checked_at >= ?
			    AND COALESCE((SELECT p.up FROM monitor_checks p INDEXED BY idx_monitor_checks_item_up
			                   WHERE p.item_id = d.item_id AND p.checked_at < d.checked_at
			                   ORDER BY p.checked_at DESC, p.id DESC LIMIT 1), 1) = 1
			  ORDER BY d.checked_at`, it.ID, sinceStr)
		if err != nil {
			return nil, err
		}
		for rows.Next() {
			var at, endAt any
			var code int
			if err := rows.Scan(&at, &code, &endAt); err != nil {
				rows.Close()
				return nil, err
			}
			start, ok := timeOf(at)
			if !ok {
				rows.Close()
				return nil, errors.New("unreadable check time")
			}
			var end *time.Time
			if endAt != nil {
				e, ok := timeOf(endAt)
				if !ok {
					rows.Close()
					return nil, errors.New("unreadable check time")
				}
				end = &e
			}
			add(it, start, end, code)
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return nil, err
		}
		rows.Close()

		// An outage already under way when the window began has its first failed
		// check before the window, so the query above did not see it begin.
		var firstAt any
		var firstUp, firstCode int
		err = h.DB.QueryRowContext(ctx,
			`SELECT checked_at, up, status_code FROM monitor_checks INDEXED BY idx_monitor_checks_item_up
			  WHERE item_id = ? AND checked_at >= ? ORDER BY checked_at, id LIMIT 1`, it.ID, sinceStr).Scan(&firstAt, &firstUp, &firstCode)
		if err == sql.ErrNoRows || (err == nil && firstUp != 0) {
			continue
		}
		if err != nil {
			return nil, err
		}
		first, ok := timeOf(firstAt)
		if !ok {
			return nil, errors.New("unreadable check time")
		}
		start, carried, err := h.store.OutageStart(it.ID, first)
		if err != nil {
			return nil, err
		}
		if !carried {
			continue
		}
		var endAt any
		if err := h.DB.QueryRowContext(ctx,
			`SELECT MIN(checked_at) FROM monitor_checks INDEXED BY idx_monitor_checks_item_up
			  WHERE item_id = ? AND up = 1 AND checked_at > ?`, it.ID, first.Format("2006-01-02 15:04:05")).Scan(&endAt); err != nil {
			return nil, err
		}
		var end *time.Time
		if endAt != nil {
			e, ok := timeOf(endAt)
			if !ok {
				return nil, errors.New("unreadable check time")
			}
			end = &e
		}
		add(it, start, end, firstCode)
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Start.After(out[j].Start) })
	return out, nil
}

// incidentsAcrossScan is the same list read the slow way: one pass over every
// check of the window in item order, handing each item's checks to the same
// summary one service's history uses. It is what the quick way is held to, and
// what answers if the quick one cannot be asked.
func (h *MonitorHandler) incidentsAcrossScan(ctx context.Context, userID int, since, now time.Time) ([]serviceIncident, error) {
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
