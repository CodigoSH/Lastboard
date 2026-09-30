package api

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
)

// TestTheAgentTokenTravelsInTheBody.
//
// The widget used to put the host — and with it the agent's token — in the
// query string, which a reverse proxy in front of Lastboard writes to its
// access log. It now posts it. This checks the posted host still reaches the
// agent with its token, for both the list and the stats.
func TestTheAgentTokenTravelsInTheBody(t *testing.T) {
	var mu sync.Mutex
	var seen []string
	agent := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		seen = append(seen, r.URL.Path+" "+r.Header.Get("Authorization"))
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		if strings.HasSuffix(r.URL.Path, "/stats") {
			_, _ = w.Write([]byte(`{"cpu_stats":{},"precpu_stats":{},"memory_stats":{}}`))
			return
		}
		_, _ = w.Write([]byte(`[{"Id":"abcdef1234567890","Names":["/web"],"Image":"nginx","State":"running"}]`))
	}))
	defer agent.Close()

	host := "agent://" + strings.TrimPrefix(agent.URL, "http://") + "?token=" + url.QueryEscape("s3cret/+=")
	h := NewDockerHandler(nil)

	for _, c := range []struct {
		name string
		call http.HandlerFunc
		body string
	}{
		{"containers", h.ListContainersFor, `{"host":` + quote(host) + `}`},
		{"stats", h.StatsFor, `{"host":` + quote(host) + `,"ids":["abcdef1234567890"]}`},
	} {
		req := httptest.NewRequest(http.MethodPost, "/api/docker/"+c.name, strings.NewReader(c.body))
		rec := httptest.NewRecorder()
		c.call(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s: %d %s", c.name, rec.Code, rec.Body.String())
		}
		if strings.Contains(req.URL.String(), "s3cret") {
			t.Errorf("%s: the token is in the request URL", c.name)
		}
	}

	mu.Lock()
	defer mu.Unlock()
	if len(seen) < 2 {
		t.Fatalf("the agent was asked %d times, want a list and a stats call: %v", len(seen), seen)
	}
	for _, s := range seen {
		if !strings.HasSuffix(s, "Bearer s3cret/+=") {
			t.Errorf("the agent got %q, want the token intact", s)
		}
	}
}

func quote(s string) string {
	return `"` + strings.ReplaceAll(s, `"`, `\"`) + `"`
}

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

	rec := httptest.NewRecorder()
	NewDockerHandler(nil).ListContainersFor(rec, httptest.NewRequest(http.MethodPost, "/api/docker/containers",
		strings.NewReader(`{"host":`+quote(host)+`}`)))
	if msg := strings.TrimSpace(rec.Body.String()); msg != "docker.unauthorized" {
		t.Errorf("a refused token answered %d %q, want docker.unauthorized", rec.Code, msg)
	}

	if err := ContainerAction(host, "abc", "restart"); err != errDockerUnauthorized {
		t.Errorf("an action with a refused token gave %v", err)
	}
}
