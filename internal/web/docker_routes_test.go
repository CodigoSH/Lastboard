package web

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/access"
)

// fakeAgent answers the two calls the widget makes of a Lastboard Agent, and only
// with the right token. It writes down which containers it was asked to start.
func fakeAgent(t *testing.T, token string) (addr string, started func() []string) {
	t.Helper()
	var mu sync.Mutex
	var starts []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer "+token {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/containers/json":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`[{"Id":"abc123def456","Names":["/plex"],"Image":"plex","State":"running","Status":"Up","Created":1,"Ports":[]}]`))
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/start"):
			mu.Lock()
			starts = append(starts, strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/containers/"), "/start"))
			mu.Unlock()
			w.WriteHeader(http.StatusNoContent)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return strings.TrimPrefix(srv.URL, "http://"), func() []string {
		mu.Lock()
		defer mu.Unlock()
		return append([]string(nil), starts...)
	}
}

func hostsOf(t *testing.T, as func(method, path, body string) *httptest.ResponseRecorder) []map[string]any {
	t.Helper()
	w := as(http.MethodGet, "/api/docker/settings", "")
	if w.Code != http.StatusOK {
		t.Fatalf("GET /api/docker/settings = %d", w.Code)
	}
	var out struct {
		Hosts []map[string]any `json:"hosts"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	return out.Hosts
}

func TestAMemberUsesDockerThroughItsOwnAgentsOnly(t *testing.T) {
	addr, started := fakeAgent(t, "the-token")
	srv := newTestServer(t, true)
	ana := asMember(t, srv, "ana", access.Homelab())
	luis := asMember(t, srv, "luis", access.Homelab())
	admin := adminOf(t, srv)

	// Ana connects her agent. The token goes in and never comes back out.
	body := fmt.Sprintf(`{"hosts":[{"name":"Mine","type":"agent","url":%q,"token":"the-token","enabled":true}]}`, addr)
	if w := ana(http.MethodPost, "/api/docker/settings", body); w.Code != http.StatusNoContent {
		t.Fatalf("a member adding its own agent = %d %s, want 204", w.Code, w.Body.String())
	}
	if w := ana(http.MethodGet, "/api/docker/settings", ""); strings.Contains(w.Body.String(), "the-token") {
		t.Error("the settings answer carried the agent's token")
	}
	hosts := hostsOf(t, ana)
	if len(hosts) != 1 || hosts[0]["has_token"] != true || hosts[0]["usable"] != true {
		t.Fatalf("ana's hosts = %v", hosts)
	}
	id := hosts[0]["id"].(string)

	// She lists her containers and starts one, on her own agent.
	if w := ana(http.MethodPost, "/api/docker/containers", fmt.Sprintf(`{"host_id":%q}`, id)); w.Code != http.StatusOK || !strings.Contains(w.Body.String(), "plex") {
		t.Errorf("listing her own agent = %d %s", w.Code, w.Body.String())
	}
	if w := ana(http.MethodPost, "/api/docker/action", fmt.Sprintf(`{"host_id":%q,"id":"abc123def456","action":"start"}`, id)); w.Code != http.StatusOK {
		t.Errorf("starting a container on her own agent = %d %s", w.Code, w.Body.String())
	}
	if s := started(); len(s) != 1 || s[0] != "abc123def456" {
		t.Errorf("the agent was asked to start %v", s)
	}

	// A host is named by id, and only among the caller's own: Luis cannot use hers.
	if w := luis(http.MethodPost, "/api/docker/containers", fmt.Sprintf(`{"host_id":%q}`, id)); w.Code != http.StatusNotFound {
		t.Errorf("another account's host = %d, want 404", w.Code)
	}

	// The kinds reached by being the server are the administrator's.
	for _, kind := range []string{"local", "tcp", "tls"} {
		b := fmt.Sprintf(`{"hosts":[{"name":"X","type":%q,"url":"10.0.0.9:2375","enabled":true}]}`, kind)
		if w := ana(http.MethodPost, "/api/docker/settings", b); w.Code != http.StatusForbidden {
			t.Errorf("a member adding a %s host = %d, want 403", kind, w.Code)
		}
		if w := admin(http.MethodPost, "/api/docker/settings", b); w.Code != http.StatusNoContent {
			t.Errorf("the administrator adding a %s host = %d, want 204", kind, w.Code)
		}
	}
}

// A member that had the server's socket in a widget keeps it as its own data
// after the move to the account, and can save its list with it untouched — but
// the host does nothing for it, and says so.
func TestAMembersSocketFromBeforeIsKeptAndRefused(t *testing.T) {
	srv := newTestServer(t, true)
	ana := asMember(t, srv, "ana", access.Homelab())
	var id int
	srv.DB.QueryRow("SELECT id FROM users WHERE username = 'ana'").Scan(&id)
	if _, err := srv.DB.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (?, 'docker_hosts', ?)`,
		id, `[{"id":"m1","name":"This server","type":"local","url":"","enabled":true}]`); err != nil {
		t.Fatal(err)
	}

	hosts := hostsOf(t, ana)
	if len(hosts) != 1 || hosts[0]["usable"] != false {
		t.Fatalf("the socket should be listed as not usable by a member: %v", hosts)
	}
	if w := ana(http.MethodPost, "/api/docker/containers", `{"host_id":"m1"}`); w.Code != http.StatusForbidden || !strings.Contains(w.Body.String(), "docker.admin_only") {
		t.Errorf("using it = %d %s, want 403 docker.admin_only", w.Code, w.Body.String())
	}
	if w := ana(http.MethodPost, "/api/docker/settings", `{"hosts":[{"id":"m1","name":"Renamed","type":"local","url":"","enabled":true}]}`); w.Code != http.StatusNoContent {
		t.Errorf("saving the list with it untouched = %d, want 204", w.Code)
	}
}

