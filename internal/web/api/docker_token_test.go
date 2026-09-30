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
