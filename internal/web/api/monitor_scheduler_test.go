package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"git.codigosh.com/CodigoSH/Lastboard/internal/core/access"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestSchedulerAlertTransitions(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	sched := NewMonitorScheduler(db)
	// Enabled:false → no outbound send; we only assert the state machine.
	cfg := notifyConfig{Enabled: false, Type: "webhook", URL: "http://x", FailThreshold: 2}
	it := MonitoredItem{ID: 1, Name: "x", URL: "http://x"}

	sched.evalAlert(context.Background(), it, true, cfg) // seed as up
	if sched.alertState[1].down {
		t.Fatal("seed up should not be down")
	}
	sched.evalAlert(context.Background(), it, false, cfg) // 1st fail (threshold 2)
	if sched.alertState[1].down || sched.alertState[1].fails != 1 {
		t.Fatalf("after 1 fail: fails=%d down=%v", sched.alertState[1].fails, sched.alertState[1].down)
	}
	sched.evalAlert(context.Background(), it, false, cfg) // 2nd fail → down
	if !sched.alertState[1].down {
		t.Fatal("should be down after reaching threshold")
	}
	sched.evalAlert(context.Background(), it, true, cfg) // recover
	if sched.alertState[1].down || sched.alertState[1].fails != 0 {
		t.Fatal("should recover on next up")
	}
}

