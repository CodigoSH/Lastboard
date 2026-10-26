package middleware

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"net"
	"net/http"
	"net/netip"
	"os"
	"strings"
	"time"
	"unicode"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/config"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

/* ---------------------------------------------------------------------------
 * Signing in through a proxy (forward-auth)
 *
 * A proxy in front of Lastboard that has already signed the person in says who
 * it is in a header; Lastboard believes it only from the proxy's own addresses,
 * and only for an account that already exists by that name. It never makes an
 * account and never changes what an account may do: the administrator decides
 * both, as always. The proxy is the sign-in, so nothing more is asked — not a
 * password, not a code.
 *
 * What it opens is an ordinary stored session, so the rest of the server needs
 * to know nothing about proxies: Active sessions lists it, and closing it ends it.
 * ------------------------------------------------------------------------ */

// proxySessionLife is how long a session opened by the proxy lasts. The proxy
// is asked again by every request anyway; this only bounds a cookie that
// outlives the proxy's own session.
const proxySessionLife = 24 * time.Hour

// maxProxyName bounds the header's value, in characters.
const maxProxyName = 128

// LoadAuthProxy reads signing in through a proxy from the environment. The
// server reads it once, at start; config.CheckEnvironment reports what was set
// and cannot be used.
func LoadAuthProxy() config.AuthProxy {
	p, _ := config.ReadAuthProxy(os.LookupEnv)
	return p
}

// FromAuthProxy says whether the request came from the trusted proxy — judged
// by the address that opened the connection, never by a header.
func FromAuthProxy(p config.AuthProxy, r *http.Request) bool {
	if !p.Enabled() {
		return false
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	addr, err := netip.ParseAddr(host)
	return err == nil && p.Trusts(addr)
}

// proxiedName is the user name the proxy says is signed in, or "".
func proxiedName(p config.AuthProxy, r *http.Request) string {
	if !FromAuthProxy(p, r) {
		return ""
	}
	name := strings.TrimSpace(r.Header.Get(p.Header))
	if name == "" || len([]rune(name)) > maxProxyName || strings.IndexFunc(name, unicode.IsControl) >= 0 {
		return ""
	}
	return name
}

// proxiedAccount is the account the proxy names, if one exists by that name.
func proxiedAccount(db *sql.DB, p config.AuthProxy, r *http.Request) (Session, int, bool) {
	name := proxiedName(p, r)
	if name == "" {
		return Session{}, 0, false
	}
	var (
		s          Session
		generation int
	)
	err := db.QueryRow(`SELECT id, username, role, password_version FROM users WHERE username = ?`, name).
		Scan(&s.ID, &s.Username, &s.Role, &generation)
	return s, generation, err == nil
}

// ProxyNamesAnAccount says whether the proxy signed this request in as an
// account that exists — what the sign-in page asks before showing itself.
func ProxyNamesAnAccount(db *sql.DB, p config.AuthProxy, r *http.Request) bool {
	_, _, ok := proxiedAccount(db, p, r)
	return ok
}

// startProxySession opens a stored session for the account the proxy named and
// hands the browser its cookies, as a sign-in does.
func startProxySession(w http.ResponseWriter, r *http.Request, db *sql.DB, secret []byte, s Session, generation int) (Session, error) {
	expiry := time.Now().Add(proxySessionLife)
	token, id, err := CreateSession(r.Context(), db, secret, r, NewSession{UserID: s.ID, Generation: generation, Expiry: expiry})
	if err != nil {
		return Session{}, err
	}
	SetSessionCookie(w, r, token, expiry)
	csrf := make([]byte, 32)
	if _, err := rand.Read(csrf); err != nil {
		return Session{}, err
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "csrf_token",
		Value:    hex.EncodeToString(csrf),
		Path:     "/",
		Expires:  expiry,
		HttpOnly: false,
		Secure:   util.IsSecureRequest(r),
		SameSite: http.SameSiteLaxMode,
	})
	s.SessionID = id
	return s, nil
}

// withSession is the request as the handlers see a signed-in one.
func withSession(r *http.Request, s Session) *http.Request {
	ctx := context.WithValue(r.Context(), userContextKey, s.Username)
	ctx = context.WithValue(ctx, userIDContextKey, s.ID)
	ctx = context.WithValue(ctx, sessionIDContextKey, s.SessionID)
	return r.WithContext(ctx)
}
