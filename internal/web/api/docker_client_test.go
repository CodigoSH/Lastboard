package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
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

func TestGetContainerStats_ComputesPercentages(t *testing.T) {
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

	stats, err := GetContainerStats(srv.URL, "abc")
	if err != nil {
		t.Fatalf("GetContainerStats: %v", err)
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

func TestListContainers_ErrorStatus(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()
	if _, err := ListContainers(srv.URL); err == nil {
		t.Fatal("expected error on non-200 Docker response")
	}
}