func TestMonitorHandlerGetDefaults(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	h := NewMonitorHandler(db)

	rec := httptest.NewRecorder()
	h.GetSettings(rec, httptest.NewRequest("GET", "/api/monitor/settings", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var s monitorSettings
	if err := json.Unmarshal(rec.Body.Bytes(), &s); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if s.Mode != "tab" || s.IntervalSec != monitorDefaultIntervalSec {
		t.Errorf("unexpected defaults: %+v", s)
	}
}

func TestMonitorHandlerRejectsBadMode(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	h := NewMonitorHandler(db)

	req := httptest.NewRequest("POST", "/api/monitor/settings",
		strings.NewReader(`{"mode":"nonsense","interval_sec":60}`))
	rec := httptest.NewRecorder()
	h.UpdateSettings(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestSchedulerRunCycleRecords(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	sched := NewMonitorScheduler(db)

	// A monitored bookmark pointing at the live test server.
	res, _ := db.Exec(`INSERT INTO users (username, password) VALUES ('u', 'p')`)
	uid, _ := res.LastInsertId()
	grant(t, db, int(uid), access.Homelab())
	if _, err := db.Exec(
		`INSERT INTO items (user_id, type, x, y, w, h, content)
		 VALUES (?, 'bookmark', 0, 0, 1, 1, ?)`, uid,
		`{"statusCheck":true,"url":"`+srv.URL+`"}`); err != nil {
		t.Fatalf("seed item: %v", err)
	}
	var itemID int
	db.QueryRow(`SELECT id FROM items LIMIT 1`).Scan(&itemID)

	sched.RunCycle()

	checks, err := sched.store.Recent(itemID, 10)
	if err != nil {
		t.Fatalf("recent: %v", err)
	}
	if len(checks) != 1 {
		t.Fatalf("expected 1 recorded check, got %d", len(checks))
	}
	if !checks[0].Up || checks[0].StatusCode != 200 {
		t.Errorf("expected up/200, got up=%v code=%d", checks[0].Up, checks[0].StatusCode)
	}
	if checks[0].LatencyMs == nil {
		t.Errorf("up check should carry latency")
	}
}

func TestSchedulerSettingsDefaults(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	sched := NewMonitorScheduler(db)

	// Unset → safe defaults: mode "tab" (idle), interval the 5-min default.
	if got := sched.mode(1); got != "tab" {
		t.Errorf("default mode should be tab, got %q", got)
	}
	if got := sched.intervalSec(1); got != monitorDefaultIntervalSec {
		t.Errorf("default interval should be %d, got %d", monitorDefaultIntervalSec, got)
	}

	// A too-small interval clamps to the floor; a valid one passes through.
	db.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('monitoring_interval_sec', '5')`)
	if got := sched.intervalSec(1); got != monitorMinIntervalSec {
		t.Errorf("interval 5 should clamp to %d, got %d", monitorMinIntervalSec, got)
	}
	db.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('monitoring_interval_sec', '120')`)
	if got := sched.intervalSec(1); got != 120 {
		t.Errorf("interval 120 should pass through, got %d", got)
	}

	db.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('monitoring_mode', 'background')`)
	if got := sched.mode(1); got != "background" {
		t.Errorf("mode should read back as background, got %q", got)
	}
}

// TestForgetStaleAlerts checks that alert state for monitors that no longer
// exist is dropped, while live monitors keep theirs.
func TestForgetStaleAlerts(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	sched := NewMonitorScheduler(db)
	cfg := notifyConfig{Enabled: false, FailThreshold: 1}

	sched.evalAlert(context.Background(), MonitoredItem{ID: 1, URL: "http://a"}, false, cfg)
	sched.evalAlert(context.Background(), MonitoredItem{ID: 2, URL: "http://b"}, false, cfg)
	if len(sched.alertState) != 2 {
		t.Fatalf("expected 2 seeded entries, got %d", len(sched.alertState))
	}

	// Item 2 is gone from the monitored set (bookmark deleted).
	sched.forgetStaleAlerts(0, []MonitoredItem{{ID: 1, URL: "http://a"}})

	if _, ok := sched.alertState[1]; !ok {
		t.Error("live monitor 1 should keep its alert state")
	}
	if _, ok := sched.alertState[2]; ok {
		t.Error("deleted monitor 2 should have been forgotten")
	}
}

// TestForgetStaleAlertsClearsAllWhenNoneMonitored covers turning monitoring off
// for every bookmark: nothing should be retained.
func TestForgetStaleAlertsClearsAllWhenNoneMonitored(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	sched := NewMonitorScheduler(db)
	cfg := notifyConfig{Enabled: false, FailThreshold: 1}

	sched.evalAlert(context.Background(), MonitoredItem{ID: 7, URL: "http://x"}, false, cfg)
	sched.forgetStaleAlerts(0, nil)

	if len(sched.alertState) != 0 {
		t.Fatalf("expected empty alert state, got %d entries", len(sched.alertState))
	}
}

// An account's mode, interval and failure threshold are its own; one that never
// saved them starts from what the server was set to.
func TestMonitoringSettingsAreEachAccountsOwn(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	db.Exec(`INSERT INTO users (id, username, password, role) VALUES (1, 'a', 'p', 'admin'), (2, 'b', 'p', 'user')`)
	sched := NewMonitorScheduler(db)

	db.Exec(`INSERT INTO system_settings (key, value) VALUES ('monitoring_mode', 'background'), ('monitoring_interval_sec', '120')`)
	if sched.mode(1) != "background" || sched.intervalSec(2) != 120 {
		t.Fatal("an account that chose nothing did not start from the server's setting")
	}

	db.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (1, 'monitoring_mode', 'off'), (1, 'monitoring_interval_sec', '45')`)
	if sched.mode(1) != "off" || sched.intervalSec(1) != 45 {
		t.Errorf("an account's own choice was not used: %s %d", sched.mode(1), sched.intervalSec(1))
	}
	if sched.mode(2) != "background" || sched.intervalSec(2) != 120 {
		t.Errorf("one account's choice reached another: %s %d", sched.mode(2), sched.intervalSec(2))
	}
	// The alert channel has no starting point to inherit.
	db.Exec(`INSERT INTO system_settings (key, value) VALUES ('monitoring_notify_url', 'http://leftover')`)
	if got := sched.notifyCfg(2).URL; got != "" {
		t.Errorf("an account inherited a channel nobody gave it: %q", got)
	}
}

// Each account's alerts go to its own channel, and only for its own bookmarks.
func TestAlertsGoToTheChannelOfTheAccountThatOwnsTheBookmark(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	db.Exec(`INSERT INTO users (id, username, password, role) VALUES (1, 'a', 'p', 'admin'), (2, 'b', 'p', 'user')`)
	grant(t, db, 2, access.Homelab())

	var mu sync.Mutex
	got := map[string][]string{}
	channel := func(who string) *httptest.Server {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			mu.Lock()
			got[who] = append(got[who], r.Header.Get("Title"))
			mu.Unlock()
		}))
		t.Cleanup(srv.Close)
		return srv
	}
	chA, chB := channel("a"), channel("b")

	dead := httptest.NewServer(http.NotFoundHandler())
	deadURL := dead.URL
	dead.Close()
	for uid, label := range map[int]string{1: "svc-of-a", 2: "svc-of-b"} {
		db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'bookmark', 0, 0, 1, 1, ?)`,
			uid, `{"statusCheck":true,"url":"`+deadURL+`","label":"`+label+`"}`)
	}
	for uid, ch := range map[int]string{1: chA.URL, 2: chB.URL} {
		db.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (?, 'monitoring_alerts_enabled', '1'), (?, 'monitoring_notify_type', 'ntfy'), (?, 'monitoring_notify_url', ?), (?, 'monitoring_fail_threshold', '1')`,
			uid, uid, uid, ch, uid)
	}

	sched := NewMonitorScheduler(db)
	// The first sight of a bookmark seeds its state silently, so both start down
	// without a word. A recovery is the transition that can be observed without
	// waiting for a flap: bring both services back and each owner hears of its own.
	sched.RunCycle()
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer up.Close()
	for uid, label := range map[int]string{1: "svc-of-a", 2: "svc-of-b"} {
		db.Exec(`UPDATE items SET content = ? WHERE user_id = ?`, `{"statusCheck":true,"url":"`+up.URL+`","label":"`+label+`"}`, uid)
	}
	sched.RunCycle()

	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		mu.Lock()
		n := len(got["a"]) + len(got["b"])
		mu.Unlock()
		if n >= 2 {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	mu.Lock()
	defer mu.Unlock()
	if len(got["a"]) != 1 || got["a"][0] != "svc-of-a" {
		t.Errorf("account a's channel got %v, want its own recovery and nothing of b's", got["a"])
	}
	if len(got["b"]) != 1 || got["b"][0] != "svc-of-b" {
		t.Errorf("account b's channel got %v, want its own recovery", got["b"])
	}
}

