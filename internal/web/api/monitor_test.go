package api

import (
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

	items, err := store.MonitoredItems()
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

	up, latency, code := probeTimed(srv.URL)
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

	up, latency, _ := probeTimed(url)
	if up {
		t.Fatalf("expected down for a closed server")
	}
	if latency != nil {
		t.Errorf("down check must have nil latency, got %d", *latency)
	}
}

func TestProbeTimedBadScheme(t *testing.T) {
	up, latency, code := probeTimed("ftp://example.com")
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

func TestBuildHeartbeat(t *testing.T) {
	now := time.Now()
	since := now.Add(-60 * time.Minute) // 60 buckets → 1 min each
	at := func(minAgo int) time.Time { return now.Add(time.Duration(-minAgo) * time.Minute) }

	checks := []MonitorCheck{
		{Up: true, CheckedAt: at(59)},  // bucket ~0
		{Up: false, CheckedAt: at(30)}, // bucket ~30 → down
		{Up: true, CheckedAt: at(30)},  // same bucket, must stay down
		{Up: true, CheckedAt: at(1)},   // bucket ~59
	}
	hb := buildHeartbeat(checks, since, now, 60)
	if len(hb) != 60 {
		t.Fatalf("expected 60 buckets, got %d", len(hb))
	}

	up, down, none := 0, 0, 0
	for _, b := range hb {
		switch b.Status {
		case "up":
			up++
		case "down":
			down++
		case "none":
			none++
		}
	}
	if down != 1 {
		t.Errorf("expected exactly 1 down bucket, got %d", down)
	}
	if up != 2 {
		t.Errorf("expected 2 up buckets, got %d", up)
	}
	if none != 57 {
		t.Errorf("expected 57 empty buckets, got %d", none)
	}
	// Buckets are chronological.
	for i := 1; i < len(hb); i++ {
		if hb[i].At.Before(hb[i-1].At) {
			t.Errorf("buckets not chronological at %d", i)
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
