package util

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func request(t *testing.T, peer, forwarded string) *http.Request {
	t.Helper()
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.RemoteAddr = peer
	if forwarded != "" {
		r.Header.Set("X-Forwarded-For", forwarded)
	}
	return r
}

func TestClientIP(t *testing.T) {
	cases := []struct {
		name       string
		trustProxy string
		hops       string
		peer       string
		forwarded  string
		want       string
	}{
		{
			name: "no proxy configured, the header is ignored entirely",
			peer: "203.0.113.7:5555", forwarded: "10.9.9.9", want: "203.0.113.7",
		},
		{
			name:       "one proxy appends the real client after what the caller sent",
			trustProxy: "true", peer: "127.0.0.1:5555",
			forwarded: "10.1.2.3, 203.0.113.7", want: "203.0.113.7",
		},
		{
			name:       "one proxy, nothing forged",
			trustProxy: "true", peer: "127.0.0.1:5555",
			forwarded: "203.0.113.7", want: "203.0.113.7",
		},
		{
			name:       "two declared proxies: the client sits two places from the right",
			trustProxy: "true", hops: "2", peer: "127.0.0.1:5555",
			forwarded: "203.0.113.7, 172.16.0.1", want: "203.0.113.7",
		},
		{
			name:       "chain shorter than declared: fall back to the peer, not to a forged entry",
			trustProxy: "true", hops: "3", peer: "127.0.0.1:5555",
			forwarded: "10.1.2.3", want: "127.0.0.1",
		},
		{
			name:       "an entry that is not an address is not trusted",
			trustProxy: "true", peer: "127.0.0.1:5555",
			forwarded: "10.1.2.3, not-an-ip", want: "127.0.0.1",
		},
		{
			name:       "empty header behind a proxy",
			trustProxy: "true", peer: "127.0.0.1:5555", want: "127.0.0.1",
		},
		{
			name:       "an unparseable hop count means one hop",
			trustProxy: "true", hops: "banana", peer: "127.0.0.1:5555",
			forwarded: "10.1.2.3, 203.0.113.7", want: "203.0.113.7",
		},
		{
			name: "RemoteAddr without a port is still usable",
			peer: "203.0.113.7", want: "203.0.113.7",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Setenv("TRUST_PROXY", c.trustProxy)
			t.Setenv("TRUST_PROXY_HOPS", c.hops)
			if got := ClientIP(request(t, c.peer, c.forwarded)); got != c.want {
				t.Errorf("got %q, want %q", got, c.want)
			}
		})
	}
}
