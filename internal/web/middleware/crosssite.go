package middleware

import "net/http"

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
// script — the request passes, so nothing that works today stops working.
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
	}
	return false
}
