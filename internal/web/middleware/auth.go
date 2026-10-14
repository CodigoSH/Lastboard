package middleware

import (
	"context"
	"crypto/subtle"
	"database/sql"
	"errors"
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

// Why a cookie did not become an account.
var (
	// ErrNoSession: there is no session cookie at all.
	ErrNoSession = errors.New("no session")
	// ErrInvalidSession: the cookie is not ours, has run out, or names an
	// account that no longer exists.
	ErrInvalidSession = errors.New("invalid session")
	// ErrSessionExpired: the account exists but its password has changed since
	// this session was minted, which ends it.
	ErrSessionExpired = errors.New("session expired")
)

// Session is the account a valid cookie belongs to.
type Session struct {
	ID       int
	Username string
	Role     string
}

// lookupSession turns a verified token payload into the account it belongs to,
// and refuses it if the password has changed since it was minted.
//
// A payload that names an id finds the account by id. One minted before sessions
// carried an id names the account by name, as it always did.
func lookupSession(db *sql.DB, payload string) (Session, error) {
	id, name, tokenVersion := util.ParseSession(payload)

	var (
		s       Session
		version int
		err     error
	)
	if id > 0 {
		err = db.QueryRow("SELECT id, username, role, password_version FROM users WHERE id = ?", id).
			Scan(&s.ID, &s.Username, &s.Role, &version)
	} else {
		err = db.QueryRow("SELECT id, username, role, password_version FROM users WHERE username = ?", name).
			Scan(&s.ID, &s.Username, &s.Role, &version)
	}
	if err != nil {
		return Session{}, ErrInvalidSession
	}
	// The generation the token was minted under has to still be current. This
	// is what makes changing a password end the sessions that were open under
	// the old one.
	if tokenVersion != version {
		return Session{}, ErrSessionExpired
	}
	return s, nil
}

// ResolveSession is the one place a request's cookie becomes an account. Every
// page that decides what to do with someone who "has a session" has to ask this
// and not the signature alone: a cookie can be perfectly signed and belong to a
// password that has since changed, and treating it as a login sends the person
// round a loop between the login page and the app.
func ResolveSession(db *sql.DB, secret []byte, r *http.Request) (Session, error) {
	cookie, err := r.Cookie("session_token")
	if err != nil || cookie.Value == "" {
		return Session{}, ErrNoSession
	}
	payload, err := util.VerifyToken(cookie.Value, secret)
	if err != nil {
		return Session{}, ErrInvalidSession
	}
	return lookupSession(db, payload)
}

// AuthRequired checks for a valid session cookie.
// If valid, it allows the request.
// If invalid, it redirects to /login for page requests, or returns 401 for API requests.
//
// It has no list of public paths, and must not grow one. A route is public by
// being registered without this middleware, which is a decision visible where
// the route is declared. The list that used to live here also let anything
// under /dist/ or /styles/ through — including paths with no file behind them,
// which fall back to the application shell — so an unauthenticated caller got
// the page by asking for an asset that did not exist.
func AuthRequired(db *sql.DB, secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			// Check for Session Cookie
			// What an unauthenticated request gets: the API says so, a page goes
			// to the login screen.
			deny := func(apiMessage string) {
				if strings.HasPrefix(r.URL.Path, "/api/") {
					http.Error(w, apiMessage, http.StatusUnauthorized)
					return
				}
				http.Redirect(w, r, "/login", http.StatusFound)
			}

			cookie, err := r.Cookie("session_token")
			if err != nil || cookie.Value == "" {
				deny("auth.unauthorized")
				return
			}
			payload, err := util.VerifyToken(cookie.Value, secret)
			if err != nil {
				deny("auth.unauthorized")
				return
			}

			// CSRF check for state-changing methods
			if r.Method == http.MethodPost || r.Method == http.MethodPut ||
				r.Method == http.MethodPatch || r.Method == http.MethodDelete {

				// A write from another site is refused before the token is
				// even looked at — see IsCrossSiteWrite for why the browser is
				// the one party here that cannot be lied to.
				if IsCrossSiteWrite(r) {
					http.Error(w, "error.forbidden", http.StatusForbidden)
					return
				}

				csrfCookie, err := r.Cookie("csrf_token")
				csrfHeader := r.Header.Get("X-CSRF-Token")
				if err != nil || csrfCookie.Value == "" || csrfHeader == "" || subtle.ConstantTimeCompare([]byte(csrfCookie.Value), []byte(csrfHeader)) != 1 {
					http.Error(w, "error.forbidden", http.StatusForbidden)
					return
				}
			}

			// The account the session belongs to, so handlers can scope queries
			// without another round-trip. An account deleted while its session was
			// still live, or a password changed since, ends it here.
			session, err := lookupSession(db, payload)
			if err != nil {
				if errors.Is(err, ErrSessionExpired) {
					deny("auth.session_expired")
				} else {
					deny("auth.unauthorized")
				}
				return
			}
			username, userID, userRole := session.Username, session.ID, session.Role

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
