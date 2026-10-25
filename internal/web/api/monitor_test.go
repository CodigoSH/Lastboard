package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// seedItem creates a user and a bookmark item, returning the item id. The
// monitor_checks FK targets items(id), which in turn targets users(id).
func seedItem(t *testing.T, store *MonitorStore) int {
	t.Helper()
	res, err := store.DB.Exec(`INSERT INTO users (username, password) VALUES ('u', 'p')`)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}
	uid, _ := res.LastInsertId()
	res, err = store.DB.Exec(
		`INSERT INTO items (user_id, type, x, y, w, h) VALUES (?, 'bookmark', 0, 0, 1, 1)`, uid)
	if err != nil {
		t.Fatalf("seed item: %v", err)
	}
	itemID, _ := res.LastInsertId()
	return int(itemID)
}

func TestMonitorStoreRecordAndRecent(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1) // pin one in-memory connection for the test
	store := NewMonitorStore(db)
	itemID := seedItem(t, store)

	lat := 42
	if err := store.Record(itemID, true, &lat, 200); err != nil {
		t.Fatalf("record up: %v", err)
	}
	if err := store.Record(itemID, false, nil, 0); err != nil {
		t.Fatalf("record down: %v", err)
	}

	recent, err := store.Recent(itemID, 10)
	if err != nil {
		t.Fatalf("recent: %v", err)
	}
	if len(recent) != 2 {
		t.Fatalf("expected 2 checks, got %d", len(recent))
	}

	// Newest first: the "down" check was recorded last.
	if recent[0].Up {
		t.Errorf("newest check should be down, got up")
	}
	if recent[0].LatencyMs != nil {
		t.Errorf("down check must have nil latency, got %v", *recent[0].LatencyMs)
	}
	if recent[0].StatusCode != 0 {
		t.Errorf("down check status should be 0, got %d", recent[0].StatusCode)
	}

	if !recent[1].Up {
		t.Errorf("oldest check should be up")
	}
	if recent[1].LatencyMs == nil || *recent[1].LatencyMs != 42 {
		t.Errorf("up check latency should be 42, got %v", recent[1].LatencyMs)
	}
	if recent[1].StatusCode != 200 {
		t.Errorf("up check status should be 200, got %d", recent[1].StatusCode)
	}
}

