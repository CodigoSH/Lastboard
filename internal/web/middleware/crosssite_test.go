package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

// Logging in is the one write with no session behind it, so the double-submit
// token has nothing to compare. Without this, a page on another site can POST
// credentials and sign the visitor into an account the attacker controls.
func TestRefuseCrossSiteGuardsTheRoutesThatHaveNoTokenYet(t *testing.T) {
	cases := []struct {
		fetchSite string
		method    string
		want      int
	}{
		{"cross-site", http.MethodPost, http.StatusForbidden},
		{"same-site", http.MethodPost, http.StatusForbidden},
		{"same-origin", http.MethodPost, http.StatusOK},
		{"none", http.MethodPost, http.StatusOK},
		// No header at all: an older browser, curl, someone's script.
		{"", http.MethodPost, http.StatusOK},
		// Reads are not state-changing and are never refused.
		{"cross-site", http.MethodGet, http.StatusOK},
	}

	for _, c := range cases {
		reached := false
		h := middleware.RefuseCrossSite(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			reached = true
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(c.method, "/api/login", nil)
		if c.fetchSite != "" {
			req.Header.Set("Sec-Fetch-Site", c.fetchSite)
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)

		if w.Code != c.want {
			t.Errorf("%s reported as %q got %d, want %d", c.method, c.fetchSite, w.Code, c.want)
		}
		if reached != (c.want == http.StatusOK) {
			t.Errorf("%s reported as %q: handler reached=%v", c.method, c.fetchSite, reached)
		}
	}
}

// A browser too old to send Sec-Fetch-Site still sends Origin on a cross-origin
// write, and the page cannot choose it. Without Sec-Fetch-Site that header decides.
func TestWithoutFetchMetadataTheOriginDecides(t *testing.T) {
	cases := []struct {
		name      string
		host      string
		origin    string
		forwarded string
		want      int
	}{
		{"curl or a script, no Origin", "lastboard.lan", "", "", http.StatusOK},
		{"same origin", "lastboard.lan", "http://lastboard.lan", "", http.StatusOK},
		{"same origin with a port", "10.0.0.5:8080", "http://10.0.0.5:8080", "", http.StatusOK},
		{"host names differ only in case", "Lastboard.lan", "https://lastboard.LAN", "", http.StatusOK},
		{"a proxy rewrote Host", "127.0.0.1:8080", "https://dash.example.com", "dash.example.com", http.StatusOK},
		{"another site", "lastboard.lan", "https://evil.example", "", http.StatusForbidden},
		{"same host, another port", "lastboard.lan:8080", "http://lastboard.lan:9090", "", http.StatusForbidden},
		{"a look-alike host", "lastboard.lan", "http://lastboard.lan.evil.example", "", http.StatusForbidden},
		{"opaque origin", "lastboard.lan", "null", "", http.StatusForbidden},
		{"an Origin that is not an address", "lastboard.lan", "::not a url", "", http.StatusForbidden},
		{"another site, through a proxy", "127.0.0.1:8080", "https://evil.example", "dash.example.com", http.StatusForbidden},
	}
	for _, c := range cases {
		reached := false
		h := middleware.RefuseCrossSite(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			reached = true
			w.WriteHeader(http.StatusOK)
		}))
		req := httptest.NewRequest(http.MethodPost, "/api/login", nil)
		req.Host = c.host
		if c.origin != "" {
			req.Header.Set("Origin", c.origin)
		}
		if c.forwarded != "" {
			req.Header.Set("X-Forwarded-Host", c.forwarded)
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)
		if w.Code != c.want || reached != (c.want == http.StatusOK) {
			t.Errorf("%s: got %d (handler reached=%v), want %d", c.name, w.Code, reached, c.want)
		}
	}

	// Sec-Fetch-Site, when present, still has the last word: a same-origin
	// request from behind a proxy that leaves Origin and Host disagreeing passes.
	req := httptest.NewRequest(http.MethodPost, "/api/login", nil)
	req.Host = "127.0.0.1:8080"
	req.Header.Set("Origin", "https://dash.example.com")
	req.Header.Set("Sec-Fetch-Site", "same-origin")
	if middleware.IsCrossSiteWrite(req) {
		t.Error("a request the browser calls same-origin is not refused for its Origin")
	}
}
