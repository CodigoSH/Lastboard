package api

import (
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestNormaliseStatus(t *testing.T) {
	cases := map[string]string{
		"running":    "running",
		"Running":    "running",
		"paused":     "paused",
		"restarting": "restarting",
		"exited":     "stopped",
		"dead":       "stopped",
		"created":    "stopped",
		"weird":      "stopped",
	}
	for in, want := range cases {
		if got := normaliseStatus(in); got != want {
			t.Errorf("normaliseStatus(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestListContainers_ParsesMockAPI(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/containers/json" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[
			{"Id":"abcdef1234567890","Names":["/web"],"Image":"nginx","State":"running","Created":100,
			 "Ports":[{"PublicPort":8080,"PrivatePort":80,"Type":"tcp"},{"PublicPort":0,"PrivatePort":9000,"Type":"tcp"}]},
			{"Id":"deadbeef","Names":["/db"],"Image":"postgres","State":"exited","Created":50,"Ports":[]}
		]`))
	}))
	defer srv.Close()

	containers, err := ListContainers(srv.URL)
	if err != nil {
		t.Fatalf("ListContainers: %v", err)
	}
	if len(containers) != 2 {
		t.Fatalf("want 2 containers, got %d", len(containers))
	}

	web := containers[0]
	if web.ID != "abcdef123456" {
		t.Errorf("short ID: want abcdef123456, got %s", web.ID)
	}
	if web.Name != "web" {
		t.Errorf("name should strip leading slash, got %s", web.Name)
	}
	if web.Status != "running" {
		t.Errorf("status: want running, got %s", web.Status)
	}
	// Only host-exposed ports (PublicPort > 0) are kept.
	if len(web.Ports) != 1 || web.Ports[0].PublicPort != 8080 {
		t.Errorf("ports: want one exposed 8080, got %+v", web.Ports)
	}

	if containers[1].Status != "stopped" {
		t.Errorf("exited container should normalise to stopped, got %s", containers[1].Status)
	}
}

func TestUrlFromLabels(t *testing.T) {
	cases := []struct {
		name   string
		labels map[string]string
		want   string
	}{
		{"nothing to read", nil, ""},
		{"no url labels", map[string]string{"traefik.enable": "true"}, ""},
		{"homepage label", map[string]string{"homepage.href": "http://nas:8096"}, "http://nas:8096"},
		{"our own label", map[string]string{"lastboard.url": "https://plex.home"}, "https://plex.home"},
		{
			// A container may already carry homepage's label for someone else's
			// dashboard; ours is the one that wins.
			"ours wins over homepage's",
			map[string]string{"homepage.href": "http://a", "lastboard.url": "http://b"},
			"http://b",
		},
		{"blank is not a value", map[string]string{"lastboard.url": "   "}, ""},
		{
			// This ends up in an href. A container labelling itself with a
			// script URL must not become a link that runs it.
			"only http(s) is trusted",
			map[string]string{"lastboard.url": "javascript:alert(1)"},
			"",
		},
		{"no scheme, no link", map[string]string{"homepage.href": "nas:8096"}, ""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := urlFromLabels(tc.labels); got != tc.want {
				t.Errorf("urlFromLabels(%v) = %q, want %q", tc.labels, got, tc.want)
			}
		})
	}
}

func TestListContainers_ReadsUrlLabel(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[
			{"Id":"aaa","Names":["/jellyfin"],"Image":"jellyfin","State":"running","Created":1,"Ports":[],
			 "Labels":{"homepage.href":"http://nas:8096","traefik.enable":"true"}},
			{"Id":"bbb","Names":["/redis"],"Image":"redis","State":"running","Created":1,"Ports":[],"Labels":{}}
		]`))
	}))
	defer srv.Close()

	containers, err := ListContainers(srv.URL)
	if err != nil {
		t.Fatalf("ListContainers: %v", err)
	}
	if containers[0].UrlHint != "http://nas:8096" {
		t.Errorf("UrlHint = %q, want http://nas:8096", containers[0].UrlHint)
	}
	if containers[1].UrlHint != "" {
		t.Errorf("a container without the label got UrlHint %q", containers[1].UrlHint)
	}
}

func TestGetContainersStats_ComputesPercentages(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// cpuDelta=100, systemDelta=1000, cpus=2 → (100/1000)*2*100 = 20%
		// mem 50/100 → 50%
		_, _ = w.Write([]byte(`{
			"cpu_stats":{"cpu_usage":{"total_usage":200},"system_cpu_usage":2000,"online_cpus":2},
			"precpu_stats":{"cpu_usage":{"total_usage":100},"system_cpu_usage":1000},
			"memory_stats":{"usage":50,"limit":100}
		}`))
	}))
	defer srv.Close()

	all, err := GetContainersStats(srv.URL, []string{"abc"})
	if err != nil {
		t.Fatalf("GetContainersStats: %v", err)
	}
	stats, ok := all["abc"]
	if !ok {
		t.Fatalf("no reading for abc, got %v", all)
	}
	if stats.CPUPercent != 20 {
		t.Errorf("CPU%%: want 20, got %v", stats.CPUPercent)
	}
	if stats.MemPercent != 50 {
		t.Errorf("Mem%%: want 50, got %v", stats.MemPercent)
	}
	if stats.MemUsed != 50 || stats.MemLimit != 100 {
		t.Errorf("mem used/limit: want 50/100, got %d/%d", stats.MemUsed, stats.MemLimit)
	}
}

