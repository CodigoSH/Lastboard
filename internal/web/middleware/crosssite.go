package middleware

import (
	"net/http"
	"net/url"
	"strings"
)

// RefuseCrossSite rejects a state-changing request the browser reports as
// coming from another site.
//
// The double-submit token defends every authenticated route, but it needs a
// session to compare against, so the two routes that create one — logging in
// and the first-run setup — have nothing to check. That leaves login CSRF: a
// page on another site can POST credentials and quietly sign the visitor into
// an account the attacker controls, and from then on everything they save goes
// somewhere they can read.
//
// Sec-Fetch-Site is written by the browser from the real origins and cannot be
// set by the page making the request. Absent — an older browser, curl, a
// script — the Origin header decides instead: see originIsElsewhere.
func RefuseCrossSite(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if IsCrossSiteWrite(r) {
			http.Error(w, "error.forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// IsCrossSiteWrite reports whether this is a state-changing request the browser
// says came from somewhere other than this exact origin.
//
// "same-site" counts as elsewhere: a subdomain is a different origin, and the
// whole point of the check is that it holds where a shared cookie jar does not.
func IsCrossSiteWrite(r *http.Request) bool {
	switch r.Method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
	default:
		return false
	}
	switch r.Header.Get("Sec-Fetch-Site") {
	case "cross-site", "same-site":
		return true
	case "":
		return originIsElsewhere(r)
	}
	return false
}

// originIsElsewhere reports whether a request without Sec-Fetch-Site still says,
// through Origin, that a page on another site sent it.
//
// A browser too old for Sec-Fetch-Site still sends Origin on a cross-origin POST,
// and a page cannot choose its value. Without this, such a browser was the one
// case where the login and the first-run setup — the two writes that have no
// session token yet — took a write from another site at its word.
//
// No Origin at all is curl or a script, and passes as before. "null" is an
// opaque origin — a sandboxed frame, a file opened from disk — which is never
// this application. Otherwise the origin's host must be the host the request was
// made to: Host, or X-Forwarded-Host when a proxy in front rewrote Host. A page
// cannot add X-Forwarded-Host to a form post, and a script that tries is stopped
// by the browser's own preflight, so accepting it lets nobody in.
func originIsElsewhere(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return false
	}
	if origin == "null" {
		return true
	}
	u, err := url.Parse(origin)
	if err != nil || u.Host == "" {
		return true
	}
	if strings.EqualFold(u.Host, r.Host) {
		return false
	}
	forwarded := strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-Host"), ",")[0])
	return forwarded == "" || !strings.EqualFold(u.Host, forwarded)
}
