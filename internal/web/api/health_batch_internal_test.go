package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
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
