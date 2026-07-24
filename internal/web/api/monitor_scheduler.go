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
	store *MonitorStore
}

// NewMonitorScheduler builds a scheduler over the given database handle.
func NewMonitorScheduler(db *sql.DB) *MonitorScheduler {
	return &MonitorScheduler{store: NewMonitorStore(db)}
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

func (m *MonitorScheduler) pruneLoop() {
	for {
		time.Sleep(24 * time.Hour)
		if n, err := m.store.Prune(monitorRetentionDays); err != nil {
			slog.Error("monitor: prune failed", "error", err)
		} else if n > 0 {
			slog.Info("monitor: pruned old history", "rows", n)
		}
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
		}(it)
	}
	wg.Wait()
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
