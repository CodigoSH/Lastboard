package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

func setupDockerIconsServer(t *testing.T) (*httptest.Server, *database.DB, func()) {
	t.Helper()
	tmp, err := os.CreateTemp("", "lastboard_dk_icons_*.db")
	if err != nil {
		t.Fatalf("temp file: %v", err)
	}
	tmp.Close()
	db, err := database.InitDB(tmp.Name())
	if err != nil {
		t.Fatalf("InitDB: %v", err)
	}
	mux := http.NewServeMux()
	protect := middleware.AuthRequired(db.DB, testSecret)
	auth := api.NewAuthHandler(db.DB, testSecret)
	dk := api.NewDockerHandler(db.DB)
	mux.Handle("POST /api/login", http.HandlerFunc(auth.Login))
	mux.Handle("GET /api/docker/settings", protect(http.HandlerFunc(dk.GetSettings)))
	mux.Handle("POST /api/docker/settings", protect(http.HandlerFunc(dk.UpdateSettings)))
	mux.Handle("POST /api/docker/icon", protect(http.HandlerFunc(dk.SetIcon)))
	server := httptest.NewServer(mux)
	return server, db, func() {
		server.Close()
		db.Close()
		os.Remove(tmp.Name())
	}
}

func dkCall(t *testing.T, base, method, path string, s *userSession, body string) (int, []byte) {
	t.Helper()
	req, _ := http.NewRequest(method, base+path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer resp.Body.Close()
	var buf strings.Builder
	b := make([]byte, 4096)
	for {
		n, e := resp.Body.Read(b)
		buf.Write(b[:n])
		if e != nil {
			break
		}
	}
	return resp.StatusCode, []byte(buf.String())
}

// dkHost saves one agent host for the account and returns the id the server minted.
func dkHost(t *testing.T, base string, s *userSession) string {
	t.Helper()
	code, _ := dkCall(t, base, "POST", "/api/docker/settings", s,
		`{"hosts":[{"name":"box","type":"agent","url":"10.0.0.5:9876","token":"tok","enabled":true}]}`)
	if code != http.StatusOK && code != http.StatusNoContent {
		t.Fatalf("saving a host: %d", code)
	}
	_, body := dkCall(t, base, "GET", "/api/docker/settings", s, "")
	var out struct {
		Hosts []struct {
			ID string `json:"id"`
		} `json:"hosts"`
	}
	json.Unmarshal(body, &out)
	if len(out.Hosts) != 1 || out.Hosts[0].ID == "" {
		t.Fatalf("no host id came back: %s", body)
	}
	return out.Hosts[0].ID
}

func dkIcons(t *testing.T, base string, s *userSession) map[string]string {
	t.Helper()
	_, body := dkCall(t, base, "GET", "/api/docker/settings", s, "")
	var out struct {
		Icons map[string]string `json:"icons"`
	}
	json.Unmarshal(body, &out)
	return out.Icons
}

func TestAContainersIconIsKeptByHostAndNameForItsOwner(t *testing.T) {
	server, db, cleanup := setupDockerIconsServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	createUser(t, db.DB, "guest", "password", "user")
	admin := doLogin(t, server.URL, "root", "password")
	guest := doLogin(t, server.URL, "guest", "password")
	id := dkHost(t, server.URL, admin)

	code, _ := dkCall(t, server.URL, "POST", "/api/docker/icon", admin, `{"host_id":"`+id+`","name":"plex","icon":"/api/icons/plex"}`)
	if code != http.StatusNoContent {
		t.Fatalf("set: %d", code)
	}
	if got := dkIcons(t, server.URL, admin)[id+"/plex"]; got != "/api/icons/plex" {
		t.Errorf("icon = %q, want it keyed by host id and name", got)
	}
	if got := dkIcons(t, server.URL, guest); len(got) != 0 {
		t.Errorf("another account sees %v", got)
	}

	// An empty icon clears the choice.
	dkCall(t, server.URL, "POST", "/api/docker/icon", admin, `{"host_id":"`+id+`","name":"plex","icon":""}`)
	if got := dkIcons(t, server.URL, admin); len(got) != 0 {
		t.Errorf("after clearing: %v", got)
	}
}

func TestAnIconThatCouldForgeAKeyOrFillTheRowIsRefused(t *testing.T) {
	server, db, cleanup := setupDockerIconsServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	id := dkHost(t, server.URL, s)

	for name, body := range map[string]string{
		"unknown host":  `{"host_id":"dkdeadbeef","name":"plex","icon":"/api/icons/x"}`,
		"no name":       `{"host_id":"` + id + `","name":"","icon":"/api/icons/x"}`,
		"slash in name": `{"host_id":"` + id + `","name":"a/b","icon":"/api/icons/x"}`,
		"huge icon":     `{"host_id":"` + id + `","name":"plex","icon":"` + strings.Repeat("x", 600) + `"}`,
		"not json":      `nope`,
	} {
		code, _ := dkCall(t, server.URL, "POST", "/api/docker/icon", s, body)
		if code == http.StatusNoContent {
			t.Errorf("%s: stored", name)
		}
	}
	if got := dkIcons(t, server.URL, s); len(got) != 0 {
		t.Errorf("icons = %v, want none", got)
	}
}

func TestTheIconMapStopsGrowingButStillAcceptsChangesToWhatIsThere(t *testing.T) {
	server, db, cleanup := setupDockerIconsServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	id := dkHost(t, server.URL, s)

	for i := 0; i < 500; i++ {
		body := `{"host_id":"` + id + `","name":"c` + strings.Repeat("x", i%7) + string(rune('a'+i%26)) + string(rune('a'+(i/26)%26)) + string(rune('a'+(i/676)%26)) + `","icon":"/api/icons/x"}`
		if code, _ := dkCall(t, server.URL, "POST", "/api/docker/icon", s, body); code != http.StatusNoContent {
			t.Fatalf("icon %d refused with %d", i, code)
		}
	}
	if n := len(dkIcons(t, server.URL, s)); n != 500 {
		t.Fatalf("stored %d, want 500", n)
	}
	if code, _ := dkCall(t, server.URL, "POST", "/api/docker/icon", s, `{"host_id":"`+id+`","name":"one-more","icon":"/api/icons/x"}`); code == http.StatusNoContent {
		t.Error("a 501st container was accepted")
	}
	// A container already there can still change or clear its icon.
	var first string
	for k := range dkIcons(t, server.URL, s) {
		first = strings.TrimPrefix(k, id+"/")
		break
	}
	if code, _ := dkCall(t, server.URL, "POST", "/api/docker/icon", s, `{"host_id":"`+id+`","name":"`+first+`","icon":"/api/icons/y"}`); code != http.StatusNoContent {
		t.Errorf("changing a known container: %d", code)
	}
}

func TestRemovingAHostDropsTheIconsOfItsContainers(t *testing.T) {
	server, db, cleanup := setupDockerIconsServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	id := dkHost(t, server.URL, s)
	dkCall(t, server.URL, "POST", "/api/docker/icon", s, `{"host_id":"`+id+`","name":"plex","icon":"/api/icons/x"}`)

	dkCall(t, server.URL, "POST", "/api/docker/settings", s, `{"hosts":[]}`)
	if got := dkIcons(t, server.URL, s); len(got) != 0 {
		t.Errorf("icons of a host that is gone: %v", got)
	}
}
