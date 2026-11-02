package api

import (
	"fmt"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// A daemon that answers a one-shot reading at once and with no previous sample, as
// Docker does from API 1.41: the CPU counters only ever go up, by `cpuStep` of the
// host's `sysStep` for each reading of a container.
type quickDaemon struct {
	t       *testing.T
	srv     *httptest.Server
	mu      sync.Mutex
	calls   map[string]int
	total   atomic.Int64
	oneShot atomic.Int64
	wait    time.Duration
	cpuStep uint64
	sysStep uint64
	inFly   atomic.Int64
	peak    atomic.Int64
}

func newQuickDaemon(t *testing.T) *quickDaemon {
	d := &quickDaemon{t: t, calls: map[string]int{}, cpuStep: 10_000_000, sysStep: 100_000_000}
	d.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/stats") {
			http.NotFound(w, r)
			return
		}
		n := d.inFly.Add(1)
		for {
			p := d.peak.Load()
			if n <= p || d.peak.CompareAndSwap(p, n) {
				break
			}
		}
		defer d.inFly.Add(-1)
		if d.wait > 0 {
			time.Sleep(d.wait)
		}
		d.total.Add(1)
		if r.URL.Query().Get("one-shot") == "true" {
			d.oneShot.Add(1)
		}
		id := strings.Split(strings.Trim(r.URL.Path, "/"), "/")[1]
		d.mu.Lock()
		d.calls[id]++
		k := uint64(d.calls[id])
		d.mu.Unlock()
		fmt.Fprintf(w, `{"cpu_stats":{"cpu_usage":{"total_usage":%d},"system_cpu_usage":%d,"online_cpus":4},
			"precpu_stats":{"cpu_usage":{"total_usage":0},"system_cpu_usage":0},
			"memory_stats":{"usage":50,"limit":200}}`, 1_000_000_000+k*d.cpuStep, 1_000_000_000_000+k*d.sysStep)
	}))
	t.Cleanup(d.srv.Close)
	return d
}

func ids(n int) []string {
	out := make([]string, n)
	for i := range out {
		out[i] = fmt.Sprintf("c%03d", i)
	}
	return out
}

// quick makes the waits of a test short and restores them after.
func quick(t *testing.T, gap, ttl time.Duration) {
	oldGap, oldTTL := statsSecondGap, statsRoundTTL
	statsSecondGap, statsRoundTTL = gap, ttl
	t.Cleanup(func() { statsSecondGap, statsRoundTTL = oldGap, oldTTL })
}

// A host read for the first time has no earlier reading, so each container is read
// twice, a moment apart, all of them at once: the CPU comes out of those two, and the
// host costs one gap and not one per batch of containers.
func TestTheFirstRoundReadsEveryContainerTwiceAtOnce(t *testing.T) {
	quick(t, 30*time.Millisecond, time.Second)
	d := newQuickDaemon(t)
	d.wait = 20 * time.Millisecond
	const n = 64

	start := time.Now()
	got, err := GetContainersStats(d.srv.URL, ids(n))
	if err != nil {
		t.Fatal(err)
	}
	took := time.Since(start)

	if len(got) != n {
		t.Fatalf("%d containers read, want %d", len(got), n)
	}
	if d.total.Load() != 2*n {
		t.Errorf("the daemon was asked %d times, want %d (twice each)", d.total.Load(), 2*n)
	}
	if d.oneShot.Load() != d.total.Load() {
		t.Errorf("%d of %d readings asked for one-shot: all of them must", d.oneShot.Load(), d.total.Load())
	}
	// 10 of every 100 of the host's CPU time, on 4 cpus: 10/100*4*100 = 40 %.
	for id, s := range got {
		if math.Abs(s.CPUPercent-40) > 1e-6 {
			t.Fatalf("%s: CPU %.4f, want 40 (from its two readings)", id, s.CPUPercent)
		}
		if s.MemPercent != 25 || s.MemUsed != 50 || s.MemLimit != 200 {
			t.Fatalf("%s: memory %+v, want 25 %% of 200", id, s)
		}
	}
	// Two waves of readings of 64 at sixteen at a time, and one gap: well under what
	// reading them one second each, eight at a time, took.
	if took > 600*time.Millisecond {
		t.Errorf("the first round took %v", took)
	}
	if d.peak.Load() > statsParallelism {
		t.Errorf("peak %d readings at once, above the cap of %d", d.peak.Load(), statsParallelism)
	}
}

// The round after takes the reading before as its start: one reading per container,
// and no gap to wait.
func TestTheNextRoundStartsFromTheReadingBefore(t *testing.T) {
	quick(t, 400*time.Millisecond, 10*time.Millisecond)
	d := newQuickDaemon(t)
	list := ids(10)
	// The first round has to wait its gap; make it short just for that round.
	statsSecondGap = 20 * time.Millisecond
	if _, err := GetContainersStats(d.srv.URL, list); err != nil {
		t.Fatal(err)
	}
	before := d.total.Load()
	time.Sleep(25 * time.Millisecond) // the shared answer has gone stale
	statsSecondGap = 400 * time.Millisecond

	start := time.Now()
	got, err := GetContainersStats(d.srv.URL, list)
	if err != nil {
		t.Fatal(err)
	}
	if d.total.Load()-before != int64(len(list)) {
		t.Fatalf("the round asked the daemon %d times, want %d (once each)", d.total.Load()-before, len(list))
	}
	if time.Since(start) > 300*time.Millisecond {
		t.Errorf("it waited a gap it did not need")
	}
	// Between the second reading of the first round and this one the counters moved by
	// 10 ms of 100 ms on 4 cpus.
	for id, s := range got {
		if math.Abs(s.CPUPercent-40) > 1e-6 {
			t.Fatalf("%s: CPU %.4f, want 40 against the reading before", id, s.CPUPercent)
		}
	}
}

