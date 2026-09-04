package util

import (
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
)

// ClientIP returns the address a request should be attributed to, for the
// login lockout and the rate limiter.
//
// Behind a proxy the peer address is the proxy's, identical for everyone, so
// X-Forwarded-For is read instead — but only the part of it we have grounds to
// believe. A proxy does not replace that header, it appends to it: nginx's
// $proxy_add_x_forwarded_for adds the peer to whatever the client already sent.
// So the leftmost entry is written by the caller, who can put anything there
// and get a fresh lockout counter for every attempt. The rightmost entry is the
// one our own proxy appended.
//
// With more than one proxy in front, set TRUST_PROXY_HOPS to how many there
// are, and the entry that many places from the right is used. If the header is
// shorter than that, the chain is not what was declared and the peer address is
// used instead.
func ClientIP(r *http.Request) string {
	peer, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		peer = r.RemoteAddr
	}

	if os.Getenv("TRUST_PROXY") != "true" {
		return peer
	}

	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded == "" {
		return peer
	}

	parts := strings.Split(forwarded, ",")
	index := len(parts) - trustedProxyHops()
	if index < 0 {
		return peer
	}

	candidate := strings.TrimSpace(parts[index])
	if net.ParseIP(candidate) == nil {
		return peer
	}
	return candidate
}

// trustedProxyHops is how many proxies sit in front of us. One is the normal
// case; anything unparseable or below one is treated as that.
func trustedProxyHops() int {
	if raw := os.Getenv("TRUST_PROXY_HOPS"); raw != "" {
		if hops, err := strconv.Atoi(raw); err == nil && hops >= 1 {
			return hops
		}
	}
	return 1
}
