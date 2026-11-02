package api

import (
	"encoding/json"
	"math"
	"math/rand"
	"net/http/httptest"
	"testing"
	"time"
)

// seedHistory gives a service a month of checks every seven minutes, with runs of
// failures (one still going), checks that answered slowly, some without a latency,
// and two at the very same moment.
func seedHistory(t *testing.T, store *MonitorStore, itemID int, now time.Time) {
	t.Helper()
	rng := rand.New(rand.NewSource(21))
	tx, err := store.DB.Begin()
	if err != nil {
		t.Fatal(err)
	}
	put := func(at time.Time, up bool, latency any, code int) {
		if _, err := tx.Exec(`INSERT INTO monitor_checks (item_id, checked_at, up, latency_ms, status_code) VALUES (?, ?, ?, ?, ?)`,
			itemID, at.UTC().Format("2006-01-02 15:04:05"), up, latency, code); err != nil {
			t.Fatal(err)
		}
	}
	const n = 31 * 24 * 60 / 7
	down := false
	for i := 0; i < n; i++ {
		at := now.Add(-time.Duration(n-i) * 7 * time.Minute)
		switch {
		case !down && rng.Intn(70) == 0:
			down = true
		case down && rng.Intn(8) == 0 && i < n-30:
			down = false
		}
		switch {
		case down:
			put(at, false, nil, []int{0, 502, 503}[rng.Intn(3)])
		case rng.Intn(25) == 0:
			put(at, true, nil, 200) // answered, no timing kept
		default:
			put(at, true, 20+rng.Intn(300), 200)
		}
	}
	// Two checks at one moment: the cursor must tell them apart.
	at := now.Add(-3 * time.Hour).Add(time.Second)
	put(at, true, 111, 200)
	put(at, false, nil, 500)
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}
}

