package api_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/access"
)

type recordingAgent struct {
	*httptest.Server
	mu   sync.Mutex
	auth []string
}

func newRecordingAgent(t *testing.T) *recordingAgent {
	t.Helper()
	a := &recordingAgent{}
	a.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		a.mu.Lock()
		a.auth = append(a.auth, r.Method+" "+r.URL.Path+" "+r.Header.Get("Authorization"))
		a.mu.Unlock()
		switch {
		case r.Method == http.MethodPost:
			w.WriteHeader(http.StatusNoContent)
		case strings.HasSuffix(r.URL.Path, "/stats"):
			w.Write([]byte(`{"cpu_stats":{},"precpu_stats":{},"memory_stats":{}}`))
		default:
			w.Write([]byte(`[{"Id":"abcdef1234567890","Names":["/web"],"Image":"nginx","State":"running"}]`))
		}
	}))
	t.Cleanup(a.Close)
	return a
}

func (a *recordingAgent) last() string {
	a.mu.Lock()
	defer a.mu.Unlock()
	if len(a.auth) == 0 {
		return ""
	}
	return a.auth[len(a.auth)-1]
}

// The agent token is kept with the account's host; the browser names the host
// and the server puts the token on the request — for the list, the readings and
// the start/stop/restart. A token with characters a URL would mangle arrives as
// it was typed, and no answer carries it back.
func TestADockerHostTokenTravelsOnlyToItsAgent(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "alice", "correcthorse", "admin")
	cookie := loginAndGetCookie(t, server, "alice", "correcthorse")
	agent := newRecordingAgent(t)
	addr := strings.TrimPrefix(agent.URL, "http://")

	db.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (1, 'docker_hosts', ?)`,
		`[{"id":"h_abc123","name":"nas","type":"agent","url":"`+addr+`","token":"s3cret/+=","enabled":true}]`)

	for name, c := range map[string]struct{ path, body string }{
		"containers": {"/api/docker/containers", `{"host_id":"h_abc123"}`},
		"stats":      {"/api/docker/stats", `{"host_id":"h_abc123","ids":["abcdef1234567890"]}`},
		"action":     {"/api/docker/action", `{"host_id":"h_abc123","id":"abcdef1234567890","action":"restart"}`},
	} {
		code, body := secretReq(t, "POST", server.URL+c.path, cookie, c.body)
		if code != http.StatusOK {
			t.Fatalf("%s: %d %s", name, code, body)
		}
		if !strings.HasSuffix(agent.last(), "Bearer s3cret/+=") {
			t.Errorf("%s: the agent got %q", name, agent.last())
		}
		if strings.Contains(body, "s3cret") {
			t.Errorf("%s: the answer carries the token", name)
		}
	}
	code, body := secretReq(t, "GET", server.URL+"/api/docker/settings", cookie, "")
	if code != http.StatusOK || strings.Contains(body, "s3cret") {
		t.Errorf("settings: %d, and the answer must not carry the token: %s", code, body)
	}
}

// A host is named by id among the caller's own hosts. Another account naming
// the administrator's host id reaches nothing, and certainly not with its token.
func TestADockerHostTokenStaysWithItsOwner(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "alice", "correcthorse", "admin")
	createUser(t, db, "mallory", "correcthorse", "user")
	db.Exec(`INSERT INTO user_access (user_id, grants) SELECT id, ? FROM users WHERE username = 'mallory'`,
		access.Encode(access.Homelab()))
	agent := newRecordingAgent(t)
	addr := strings.TrimPrefix(agent.URL, "http://")
	db.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (1, 'docker_hosts', ?)`,
		`[{"id":"h_abc123","name":"nas","type":"agent","url":"`+addr+`","token":"alice-agent-token","enabled":true}]`)

	mallory := loginAndGetCookie(t, server, "mallory", "correcthorse")
	code, _ := secretReq(t, "POST", server.URL+"/api/docker/containers", mallory, `{"host_id":"h_abc123"}`)
	if code != http.StatusNotFound {
		t.Errorf("mallory naming alice's host = %d, want 404", code)
	}
	if strings.Contains(agent.last(), "alice-agent-token") {
		t.Fatalf("mallory used alice's agent token: %q", agent.last())
	}
}
