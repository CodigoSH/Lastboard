package util

import (
	"net/http"
	"net/url"
	"testing"
)

func mustURL(t *testing.T, raw string) *url.URL {
	t.Helper()
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatal(err)
	}
	return u
}

func TestSameOrigin(t *testing.T) {
	cases := []struct {
		from, to string
		want     bool
	}{
		{"http://nas.lan:8080/api", "http://nas.lan:8080/api/", true},
		{"http://NAS.lan/a", "http://nas.lan:80/b", true},
		{"https://nas.lan/a", "https://nas.lan:443/b", true},
		// A server moving itself to its own https is the one change allowed.
		{"http://nas.lan/a", "https://nas.lan/a", true},
		{"http://nas.lan:8080/a", "https://nas.lan:443/a", true},
		// Its https on another port is another service.
		{"http://nas.lan:8080/a", "https://nas.lan:8443/a", false},
		// Never from https down to plain http: the key would cross the network in the clear.
		{"https://nas.lan/a", "http://nas.lan/a", false},
		{"http://nas.lan:8080/a", "http://nas.lan:9090/a", false},
		{"http://nas.lan/a", "http://evil.example/a", false},
		{"http://nas.lan/a", "http://nas.lan.evil.example/a", false},
		{"http://127.0.0.1:8080/a", "http://localhost:8080/a", false},
		{"http://nas.lan/a", "ftp://nas.lan/a", false},
	}
	for _, c := range cases {
		if got := SameOrigin(mustURL(t, c.from), mustURL(t, c.to)); got != c.want {
			t.Errorf("SameOrigin(%s, %s) = %v, want %v", c.from, c.to, got, c.want)
		}
	}
	if SameOrigin(nil, mustURL(t, "http://a")) || SameOrigin(mustURL(t, "http://a"), nil) {
		t.Error("an absent address is never the same origin")
	}
}

func TestKeepToOrigin(t *testing.T) {
	req := func(raw string) *http.Request { return &http.Request{URL: mustURL(t, raw)} }
	start := req("http://nas.lan:8080/api")

	if err := KeepToOrigin(req("http://nas.lan:8080/api/"), []*http.Request{start}); err != nil {
		t.Errorf("a redirect on the same origin is followed, got %v", err)
	}
	if err := KeepToOrigin(req("http://elsewhere:8080/api"), []*http.Request{start}); err != http.ErrUseLastResponse {
		t.Errorf("a redirect to another host stops with the redirect itself, got %v", err)
	}
	// Measured against where the request was meant to go, not the hop before:
	// a chain that wanders off and back is still judged by its first address.
	hops := []*http.Request{start, req("http://nas.lan:8080/b")}
	if err := KeepToOrigin(req("http://other:8080/c"), hops); err != http.ErrUseLastResponse {
		t.Errorf("a later hop to another host is refused, got %v", err)
	}
	long := make([]*http.Request, maxRedirects)
	for i := range long {
		long[i] = start
	}
	if err := KeepToOrigin(req("http://nas.lan:8080/api"), long); err != http.ErrUseLastResponse {
		t.Errorf("past %d hops the client stops, got %v", maxRedirects, err)
	}
}