// A batch asks about many containers at once, so the two things that matter
// are that every id gets its own reading and that one bad container does not
// take the rest of the screen down with it.
func TestGetContainersStats_KeepsGoodReadingsWhenOneFails(t *testing.T) {
	var mu sync.Mutex
	var peak, live int

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		live++
		if live > peak {
			peak = live
		}
		mu.Unlock()
		defer func() { mu.Lock(); live--; mu.Unlock() }()

		// "broken" is the one the daemon refuses to report on.
		if strings.Contains(r.URL.Path, "broken") {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		time.Sleep(20 * time.Millisecond) // long enough for overlap to show
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"cpu_stats":{"cpu_usage":{"total_usage":200},"system_cpu_usage":2000,"online_cpus":2},
			"precpu_stats":{"cpu_usage":{"total_usage":100},"system_cpu_usage":1000},
			"memory_stats":{"usage":50,"limit":100}
		}`))
	}))
	defer srv.Close()

	ids := []string{"a", "b", "broken", "c", "d", "e"}
	all, err := GetContainersStats(srv.URL, ids)
	if err != nil {
		t.Fatalf("GetContainersStats: %v", err)
	}

	if len(all) != len(ids)-1 {
		t.Errorf("want %d readings, got %d: %v", len(ids)-1, len(all), all)
	}
	if _, ok := all["broken"]; ok {
		t.Error("the container that failed should be absent, not zeroed")
	}
	for _, id := range []string{"a", "b", "c", "d", "e"} {
		if all[id].CPUPercent != 20 {
			t.Errorf("%s: CPU%% = %v, want 20", id, all[id].CPUPercent)
		}
	}
	if peak < 2 {
		t.Errorf("readings ran one at a time (peak concurrency %d); the batch exists to overlap them", peak)
	}
	if peak > statsParallelism {
		t.Errorf("peak concurrency %d exceeds the cap of %d", peak, statsParallelism)
	}
}

// The cap is what stops one host with many containers from opening one
// reading per container against the daemon at the same instant.
func TestGetContainersStats_RespectsParallelismCap(t *testing.T) {
	var mu sync.Mutex
	var peak, live int

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		mu.Lock()
		live++
		if live > peak {
			peak = live
		}
		mu.Unlock()
		time.Sleep(15 * time.Millisecond)
		mu.Lock()
		live--
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"cpu_stats":{"cpu_usage":{"total_usage":0},"system_cpu_usage":0},
			"precpu_stats":{"cpu_usage":{"total_usage":0},"system_cpu_usage":0},
			"memory_stats":{"usage":0,"limit":100}}`))
	}))
	defer srv.Close()

	ids := make([]string, 40)
	for i := range ids {
		ids[i] = fmt.Sprintf("c%d", i)
	}
	if _, err := GetContainersStats(srv.URL, ids); err != nil {
		t.Fatalf("GetContainersStats: %v", err)
	}
	if peak > statsParallelism {
		t.Errorf("peak concurrency %d exceeds the cap of %d", peak, statsParallelism)
	}
}

func TestListContainers_ErrorStatus(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()
	if _, err := ListContainers(srv.URL); err == nil {
		t.Fatal("expected error on non-200 Docker response")
	}
}

// The addresses people actually have: whatever DOCKER_HOST holds, whatever
// `docker context ls` prints, and whatever they type without a scheme. Pinned
// because `tcp://` — the commonest of them — used to be turned into
// `http://tcp://host:2375` and failed four seconds later with no explanation.
func TestNewDockerClient_AcceptsDockerHostForms(t *testing.T) {
	cases := []struct {
		host string
		base string
	}{
		{"", "http://localhost"},
		{"local", "http://localhost"},
		{"LOCAL", "http://localhost"},
		{"unix:///var/run/docker.sock", "http://localhost"},
		{"unix:///run/user/1000/podman/podman.sock", "http://localhost"},
		{"tcp://192.168.1.10:2375", "http://192.168.1.10:2375"},
		{"tcp://docker.example.com:2375/", "http://docker.example.com:2375"},
		{"http://192.168.1.10:2375", "http://192.168.1.10:2375"},
		{"https://192.168.1.10:2376", "https://192.168.1.10:2376"},
		{"192.168.1.10:2375", "http://192.168.1.10:2375"},
		{"agent://192.168.1.10:2375?token=secret", "http://192.168.1.10:2375"},
	}
	for _, c := range cases {
		client, base, err := newDockerClient(c.host)
		if err != nil {
			t.Errorf("newDockerClient(%q) returned %v", c.host, err)
			continue
		}
		if client == nil {
			t.Errorf("newDockerClient(%q) returned no client", c.host)
		}
		if base != c.base {
			t.Errorf("newDockerClient(%q) base = %q, want %q", c.host, base, c.base)
		}
	}
}