// Which accounts are watched is decided by their mode, which is a handful of
// settings. The loop used to find the accounts by reading and parsing every
// bookmark of everyone, every fifteen seconds, even when nobody had background
// monitoring on.
func TestATickReadsNoBookmarksWhenNobodyMonitorsInTheBackground(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	db.Exec(`INSERT INTO users (id, username, password, role) VALUES (1, 'a', 'p', 'admin'), (2, 'b', 'p', 'user'), (3, 'c', 'p', 'user')`)
	db.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (1, 'monitoring_mode', 'tab'), (2, 'monitoring_mode', 'off')`)

	sched := NewMonitorScheduler(db)
	var read []int
	sched.itemsFor = func(uid int) ([]MonitoredItem, error) { read = append(read, uid); return nil, nil }

	last := map[int]time.Time{}
	now := time.Now()
	for i := 0; i < 5; i++ {
		sched.tick(now.Add(time.Duration(i)*time.Hour), last)
	}
	if len(read) != 0 {
		t.Fatalf("bookmarks were read for accounts %v although nobody monitors in the background", read)
	}
}

// An account in background mode is probed once its interval has passed, and only
// that account's bookmarks are read.
func TestATickProbesOnlyTheAccountsInBackgroundModeWhenTheirIntervalPasses(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	db.Exec(`INSERT INTO users (id, username, password, role) VALUES (1, 'a', 'p', 'admin'), (2, 'b', 'p', 'user')`)
	db.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES
		(1, 'monitoring_mode', 'background'), (1, 'monitoring_interval_sec', '60'), (2, 'monitoring_mode', 'tab')`)

	sched := NewMonitorScheduler(db)
	var read []int
	sched.itemsFor = func(uid int) ([]MonitoredItem, error) { read = append(read, uid); return nil, nil }

	last := map[int]time.Time{}
	t0 := time.Now()
	sched.tick(t0, last)                     // first sight: only starts the clock
	sched.tick(t0.Add(30*time.Second), last) // interval not over
	if len(read) != 0 {
		t.Fatalf("probed before the interval passed: %v", read)
	}
	sched.tick(t0.Add(61*time.Second), last)
	if len(read) != 1 || read[0] != 1 {
		t.Fatalf("read bookmarks of %v, want only account 1", read)
	}
}

