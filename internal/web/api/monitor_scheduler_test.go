package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

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
	if _, err := db.Exec(
		`INSERT INTO items (user_id, type, x, y, w, h, url, content)
		 VALUES (?, 'bookmark', 0, 0, 1, 1, ?, '{"statusCheck":true}')`, uid, srv.URL); err != nil {
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
	if got := sched.mode(); got != "tab" {
		t.Errorf("default mode should be tab, got %q", got)
	}
	if got := sched.intervalSec(); got != monitorDefaultIntervalSec {
		t.Errorf("default interval should be %d, got %d", monitorDefaultIntervalSec, got)
	}

	// A too-small interval clamps to the floor; a valid one passes through.
	db.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('monitoring_interval_sec', '5')`)
	if got := sched.intervalSec(); got != monitorMinIntervalSec {
		t.Errorf("interval 5 should clamp to %d, got %d", monitorMinIntervalSec, got)
	}
	db.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('monitoring_interval_sec', '120')`)
	if got := sched.intervalSec(); got != 120 {
		t.Errorf("interval 120 should pass through, got %d", got)
	}

	db.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('monitoring_mode', 'background')`)
	if got := sched.mode(); got != "background" {
		t.Errorf("mode should read back as background, got %q", got)
	}
}
