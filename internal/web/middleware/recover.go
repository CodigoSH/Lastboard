package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"
)

// Recover turns a panic into a 500 and a log line with enough context to find it.
//
// net/http already stops a panic from taking the process down, but what it does
// with it is unhelpful in both directions: the client gets a dropped connection
// rather than a status, and the only record is a stack on stderr with nothing
// saying which request produced it. Anything the handler was holding — an open
// transaction, a lock — is abandoned either way, so the point of catching it
// here is to leave a trail that says where to look.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			rec := recover()
			if rec == nil {
				return
			}
			// A client that hangs up mid-response makes the handler panic with
			// http.ErrAbortHandler on purpose; that is not a fault to report.
			if rec == http.ErrAbortHandler {
				panic(rec)
			}
			slog.Error("Handler panicked",
				"panic", rec,
				"method", r.Method,
				"path", r.URL.Path,
				"user", GetUserFromContext(r),
				"stack", string(debug.Stack()),
			)
			// Nothing may have been written yet, or a partial response may be on
			// the wire already. WriteHeader on a hijacked or already-started
			// response is a no-op with a log line of its own, which is fine.
			http.Error(w, "general.internal_error", http.StatusInternalServerError)
		}()
		next.ServeHTTP(w, r)
	})
}
