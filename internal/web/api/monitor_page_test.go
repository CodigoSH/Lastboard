package api

import (
	"context"
	"testing"
	"time"
)

// monitored makes an item the monitor watches: a bookmark with its status check on.
func monitored(t *testing.T, store *MonitorStore, owner int, name string) int {
	t.Helper()
	id := seedItemFor(t, store, owner)
	content := `{"label":"` + name + `","url":"http://` + name + `.lan","statusCheck":true,"icon":"/api/icons/x"}`
	if _, err := store.DB.Exec(`UPDATE items SET content = ? WHERE id = ?`, content, id); err != nil {
		t.Fatalf("content: %v", err)
	}
	return id
}

// anotherUser creates a second account and returns its id.
func anotherUser(t *testing.T, store *MonitorStore) int {
	t.Helper()
	res, err := store.DB.Exec(`INSERT INTO users (username, password) VALUES ('other', 'p')`)
	if err != nil {
		t.Fatalf("user: %v", err)
	}
	id, _ := res.LastInsertId()
	return int(id)
}

// recordCode inserts one check with an explicit answer.
func recordCode(t *testing.T, store *MonitorStore, itemID int, at time.Time, up bool, latency *int, code int) {
	t.Helper()
	if _, err := store.DB.Exec(
		`INSERT INTO monitor_checks (item_id, checked_at, up, latency_ms, status_code) VALUES (?, ?, ?, ?, ?)`,
		itemID, at.UTC().Format("2006-01-02 15:04:05"), up, latency, code); err != nil {
		t.Fatalf("record: %v", err)
	}
}

func ms(v int) *int { return &v }

func TestAnIncidentSaysWhatTheFirstFailingCheckGotBack(t *testing.T) {
	now := time.Now().UTC()
	at := func(m int) time.Time { return now.Add(-time.Duration(m) * time.Minute) }
	checks := []MonitorCheck{
		{CheckedAt: at(50), Up: true, StatusCode: 200},
		{CheckedAt: at(40), Up: false, StatusCode: 502},
		{CheckedAt: at(30), Up: false, StatusCode: 0},
		{CheckedAt: at(20), Up: true, StatusCode: 200},
		{CheckedAt: at(10), Up: false, StatusCode: 0},
	}
	_, incs := summarizeHistory(checks, now)
	if len(incs) != 2 {
		t.Fatalf("incidents = %d, want 2", len(incs))
	}
	if incs[0].StatusCode != 502 || incs[1].StatusCode != 0 {
		t.Errorf("codes = %d and %d, want 502 and 0 (the first failing check's, not the last's)", incs[0].StatusCode, incs[1].StatusCode)
	}
}

func TestTheOverviewWindowsAreEachItsOwnAndTheOwners(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := &MonitorStore{DB: db}
	first := seedItem(t, store)
	owner := ownerOf(t, store, first)
	now := time.Now()

	// Today: two answered (100 and 300 ms), one did not. Five days ago: it did not answer
	// twice. Twenty days ago: it answered. A day-old average must not see the older ones.
	recordCode(t, store, first, now.Add(-1*time.Hour), true, ms(100), 200)
	recordCode(t, store, first, now.Add(-2*time.Hour), true, ms(300), 200)
	recordCode(t, store, first, now.Add(-3*time.Hour), false, nil, 502)
	recordCode(t, store, first, now.Add(-5*24*time.Hour), false, nil, 0)
	recordCode(t, store, first, now.Add(-5*24*time.Hour-time.Hour), false, nil, 0)
	recordCode(t, store, first, now.Add(-20*24*time.Hour), true, ms(9000), 200)

	other := seedItemFor(t, store, anotherUser(t, store)) // somebody else's
	recordCode(t, store, other, now.Add(-time.Hour), false, nil, 0)

	w, err := store.OverviewWindows(owner, now)
	if err != nil {
		t.Fatal(err)
	}
	got, ok := w[first]
	if !ok {
		t.Fatal("no windows for the item")
	}
	// 7 d: five checks, two answered.
	if got.Uptime7d < 39.9 || got.Uptime7d > 40.1 {
		t.Errorf("7 d uptime = %.1f, want 40", got.Uptime7d)
	}
	// 30 d: six checks, three answered.
	if got.Uptime30d < 49.9 || got.Uptime30d > 50.1 {
		t.Errorf("30 d uptime = %.1f, want 50", got.Uptime30d)
	}
	if got.AvgMs24h == nil || *got.AvgMs24h != 200 {
		t.Errorf("24 h average = %v, want 200 (the 9 s twenty days ago does not count)", got.AvgMs24h)
	}
	if _, leaked := w[other]; leaked {
		t.Error("another account's item is in the windows")
	}
}

func TestTheTrendBucketsTheWindowAndLeavesGapsEmpty(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := &MonitorStore{DB: db}
	a := seedItem(t, store)
	owner := ownerOf(t, store, a)
	b := seedItemFor(t, store, owner)
	now := time.Now().UTC().Truncate(time.Second)
	since := now.Add(-24 * time.Hour)

	// Both services were checked in the last bucket: one answered in 100 ms and one in 500 ms.
	recordCode(t, store, a, now.Add(-2*time.Minute), true, ms(100), 200)
	recordCode(t, store, b, now.Add(-2*time.Minute), true, ms(500), 200)
	// One bucket early on had a check that did not answer.
	recordCode(t, store, a, since.Add(10*time.Minute), false, nil, 502)

	pts, err := store.Trend(owner, since, now)
	if err != nil {
		t.Fatal(err)
	}
	if len(pts) != trendPoints {
		t.Fatalf("points = %d, want %d", len(pts), trendPoints)
	}
	last := pts[trendPoints-1]
	if last.MeanMs == nil || *last.MeanMs != 300 || last.MaxMs == nil || *last.MaxMs != 500 {
		t.Errorf("last bucket mean/max = %v/%v, want 300/500", last.MeanMs, last.MaxMs)
	}
	first := pts[0]
	if first.MeanMs != nil || first.MaxMs != nil {
		t.Error("a bucket where nothing answered must carry no latency, not a zero")
	}
	if first.UptimePc == nil || *first.UptimePc != 0 {
		t.Errorf("the failed bucket's uptime = %v, want 0", first.UptimePc)
	}
	if pts[30].UptimePc != nil {
		t.Error("a bucket nobody checked must say nothing, not 0 or 100")
	}
}