// The folded answer must be what the browser used to work out from every check:
// the same figures, the same outages, the newest lines, and the chart's sixty
// points the way the page folds them.
func TestTheLiteHistoryIsTheFullHistoryFolded(t *testing.T) {
	db, _ := setupTestDB(t)
	store := &MonitorStore{DB: db}
	h := &MonitorHandler{DB: db, store: store}
	owner := ownerOf(t, store, seedItem(t, store))
	id := monitored(t, store, owner, "plex")
	now := time.Now().UTC().Truncate(time.Second)
	seedHistory(t, store, id, now)

	for _, window := range []time.Duration{24 * time.Hour, 7 * 24 * time.Hour, 30 * 24 * time.Hour} {
		since := now.Add(-window)
		rec := httptest.NewRecorder()
		h.historyLite(rec, httptest.NewRequest("GET", "/api/monitor/history?lite=1", nil), id, "x", since, now)
		var got struct {
			Lite      bool           `json:"lite"`
			UptimePct float64        `json:"uptime_pct"`
			Total     int            `json:"total"`
			Checks    []MonitorCheck `json:"checks"`
			Current   *MonitorCheck  `json:"current"`
			Incidents []incident     `json:"incidents"`
			Latency   []struct {
				At     time.Time `json:"at"`
				MeanMs *float64  `json:"mean_ms"`
			} `json:"latency"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
			t.Fatalf("%v: %v", window, err)
		}

		all, err := store.History(id, since)
		if err != nil {
			t.Fatal(err)
		}
		uptime, incs := h.incidentsFor(id, all, now)

		if !got.Lite || got.Total != len(all) {
			t.Fatalf("%v: lite=%v total=%d, want true and %d", window, got.Lite, got.Total, len(all))
		}
		if math.Abs(got.UptimePct-uptime) > 1e-9 {
			t.Errorf("%v: uptime %.9f, the checks say %.9f", window, got.UptimePct, uptime)
		}
		if len(got.Incidents) != len(incs) {
			t.Fatalf("%v: %d outages, the checks say %d", window, len(got.Incidents), len(incs))
		}
		for i := range incs {
			a, b := got.Incidents[i], incs[i]
			if !a.Start.Equal(b.Start) || (a.End == nil) != (b.End == nil) || (a.End != nil && !a.End.Equal(*b.End)) || a.DurationSec != b.DurationSec || a.StatusCode != b.StatusCode {
				t.Fatalf("%v: outage %d is %+v, the checks say %+v", window, i, a, b)
			}
		}
		if len(got.Checks) != recentChecks {
			t.Fatalf("%v: %d lines, want the newest %d", window, len(got.Checks), recentChecks)
		}
		for i, c := range got.Checks {
			if want := all[len(all)-recentChecks+i]; !c.CheckedAt.Equal(want.CheckedAt) || c.Up != want.Up || c.StatusCode != want.StatusCode {
				t.Fatalf("%v: line %d is %+v, want %+v (oldest first, the last of the window)", window, i, c, want)
			}
		}
		if got.Current == nil || !got.Current.CheckedAt.Equal(all[len(all)-1].CheckedAt) {
			t.Errorf("%v: current is %+v, want the last check", window, got.Current)
		}

		// The chart: the mean of the checks that answered, in sixty buckets of the range.
		width := int64(window.Seconds()) / historyBuckets
		sum := make([]float64, historyBuckets)
		cnt := make([]int, historyBuckets)
		for _, c := range all {
			if !c.Up || c.LatencyMs == nil {
				continue
			}
			b := int((c.CheckedAt.Unix() - since.Unix()) / width)
			if b < 0 {
				continue
			}
			if b >= historyBuckets {
				b = historyBuckets - 1
			}
			sum[b] += float64(*c.LatencyMs)
			cnt[b]++
		}
		if len(got.Latency) != historyBuckets {
			t.Fatalf("%v: %d points, want %d", window, len(got.Latency), historyBuckets)
		}
		answered := 0
		for b, p := range got.Latency {
			if cnt[b] == 0 {
				if p.MeanMs != nil {
					t.Fatalf("%v: bucket %d has a mean and no check answered in it", window, b)
				}
				continue
			}
			answered++
			if p.MeanMs == nil || math.Abs(*p.MeanMs-sum[b]/float64(cnt[b])) > 1e-6 {
				t.Fatalf("%v: bucket %d is %v, the checks say %.6f", window, b, p.MeanMs, sum[b]/float64(cnt[b]))
			}
			if want := since.Add(time.Duration(int64(b)*width) * time.Second); !p.At.Equal(want) {
				t.Fatalf("%v: bucket %d begins %v, want %v", window, b, p.At, want)
			}
		}
		if answered < historyBuckets/2 {
			t.Fatalf("%v: only %d buckets answered: the data does not exercise the comparison", window, answered)
		}
	}
}

// Every check of a range is reachable by pages, newest first, once each, and the
// last page says there are no more; two checks at one moment are told apart.
func TestThePagesOfChecksAreEveryCheckOnceNewestFirst(t *testing.T) {
	db, _ := setupTestDB(t)
	store := &MonitorStore{DB: db}
	owner := ownerOf(t, store, seedItem(t, store))
	id := monitored(t, store, owner, "plex")
	now := time.Now().UTC().Truncate(time.Second)
	seedHistory(t, store, id, now)
	since := now.Add(-7 * 24 * time.Hour)

	all, err := store.History(id, since)
	if err != nil {
		t.Fatal(err)
	}
	var got []MonitorCheck
	cursor, pages := "", 0
	for {
		page, next, err := store.ChecksPage(id, since, cursor, 37)
		if err != nil {
			t.Fatal(err)
		}
		got = append(got, page...)
		pages++
		if next == "" {
			break
		}
		if len(page) != 37 {
			t.Fatalf("page %d has %d checks and says there is more", pages, len(page))
		}
		cursor = next
	}
	if len(got) != len(all) {
		t.Fatalf("pages gave %d checks, the range has %d", len(got), len(all))
	}
	if pages < 10 {
		t.Fatalf("only %d pages: the data does not exercise the cursor", pages)
	}
	for i, c := range got {
		want := all[len(all)-1-i]
		if !c.CheckedAt.Equal(want.CheckedAt) || c.Up != want.Up || c.StatusCode != want.StatusCode {
			t.Fatalf("check %d of the pages is %+v, want %+v", i, c, want)
		}
	}
	if _, _, err := store.ChecksPage(id, since, "not a cursor", 10); err == nil {
		t.Errorf("a cursor that is not one must be refused")
	}
}