// A container's details and log are read like the list: with Docker view, on the
// account's own hosts only, and with the environment as names.
func TestAContainersDetailsAndLogAreReadOnTheAccountsOwnHosts(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/containers/plex/json":
			w.Write([]byte(`{"Id":"abc123def456","Name":"/plex","Config":{"Image":"plex","Env":["PLEX_CLAIM=claim-secret"]},"State":{"Status":"running"}}`))
		case "/containers/plex/logs":
			w.Header().Set("Content-Type", "application/octet-stream")
			w.Write([]byte("2026-10-26T17:00:01Z started\n"))
		default:
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"message":"no such container"}`))
		}
	}))
	t.Cleanup(srv.Close)

	server := newTestServer(t, true)
	admin := adminOf(t, server)
	view := access.Standard()
	view.Docker = access.View
	viewer := asMember(t, server, "viewer", view)
	none := asMember(t, server, "none", access.Standard())

	body := fmt.Sprintf(`{"hosts":[{"name":"Lab","type":"tcp","url":%q,"enabled":true}]}`, strings.TrimPrefix(srv.URL, "http://"))
	if w := admin(http.MethodPost, "/api/docker/settings", body); w.Code != http.StatusNoContent {
		t.Fatalf("adding the host = %d %s", w.Code, w.Body.String())
	}
	id := hostsOf(t, admin)[0]["id"].(string)

	w := admin(http.MethodPost, "/api/docker/detail", fmt.Sprintf(`{"host_id":%q,"id":"plex"}`, id))
	if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), `"PLEX_CLAIM"`) || strings.Contains(w.Body.String(), "claim-secret") {
		t.Errorf("details = %d %s, want the variable's name and not its value", w.Code, w.Body.String())
	}
	if w := admin(http.MethodPost, "/api/docker/logs", fmt.Sprintf(`{"host_id":%q,"id":"plex","tail":10}`, id)); w.Code != http.StatusOK || !strings.Contains(w.Body.String(), "started") {
		t.Errorf("logs = %d %s", w.Code, w.Body.String())
	}
	if w := admin(http.MethodPost, "/api/docker/detail", fmt.Sprintf(`{"host_id":%q,"id":"gone"}`, id)); w.Code != http.StatusNotFound || !strings.Contains(w.Body.String(), "docker.not_found") {
		t.Errorf("a container that is not there = %d %s, want 404 docker.not_found", w.Code, w.Body.String())
	}
	for _, bad := range []string{`"../images/json"`, `""`, `"a/b"`, `"-rf"`} {
		if w := admin(http.MethodPost, "/api/docker/logs", fmt.Sprintf(`{"host_id":%q,"id":%s}`, id, bad)); w.Code != http.StatusBadRequest {
			t.Errorf("id %s = %d, want 400", bad, w.Code)
		}
	}
	if w := admin(http.MethodPost, "/api/docker/logs", fmt.Sprintf(`{"host_id":%q,"id":"plex","after":"yesterday"}`, id)); w.Code != http.StatusBadRequest {
		t.Errorf("an after that is not a time = %d, want 400", w.Code)
	}

	// The host is the administrator's: a member names it and finds nothing.
	if w := viewer(http.MethodPost, "/api/docker/detail", fmt.Sprintf(`{"host_id":%q,"id":"plex"}`, id)); w.Code != http.StatusNotFound {
		t.Errorf("another account's host = %d, want 404", w.Code)
	}
	for _, path := range []string{"/api/docker/detail", "/api/docker/logs"} {
		if w := none(http.MethodPost, path, fmt.Sprintf(`{"host_id":%q,"id":"plex"}`, id)); w.Code != http.StatusForbidden {
			t.Errorf("%s without Docker = %d, want 403", path, w.Code)
		}
	}
}

// An agent from before v1.3.0 does not have the calls, and the answer says to
// update it instead of "could not connect".
func TestAnOldAgentIsAskedToBeUpdated(t *testing.T) {
	addr, _ := fakeAgent(t, "the-token")
	srv := newTestServer(t, true)
	ana := asMember(t, srv, "ana", access.Homelab())
	body := fmt.Sprintf(`{"hosts":[{"name":"Mine","type":"agent","url":%q,"token":"the-token","enabled":true}]}`, addr)
	if w := ana(http.MethodPost, "/api/docker/settings", body); w.Code != http.StatusNoContent {
		t.Fatalf("adding the agent = %d", w.Code)
	}
	id := hostsOf(t, ana)[0]["id"].(string)
	if w := ana(http.MethodPost, "/api/docker/logs", fmt.Sprintf(`{"host_id":%q,"id":"plex"}`, id)); w.Code != http.StatusBadGateway || !strings.Contains(w.Body.String(), "docker.agent_too_old") {
		t.Errorf("logs from an old agent = %d %s, want 502 docker.agent_too_old", w.Code, w.Body.String())
	}
}

// Without the permission there is no Docker at all.
func TestDockerNeedsItsPermission(t *testing.T) {
	srv := newTestServer(t, true)
	none := asMember(t, srv, "none", access.Standard())
	if w := none(http.MethodGet, "/api/docker/settings", ""); w.Code != http.StatusForbidden {
		t.Errorf("GET /api/docker/settings without Docker = %d, want 403", w.Code)
	}
	view := access.Standard()
	view.Docker = access.View
	viewer := asMember(t, srv, "viewer", view)
	if w := viewer(http.MethodPost, "/api/docker/action", `{"host_id":"x","id":"a","action":"start"}`); w.Code != http.StatusForbidden {
		t.Errorf("an action with Docker view only = %d, want 403", w.Code)
	}
}
