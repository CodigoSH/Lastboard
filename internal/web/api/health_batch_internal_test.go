package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// A hundred bookmarks used to mean a hundred sockets opened at once, from one
// page load, by one user — and the rate limiter allows a burst of those
// requests. The background scheduler was already bounded; this path was not.
func TestCheckHealthBatchProbesAreBounded(t *testing.T) {
	var live, peak int32

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		now := atomic.AddInt32(&live, 1)
		for {
			was := atomic.LoadInt32(&peak)
			if now <= was || atomic.CompareAndSwapInt32(&peak, was, now) {
				break
			}
		}
		// Long enough that everything admitted at once overlaps here.
		time.Sleep(60 * time.Millisecond)
		atomic.AddInt32(&live, -1)
	}))
	defer upstream.Close()

	urls := make([]string, 60)
	for i := range urls {
		urls[i] = fmt.Sprintf("%s/?n=%d", upstream.URL, i)
	}
	payload, err := json.Marshal(map[string]any{"urls": urls})
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/dashboard/health-batch", bytes.NewReader(payload))
	rec := httptest.NewRecorder()
	// The handler reads no database: the URLs come from the body.
	(&DashboardHandler{}).CheckHealthBatch(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("the probe never ran: %d", rec.Code)
	}
	if got := atomic.LoadInt32(&peak); got > healthBatchConcurrency {
		t.Errorf("%d probes ran at once for %d URLs; the limit is %d",
			got, len(urls), healthBatchConcurrency)
	}
	if atomic.LoadInt32(&peak) == 0 {
		t.Error("nothing was probed, so the measurement proves nothing")
	}
}

// What "up" means, for the status dot on a bookmark: an HTTP answer below 500, or
// failing that a TCP connection to the port (a service that is running and does
// not speak HTTP on it). Anything else is down — including an address that can
// never be probed.
func TestProbeURLSaysUpOrDown(t *testing.T) {
	ok := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer ok.Close()
	broken := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer broken.Close()
	closed := httptest.NewServer(http.NotFoundHandler())
	closedURL := closed.URL
	closed.Close()

	for name, tc := range map[string]struct{ url, want string }{
		"answers 200":                            {ok.URL, "up"},
		"answers 404 (a page that is not there)": {ok.URL + "/nope", "up"},
		"answers 500 but the port is open":       {broken.URL, "up"},
		"nothing listens":                        {closedURL, "down"},
		"not an http address":                    {"ftp://example.com", "down"},
		"not an address":                         {"::::", "down"},
		"a cloud metadata service":               {"http://169.254.169.254/", "down"},
	} {
		if got := probeURL(context.Background(), tc.url); got != tc.want {
			t.Errorf("%s: probeURL(%q) = %q, want %q", name, tc.url, got, tc.want)
		}
	}
}

// The single-URL check answers 503 for a service that is down. It set the
// content type after writing the status, which is too late: the header never
// went out and the body was sent as plain text.
func TestTheSingleHealthCheckAnswersJSONEvenWhenTheServiceIsDown(t *testing.T) {
	closed := httptest.NewServer(http.NotFoundHandler())
	closedURL := closed.URL
	closed.Close()

	for name, tc := range map[string]struct {
		url      string
		wantCode int
		want     string
	}{
		"down": {closedURL, http.StatusServiceUnavailable, `{"status":"down"}`},
		"up":   {httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {})).URL, http.StatusOK, `{"status":"up"}`},
	} {
		req := httptest.NewRequest(http.MethodGet, "/api/dashboard/health?url="+tc.url, nil)
		rec := httptest.NewRecorder()
		(&DashboardHandler{}).CheckHealth(rec, req)
		res := rec.Result()
		if res.StatusCode != tc.wantCode {
			t.Errorf("%s: status %d, want %d", name, res.StatusCode, tc.wantCode)
		}
		if ct := res.Header.Get("Content-Type"); ct != "application/json" {
			t.Errorf("%s: Content-Type = %q, want application/json", name, ct)
		}
		if body := strings.TrimSpace(rec.Body.String()); body != tc.want {
			t.Errorf("%s: body %q, want %q", name, body, tc.want)
		}
	}
}
