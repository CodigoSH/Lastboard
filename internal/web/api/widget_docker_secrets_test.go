package api_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
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

// The agent token is in the secret store, the widget lists the host without it,
// and the server puts it on the request — for the list, the readings and the
// start/stop/restart.
func TestADockerHostTokenIsReadFromTheSecretStore(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "alice", "correcthorse", "admin")
	cookie := loginAndGetCookie(t, server, "alice", "correcthorse")
	agent := newRecordingAgent(t)
	addr := strings.TrimPrefix(agent.URL, "http://")

	res, _ := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 0, 0, 1, 1, ?)`,
		`{"widgetId":"docker","hosts":[{"id":"h_abc123","name":"nas","type":"agent","url":"`+addr+`"}]}`)
	wid, _ := res.LastInsertId()
	db.Exec(`INSERT INTO widget_secrets (item_id, name, value) VALUES (?, 'docker.h_abc123', 's3cret/+=')`, wid)

	host := `"agent://` + addr + `"`
	ref := `,"widget":` + itoa(wid) + `,"host_id":"h_abc123"`
	for name, c := range map[string]struct{ path, body string }{
		"containers": {"/api/docker/containers", `{"host":` + host + ref + `}`},
		"stats":      {"/api/docker/stats", `{"host":` + host + `,"ids":["abcdef1234567890"]` + ref + `}`},
		"action":     {"/api/docker/action", `{"host":` + host + `,"id":"abcdef1234567890","action":"restart"` + ref + `}`},
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

	// A host that arrives with its own token — typed in a form, or from a
	// browser on the previous bundle — keeps working and is not overridden.
	secretReq(t, "POST", server.URL+"/api/docker/containers", cookie,
		`{"host":"agent://`+addr+`?token=typed-now"`+ref+`}`)
	if !strings.HasSuffix(agent.last(), "Bearer typed-now") {
		t.Errorf("a token that came with the host was replaced: %q", agent.last())
	}

	// A different host id has no secret: no token is made up.
	secretReq(t, "POST", server.URL+"/api/docker/containers", cookie,
		`{"host":`+host+`,"widget":`+itoa(wid)+`,"host_id":"h_other"}`)
	if strings.Contains(agent.last(), "s3cret") {
		t.Errorf("another host's token was used: %q", agent.last())
	}
}

func TestADockerHostTokenStaysWithItsOwner(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "alice", "correcthorse", "admin")
	createUser(t, db, "mallory", "correcthorse", "user")
	agent := newRecordingAgent(t)
	addr := strings.TrimPrefix(agent.URL, "http://")
	res, _ := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 0, 0, 1, 1, '{"widgetId":"docker"}')`)
	wid, _ := res.LastInsertId()
	db.Exec(`INSERT INTO widget_secrets (item_id, name, value) VALUES (?, 'docker.h_abc123', 'alice-agent-token')`, wid)

	mallory := loginAndGetCookie(t, server, "mallory", "correcthorse")
	secretReq(t, "POST", server.URL+"/api/docker/containers", mallory,
		`{"host":"agent://`+addr+`","widget":`+itoa(wid)+`,"host_id":"h_abc123"}`)
	if strings.Contains(agent.last(), "alice-agent-token") {
		t.Fatalf("mallory used alice's agent token: %q", agent.last())
	}
}
