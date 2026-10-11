package api

import (
	"context"
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

// MonitorScheduler runs the always-on backend monitoring loop. For each account
// whose mode is "background" it probes that account's bookmarks with statusCheck
// enabled, on that account's own interval, and appends the results to
// monitor_checks, plus a daily retention prune. Alerts go to the channel of the
// account that owns the bookmark. An account in "off" or "tab" is left alone, so
// the loop writes nothing for it and is safe to start unconditionally at boot.
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
// its own goroutine at startup and runs until ctx is cancelled.
func (m *MonitorScheduler) Run(ctx context.Context) {
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		m.pruneLoop(ctx)
	}()

	m.probeLoop(ctx)
	wg.Wait()
}

// monitorTick is how often the loop looks at whose turn it is. Intervals are
// each account's own, so there is no single sleep to take; thirty seconds is
// also the shortest interval anyone can ask for.
const monitorTick = 15 * time.Second

func (m *MonitorScheduler) probeLoop(ctx context.Context) {
	// When each account was last probed. An account seen for the first time is
	// probed one interval from now, never at once: the first cycle after a boot
	// has always been one interval away.
	last := map[int]time.Time{}
	for {
		if !sleep(ctx, monitorTick) {
			return
		}
		now := time.Now()
		for _, uid := range m.usersWithMonitors() {
			if m.mode(uid) != "background" {
				delete(last, uid)
				continue
			}
			since, seen := last[uid]
			if !seen {
				last[uid] = now
				continue
			}
			if now.Sub(since) < time.Duration(m.intervalSec(uid))*time.Second {
				continue
			}
			last[uid] = now
			m.runCycleFor(uid)
		}
	}
}

// usersWithMonitors lists the accounts that have a bookmark to probe.
func (m *MonitorScheduler) usersWithMonitors() []int {
	items, err := m.store.MonitoredItems()
	if err != nil {
		slog.Error("monitor: listing items failed", "error", err)
		return nil
	}
	seen := map[int]bool{}
	var out []int
	for _, it := range items {
		if !seen[it.UserID] {
			seen[it.UserID] = true
			out = append(out, it.UserID)
		}
	}
	return out
}

// sleep waits for d, or returns false as soon as ctx is cancelled. A plain
// time.Sleep here would hold shutdown for up to a day.
func sleep(ctx context.Context, d time.Duration) bool {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-timer.C:
		return true
	case <-ctx.Done():
		return false
	}
}

// pruneLoop enforces the retention window. It prunes before sleeping: waiting a
// full day first meant an instance restarted more often than that (a routine
// homelab update cadence) never pruned at all, and history grew unbounded.
func (m *MonitorScheduler) pruneLoop(ctx context.Context) {
	for {
		if n, err := m.store.Prune(monitorRetentionDays); err != nil {
			slog.Error("monitor: prune failed", "error", err)
		} else if n > 0 {
			slog.Info("monitor: pruned old history", "rows", n)
		}
		if !sleep(ctx, 24*time.Hour) {
			return
		}
	}
}

// RunCycle probes every monitored bookmark of every account once (bounded
// concurrency) and records each result. Exported so it can be unit-tested
// without the timing loop; the loop itself runs one account at a time, on its
// own schedule, through runCycleFor.
func (m *MonitorScheduler) RunCycle() {
	items, err := m.store.MonitoredItems()
	if err != nil {
		slog.Error("monitor: listing items failed", "error", err)
		return
	}
	m.forgetStaleAlerts(items)
	m.probe(items)
}

// runCycleFor probes one account's bookmarks and alerts on its channel.
func (m *MonitorScheduler) runCycleFor(userID int) {
	items, err := m.store.MonitoredItemsForUser(userID)
	if err != nil {
		slog.Error("monitor: listing items failed", "user", userID, "error", err)
		return
	}
	m.probe(items)
}

func (m *MonitorScheduler) probe(items []MonitoredItem) {
	if len(items) == 0 {
		return
	}
	cfgs := map[int]notifyConfig{}
	sem := make(chan struct{}, monitorMaxConcurrency)
	for _, it := range items {
		if _, ok := cfgs[it.UserID]; !ok {
			cfgs[it.UserID] = m.notifyCfg(it.UserID)
		}
	}
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
			m.evalAlert(it, up, cfgs[it.UserID])
		}(it)
	}
	wg.Wait()
}

// notifyCfg reads one account's alerting configuration.
func (m *MonitorScheduler) notifyCfg(userID int) notifyConfig {
	th, _ := strconv.Atoi(m.setting(userID, keyMonThreshold))
	if th < 1 {
		th = 1
	}
	return notifyConfig{
		Enabled:       m.setting(userID, keyMonAlerts) == "1",
		Type:          m.setting(userID, keyMonType),
		URL:           m.setting(userID, keyMonURL),
		Token:         m.setting(userID, keyMonToken),
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

// mode returns an account's monitoring mode, defaulting to "tab" (today's
// frontend-orchestrated behavior) when it has none.
func (m *MonitorScheduler) mode(userID int) string {
	if s := m.setting(userID, keyMonMode); s != "" {
		return s
	}
	return "tab"
}

// intervalSec returns an account's probe interval in seconds, clamped to a sane
// floor and defaulting when unset or invalid.
func (m *MonitorScheduler) intervalSec(userID int) int {
	n, _ := strconv.Atoi(m.setting(userID, keyMonInterval))
	if n <= 0 {
		return monitorDefaultIntervalSec
	}
	if n < monitorMinIntervalSec {
		return monitorMinIntervalSec
	}
	return n
}

func (m *MonitorScheduler) setting(userID int, key string) string {
	return monitorSetting(m.store.DB, userID, key)
}
