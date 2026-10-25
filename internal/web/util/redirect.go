package util

import (
	"net/http"
	"net/url"
	"strings"
)

// maxRedirects is how many hops a credentialed request follows before it stops
// and hands back the last answer. The standard client allows ten.
const maxRedirects = 5

// KeepToOrigin is the redirect policy of every client that sends a credential: the
// API widget's key, a telemetry source's header, a Gotify token, a Proxmox token,
// a Docker agent's token.
//
// Left to the standard policy, a redirect to another server takes the request
// there again. Go drops Authorization and Cookie when the host changes, but a
// header of any other name goes along unchanged — X-Api-Key, X-Gotify-Key,
// whatever a service calls its key — and a token a transport adds is added again
// on every hop. A service that answers with a redirect to somebody else's address,
// because it was misconfigured or because it was taken over, would collect the key.
//
// So a redirect is followed only to the origin the request was made to: the same
// host on the same port, or that host's https on its standard port when the
// address was plain http. Anywhere else, and past maxRedirects, the client stops
// and returns the redirect itself, so the caller sees a 3xx rather than an answer
// from somewhere it was never pointed at.
func KeepToOrigin(req *http.Request, via []*http.Request) error {
	if len(via) == 0 {
		return nil
	}
	if len(via) >= maxRedirects || !SameOrigin(via[0].URL, req.URL) {
		return http.ErrUseLastResponse
	}
	return nil
}

// SameOrigin reports whether a redirect from one address to another stays where
// the request was meant to go.
func SameOrigin(from, to *url.URL) bool {
	if from == nil || to == nil || !strings.EqualFold(from.Hostname(), to.Hostname()) {
		return false
	}
	switch {
	case from.Scheme == to.Scheme:
		return portOf(from) == portOf(to)
	case from.Scheme == "http" && to.Scheme == "https":
		// The one move a server makes for its own sake: from plain http to its
		// own https. Never the other way, which would send the key in the clear.
		return portOf(to) == "443"
	}
	return false
}

func portOf(u *url.URL) string {
	if p := u.Port(); p != "" {
		return p
	}
	if u.Scheme == "https" {
		return "443"
	}
	return "80"
}
