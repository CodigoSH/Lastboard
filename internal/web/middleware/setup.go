package middleware

import (
	"database/sql"
	"log/slog"
	"net/http"
	"strings"
	"sync/atomic"
)

var setupDone atomic.Bool

// SetupRequired checks if any users exist. If not, it redirects to /setup.
// Once setup is confirmed done, the result is cached in memory so no further
// DB queries are needed on every request.
func SetupRequired(db *sql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip check for setup page and static assets to avoid infinite loop
			if r.URL.Path == "/setup" ||
				strings.HasPrefix(r.URL.Path, "/dist/") ||
				strings.HasPrefix(r.URL.Path, "/styles/") {
				next.ServeHTTP(w, r)
				return
			}

			// Fast path: setup already confirmed done
			if setupDone.Load() {
				next.ServeHTTP(w, r)
				return
			}

			// Slow path: check DB
			var count int
			err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
			if err != nil {
				slog.Error("Error checking users count", "error", err)
				http.Error(w, "general.internal_error", http.StatusInternalServerError)
				return
			}

			if count == 0 {
				http.Redirect(w, r, "/setup", http.StatusFound)
				return
			}

			// Cache the result so future requests skip the DB query
			setupDone.Store(true)
			next.ServeHTTP(w, r)
		})
	}
}
