package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// A pair of servers for following a credential through a redirect. The first
// answers every request by sending it to the second, under another host name
// ("localhost" instead of the "127.0.0.1" it was asked on), which is what a
// redirect to somebody else's server looks like to the client. The second writes
// down every request it gets, headers included. "/same" redirects on the first
// server itself, to "/ok", which answers a small JSON document.
type redirectPair struct {
	first, second *httptest.Server
	mu            sync.Mutex
	reached       []http.Header
	firstAuth     []string
}

func newRedirectPair(t *testing.T) *redirectPair {
	t.Helper()
	p := &redirectPair{}
	p.second = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p.mu.Lock()
		p.reached = append(p.reached, r.Header.Clone())
		p.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"v":2}`))
	}))
	elsewhere := strings.Replace(p.second.URL, "127.0.0.1", "localhost", 1)
	p.first = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p.mu.Lock()
		p.firstAuth = append(p.firstAuth, r.Header.Get("Authorization"))
		p.mu.Unlock()
		switch r.URL.Path {
		case "/same":
			http.Redirect(w, r, "/ok", http.StatusFound)
		case "/ok":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"v":1}`))
		default:
			http.Redirect(w, r, elsewhere+r.URL.Path, http.StatusFound)
		}
	}))
	t.Cleanup(func() { p.first.Close(); p.second.Close() })
	return p
}

// leaked says what reached the second server, if anything did.
func (p *redirectPair) leaked(t *testing.T, what string) {
	t.Helper()
	p.mu.Lock()
	defer p.mu.Unlock()
	if len(p.reached) > 0 {
		t.Errorf("%s: a redirect to another host was followed, and it received %v", what, p.reached[0])
	}
}

func TestTheAPIWidgetKeyDoesNotFollowARedirectElsewhere(t *testing.T) {
	p := newRedirectPair(t)
	rec := httptest.NewRecorder()
	serveAPIFetch(rec, httptest.NewRequest(http.MethodPost, "/api/widget/fetch", nil), apiFetchInput{
		URL:     p.first.URL + "/leave",
		Headers: map[string]string{"X-Api-Key": "the-key", "X-Token": "the-key"},
		Paths:   []string{"v"},
	})
	p.leaked(t, "API widget")
	if !strings.Contains(rec.Body.String(), `"status_code":302`) {
		t.Errorf("the widget should see the redirect it was not allowed to follow, got %s", rec.Body.String())
	}
}

// Following a redirect on the same server is what the widget did before, and keeps doing.
func TestTheAPIWidgetStillFollowsARedirectOnItsOwnServer(t *testing.T) {
	p := newRedirectPair(t)
	rec := httptest.NewRecorder()
	serveAPIFetch(rec, httptest.NewRequest(http.MethodPost, "/api/widget/fetch", nil), apiFetchInput{
		URL:     p.first.URL + "/same",
		Headers: map[string]string{"X-Api-Key": "the-key"},
		Paths:   []string{"v"},
	})
	if !strings.Contains(rec.Body.String(), `"v":1`) {
		t.Errorf("a redirect on the same server should be followed to its answer, got %s", rec.Body.String())
	}
}

func TestATelemetryKeyDoesNotFollowARedirectElsewhere(t *testing.T) {
	p := newRedirectPair(t)
	_, _ = readCustom(context.Background(), p.first.URL+"/stats", remoteConfig{
		Source: "custom", HeaderName: "X-Stats-Key", CPUPath: "v",
	}, "the-key")
	p.leaked(t, "telemetry")
}

func TestAGotifyKeyDoesNotFollowARedirectElsewhere(t *testing.T) {
	p := newRedirectPair(t)
	_ = sendGotify(context.Background(), notifyConfig{Enabled: true, Type: "gotify", URL: p.first.URL, Token: "the-key"}, "svc", "down")
	p.leaked(t, "Gotify alert")
}

func TestADockerAgentTokenDoesNotFollowARedirectElsewhere(t *testing.T) {
	p := newRedirectPair(t)
	host := strings.TrimPrefix(p.first.URL, "http://")
	_, _ = ListContainers("agent://" + host + "?token=the-token")
	p.leaked(t, "Docker agent")
	// The token still reaches the agent it belongs to: without this the test
	// above would pass for a client that never sent it at all.
	p.mu.Lock()
	defer p.mu.Unlock()
	if len(p.firstAuth) == 0 || p.firstAuth[0] != "Bearer the-token" {
		t.Errorf("the agent's own host should get its token, got %q", p.firstAuth)
	}
}

type recordingTransport struct{ got *http.Request }

func (r *recordingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	r.got = req
	return &http.Response{StatusCode: http.StatusNoContent, Body: http.NoBody, Request: req}, nil
}

// The transport is the second line: whatever the client's policy, it only puts
// the token on requests to the agent's own host.
func TestTheAgentTransportOnlyGivesTheTokenToItsOwnHost(t *testing.T) {
	rec := &recordingTransport{}
	tr := &agentTransport{token: "the-token", host: "agent.lan", transport: rec}

	for _, c := range []struct {
		url  string
		want string
	}{
		{"http://agent.lan:9876/containers/json", "Bearer the-token"},
		{"http://AGENT.lan:9876/x", "Bearer the-token"},
		{"http://elsewhere.lan:9876/containers/json", ""},
		{"http://agent.lan.elsewhere:9876/x", ""},
	} {
		req := httptest.NewRequest(http.MethodGet, c.url, nil)
		if _, err := tr.RoundTrip(req); err != nil {
			t.Fatal(err)
		}
		if got := rec.got.Header.Get("Authorization"); got != c.want {
			t.Errorf("%s: Authorization = %q, want %q", c.url, got, c.want)
		}
	}
}
