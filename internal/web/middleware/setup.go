package middleware

import (
	"database/sql"
	"log"
	"net/http"
)

// SetupRequired checks if any users exist. If not, it redirects to /setup.
// This is a simple implementation. In a real app, you might inject a Service or Repository.
func SetupRequired(db *sql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip check for setup page and static assets to avoid infinite loop
			// Skip check for setup page and static assets to avoid infinite loop
			if r.URL.Path == "/setup" ||
				(len(r.URL.Path) > 5 && r.URL.Path[:6] == "/dist/") ||
				(len(r.URL.Path) > 7 && r.URL.Path[:8] == "/styles/") ||
				(len(r.URL.Path) > 4 && r.URL.Path[:5] == "/src/") {
				next.ServeHTTP(w, r)
				return
			}

			var count int
			err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
			if err != nil {
				log.Printf("Error checking users count: %v", err)
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
