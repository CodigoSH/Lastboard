package api_test

import (
	"encoding/json"
	"net/http"
	"testing"
)

type engineHost struct {
	Name   string `json:"name"`
	Type   string `json:"type"`
	URL    string `json:"url"`
	Engine string `json:"engine"`
}

func dkHostsOf(t *testing.T, base string, s *userSession) []engineHost {
	t.Helper()
	_, body := dkCall(t, base, "GET", "/api/docker/settings", s, "")
	var out struct {
		Hosts []engineHost `json:"hosts"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		t.Fatal(err)
	}
	return out.Hosts
}

func TestAHostRemembersItsEngineAndOldOnesAreDocker(t *testing.T) {
	server, db, cleanup := setupDockerIconsServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")

	code, _ := dkCall(t, server.URL, "POST", "/api/docker/settings", s,
		`{"hosts":[{"name":"old","type":"agent","url":"10.0.0.5:9876","enabled":true},`+
			`{"name":"","type":"agent","url":"10.0.0.6:9876","engine":"podman","enabled":true},`+
			`{"name":"x","type":"agent","url":"10.0.0.7:9876","engine":"nonsense","enabled":true}]}`)
	if code != http.StatusNoContent {
		t.Fatalf("save: %d", code)
	}
	hosts := dkHostsOf(t, server.URL, s)
	if len(hosts) != 3 {
		t.Fatalf("hosts: %+v", hosts)
	}
	if hosts[0].Engine != "docker" || hosts[2].Engine != "docker" {
		t.Errorf("a host without an engine, or with a made-up one, must be docker: %+v", hosts)
	}
	if hosts[1].Engine != "podman" || hosts[1].Name != "Podman" {
		t.Errorf("a Podman host keeps its engine and is named for it when left unnamed: %+v", hosts[1])
	}
}

func TestPodmanIsNotOfferedOnANetworkPort(t *testing.T) {
	server, db, cleanup := setupDockerIconsServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")

	for _, kind := range []string{"tcp", "tls"} {
		code, _ := dkCall(t, server.URL, "POST", "/api/docker/settings", s,
			`{"hosts":[{"name":"p","type":"`+kind+`","url":"10.0.0.5:2375","engine":"podman","enabled":true}]}`)
		if code != http.StatusBadRequest {
			t.Errorf("podman over %s: %d, want 400", kind, code)
		}
	}
	// Docker still can, and so can Podman through its socket.
	for _, body := range []string{
		`{"hosts":[{"name":"d","type":"tcp","url":"10.0.0.5:2375","enabled":true}]}`,
		`{"hosts":[{"name":"p","type":"local","url":"/run/podman/podman.sock","engine":"podman","enabled":true}]}`,
	} {
		if code, _ := dkCall(t, server.URL, "POST", "/api/docker/settings", s, body); code != http.StatusNoContent {
			t.Errorf("%s: %d", body, code)
		}
	}
}

func TestALocalHostTakesAPlainAbsoluteSocketPath(t *testing.T) {
	server, db, cleanup := setupDockerIconsServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")

	for name, path := range map[string]string{
		"relative":   "podman.sock",
		"dot dots":   "/run/../etc/x.sock",
		"double":     "/run//podman.sock",
		"trailing":   "/run/podman/",
		"too long":   "/" + string(make([]byte, 0)) + "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		"with a nul": "/run/a\u0000b",
	} {
		body, _ := json.Marshal(map[string]any{"hosts": []map[string]any{{"name": "l", "type": "local", "url": path, "enabled": true}}})
		if code, _ := dkCall(t, server.URL, "POST", "/api/docker/settings", s, string(body)); code != http.StatusBadRequest {
			t.Errorf("%s (%q): %d, want 400", name, path, code)
		}
	}
	if code, _ := dkCall(t, server.URL, "POST", "/api/docker/settings", s,
		`{"hosts":[{"name":"l","type":"local","url":"/run/podman/podman.sock","enabled":true}]}`); code != http.StatusNoContent {
		t.Fatalf("a good path: %d", code)
	}
	if h := dkHostsOf(t, server.URL, s); len(h) != 1 || h[0].URL != "/run/podman/podman.sock" {
		t.Errorf("the path was not kept: %+v", h)
	}
}
