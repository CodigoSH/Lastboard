package middleware

import (
	"context"
	"database/sql"
	"encoding/base64"
	"net/http"
	"strings"
)

// AuthRequired checks for a valid session cookie.
// If valid, it allows the request.
// If invalid, it redirects to /login for page requests, or returns 401 for API requests.
func AuthRequired(db *sql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			// 1. Skip check for Login page and static assets (and Setup)
			if r.URL.Path == "/login" || r.URL.Path == "/setup" ||
				strings.HasPrefix(r.URL.Path, "/dist/") ||
				strings.HasPrefix(r.URL.Path, "/styles/") ||
				strings.HasPrefix(r.URL.Path, "/src/") ||
				// Allow Login API
				r.URL.Path == "/api/login" ||
				// Allow Setup API
				r.URL.Path == "/api/setup" {
				next.ServeHTTP(w, r)
				return
			}

			// 2. Check for Session Cookie
			cookie, err := r.Cookie("session_token")

			if err != nil || cookie.Value == "" {
				if strings.HasPrefix(r.URL.Path, "/api/") {
					http.Error(w, "Unauthorized", http.StatusUnauthorized)
					return
				}
				http.Redirect(w, r, "/login", http.StatusFound)
				return
			}

			// Decode Username
			usernameBytes, err := base64.StdEncoding.DecodeString(cookie.Value)
			if err != nil {
				// Invalid cookie
				http.Redirect(w, r, "/login", http.StatusFound)
				return
			}
			username := string(usernameBytes)

			// Inject into Context
			ctx := context.WithValue(r.Context(), "user", username)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserFromContext(r *http.Request) string {
	if u, ok := r.Context().Value("user").(string); ok {
		return u
	}
	return ""
}
