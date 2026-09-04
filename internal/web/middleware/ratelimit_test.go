package middleware

import (
	"fmt"
	"testing"
)

// The tracked-address map used to have no ceiling. Behind a proxy the address
// is taken from a header, so anyone could mint a new one per request and grow
// the map until the process died — no login required, and nothing in the logs
// but a rising memory graph.
func TestTrackedAddressesStayBounded(t *testing.T) {
	resetLimiterState()
	defer resetLimiterState()

	const attempts = maxClients * 2
	for i := 0; i < attempts; i++ {
		getLimiter(fmt.Sprintf("10.%d.%d.%d", i>>16&0xff, i>>8&0xff, i&0xff))
	}

	mu.Lock()
	tracked, ordered := len(clients), recent.Len()
	mu.Unlock()

	if tracked > maxClients {
		t.Errorf("%d addresses tracked after %d distinct callers; the cap of %d is not holding",
			tracked, attempts, maxClients)
	}
	// The map and the eviction order have to agree, or eviction starts removing
	// entries that are not there and the map grows again.
	if ordered != tracked {
		t.Errorf("map holds %d addresses but the eviction order holds %d", tracked, ordered)
	}
}

// Eviction must not lose the limiter of someone still calling: a returning
// caller keeps the bucket they were already spending.
func TestReturningCallerKeepsItsBucket(t *testing.T) {
	resetLimiterState()
	defer resetLimiterState()

	first := getLimiter("203.0.113.7")
	for i := 0; i < maxClients-1; i++ {
		getLimiter(fmt.Sprintf("10.%d.%d.%d", i>>16&0xff, i>>8&0xff, i&0xff))
		// Keep it in use, so it is never the oldest.
		getLimiter("203.0.113.7")
	}

	if again := getLimiter("203.0.113.7"); again != first {
		t.Error("an address in constant use was evicted and given a fresh bucket")
	}
}

func resetLimiterState() {
	mu.Lock()
	defer mu.Unlock()
	clients = make(map[string]*client)
	recent.Init()
}