func TestMonitorStorePrune(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := NewMonitorStore(db)
	itemID := seedItem(t, store)

	// A fresh check plus an old one 40 days back.
	if err := store.Record(itemID, true, intPtr(10), 200); err != nil {
		t.Fatalf("record fresh: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO monitor_checks (item_id, checked_at, up, status_code)
		 VALUES (?, datetime('now', '-40 days'), 1, 200)`, itemID); err != nil {
		t.Fatalf("insert old: %v", err)
	}

	removed, err := store.Prune(30)
	if err != nil {
		t.Fatalf("prune: %v", err)
	}
	if removed != 1 {
		t.Fatalf("expected 1 pruned row, got %d", removed)
	}

	recent, _ := store.Recent(itemID, 10)
	if len(recent) != 1 {
		t.Fatalf("expected 1 remaining check after prune, got %d", len(recent))
	}
}

func TestMonitorStoreClear(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := NewMonitorStore(db)
	itemID := seedItem(t, store)

	for i := 0; i < 3; i++ {
		if err := store.Record(itemID, true, intPtr(10), 200); err != nil {
			t.Fatalf("record: %v", err)
		}
	}
	n, err := store.ClearItem(itemID)
	if err != nil || n != 3 {
		t.Fatalf("ClearItem expected 3 removed, got %d (err %v)", n, err)
	}
	if recent, _ := store.Recent(itemID, 10); len(recent) != 0 {
		t.Fatalf("expected no checks after clear, got %d", len(recent))
	}
}

func TestMonitorStoreCascadeOnItemDelete(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := NewMonitorStore(db)
	itemID := seedItem(t, store)

	if err := store.Record(itemID, true, intPtr(5), 200); err != nil {
		t.Fatalf("record: %v", err)
	}
	if _, err := db.Exec(`DELETE FROM items WHERE id = ?`, itemID); err != nil {
		t.Fatalf("delete item: %v", err)
	}

	recent, err := store.Recent(itemID, 10)
	if err != nil {
		t.Fatalf("recent after delete: %v", err)
	}
	if len(recent) != 0 {
		t.Fatalf("history should cascade-delete with the item, got %d rows", len(recent))
	}
}

func intPtr(v int) *int { return &v }

func TestMonitoredItems(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := NewMonitorStore(db)

	res, _ := db.Exec(`INSERT INTO users (username, password) VALUES ('u', 'p')`)
	uid, _ := res.LastInsertId()
	ins := func(content string) {
		if _, err := db.Exec(
			`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'bookmark', 0, 0, 1, 1, ?)`,
			uid, content); err != nil {
			t.Fatalf("insert item: %v", err)
		}
	}
	ins(`{"statusCheck":true,"url":"https://a.example"}`)  // monitored
	ins(`{"statusCheck":false,"url":"https://b.example"}`) // opted out
	ins(`{"url":"https://c.example"}`)                     // no flag
	ins(`{"statusCheck":true}`)                            // no URL → skipped

	items, err := store.monitoredItems(0)
	if err != nil {
		t.Fatalf("MonitoredItems: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 monitored item, got %d", len(items))
	}
	if items[0].URL != "https://a.example" {
		t.Errorf("wrong item enumerated: %q", items[0].URL)
	}
}

func TestProbeTimedUp(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	up, latency, code := probeTimed(context.Background(), srv.URL)
	if !up {
		t.Fatalf("expected up for a 200 server")
	}
	if latency == nil {
		t.Errorf("up check must carry a latency")
	}
	if code != 200 {
		t.Errorf("expected status 200, got %d", code)
	}
}

func TestProbeTimedDown(t *testing.T) {
	// Reserve a port then close it, so nothing is listening.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	url := srv.URL
	srv.Close()

	up, latency, _ := probeTimed(context.Background(), url)
	if up {
		t.Fatalf("expected down for a closed server")
	}
	if latency != nil {
		t.Errorf("down check must have nil latency, got %d", *latency)
	}
}

func TestProbeTimedBadScheme(t *testing.T) {
	up, latency, code := probeTimed(context.Background(), "ftp://example.com")
	if up || latency != nil || code != 0 {
		t.Errorf("non-http scheme should be down/nil/0, got up=%v code=%d", up, code)
	}
}

func TestMonitorStoreHistoryOrder(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := NewMonitorStore(db)
	itemID := seedItem(t, store)

	// Insert three checks at distinct timestamps, newest inserted first.
	stamps := []string{
		"datetime('now','-2 hours')",
		"datetime('now','-1 hours')",
		"datetime('now','-30 minutes')",
	}
	for _, ts := range stamps {
		if _, err := db.Exec(
			`INSERT INTO monitor_checks (item_id, checked_at, up, status_code) VALUES (?, `+ts+`, 1, 200)`, itemID); err != nil {
			t.Fatalf("insert: %v", err)
		}
	}
	// Older than the 24h window — must be excluded.
	db.Exec(`INSERT INTO monitor_checks (item_id, checked_at, up, status_code) VALUES (?, datetime('now','-2 days'), 1, 200)`, itemID)

	hist, err := store.History(itemID, time.Now().Add(-24*time.Hour))
	if err != nil {
		t.Fatalf("history: %v", err)
	}
	if len(hist) != 3 {
		t.Fatalf("expected 3 in-window checks, got %d", len(hist))
	}
	for i := 1; i < len(hist); i++ {
		if hist[i].CheckedAt.Before(hist[i-1].CheckedAt) {
			t.Errorf("history not oldest-first at index %d", i)
		}
	}
}

func TestSummarizeHistory(t *testing.T) {
	now := time.Now()
	at := func(min int) time.Time { return now.Add(time.Duration(-min) * time.Minute) }

	// up, up, DOWN, DOWN, up, up  → one recovered outage, 4/6 uptime.
	checks := []MonitorCheck{
		{Up: true, CheckedAt: at(50)},
		{Up: true, CheckedAt: at(40)},
		{Up: false, CheckedAt: at(30)},
		{Up: false, CheckedAt: at(20)},
		{Up: true, CheckedAt: at(10)},
		{Up: true, CheckedAt: at(0)},
	}
	pct, incidents := summarizeHistory(checks, now)
	if pct < 66.6 || pct > 66.7 {
		t.Errorf("expected ~66.67%% uptime, got %.2f", pct)
	}
	if len(incidents) != 1 {
		t.Fatalf("expected 1 incident, got %d", len(incidents))
	}
	if incidents[0].End == nil {
		t.Errorf("recovered incident should have an end")
	}
	// Down at t-30 → recovered at t-10 = 1200s.
	if incidents[0].DurationSec != 1200 {
		t.Errorf("expected 1200s outage, got %d", incidents[0].DurationSec)
	}

	// Ongoing outage: last check is down → End nil.
	ongoing := []MonitorCheck{
		{Up: true, CheckedAt: at(20)},
		{Up: false, CheckedAt: at(10)},
	}
	_, inc2 := summarizeHistory(ongoing, now)
	if len(inc2) != 1 || inc2[0].End != nil {
		t.Fatalf("expected 1 ongoing (End nil) incident, got %+v", inc2)
	}

	// No data → uptime -1, no incidents.
	if pct, inc := summarizeHistory(nil, now); pct != -1 || inc != nil {
		t.Errorf("empty history should be -1/nil, got %.0f/%v", pct, inc)
	}
}

// ── OverviewStats ───────────────────────────────────────────────────────────
//
// The overview is now summarised by the database instead of by reading every
// check into memory, so these pin the four things a row shows: uptime, the
// current status, the latency of the last check, and the heartbeat — including
// the cases where the shortcut of "just look at the rows" no longer applies.

// seedItemFor creates a bookmark owned by an existing user.
func seedItemFor(t *testing.T, store *MonitorStore, userID int) int {
	t.Helper()
	res, err := store.DB.Exec(
		`INSERT INTO items (user_id, type, x, y, w, h) VALUES (?, 'bookmark', 0, 0, 1, 1)`, userID)
	if err != nil {
		t.Fatalf("seed item: %v", err)
	}
	id, _ := res.LastInsertId()
	return int(id)
}

func ownerOf(t *testing.T, store *MonitorStore, itemID int) int {
	t.Helper()
	var uid int
	if err := store.DB.QueryRow(`SELECT user_id FROM items WHERE id = ?`, itemID).Scan(&uid); err != nil {
		t.Fatalf("owner: %v", err)
	}
	return uid
}

// record inserts one check at an explicit time.
func record(t *testing.T, store *MonitorStore, itemID int, at time.Time, up bool, latency *int) {
	t.Helper()
	_, err := store.DB.Exec(
		`INSERT INTO monitor_checks (item_id, checked_at, up, latency_ms, status_code)
		 VALUES (?, ?, ?, ?, 200)`,
		itemID, at.UTC().Format("2006-01-02 15:04:05"), up, latency)
	if err != nil {
		t.Fatalf("record check: %v", err)
	}
}

func TestOverviewStatsUptimeAndLastCheck(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := &MonitorStore{DB: db}
	itemID := seedItem(t, store)
	userID := ownerOf(t, store, itemID)

	now := time.Now()
	lat := 55
	record(t, store, itemID, now.Add(-30*time.Minute), true, &lat)
	record(t, store, itemID, now.Add(-20*time.Minute), false, nil)
	record(t, store, itemID, now.Add(-10*time.Minute), true, &lat)
	// Outside the 24h window: must not count towards uptime.
	record(t, store, itemID, now.Add(-30*time.Hour), false, nil)

	stats, err := store.OverviewStats(userID, now.Add(-24*time.Hour))
	if err != nil {
		t.Fatalf("OverviewStats: %v", err)
	}
	st := stats[itemID]
	if st == nil {
		t.Fatal("no stats for the seeded item")
	}
	if st.Total != 3 || st.Up != 2 {
		t.Errorf("total/up = %d/%d, want 3/2 (the 30h-old check must be excluded)", st.Total, st.Up)
	}
	if !st.LastUp {
		t.Error("last check was up, LastUp says otherwise")
	}
	if st.LastLatency == nil || *st.LastLatency != 55 {
		t.Errorf("LastLatency = %v, want 55", st.LastLatency)
	}
}

// A failed check stores no latency; the row must report none rather than
// carrying the latency of an earlier, successful one.
func TestOverviewStatsDropsLatencyWhenLastCheckFailed(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := &MonitorStore{DB: db}
	itemID := seedItem(t, store)
	userID := ownerOf(t, store, itemID)

	now := time.Now()
	lat := 42
	record(t, store, itemID, now.Add(-10*time.Minute), true, &lat)
	record(t, store, itemID, now.Add(-1*time.Minute), false, nil)

	stats, _ := store.OverviewStats(userID, now.Add(-24*time.Hour))
	st := stats[itemID]
	if st.LastUp {
		t.Error("last check failed, LastUp says up")
	}
	if st.LastLatency != nil {
		t.Errorf("LastLatency = %v, want nil after a failed check", *st.LastLatency)
	}
}

// The bars show the most recent checks, oldest first — the order they are drawn
// in. Everything older than that window is summarised, never returned.
func TestOverviewStatsHeartbeatIsCappedAndOldestFirst(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := &MonitorStore{DB: db}
	itemID := seedItem(t, store)
	userID := ownerOf(t, store, itemID)

	now := time.Now()
	const total = overviewBeats + 15
	for i := total; i >= 1; i-- {
		// The oldest checks are the failures, so a capped list must be all "up".
		record(t, store, itemID, now.Add(-time.Duration(i)*time.Minute), i <= overviewBeats, nil)
	}

	stats, _ := store.OverviewStats(userID, now.Add(-24*time.Hour))
	st := stats[itemID]

	if st.Total != total {
		t.Errorf("uptime still counts every check: total = %d, want %d", st.Total, total)
	}
	if len(st.Beats) != overviewBeats {
		t.Fatalf("beats = %d, want %d", len(st.Beats), overviewBeats)
	}
	for i, b := range st.Beats {
		if b.Status != "up" {
			t.Fatalf("beat %d is %q: the cap kept the oldest checks instead of the newest", i, b.Status)
		}
	}
	for i := 1; i < len(st.Beats); i++ {
		if st.Beats[i].At.Before(st.Beats[i-1].At) {
			t.Fatalf("beats are not oldest-first at index %d", i)
		}
	}
}

// The query is scoped by owner: one user's monitors never appear in another's
// overview, which a bulk query makes easy to get wrong.
func TestOverviewStatsIsScopedToTheOwner(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := &MonitorStore{DB: db}

	mine := seedItem(t, store)
	myUser := ownerOf(t, store, mine)

	res, err := store.DB.Exec(`INSERT INTO users (username, password) VALUES ('other', 'p')`)
	if err != nil {
		t.Fatalf("seed other user: %v", err)
	}
	otherUID, _ := res.LastInsertId()
	theirs := seedItemFor(t, store, int(otherUID))

	now := time.Now()
	record(t, store, mine, now.Add(-5*time.Minute), true, nil)
	record(t, store, theirs, now.Add(-5*time.Minute), true, nil)

	stats, _ := store.OverviewStats(myUser, now.Add(-24*time.Hour))
	if _, leaked := stats[theirs]; leaked {
		t.Error("another user's monitor leaked into the overview")
	}
	if _, ok := stats[mine]; !ok {
		t.Error("the user's own monitor is missing")
	}
}

// No checks in the window means the item simply has no entry; the handler turns
// that into "none" / -1 rather than a fake 0% uptime.
func TestOverviewStatsOmitsItemsWithoutChecks(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := &MonitorStore{DB: db}
	itemID := seedItem(t, store)
	userID := ownerOf(t, store, itemID)

	now := time.Now()
	record(t, store, itemID, now.Add(-40*time.Hour), true, nil)

	stats, _ := store.OverviewStats(userID, now.Add(-24*time.Hour))
	if st, ok := stats[itemID]; ok && st.Total > 0 {
		t.Errorf("item with only stale checks reported %d checks in range", st.Total)
	}
}

// The heartbeat strip has to span the range the user picked. It used to return
// the most recent forty checks instead, which at one check every five minutes
// is the last three hours whether the request said 24h, 7d or 30d — the numbers
// above the strip changed and the strip did not.
func TestBucketBeatsSpansTheWholeWindow(t *testing.T) {
	now := time.Date(2026, 9, 14, 12, 0, 0, 0, time.UTC)

	for _, tc := range []struct {
		name string
		span time.Duration
	}{
		{"24h", 24 * time.Hour},
		{"7d", 7 * 24 * time.Hour},
		{"30d", 30 * 24 * time.Hour},
	} {
		t.Run(tc.name, func(t *testing.T) {
			since := now.Add(-tc.span)

			// One check every five minutes for the whole window.
			var checks []MonitorCheck
			for at := since; at.Before(now); at = at.Add(5 * time.Minute) {
				checks = append(checks, MonitorCheck{CheckedAt: at, Up: true})
			}

			beats := bucketBeats(checks, since, now, 40)
			if len(beats) != 40 {
				t.Fatalf("got %d beats, want 40", len(beats))
			}

			covered := beats[len(beats)-1].At.Sub(beats[0].At)
			// The last bucket starts one width before the end, so the stamps
			// cover all but that final slice.
			wantAtLeast := tc.span - tc.span/40 - time.Minute
			if covered < wantAtLeast {
				t.Errorf("beats cover %s of a %s window, want at least %s",
					covered, tc.span, wantAtLeast)
			}
			if beats[0].At.Before(since) {
				t.Errorf("first beat at %s is before the window start %s", beats[0].At, since)
			}
		})
	}
}

// A bucket says one of three things: everything passed, everything failed, or
// some of each. The middle answer matters most at wide ranges — over thirty
// days a bucket is eighteen hours, and calling that "down" for one failed check
// contradicts the 99.9% printed next to it, while calling it "up" hides the
// outage entirely.
func TestBucketBeatsDistinguishesPartialFromTotalOutages(t *testing.T) {
	now := time.Date(2026, 9, 14, 12, 0, 0, 0, time.UTC)
	since := now.Add(-10 * time.Hour) // ten buckets of one hour
	at := func(hoursIn int) time.Time { return since.Add(time.Duration(hoursIn)*time.Hour + 30*time.Minute) }

	checks := []MonitorCheck{
		{CheckedAt: at(0), Up: true},
		// Bucket 1: one check failed, one did not.
		{CheckedAt: at(1), Up: true},
		{CheckedAt: at(1).Add(time.Minute), Up: false},
		// Bucket 2: every check failed.
		{CheckedAt: at(2), Up: false},
		{CheckedAt: at(2).Add(time.Minute), Up: false},
		// buckets 3..8 have nothing recorded at all
		{CheckedAt: at(9), Up: true},
	}

	beats := bucketBeats(checks, since, now, 10)
	if len(beats) != 10 {
		t.Fatalf("got %d beats, want 10", len(beats))
	}

	want := []string{"up", "partial", "down", "empty", "empty", "empty", "empty", "empty", "empty", "up"}
	for i, w := range want {
		if beats[i].Status != w {
			t.Errorf("bucket %d is %q, want %q", i, beats[i].Status, w)
		}
	}
}

// Degenerate windows must not panic or divide by zero.
func TestBucketBeatsHandlesEmptyWindows(t *testing.T) {
	now := time.Date(2026, 9, 14, 12, 0, 0, 0, time.UTC)

	if got := bucketBeats(nil, now, now, 40); len(got) != 0 {
		t.Errorf("a zero-length window gave %d beats, want none", len(got))
	}
	if got := bucketBeats(nil, now.Add(time.Hour), now, 40); len(got) != 0 {
		t.Errorf("a window ending before it starts gave %d beats, want none", len(got))
	}
	if got := bucketBeats(nil, now.Add(-time.Hour), now, 0); len(got) != 0 {
		t.Errorf("zero buckets gave %d beats, want none", len(got))
	}

	// An empty window still reports its shape, so the strip spans the range
	// rather than collapsing to nothing.
	got := bucketBeats(nil, now.Add(-24*time.Hour), now, 40)
	if len(got) != 40 {
		t.Fatalf("got %d beats for a window with no checks, want 40", len(got))
	}
	for i, b := range got {
		if b.Status != "empty" {
			t.Errorf("bucket %d is %q with no checks at all, want %q", i, b.Status, "empty")
		}
	}
}

// incidentsOver reads the incidents the way GetHistory does for one range.
func incidentsOver(t *testing.T, h *MonitorHandler, itemID int, since, now time.Time) []incident {
	t.Helper()
	checks, err := h.store.History(itemID, since)
	if err != nil {
		t.Fatalf("history: %v", err)
	}
	_, inc := h.incidentsFor(itemID, checks, now)
	return inc
}

// An outage has one start and one length, whichever range it is looked at
// through. Before this, the list only knew the checks inside the window, so an
// outage that began two days ago read as starting 24 hours ago under "24h" and
// as starting two days ago under "7d" - same outage, two dates, two durations.
func TestIncidentKeepsItsStartAcrossRanges(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := &MonitorStore{DB: db}
	h := &MonitorHandler{DB: db, store: store}
	now := time.Now().UTC().Truncate(time.Second)

	// Ongoing: up until 50 hours ago, down ever since.
	going := seedItem(t, store)
	for m := 60 * 60; m > 50*60; m -= 30 {
		record(t, store, going, now.Add(-time.Duration(m)*time.Minute), true, nil)
	}
	began := now.Add(-50 * time.Hour)
	for m := 50 * 60; m >= 0; m -= 30 {
		record(t, store, going, now.Add(-time.Duration(m)*time.Minute), false, nil)
	}

	day := incidentsOver(t, h, going, now.Add(-24*time.Hour), now)
	week := incidentsOver(t, h, going, now.Add(-7*24*time.Hour), now)
	if len(day) != 1 || len(week) != 1 {
		t.Fatalf("want one incident in each range, got %d and %d", len(day), len(week))
	}
	if !day[0].Start.Equal(began) || !week[0].Start.Equal(began) {
		t.Errorf("start: 24h says %v, 7d says %v, the outage began %v", day[0].Start, week[0].Start, began)
	}
	if day[0].DurationSec != week[0].DurationSec || day[0].DurationSec != 50*3600 {
		t.Errorf("duration: 24h says %ds, 7d says %ds, want %ds", day[0].DurationSec, week[0].DurationSec, 50*3600)
	}
	if day[0].End != nil {
		t.Errorf("an outage still going on has no end, got %v", day[0].End)
	}

	// Closed: down from 30 hours ago to 20 hours ago. Under 24h the window
	// catches only its last four hours; the start and length must still be its own.
	closed := seedItem2(t, store)
	record(t, store, closed, now.Add(-31*time.Hour), true, nil)
	for m := 30 * 60; m > 20*60; m -= 30 {
		record(t, store, closed, now.Add(-time.Duration(m)*time.Minute), false, nil)
	}
	record(t, store, closed, now.Add(-20*time.Hour), true, nil)

	got := incidentsOver(t, h, closed, now.Add(-24*time.Hour), now)
	if len(got) != 1 {
		t.Fatalf("want one closed incident, got %d", len(got))
	}
	if want := now.Add(-30 * time.Hour); !got[0].Start.Equal(want) {
		t.Errorf("closed start = %v, want %v", got[0].Start, want)
	}
	if got[0].DurationSec != 10*3600 {
		t.Errorf("closed duration = %ds, want %ds", got[0].DurationSec, 10*3600)
	}
}

// When the window opens on a successful check, nothing crosses its edge and
// the incident is left exactly as the window found it.
func TestIncidentInsideTheWindowIsUntouched(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := &MonitorStore{DB: db}
	h := &MonitorHandler{DB: db, store: store}
	now := time.Now().UTC().Truncate(time.Second)

	item := seedItem(t, store)
	record(t, store, item, now.Add(-40*time.Hour), false, nil) // an older, separate outage
	record(t, store, item, now.Add(-23*time.Hour), true, nil)
	record(t, store, item, now.Add(-10*time.Hour), false, nil)
	record(t, store, item, now.Add(-9*time.Hour), true, nil)

	got := incidentsOver(t, h, item, now.Add(-24*time.Hour), now)
	if len(got) != 1 {
		t.Fatalf("want one incident, got %d", len(got))
	}
	if want := now.Add(-10 * time.Hour); !got[0].Start.Equal(want) || got[0].DurationSec != 3600 {
		t.Errorf("got start %v and %ds, want %v and 3600s", got[0].Start, got[0].DurationSec, want)
	}
}

// seedItem2 adds a second bookmark to the user seedItem created.
func seedItem2(t *testing.T, store *MonitorStore) int {
	t.Helper()
	var uid int
	if err := store.DB.QueryRow(`SELECT id FROM users LIMIT 1`).Scan(&uid); err != nil {
		t.Fatalf("user: %v", err)
	}
	return seedItemFor(t, store, uid)
}
