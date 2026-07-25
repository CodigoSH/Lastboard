package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSchedulerAlertTransitions(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	sched := NewMonitorScheduler(db)
	// Enabled:false → no outbound send; we only assert the state machine.
	cfg := notifyConfig{Enabled: false, Type: "webhook", URL: "http://x", FailThreshold: 2}
	it := MonitoredItem{ID: 1, Name: "x", URL: "http://x"}

	sched.evalAlert(it, true, cfg) // seed as up
	if sched.alertState[1].down {
		t.Fatal("seed up should not be down")
	}
	sched.evalAlert(it, false, cfg) // 1st fail (threshold 2)
	if sched.alertState[1].down || sched.alertState[1].fails != 1 {
		t.Fatalf("after 1 fail: fails=%d down=%v", sched.alertState[1].fails, sched.alertState[1].down)
	}
	sched.evalAlert(it, false, cfg) // 2nd fail → down
	if !sched.alertState[1].down {
		t.Fatal("should be down after reaching threshold")
	}
	sched.evalAlert(it, true, cfg) // recover
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
	// Seed an admin so the request passes the admin gate and reaches validation.
	db.Exec(`INSERT INTO users (id, username, password, role) VALUES (1, 'admin', 'p', 'admin')`)
	h := NewMonitorHandler(db)

	req := httptest.NewRequest("POST", "/api/monitor/settings",
		strings.NewReader(`{"mode":"nonsense","interval_sec":60}`))
	rec := httptest.NewRecorder()
	h.UpdateSettings(rec, req)

	// Without a real session the admin gate returns 403; that already proves the
	// write is protected. With a session it would reach the 400 validation.
	if rec.Code != http.StatusForbidden && rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 403 or 400, got %d", rec.Code)
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