// The page, the widget on the board and another tab asking together read the
// daemon once between them, and an answer a moment old is shared.
func TestWhoeverAsksAtTheSameTimeSharesTheRound(t *testing.T) {
	quick(t, 20*time.Millisecond, time.Second)
	d := newQuickDaemon(t)
	d.wait = 10 * time.Millisecond
	list := ids(20)

	var wg sync.WaitGroup
	results := make([]map[string]DockerStats, 6)
	for i := range results {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			r, err := GetContainersStats(d.srv.URL, list)
			if err != nil {
				t.Error(err)
			}
			results[i] = r
		}(i)
	}
	wg.Wait()

	if d.total.Load() != int64(2*len(list)) {
		t.Errorf("six callers made the daemon answer %d readings, want %d (one round)", d.total.Load(), 2*len(list))
	}
	for i, r := range results {
		if len(r) != len(list) {
			t.Errorf("caller %d got %d containers, want %d", i, len(r), len(list))
		}
	}
	// And a subset, a moment later, is answered from what was read.
	before := d.total.Load()
	if sub, _ := GetContainersStats(d.srv.URL, list[:5]); len(sub) != 5 || d.total.Load() != before {
		t.Errorf("a subset of a fresh round asked the daemon again (%d new readings, %d containers)", d.total.Load()-before, len(sub))
	}
}

// Two hosts do not share a round.
func TestAnotherHostIsReadOnItsOwn(t *testing.T) {
	quick(t, 10*time.Millisecond, time.Second)
	a, b := newQuickDaemon(t), newQuickDaemon(t)
	if _, err := GetContainersStats(a.srv.URL, ids(3)); err != nil {
		t.Fatal(err)
	}
	if _, err := GetContainersStats(b.srv.URL, ids(3)); err != nil {
		t.Fatal(err)
	}
	if b.total.Load() != 6 {
		t.Errorf("the second host was asked %d times, want 6: its own round", b.total.Load())
	}
}

// A daemon that does not know one-shot answers with its own previous sample inside
// the answer: that is used as it comes and nothing is waited for.
func TestADaemonThatAnswersTheOldWayIsReadOnce(t *testing.T) {
	quick(t, 500*time.Millisecond, time.Second)
	var calls atomic.Int64
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		fmt.Fprint(w, `{"cpu_stats":{"cpu_usage":{"total_usage":200},"system_cpu_usage":2000,"online_cpus":2},
			"precpu_stats":{"cpu_usage":{"total_usage":100},"system_cpu_usage":1000},
			"memory_stats":{"usage":50,"limit":100}}`)
	}))
	defer srv.Close()

	start := time.Now()
	got, err := GetContainersStats(srv.URL, ids(4))
	if err != nil {
		t.Fatal(err)
	}
	if calls.Load() != 4 {
		t.Errorf("%d readings, want 4 (once each)", calls.Load())
	}
	if time.Since(start) > 300*time.Millisecond {
		t.Errorf("it waited for a second sample the daemon had already given")
	}
	for id, s := range got {
		if s.CPUPercent != 20 {
			t.Errorf("%s: CPU %v, want 20 from the daemon's own sample", id, s.CPUPercent)
		}
	}
}

// What the counters say when there is no host-wide count to compare with, a container
// that restarted since the reading before, and a reading too old to start from.
func TestTheCPUFromTwoReadingsInTheEdgeCases(t *testing.T) {
	at := time.Now()
	mk := func(total, system uint64, cpus int, when time.Time) reading {
		var r reading
		r.api.CPUStats.CPUUsage.TotalUsage = total
		r.api.CPUStats.SystemCPUUsage = system
		r.api.CPUStats.OnlineCPUs = cpus
		r.at = when
		return r
	}
	prev := cpuSample{total: 1000, system: 10000, at: at}
	// Counters of the host that do not move: the wall clock decides. 50 ms of CPU in 1 s is 5 %.
	if p, ok := cpuPercent(mk(1000+50_000_000, 10000, 4, at.Add(time.Second)), prev, true); !ok || math.Abs(p-5) > 1e-6 {
		t.Errorf("no host count: %v %v, want 5 true", p, ok)
	}
	// Went down: the container was restarted. Idle, not a negative number.
	if p, ok := cpuPercent(mk(10, 20000, 4, at.Add(time.Second)), prev, true); !ok || p != 0 {
		t.Errorf("restarted: %v %v, want 0 true", p, ok)
	}
	// Too old to be a start: nothing to say yet.
	if _, ok := cpuPercent(mk(2000, 20000, 4, at.Add(statsSampleKeep+time.Second)), prev, true); ok {
		t.Errorf("a reading older than the limit must not start a delta")
	}
	if _, ok := cpuPercent(mk(2000, 20000, 4, at.Add(time.Second)), cpuSample{}, false); ok {
		t.Errorf("with no reading before there is nothing to compare with")
	}
}
