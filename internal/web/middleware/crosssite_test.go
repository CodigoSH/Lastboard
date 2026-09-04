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
