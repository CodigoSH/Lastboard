package api

import (
	"database/sql"
	"log/slog"
	"strconv"
	"sync"
	"time"
)

const (
	monitorRetentionDays      = 30  // history window; older rows pruned daily
	monitorMinIntervalSec     = 30  // floor to keep probing cheap
	monitorDefaultIntervalSec = 300 // 5 min, matches the tab-mode frontend cadence
	monitorMaxConcurrency     = 8   // parallel probes per cycle
)

// MonitorScheduler runs the always-on backend monitoring loop. It probes every
// bookmark with statusCheck enabled on a configurable interval and appends the
// results to monitor_checks, plus a daily retention prune. Probing only happens
// while monitoring_mode is "background"; in "off"/"tab" the loop stays idle and
// writes nothing, so it is safe to start unconditionally at boot.
type MonitorScheduler struct {
	store      *MonitorStore
	alertMu    sync.Mutex
	alertState map[int]*itemAlert
}

// itemAlert tracks a monitor's alerting state between cycles: consecutive
// failures and whether we currently consider it down (already alerted).
type itemAlert struct {
	fails int
	down  bool
}

// NewMonitorScheduler builds a scheduler over the given database handle.
func NewMonitorScheduler(db *sql.DB) *MonitorScheduler {
	return &MonitorScheduler{store: NewMonitorStore(db), alertState: map[int]*itemAlert{}}
}

// Run launches the probe loop and the daily prune. It is meant to be started in
// its own goroutine at startup and runs for the life of the process (matching
// the other background loops in NewServer).
func (m *MonitorScheduler) Run() {
	go m.pruneLoop()
	m.probeLoop()
}

func (m *MonitorScheduler) probeLoop() {
	for {
		// Re-read the interval each cycle so config changes apply without a
		// restart. The first probe happens one interval after boot.
		time.Sleep(time.Duration(m.intervalSec()) * time.Second)
		if m.mode() != "background" {
			continue
		}
		m.RunCycle()
	}
}

// pruneLoop enforces the retention window. It prunes before sleeping: waiting a
// full day first meant an instance restarted more often than that (a routine
// homelab update cadence) never pruned at all, and history grew unbounded.
func (m *MonitorScheduler) pruneLoop() {
	for {
		if n, err := m.store.Prune(monitorRetentionDays); err != nil {
			slog.Error("monitor: prune failed", "error", err)
		} else if n > 0 {
			slog.Info("monitor: pruned old history", "rows", n)
		}
		time.Sleep(24 * time.Hour)
	}
}

// RunCycle probes every monitored bookmark once (bounded concurrency) and
// records each result. Exported so it can be unit-tested without the timing loop.
func (m *MonitorScheduler) RunCycle() {
	items, err := m.store.MonitoredItems()
	if err != nil {
		slog.Error("monitor: listing items failed", "error", err)
		return
	}
	if len(items) == 0 {
		return
	}

	m.forgetStaleAlerts(items)

	cfg := m.notifyCfg()
	sem := make(chan struct{}, monitorMaxConcurrency)
	var wg sync.WaitGroup
	for _, it := range items {
		wg.Add(1)
		sem <- struct{}{}
		go func(it MonitoredItem) {
			defer wg.Done()
			defer func() { <-sem }()
			up, latency, code := probeTimed(it.URL)
			if err := m.store.Record(it.ID, up, latency, code); err != nil {
				slog.Error("monitor: recording check failed", "item", it.ID, "error", err)
			}
			m.evalAlert(it, up, cfg)
		}(it)
	}
	wg.Wait()
}

// notifyCfg reads the global alerting configuration from system_settings.
func (m *MonitorScheduler) notifyCfg() notifyConfig {
	th, _ := strconv.Atoi(m.setting("monitoring_fail_threshold"))
	if th < 1 {
		th = 1
	}
	return notifyConfig{
		Enabled:       m.setting("monitoring_alerts_enabled") == "1",
		Type:          m.setting("monitoring_notify_type"),
		URL:           m.setting("monitoring_notify_url"),
		Token:         m.setting("monitoring_notify_token"),
		FailThreshold: th,
	}
}

// forgetStaleAlerts drops alert state for monitors that no longer exist, so a
// long-running instance does not accumulate an entry per bookmark ever
// monitored. Items that come back are re-seeded silently by evalAlert.
func (m *MonitorScheduler) forgetStaleAlerts(items []MonitoredItem) {
	live := make(map[int]struct{}, len(items))
	for _, it := range items {
		live[it.ID] = struct{}{}
	}
	m.alertMu.Lock()
	defer m.alertMu.Unlock()
	for id := range m.alertState {
		if _, ok := live[id]; !ok {
			delete(m.alertState, id)
		}
	}
}

// evalAlert updates a monitor's alert state and fires a notification on a
// down↔up transition. The first observation of an item seeds state silently so
// a restart never re-alerts for services that were already down.
func (m *MonitorScheduler) evalAlert(it MonitoredItem, up bool, cfg notifyConfig) {
	m.alertMu.Lock()
	st := m.alertState[it.ID]
	if st == nil {
		st = &itemAlert{down: !up}
		if !up {
			st.fails = cfg.FailThreshold
		}
		m.alertState[it.ID] = st
		m.alertMu.Unlock()
		return
	}

	var recovered bool
	var fire bool
	if up {
		st.fails = 0
		if st.down {
			st.down = false
			fire, recovered = true, true
		}
	} else {
		st.fails++
		if !st.down && st.fails >= cfg.FailThreshold {
			st.down = true
			fire = true
		}
	}
	m.alertMu.Unlock()

	if !fire || !cfg.active() {
		return
	}
	name := it.Name
	if name == "" {
		name = it.URL
	}
	msg := "Service is down"
	if recovered {
		msg = "Service recovered"
	}
	go func() {
		if err := sendNotification(cfg, name, msg, recovered); err != nil {
			slog.Error("monitor: alert failed", "item", it.ID, "error", err)
		}
	}()
}

// mode returns the configured monitoring_mode, defaulting to "tab" (today's
// frontend-orchestrated behavior) when unset.
func (m *MonitorScheduler) mode() string {
	if s := m.setting("monitoring_mode"); s != "" {
		return s
	}
	return "tab"
}

// intervalSec returns the configured probe interval in seconds, clamped to a
// sane floor and defaulting when unset or invalid.
func (m *MonitorScheduler) intervalSec() int {
	n, _ := strconv.Atoi(m.setting("monitoring_interval_sec"))
	if n <= 0 {
		return monitorDefaultIntervalSec
	}
	if n < monitorMinIntervalSec {
		return monitorMinIntervalSec
	}
	return n
}

func (m *MonitorScheduler) setting(key string) string {
	var v sql.NullString
	if err := m.store.DB.QueryRow(
		`SELECT value FROM system_settings WHERE key = ?`, key).Scan(&v); err != nil {
		return ""
	}
	if v.Valid {
		return v.String
	}
	return ""
}
