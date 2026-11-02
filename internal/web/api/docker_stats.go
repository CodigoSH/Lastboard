package api

import (
	"fmt"
	"net/http"
	"net/url"
	"sync"
	"time"
)

/*
Reading what the containers of a host are using, without waiting for Docker.

Asked for one reading, the daemon does not answer until it has taken a second
sample a second after the first, so that its own answer can say how much CPU the
container used in between. A host with fifty containers, read eight at a time,
made the Docker page wait ten seconds for its first percentages — and again at
every refresh, with the widget on the board asking its own round besides, and the
daemon sampling twenty containers at once.

Three things change that, and none of them changes what a reading says:

  - The reading is asked with one-shot=true, which the daemon answers at once with
    no previous sample (API 1.41 on). The CPU is then worked out here, from the
    reading before: at the next round, ten seconds on, which is a steadier mean than
    one second; and, when there is none yet, from a second reading taken a second
    after the first — every container of the host at once, so the whole host costs
    one second and not one second per eight containers.
  - A daemon that does not know one-shot (or an agent that does not pass it on)
    answers as before, with the previous sample inside its answer; that is used
    as it comes, and nothing is waited for twice.
  - A round of a host is one at a time, and an answer a few seconds old is shared
    by whoever asks: the page, the widget on the board and a second tab read the
    daemon once, not once each.
*/

// statsRoundTTL is how long a reading is shared by whoever asks for it next.
var statsRoundTTL = 3 * time.Second

// statsSecondGap is how long to wait for the second sample of a container that has
// no earlier one: the window the daemon itself would have used.
var statsSecondGap = time.Second

// statsSampleKeep is how old a reading can be and still serve as the start of a delta.
const statsSampleKeep = 2 * time.Minute

// maxStatsHosts bounds the hosts whose readings are kept; the rest are forgotten, and
// asked afresh.
const maxStatsHosts = 64

// cpuSample is what a reading says of the CPU, to be the start of the next delta.
type cpuSample struct {
	total, system uint64
	at            time.Time
}

type hostStats struct {
	mu      sync.Mutex // one round of this host at a time
	samples map[string]cpuSample
	out     map[string]DockerStats
	outAt   map[string]time.Time
}

var (
	statsHostsMu sync.Mutex
	statsHosts   = map[string]*hostStats{}
)

func statsOf(hostURL string) *hostStats {
	statsHostsMu.Lock()
	defer statsHostsMu.Unlock()
	if hs, ok := statsHosts[hostURL]; ok {
		return hs
	}
	if len(statsHosts) >= maxStatsHosts {
		statsHosts = map[string]*hostStats{}
	}
	hs := &hostStats{samples: map[string]cpuSample{}, out: map[string]DockerStats{}, outAt: map[string]time.Time{}}
	statsHosts[hostURL] = hs
	return hs
}

// reading is one answer of the daemon and when it came.
type reading struct {
	api dockerAPIStats
	at  time.Time
}

func (r reading) sample() cpuSample {
	return cpuSample{total: r.api.CPUStats.CPUUsage.TotalUsage, system: r.api.CPUStats.SystemCPUUsage, at: r.at}
}

// cpuPercent is the CPU a container used, in percent of one core as Docker reports
// it, from what the daemon said or from the reading before. ok is false when there
// is nothing to compare with.
func cpuPercent(r reading, prev cpuSample, hasPrev bool) (pct float64, ok bool) {
	cpus := r.api.CPUStats.OnlineCPUs
	if cpus == 0 {
		cpus = 1 // safe fallback when the field is absent
	}
	// The daemon's own previous sample, when it gave one.
	if r.api.PreCPUStats.CPUUsage.TotalUsage > 0 || r.api.PreCPUStats.SystemCPUUsage > 0 {
		cpuDelta := float64(r.api.CPUStats.CPUUsage.TotalUsage) - float64(r.api.PreCPUStats.CPUUsage.TotalUsage)
		systemDelta := float64(r.api.CPUStats.SystemCPUUsage) - float64(r.api.PreCPUStats.SystemCPUUsage)
		if systemDelta > 0 && cpuDelta > 0 {
			return (cpuDelta / systemDelta) * float64(cpus) * 100.0, true
		}
		return 0, true
	}
	if !hasPrev || !r.at.After(prev.at) || r.at.Sub(prev.at) > statsSampleKeep {
		return 0, false
	}
	cpuDelta := float64(r.api.CPUStats.CPUUsage.TotalUsage) - float64(prev.total)
	systemDelta := float64(r.api.CPUStats.SystemCPUUsage) - float64(prev.system)
	switch {
	case cpuDelta <= 0:
		return 0, true // idle, or a container that was restarted since
	case systemDelta > 0:
		return (cpuDelta / systemDelta) * float64(cpus) * 100.0, true
	default:
		// A daemon that does not count the host's CPU: the wall clock will do, the counter is in nanoseconds.
		if elapsed := float64(r.at.Sub(prev.at).Nanoseconds()); elapsed > 0 {
			return cpuDelta / elapsed * 100.0, true
		}
	}
	return 0, false
}

