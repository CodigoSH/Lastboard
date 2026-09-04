package middleware

import (
	"context"
	"crypto/subtle"
	"database/sql"
	"net/http"
	"strings"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

type contextKey string

const (
	userContextKey     contextKey = "user"
	userIDContextKey   contextKey = "user_id"
	userRoleContextKey contextKey = "user_role"
)

// AuthRequired checks for a valid session cookie.
// If valid, it allows the request.
// If invalid, it redirects to /login for page requests, or returns 401 for API requests.
func AuthRequired(db *sql.DB, secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			// Skip check for Login page and static assets (and Setup)
			if r.URL.Path == "/login" || r.URL.Path == "/setup" ||
				strings.HasPrefix(r.URL.Path, "/dist/") ||
				strings.HasPrefix(r.URL.Path, "/styles/") ||
				r.URL.Path == "/api/login" ||
				r.URL.Path == "/api/setup" {
				next.ServeHTTP(w, r)
				return
			}

			// Check for Session Cookie
			cookie, err := r.Cookie("session_token")

			if err != nil || cookie.Value == "" {
				if strings.HasPrefix(r.URL.Path, "/api/") {
					http.Error(w, "Unauthorized", http.StatusUnauthorized)
					return
				}
				http.Redirect(w, r, "/login", http.StatusFound)
				return
			}

			payload, err := util.VerifyToken(cookie.Value, secret)
			username, tokenPasswordVersion := util.ParseSessionPayload(payload)
			if err != nil {
				if strings.HasPrefix(r.URL.Path, "/api/") {
					http.Error(w, "Unauthorized", http.StatusUnauthorized)
					return
				}
				http.Redirect(w, r, "/login", http.StatusFound)
				return
			}

			// CSRF check for state-changing methods
			if r.Method == http.MethodPost || r.Method == http.MethodPut ||
				r.Method == http.MethodPatch || r.Method == http.MethodDelete {
				csrfCookie, err := r.Cookie("csrf_token")
				csrfHeader := r.Header.Get("X-CSRF-Token")
				if err != nil || csrfCookie.Value == "" || csrfHeader == "" || subtle.ConstantTimeCompare([]byte(csrfCookie.Value), []byte(csrfHeader)) != 1 {
					http.Error(w, "Forbidden", http.StatusForbidden)
					return
				}
			}

			// Resolve the numeric user ID so handlers can scope queries without
			// an extra round-trip.  A missing row also covers the "account deleted
			// while session was still live" case.
			var userID int
			var userRole string
			var passwordVersion int
			if err := db.QueryRow("SELECT id, role, password_version FROM users WHERE username = ?", username).
				Scan(&userID, &userRole, &passwordVersion); err != nil {
				if strings.HasPrefix(r.URL.Path, "/api/") {
					http.Error(w, "Unauthorized", http.StatusUnauthorized)
					return
				}
				http.Redirect(w, r, "/login", http.StatusFound)
				return
			}

			// The generation the token was minted under has to still be current.
			// This is what makes changing a password end the sessions that were
			// open under the old one — until now the counter was incremented on
			// every change and read by nobody, so a stolen session survived the
			// one action a user takes to stop it.
			if tokenPasswordVersion != passwordVersion {
				if strings.HasPrefix(r.URL.Path, "/api/") {
					http.Error(w, "auth.session_expired", http.StatusUnauthorized)
					return
				}
				http.Redirect(w, r, "/login", http.StatusFound)
				return
			}

			ctx := context.WithValue(r.Context(), userContextKey, username)
			ctx = context.WithValue(ctx, userIDContextKey, userID)
			ctx = context.WithValue(ctx, userRoleContextKey, userRole)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserFromContext(r *http.Request) string {
	if u, ok := r.Context().Value(userContextKey).(string); ok {
		return u
	}
	return ""
}

func GetUserIDFromContext(r *http.Request) int {
	if id, ok := r.Context().Value(userIDContextKey).(int); ok {
		return id
	}
	return 0
}

func GetUserRoleFromContext(r *http.Request) string {
	if v, ok := r.Context().Value(userRoleContextKey).(string); ok {
		return v
	}
	return ""
}
