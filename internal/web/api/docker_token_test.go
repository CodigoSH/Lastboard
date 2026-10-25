package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// TestAnAgentBehindHTTPSIsReachable.
//
// The guide suggests putting the agent behind a reverse proxy, which is HTTPS,
// and the Agent type used to speak plain HTTP whatever was typed. tls=1 — what
// the widget sends for an https:// address — now reaches it, with the token.
func TestAnAgentBehindHTTPSIsReachable(t *testing.T) {
	var got string
	agent := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[]`))
	}))
	defer agent.Close()
	addr := strings.TrimPrefix(agent.URL, "https://")

	if _, err := ListContainers("agent://" + addr + "?token=tls-token&tls=1"); err != nil {
		t.Fatalf("over HTTPS: %v", err)
	}
	if got != "Bearer tls-token" {
		t.Errorf("the agent got %q over HTTPS", got)
	}
	if _, err := ListContainers("agent://" + addr + "?token=tls-token"); err == nil {
		t.Error("without tls=1 the request went through: it is not asking HTTP")
	}
}

// TestARefusedTokenIsNamed. A wrong token used to read as "could not
// connect", which sends people to a firewall that is fine.
func TestARefusedTokenIsNamed(t *testing.T) {
	agent := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
	}))
	defer agent.Close()
	host := "agent://" + strings.TrimPrefix(agent.URL, "http://") + "?token=wrong"

	// The answer the containers route writes once it has resolved the host.
	rec := httptest.NewRecorder()
	NewDockerHandler(nil).writeContainers(rec, host)
	if msg := strings.TrimSpace(rec.Body.String()); msg != "docker.unauthorized" {
		t.Errorf("a refused token answered %d %q, want docker.unauthorized", rec.Code, msg)
	}

	if err := ContainerAction(host, "abc", "restart"); err != errDockerUnauthorized {
		t.Errorf("an action with a refused token gave %v", err)
	}
}

// TestAnAgentSaysWhichReleaseItRuns covers what the configuration screen
// shows beside an agent host: the version it reports, nothing from an agent
// too old to report one, and an error for anything that is not an answer.
func TestAnAgentSaysWhichReleaseItRuns(t *testing.T) {
	health := func(status int, body string) string {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/health" {
				t.Errorf("asked %s, want /health", r.URL.Path)
			}
			w.WriteHeader(status)
			_, _ = w.Write([]byte(body))
		}))
		t.Cleanup(srv.Close)
		return "agent://" + strings.TrimPrefix(srv.URL, "http://") + "?token=t"
	}

	if v, err := AgentVersion(health(200, `{"status":"ok","version":"v1.1.1"}`)); err != nil || v != "v1.1.1" {
		t.Errorf("current agent: %q, %v", v, err)
	}
	if v, err := AgentVersion(health(200, `{"status":"ok"}`)); err != nil || v != "" {
		t.Errorf("an agent from before v1.1.0: %q, %v; want empty and no error", v, err)
	}
	if _, err := AgentVersion(health(500, `oops`)); err == nil {
		t.Error("a 500 was taken as an answer")
	}
	if _, err := AgentVersion(health(200, `{"version":"`+strings.Repeat("9", 64)+`"}`)); err == nil {
		t.Error("a 64-character version was accepted")
	}
	// A plain Docker host that would answer /health is still not asked: the
	// version is an agent's, and only the guard can refuse here.
	plain := strings.Replace(health(200, `{"version":"v9.9.9"}`), "agent://", "tcp://", 1)
	plain = plain[:strings.Index(plain, "?")]
	if v, err := AgentVersion(plain); err == nil {
		t.Errorf("a plain Docker host was asked for an agent version and gave %q", v)
	}
}