// Refused by name rather than mangled into something that times out.
func TestNewDockerClient_RejectsWhatItCannotReach(t *testing.T) {
	for _, host := range []string{
		"npipe:////./pipe/docker_engine",
		"ssh://user@192.168.1.10",
		"unix://",
	} {
		if _, _, err := newDockerClient(host); err == nil {
			t.Errorf("newDockerClient(%q) accepted an address it cannot reach", host)
		}
	}
}

// Asking the same daemon again and again has to reuse one connection. Every
// call used to build a fresh client, and with it a fresh pool nobody closed: the
// widget asks every few seconds for as long as the board is open, and each ask
// left a connection (and the goroutines serving it) behind. Measured against a
// real daemon, two hundred asks took the process from 12 to 134 open files.
func TestAskingTheSameDaemonReusesItsConnection(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[]`))
	})
	var opened atomic.Int32
	count := func(_ net.Conn, state http.ConnState) {
		if state == http.StateNew {
			opened.Add(1)
		}
	}

	t.Run("over TCP", func(t *testing.T) {
		opened.Store(0)
		srv := httptest.NewUnstartedServer(handler)
		srv.Config.ConnState = count
		srv.Start()
		defer srv.Close()
		for i := 0; i < 20; i++ {
			if _, err := ListContainers(srv.URL); err != nil {
				t.Fatal(err)
			}
		}
		if got := opened.Load(); got != 1 {
			t.Fatalf("20 calls opened %d connections, want 1", got)
		}
	})

	t.Run("over a Unix socket", func(t *testing.T) {
		opened.Store(0)
		sock := filepath.Join(t.TempDir(), "d.sock")
		ln, err := net.Listen("unix", sock)
		if err != nil {
			t.Fatal(err)
		}
		srv := &http.Server{Handler: handler, ConnState: count}
		go srv.Serve(ln)
		defer srv.Close()
		for i := 0; i < 20; i++ {
			if _, err := ListContainers("unix://" + sock); err != nil {
				t.Fatal(err)
			}
		}
		if got := opened.Load(); got != 1 {
			t.Fatalf("20 calls opened %d connections, want 1", got)
		}
	})
}

// Two different daemons must not share a client: the token an agent is reached
// with is part of its address, and a client reused across them would send one
// host's token to the other.
func TestDifferentDaemonsDoNotShareAClient(t *testing.T) {
	a, _, err := newDockerClient("agent://one.example:9?token=A")
	if err != nil {
		t.Fatal(err)
	}
	b, _, err := newDockerClient("agent://two.example:9?token=B")
	if err != nil {
		t.Fatal(err)
	}
	a2, _, _ := newDockerClient("agent://one.example:9?token=A")
	if a == b {
		t.Fatal("two hosts got the same client")
	}
	if a != a2 {
		t.Fatal("the same host got a new client")
	}
}

// The cache is for the handful of hosts a board really has. Someone trying many
// addresses while setting one up must not make it grow without end.
func TestTheClientCacheIsBounded(t *testing.T) {
	for i := 0; i < maxDockerClients*3; i++ {
		if _, _, err := newDockerClient(fmt.Sprintf("agent://h%d.example:9?token=t", i)); err != nil {
			t.Fatal(err)
		}
	}
	dockerClientsMu.Lock()
	n := len(dockerClients)
	dockerClientsMu.Unlock()
	if n > maxDockerClients {
		t.Fatalf("the cache holds %d clients, the bound is %d", n, maxDockerClients)
	}
}

// A container id comes from the browser and goes into the path of a request to
// the daemon. Unescaped, an id containing "?" turns the rest of the path into a
// query string, and a POST meant for /containers/<id>/stop lands somewhere else.
func TestAContainerIDStaysOneSegmentOfThePath(t *testing.T) {
	var gotURI string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotURI = r.RequestURI
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	if err := ContainerAction(srv.URL, "x/../../volumes/prune?", "stop"); err != nil {
		t.Fatalf("action: %v", err)
	}
	want := "/containers/x%2F..%2F..%2Fvolumes%2Fprune%3F/stop"
	if gotURI != want {
		t.Fatalf("the daemon was asked for %q, want %q", gotURI, want)
	}

	// And the stats request, which takes the ids from the same place.
	if _, err := GetContainersStats(srv.URL, []string{"x/../y?"}); err != nil {
		t.Fatalf("stats: %v", err)
	}
	if want := "/containers/x%2F..%2Fy%3F/stats?stream=false"; gotURI != want {
		t.Fatalf("stats asked the daemon for %q, want %q", gotURI, want)
	}

	// A plain id is untouched.
	if err := ContainerAction(srv.URL, "abcdef123456", "restart"); err != nil {
		t.Fatal(err)
	}
	if gotURI != "/containers/abcdef123456/restart" {
		t.Fatalf("a plain id was changed: %q", gotURI)
	}
}
