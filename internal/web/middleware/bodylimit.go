package middleware

import "net/http"

// maxRequestBody is the ceiling for any request body, applied to every route.
//
// It sits above every legitimate upload — the largest is a backup restore at
// 10 MiB — so it never interferes with a handler that declares its own, much
// tighter, limit. It exists for the ones that forget: without it a handler that
// decodes a body with no cap will read whatever the caller sends, for as long
// as they care to keep sending it.
//
// A handler needing something different still says so itself with
// http.MaxBytesReader; the smaller of the two applies, which is the useful way
// round. Raising a route above this ceiling means raising the ceiling.
const maxRequestBody = 16 << 20 // 16 MiB

// LimitBody caps the request body of every route. It is a backstop, not a
// substitute for a handler stating what it is willing to accept.
func LimitBody(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Body != nil && r.Body != http.NoBody {
			r.Body = http.MaxBytesReader(w, r.Body, maxRequestBody)
		}
		next.ServeHTTP(w, r)
	})
}
