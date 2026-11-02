package api

import (
	"context"
	"fmt"
	"math/rand"
	"path/filepath"
	"sort"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
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

// The quick way to list outages must give exactly what the full pass gives: the
// same outages, the same starts (cut ones included), lengths, codes and order.
// Random histories with runs of failures that cross the window's start, still
// under way, one check long, and services with no checks at all.
func TestTheQuickOutageListIsTheFullPassesAnswer(t *testing.T) {
	// A file, not memory: the full pass asks the database again while it reads, which one connection cannot do.
	opened, err := database.InitDB(filepath.Join(t.TempDir(), "q.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { opened.Close() })
	db := opened.DB
	store := &MonitorStore{DB: db}
	h := &MonitorHandler{DB: db, store: store}
	seed := seedItem(t, store)
	owner := ownerOf(t, store, seed)
	now := time.Now().UTC().Truncate(time.Second)
	rng := rand.New(rand.NewSource(11))

	var ids []int
	for i := 0; i < 8; i++ {
		ids = append(ids, monitored(t, store, owner, fmt.Sprintf("svc%d", i)))
	}
	// One that is no longer monitored, one with nothing recorded, one of another account.
	gone := seedItemFor(t, store, owner)
	idle := monitored(t, store, owner, "idle")
	_ = idle
	stranger := monitored(t, store, anotherUser(t, store), "stranger")

	const minutes = 31 * 24 * 60 / 7 // a check every seven minutes over 31 days
	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	put := func(id int, at time.Time, up bool, latency *int, code int) {
		if _, err := tx.Exec(`INSERT INTO monitor_checks (item_id, checked_at, up, latency_ms, status_code) VALUES (?, ?, ?, ?, ?)`,
			id, at.UTC().Format("2006-01-02 15:04:05"), up, latency, code); err != nil {
			t.Fatalf("record: %v", err)
		}
	}
	for k, id := range append(append([]int{}, ids...), gone, stranger) {
		down := false
		for m := 0; m < minutes; m++ {
			// A run of failures begins now and then; the first service flaps, the second is down at the end.
			switch {
			case !down && rng.Intn(60) == 0, !down && k == 0 && rng.Intn(6) == 0:
				down = true
			case down && rng.Intn(9) == 0 && !(k == 1 && m > minutes-40):
				down = false
			}
			at := now.Add(-time.Duration(minutes-m) * 7 * time.Minute)
			if down {
				put(id, at, false, nil, []int{0, 502, 503}[rng.Intn(3)])
			} else {
				put(id, at, true, ms(10+rng.Intn(200)), 200)
			}
		}
	}
	// Failed from before the oldest check there is, so one outage is cut by the very first window too.
	put(ids[2], now.Add(-32*24*time.Hour), false, nil, 504)
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	canon := func(l []serviceIncident) []serviceIncident {
		sort.SliceStable(l, func(i, j int) bool {
			if !l[i].Start.Equal(l[j].Start) {
				return l[i].Start.After(l[j].Start)
			}
			return l[i].ItemID < l[j].ItemID
		})
		return l
	}
	for _, window := range []time.Duration{24 * time.Hour, 7 * 24 * time.Hour, 30 * 24 * time.Hour} {
		since := now.Add(-window)
		want, err := h.incidentsAcrossScan(context.Background(), owner, since, now)
		if err != nil {
			t.Fatal(err)
		}
		got, err := h.incidentsFromRuns(context.Background(), owner, since, now)
		if err != nil {
			t.Fatal(err)
		}
		want, got = canon(want), canon(got)
		if len(want) < 5 {
			t.Fatalf("%v: the full pass found only %d outages: the data does not exercise the comparison", window, len(want))
		}
		if len(got) != len(want) {
			t.Fatalf("%v: quick way found %d outages, full pass %d", window, len(got), len(want))
		}
		cut := 0
		for i := range want {
			g, w := got[i], want[i]
			same := g.ItemID == w.ItemID && g.Name == w.Name && g.Start.Equal(w.Start) &&
				(g.End == nil) == (w.End == nil) && (g.End == nil || g.End.Equal(*w.End)) &&
				g.DurationSec == w.DurationSec && g.StatusCode == w.StatusCode
			if !same {
				t.Fatalf("%v: outage %d differs:\n quick %+v\n  full %+v", window, i, g, w)
			}
			if w.Start.Before(since) {
				cut++
			}
		}
		if window == 7*24*time.Hour && cut == 0 {
			t.Errorf("no outage crossed the start of the 7 day window: the cut ones are not being compared")
		}
	}
}

// hourlyCounts reads the rollup as "item hour" -> {checks, passed}.
func hourlyCounts(t *testing.T, store *MonitorStore, query string) map[string][2]int {
	t.Helper()
	rows, err := store.DB.Query(query)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	out := map[string][2]int{}
	for rows.Next() {
		var id, total, up int
		var bucket string
		if err := rows.Scan(&id, &bucket, &total, &up); err != nil {
			t.Fatal(err)
		}
		out[fmt.Sprintf("%d %s", id, bucket)] = [2]int{total, up}
	}
	return out
}

// The hourly counts the 7 and 30 day figures are made of must say what the checks
// say after every way a check can come or go: recorded, pruned by age, cleared by
// hand, or removed with its service.
func TestTheHourlyCountsFollowTheChecksWhateverHappensToThem(t *testing.T) {
	db, _ := setupTestDB(t)
	store := &MonitorStore{DB: db}
	owner := ownerOf(t, store, seedItem(t, store))
	a, b := monitored(t, store, owner, "a"), monitored(t, store, owner, "b")
	now := time.Now().UTC().Truncate(time.Second)
	rng := rand.New(rand.NewSource(5))
	for _, id := range []int{a, b} {
		for m := 0; m < 6000; m += 7 {
			recordCode(t, store, id, now.Add(-time.Duration(m)*time.Minute), rng.Intn(5) != 0, ms(20), 200)
		}
		recordCode(t, store, id, now.Add(-45*24*time.Hour), true, ms(20), 200)
		recordCode(t, store, id, now.Add(-44*24*time.Hour), false, nil, 502)
	}
	counts := `SELECT item_id, substr(checked_at, 1, 13), COUNT(*), SUM(up) FROM monitor_checks GROUP BY 1, 2`
	rollup := `SELECT item_id, bucket, total, up FROM monitor_rollup`
	same := func(when string) {
		t.Helper()
		got, want := hourlyCounts(t, store, rollup), hourlyCounts(t, store, counts)
		if len(want) == 0 {
			t.Fatalf("%s: no checks left: the comparison compares nothing", when)
		}
		if len(got) != len(want) {
			t.Fatalf("%s: %d hours counted, %d in the checks", when, len(got), len(want))
		}
		for k, w := range want {
			if got[k] != w {
				t.Fatalf("%s: hour %s counted %v, the checks say %v", when, k, got[k], w)
			}
		}
	}
	same("after recording")
	if n, err := store.Prune(30); err != nil || n == 0 {
		t.Fatalf("prune removed %d (%v): nothing aged out to compare", n, err)
	}
	same("after pruning by age")
	if _, err := store.DB.Exec(`DELETE FROM monitor_checks WHERE item_id = ? AND checked_at < ?`, a, now.Add(-24*time.Hour).Format("2006-01-02 15:04:05")); err != nil {
		t.Fatal(err)
	}
	same("after clearing part of one service")
	if _, err := store.DB.Exec(`DELETE FROM items WHERE id = ?`, a); err != nil {
		t.Fatal(err)
	}
	same("after removing a service")
}

// The 7 and 30 day uptimes are the checks' own, to the second, even though the
// counts are by the hour: the hour a window starts in is read from the checks.
func TestTheWindowsAreExactToTheSecondWhereAnHourIsCut(t *testing.T) {
	db, _ := setupTestDB(t)
	store := &MonitorStore{DB: db}
	owner := ownerOf(t, store, seedItem(t, store))
	rng := rand.New(rand.NewSource(9))
	now := time.Date(2026, 11, 2, 14, 37, 21, 0, time.UTC) // not on an hour
	var ids []int
	for _, n := range []string{"x", "y", "z"} {
		ids = append(ids, monitored(t, store, owner, n))
	}
	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	for _, id := range ids {
		for s := 0; s < 31*24*3600; s += 97 { // a check every 97 seconds: none lands on the cut
			if _, err := tx.Exec(`INSERT INTO monitor_checks (item_id, checked_at, up, latency_ms, status_code) VALUES (?, ?, ?, 10, 200)`,
				id, now.Add(-time.Duration(s)*time.Second).Format("2006-01-02 15:04:05"), rng.Intn(7) != 0); err != nil {
				t.Fatal(err)
			}
		}
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}
	got, err := store.OverviewWindows(owner, now)
	if err != nil {
		t.Fatal(err)
	}
	for _, id := range ids {
		for _, c := range []struct {
			name   string
			window time.Duration
			read   float64
		}{{"7d", 7 * 24 * time.Hour, got[id].Uptime7d}, {"30d", 30 * 24 * time.Hour, got[id].Uptime30d}} {
			var total, up int
			if err := db.QueryRow(`SELECT COUNT(*), SUM(up) FROM monitor_checks WHERE item_id = ? AND checked_at >= ?`,
				id, now.Add(-c.window).Format("2006-01-02 15:04:05")).Scan(&total, &up); err != nil {
				t.Fatal(err)
			}
			want := float64(up) / float64(total) * 100
			if d := c.read - want; d > 1e-9 || d < -1e-9 {
				t.Errorf("item %d, %s: %.6f, the checks say %.6f", id, c.name, c.read, want)
			}
		}
	}
}
