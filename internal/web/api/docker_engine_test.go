package api_test

import (
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
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

// A daemon on a Unix socket, answering /version as the test says.
func fakeEngine(t *testing.T, version string) string {
	t.Helper()
	dir, err := os.MkdirTemp("", "lbe")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.RemoveAll(dir) })
	sock := filepath.Join(dir, "d.sock")
	l, err := net.Listen("unix", sock)
	if err != nil {
		t.Fatal(err)
	}
	srv := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/version" || version == "" {
			http.NotFound(w, r)
			return
		}
		w.Write([]byte(version))
	})}
	go srv.Serve(l)
	t.Cleanup(func() { srv.Close() })
	return sock
}

func engineServer(t *testing.T) (*httptest.Server, *database.DB, func()) {
	t.Helper()
	tmp, _ := os.CreateTemp("", "lastboard_dk_engine_*.db")
	tmp.Close()
	db, err := database.InitDB(tmp.Name())
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	protect := middleware.AuthRequired(db.DB, testSecret)
	auth := api.NewAuthHandler(db.DB, testSecret)
	dk := api.NewDockerHandler(db.DB)
	mux.Handle("POST /api/login", http.HandlerFunc(auth.Login))
	mux.Handle("GET /api/docker/settings", protect(http.HandlerFunc(dk.GetSettings)))
	mux.Handle("POST /api/docker/settings", protect(http.HandlerFunc(dk.UpdateSettings)))
	mux.Handle("POST /api/docker/engine", protect(http.HandlerFunc(dk.EngineFor)))
	server := httptest.NewServer(mux)
	return server, db, func() { server.Close(); db.Close(); os.Remove(tmp.Name()) }
}

func TestTheEngineAHostSaysItRunsCorrectsWhatWasChosen(t *testing.T) {
	podman := `{"Version":"6.2.0","Components":[{"Name":"Podman Engine","Version":"6.2.0"}]}`
	docker := `{"Version":"28.5.2","Components":[{"Name":"Engine","Version":"28.5.2"}]}`
	agentPodman := `{"engine":"podman","version":"6.2.0"}`

	cases := []struct {
		name, answer, chosen, want string
	}{
		{"Podman saved as Docker", podman, "docker", "podman"},
		{"Docker saved as Podman", docker, "podman", "docker"},
		{"an agent that says podman", agentPodman, "docker", "podman"},
		{"right already", podman, "podman", "podman"},
		{"a host that does not say keeps what was chosen", "", "podman", "podman"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			server, db, cleanup := engineServer(t)
			defer cleanup()
			createUser(t, db.DB, "root", "password", "admin")
			s := doLogin(t, server.URL, "root", "password")
			sock := fakeEngine(t, c.answer)

			body, _ := json.Marshal(map[string]any{"hosts": []map[string]any{{"name": "h", "type": "local", "url": sock, "engine": c.chosen, "enabled": true}}})
			if code, _ := dkCall(t, server.URL, "POST", "/api/docker/settings", s, string(body)); code != http.StatusNoContent {
				t.Fatalf("save: %d", code)
			}
			var id string
			_, listed := dkCall(t, server.URL, "GET", "/api/docker/settings", s, "")
			var out struct {
				Hosts []struct {
					ID string `json:"id"`
				} `json:"hosts"`
			}
			json.Unmarshal(listed, &out)
			id = out.Hosts[0].ID

			code, ans := dkCall(t, server.URL, "POST", "/api/docker/engine", s, `{"host_id":"`+id+`"}`)
			if code != http.StatusOK {
				t.Fatalf("engine: %d %s", code, ans)
			}
			if got := dkHostsOf(t, server.URL, s)[0].Engine; got != c.want {
				t.Errorf("stored engine = %q, want %q (answer %s)", got, c.want, ans)
			}
		})
	}
}