// Alert state is dropped for bookmarks that no longer exist. That used to happen
// only in a function the tests ran and the product did not, so a deleted
// bookmark's state stayed for as long as the process lived.
func TestACycleForgetsTheAlertStateOfDeletedBookmarks(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	db.Exec(`INSERT INTO users (id, username, password, role) VALUES (1, 'a', 'p', 'admin'), (2, 'b', 'p', 'user')`)

	sched := NewMonitorScheduler(db)
	cfg := notifyConfig{FailThreshold: 1}
	// Two bookmarks of account 1 (one is about to be deleted) and one of account 2.
	sched.evalAlert(context.Background(), MonitoredItem{ID: 10, UserID: 1, URL: "http://x"}, false, cfg)
	sched.evalAlert(context.Background(), MonitoredItem{ID: 11, UserID: 1, URL: "http://y"}, false, cfg)
	sched.evalAlert(context.Background(), MonitoredItem{ID: 20, UserID: 2, URL: "http://z"}, false, cfg)

	sched.itemsFor = func(uid int) ([]MonitoredItem, error) {
		if uid == 1 {
			return []MonitoredItem{{ID: 10, UserID: 1, URL: "http://x"}}, nil // 11 is gone
		}
		return nil, nil
	}
	sched.runCycleFor(1)

	if _, ok := sched.alertState[11]; ok {
		t.Error("the deleted bookmark kept its alert state")
	}
	if _, ok := sched.alertState[10]; !ok {
		t.Error("a live bookmark lost its alert state")
	}
	if _, ok := sched.alertState[20]; !ok {
		t.Error("cycling account 1 dropped the state of account 2's bookmark")
	}
}

// grant gives an account these permissions, as the administrator would.
func grant(t *testing.T, db *sql.DB, userID int, g access.Grants) {
	t.Helper()
	if err := storeAccess(context.Background(), db, userID, g, ""); err != nil {
		t.Fatal(err)
	}
}

// The background monitor runs with the permissions of the account that owns each
// bookmark, though no request of theirs is behind it.
func TestTheMonitorRunsWithItsOwnersPermissions(t *testing.T) {
	var hits atomic.Int32
	local := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.WriteHeader(http.StatusOK)
	}))
	defer local.Close()

	internetOnly := access.Homelab()
	internetOnly.NetworkLocal = false
	cases := []struct {
		name  string
		g     access.Grants
		reach bool
	}{
		{"may monitor and reach the local network", access.Homelab(), true},
		{"may not monitor", access.Standard(), false},
		{"may monitor, internet only", internetOnly, false},
	}
	for _, c := range cases {
		db, _ := setupTestDB(t)
		db.SetMaxOpenConns(1)
		sched := NewMonitorScheduler(db)
		res, _ := db.Exec(`INSERT INTO users (username, password) VALUES ('m', 'p')`)
		uid, _ := res.LastInsertId()
		grant(t, db, int(uid), c.g)
		if _, err := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'bookmark', 0, 0, 1, 1, ?)`,
			uid, `{"statusCheck":true,"url":"`+local.URL+`"}`); err != nil {
			t.Fatal(err)
		}
		before := hits.Load()
		sched.RunCycle()
		if reached := hits.Load() > before; reached != c.reach {
			t.Errorf("%s: the local server was reached = %v, want %v", c.name, reached, c.reach)
		}
	}
}
