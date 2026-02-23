package middleware

import (
	"database/sql"
	"log/slog"
	"net/http"
	"strings"
)

// SetupRequired checks if any users exist. If not, it redirects to /setup.
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

			var count int
			err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
			if err != nil {
				slog.Error("Error checking users count", "error", err)
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				return
			}

			if count == 0 {
				http.Redirect(w, r, "/setup", http.StatusFound)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