func TestIncidentsAcrossServicesAreListedNewestFirstWithTheirOwnNames(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := &MonitorStore{DB: db}
	h := &MonitorHandler{DB: db, store: store}
	seed := seedItem(t, store)
	owner := ownerOf(t, store, seed)
	plex := monitored(t, store, owner, "plex")
	immich := monitored(t, store, owner, "immich")
	other := monitored(t, store, anotherUser(t, store), "someone-elses")
	now := time.Now().UTC().Truncate(time.Second)
	at := func(m int) time.Time { return now.Add(-time.Duration(m) * time.Minute) }

	// plex: down 5 h ago for 20 minutes. immich: down 1 h ago and still down.
	recordCode(t, store, plex, at(400), true, ms(10), 200)
	recordCode(t, store, plex, at(300), false, nil, 503)
	recordCode(t, store, plex, at(280), true, ms(10), 200)
	recordCode(t, store, immich, at(120), true, ms(10), 200)
	recordCode(t, store, immich, at(60), false, nil, 0)
	recordCode(t, store, immich, at(5), false, nil, 0)
	recordCode(t, store, other, at(60), false, nil, 0)

	got, err := h.incidentsAcross(context.Background(), owner, now.Add(-24*time.Hour), now)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 {
		t.Fatalf("incidents = %d, want 2 (another account's is not ours)", len(got))
	}
	if got[0].Name != "immich" || got[0].End != nil || got[1].Name != "plex" || got[1].End == nil {
		t.Errorf("order/state wrong: %+v / %+v — want immich (open) first, then plex (closed)", got[0], got[1])
	}
	if got[1].StatusCode != 503 || got[1].DurationSec != 20*60 {
		t.Errorf("plex's incident = %d s, code %d; want 1200 s and 503", got[1].DurationSec, got[1].StatusCode)
	}
}

func TestTheMonitoredItemsSayWhereTheyLiveAndWhatTheyWear(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := &MonitorStore{DB: db}
	seed := seedItem(t, store)
	owner := ownerOf(t, store, seed)
	if _, err := db.Exec(`INSERT INTO dashboards (id, user_id, name, position) VALUES (7, ?, 'Servidores', 0)`, owner); err != nil {
		t.Fatal(err)
	}
	id := monitored(t, store, owner, "forgejo")
	if _, err := db.Exec(`UPDATE items SET dashboard_id = 7 WHERE id = ?`, id); err != nil {
		t.Fatal(err)
	}
	items, err := store.MonitoredItemsForUser(owner)
	if err != nil {
		t.Fatal(err)
	}
	var found *MonitoredItem
	for i := range items {
		if items[i].ID == id {
			found = &items[i]
		}
	}
	if found == nil {
		t.Fatal("the item is not listed")
	}
	if found.Board != "Servidores" || found.Icon != "/api/icons/x" || found.URL != "http://forgejo.lan" {
		t.Errorf("item = %+v, want board Servidores, icon /api/icons/x and its address", *found)
	}
}

func TestACheckStampedAtNowLandsInTheLastBucketNotOffTheEnd(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := &MonitorStore{DB: db}
	a := seedItem(t, store)
	owner := ownerOf(t, store, a)
	now := time.Now().UTC().Truncate(time.Second)
	recordCode(t, store, a, now, true, ms(250), 200)

	pts, err := store.Trend(owner, now.Add(-24*time.Hour), now)
	if err != nil {
		t.Fatal(err)
	}
	last := pts[trendPoints-1]
	if last.MeanMs == nil || *last.MeanMs != 250 {
		t.Errorf("a check made right now is not in the last bucket: %+v", last)
	}
}

func TestABookmarkThatStoppedBeingMonitoredLeavesTheOutageList(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := &MonitorStore{DB: db}
	h := &MonitorHandler{DB: db, store: store}
	seed := seedItem(t, store)
	owner := ownerOf(t, store, seed)
	kept := monitored(t, store, owner, "kept")
	dropped := monitored(t, store, owner, "dropped")
	now := time.Now().UTC().Truncate(time.Second)
	at := func(m int) time.Time { return now.Add(-time.Duration(m) * time.Minute) }
	for _, id := range []int{kept, dropped} {
		recordCode(t, store, id, at(60), true, ms(10), 200)
		recordCode(t, store, id, at(30), false, nil, 502)
		recordCode(t, store, id, at(5), true, ms(10), 200)
	}
	// The person turned the status check off on one of them: its history stays, but it is no longer a service.
	if _, err := db.Exec(`UPDATE items SET content = '{"label":"dropped","url":"http://dropped.lan","statusCheck":false}' WHERE id = ?`, dropped); err != nil {
		t.Fatal(err)
	}

	got, err := h.incidentsAcross(context.Background(), owner, now.Add(-24*time.Hour), now)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].Name != "kept" {
		t.Errorf("incidents = %+v, want only the one still monitored", got)
	}
}