// GetContainersStats reads several containers from one host in one go.
//
// Containers that fail are left out of the map rather than failing the batch: one
// container the daemon won't report on shouldn't cost you the other thirty.
func GetContainersStats(hostURL string, ids []string) (map[string]DockerStats, error) {
	client, base, err := newDockerClient(hostURL)
	if err != nil {
		return nil, fmt.Errorf("docker: build client: %w", err)
	}

	hs := statsOf(hostURL)
	hs.mu.Lock()
	defer hs.mu.Unlock()

	now := time.Now()
	out := make(map[string]DockerStats, len(ids))
	var need []string
	for _, id := range ids {
		if at, ok := hs.outAt[id]; ok && now.Sub(at) < statsRoundTTL {
			out[id] = hs.out[id]
		} else {
			need = append(need, id)
		}
	}
	if len(need) == 0 {
		return out, nil
	}

	first := readAll(client, base, need)
	final := make(map[string]reading, len(first))
	result := make(map[string]float64, len(first))
	var waiting []string
	for id, r := range first {
		prev, has := hs.samples[id]
		if pct, ok := cpuPercent(r, prev, has); ok {
			result[id] = pct
			final[id] = r
		} else {
			waiting = append(waiting, id)
		}
	}
	// Those with nothing to compare with are read again a second on, all at once.
	if len(waiting) > 0 {
		time.Sleep(statsSecondGap)
		second := readAll(client, base, waiting)
		for _, id := range waiting {
			if r, ok := second[id]; ok {
				pct, _ := cpuPercent(r, first[id].sample(), true)
				result[id] = pct
				final[id] = r
			} else {
				// The second reading failed: the first still says what memory is in use.
				result[id] = 0
				final[id] = first[id]
			}
		}
	}

	done := time.Now()
	for id, r := range final {
		var mem float64
		if r.api.MemoryStats.Limit > 0 {
			mem = float64(r.api.MemoryStats.Usage) / float64(r.api.MemoryStats.Limit) * 100.0
		}
		s := DockerStats{CPUPercent: result[id], MemPercent: mem, MemUsed: r.api.MemoryStats.Usage, MemLimit: r.api.MemoryStats.Limit}
		out[id] = s
		hs.out[id], hs.outAt[id] = s, done
		hs.samples[id] = r.sample()
	}
	for id, sm := range hs.samples {
		if done.Sub(sm.at) > statsSampleKeep {
			delete(hs.samples, id)
			delete(hs.out, id)
			delete(hs.outAt, id)
		}
	}
	return out, nil
}

// readAll asks the daemon about each container, statsParallelism at a time.
func readAll(client *http.Client, base string, ids []string) map[string]reading {
	var (
		mu   sync.Mutex
		wg   sync.WaitGroup
		out  = make(map[string]reading, len(ids))
		gate = make(chan struct{}, statsParallelism)
	)
	for _, id := range ids {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			gate <- struct{}{}
			defer func() { <-gate }()
			s, err := readStats(client, base, id)
			if err != nil {
				return
			}
			mu.Lock()
			out[id] = reading{api: s, at: time.Now()}
			mu.Unlock()
		}(id)
	}
	wg.Wait()
	return out
}

// statsParallelism caps how many containers we ask the daemon about at once. A
// reading without the wait costs the daemon little, so a host with a hundred
// containers is read in a handful of rounds, not forty seconds of them.
const statsParallelism = 16

// readStats performs one stats read with an already-built client. The id comes
// from the browser: escaped, it is one segment of the path and cannot turn the rest
// of it into a query or climb out of /containers/.
func readStats(client *http.Client, base, containerID string) (dockerAPIStats, error) {
	target := fmt.Sprintf("%s/containers/%s/stats?stream=false&one-shot=true", base, url.PathEscape(containerID))
	resp, err := client.Get(target)
	if err != nil {
		return dockerAPIStats{}, fmt.Errorf("docker: GET stats: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return dockerAPIStats{}, fmt.Errorf("docker: GET stats returned %d", resp.StatusCode)
	}

	var s dockerAPIStats
	if err := decodeLimited(resp.Body, dockerMaxAnswer, &s); err != nil {
		return dockerAPIStats{}, fmt.Errorf("docker: decode stats: %w", err)
	}
	return s, nil
}
