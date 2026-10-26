package middleware

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

/* ---------------------------------------------------------------------------
 * Sessions live on the server
 *
 * A session cookie carries a random id, signed. The server keeps the hash of
 * that id, the account, and when the session began, was last used and runs out,
 * so a session can be listed, and closed from anywhere for good.
 *
 * Cookies minted before this — signed account ids, valid for up to a month —
 * still work: the first time one is used it becomes a row like any other, and
 * the browser is handed a cookie of the new kind. Its id is derived from the old
 * cookie, so the requests a page sends at once all land on one row, and once
 * that row is closed the old cookie cannot open it again.
 * ------------------------------------------------------------------------ */

// sessionPrefix marks a payload that names a stored session. It cannot begin a
// username ([A-Za-z0-9_-]) nor the "#" of an account id, so the three forms
// never read as one another.
const sessionPrefix = "$"

// touchEvery is how stale last_seen may get before a request writes it again:
// often enough to tell a person which device they used today, rarely enough
// not to write on every request a page makes.
const touchEvery = time.Minute

// maxUserAgent bounds what is kept of the User-Agent header, in characters.
const maxUserAgent = 300

func sessionPayload(sid []byte) string { return sessionPrefix + hex.EncodeToString(sid) }

func parseSessionPayload(payload string) ([]byte, bool) {
	rest, ok := strings.CutPrefix(payload, sessionPrefix)
	if !ok {
		return nil, false
	}
	sid, err := hex.DecodeString(rest)
	if err != nil || len(sid) != 32 {
		return nil, false
	}
	return sid, true
}

func sessionHash(sid []byte) string {
	sum := sha256.Sum256(sid)
	return hex.EncodeToString(sum[:])
}

// legacySessionID is the id a cookie from before sessions were stored becomes.
// It is derived, not drawn, so the same old cookie always lands on the same row.
func legacySessionID(secret []byte, cookie string) []byte {
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte("legacy-session:" + cookie))
	return mac.Sum(nil)
}

// NewSession is what a sign-in records.
type NewSession struct {
	UserID     int
	Generation int
	Expiry     time.Time
	Remember   bool
}

// CreateSession stores a new session for a sign-in and returns the cookie value
// that carries it, and the session's id.
func CreateSession(ctx context.Context, db *sql.DB, secret []byte, r *http.Request, n NewSession) (string, int64, error) {
	sid := make([]byte, 32)
	if _, err := rand.Read(sid); err != nil {
		return "", 0, err
	}
	res, err := insertSession(ctx, db, sid, n, r, false)
	if err != nil {
		return "", 0, err
	}
	id, _ := res.LastInsertId()
	return util.SignToken(sessionPayload(sid), secret, n.Expiry), id, nil
}

func insertSession(ctx context.Context, db *sql.DB, sid []byte, n NewSession, r *http.Request, ifAbsent bool) (sql.Result, error) {
	now := time.Now().Unix()
	verb := "INSERT"
	if ifAbsent {
		verb = "INSERT OR IGNORE"
	}
	remember := 0
	if n.Remember {
		remember = 1
	}
	return db.ExecContext(ctx, verb+` INTO sessions
		(token_hash, user_id, generation, created_at, last_seen, expires_at, remember, user_agent, ip)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		sessionHash(sid), n.UserID, n.Generation, now, now, n.Expiry.Unix(), remember, userAgentOf(r), util.ClientIP(r))
}

func userAgentOf(r *http.Request) string {
	ua := []rune(r.UserAgent())
	if len(ua) > maxUserAgent {
		ua = ua[:maxUserAgent]
	}
	return string(ua)
}

// storedSession reads the session a new-kind payload names.
func storedSession(db *sql.DB, sid []byte) (Session, error) {
	var (
		s                   Session
		generation, version int
		expiresAt, lastSeen int64
		revoked             int
	)
	err := db.QueryRow(`SELECT s.id, s.generation, s.expires_at, s.last_seen, s.revoked,
			u.id, u.username, u.role, u.password_version
		FROM sessions s JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = ?`, sessionHash(sid)).
		Scan(&s.SessionID, &generation, &expiresAt, &lastSeen, &revoked, &s.ID, &s.Username, &s.Role, &version)
	if errors.Is(err, sql.ErrNoRows) {
		return Session{}, ErrInvalidSession
	}
	if err != nil {
		return Session{}, err
	}
	if revoked != 0 || time.Now().Unix() > expiresAt {
		return Session{}, ErrInvalidSession
	}
	if generation != version {
		return Session{}, ErrSessionExpired
	}
	s.lastSeen = time.Unix(lastSeen, 0)
	return s, nil
}

// legacyLifetime is the longest a cookie of the old kind was minted for — a
// "remember me" sign-in — with an hour for clocks that disagree.
const legacyLifetime = 30*24*time.Hour + time.Hour

// legacyMayStillBeGenuine says whether a cookie of the kind minted before
// sessions were stored could have come from a real sign-in. None has been
// minted since then, and none was minted for longer than legacyLifetime, so a
// genuine one runs out by then. Anything later was signed by someone holding
// the signing secret, not by a sign-in. A month after the update this refuses
// them all, and the old way in is closed for good. Without the date (a database
// reset since) nothing old can be genuine either.
func legacyMayStillBeGenuine(db *sql.DB, expiry time.Time) bool {
	var since int64
	if err := db.QueryRow(`SELECT CAST(value AS INTEGER) FROM system_settings WHERE key = 'sessions_since'`).Scan(&since); err != nil || since == 0 {
		return false
	}
	return !expiry.After(time.Unix(since, 0).Add(legacyLifetime))
}

// legacyClosed says whether an old cookie was converted into a session that has
// since been closed. Such a cookie is refused even where it is not converted.
func legacyClosed(db *sql.DB, secret []byte, cookie string) bool {
	var revoked int
	err := db.QueryRow(`SELECT revoked FROM sessions WHERE token_hash = ?`,
		sessionHash(legacySessionID(secret, cookie))).Scan(&revoked)
	return err == nil && revoked != 0
}

// convertLegacy turns an old cookie that has just been accepted into a stored
// session and returns the cookie of the new kind to hand the browser. The row
// keeps the old cookie's expiry: converting gives nobody a longer session.
func convertLegacy(ctx context.Context, db *sql.DB, secret []byte, r *http.Request, cookie string, s *Session, generation int, expiry time.Time) (string, error) {
	sid := legacySessionID(secret, cookie)
	n := NewSession{UserID: s.ID, Generation: generation, Expiry: expiry, Remember: time.Until(expiry) > 25*time.Hour}
	if _, err := insertSession(ctx, db, sid, n, r, true); err != nil {
		return "", err
	}
	stored, err := storedSession(db, sid)
	if err != nil {
		return "", err
	}
	s.SessionID = stored.SessionID
	return util.SignToken(sessionPayload(sid), secret, expiry), nil
}

// touchSession writes when, and from where, a session was last used — at most
// once every touchEvery.
func touchSession(ctx context.Context, db *sql.DB, r *http.Request, s Session) {
	if time.Since(s.lastSeen) < touchEvery {
		return
	}
	_, _ = db.ExecContext(ctx, `UPDATE sessions SET last_seen = ?, ip = ?, user_agent = ? WHERE id = ?`,
		time.Now().Unix(), util.ClientIP(r), userAgentOf(r), s.SessionID)
}

// SetSessionCookie hands the browser a session. The flags are the ones the
// sign-in has always used, so the browser replaces the cookie it already has.
func SetSessionCookie(w http.ResponseWriter, r *http.Request, value string, expiry time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    value,
		Path:     "/",
		Expires:  expiry,
		HttpOnly: true,
		Secure:   util.IsSecureRequest(r),
		SameSite: http.SameSiteLaxMode,
	})
}

// StoredSession is a session as the account's own list shows it.
type StoredSession struct {
	ID        int64     `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	LastSeen  time.Time `json:"last_seen"`
	ExpiresAt time.Time `json:"expires_at"`
	Remember  bool      `json:"remember"`
	UserAgent string    `json:"user_agent"`
	IP        string    `json:"ip"`
}

// ListSessions returns the sessions of an account that are still open, the most
// recently used first.
func ListSessions(ctx context.Context, db *sql.DB, userID int) ([]StoredSession, error) {
	rows, err := db.QueryContext(ctx, `SELECT s.id, s.created_at, s.last_seen, s.expires_at, s.remember, s.user_agent, s.ip
		FROM sessions s JOIN users u ON u.id = s.user_id
		WHERE s.user_id = ? AND s.revoked = 0 AND s.expires_at > ? AND s.generation = u.password_version
		ORDER BY s.last_seen DESC, s.id DESC`, userID, time.Now().Unix())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []StoredSession{}
	for rows.Next() {
		var (
			s                      StoredSession
			created, seen, expires int64
			remember               int
		)
		if err := rows.Scan(&s.ID, &created, &seen, &expires, &remember, &s.UserAgent, &s.IP); err != nil {
			return nil, err
		}
		s.CreatedAt, s.LastSeen, s.ExpiresAt = time.Unix(created, 0), time.Unix(seen, 0), time.Unix(expires, 0)
		s.Remember = remember != 0
		out = append(out, s)
	}
	return out, rows.Err()
}

// ErrSessionNotFound: the account has no open session with that id.
var ErrSessionNotFound = errors.New("session not found")

// RevokeSession closes one session of an account. Another account's id is not
// found, rather than refused, so ids say nothing about other accounts.
func RevokeSession(ctx context.Context, db *sql.DB, userID int, id int64) error {
	res, err := db.ExecContext(ctx, `UPDATE sessions SET revoked = 1 WHERE id = ? AND user_id = ? AND revoked = 0`, id, userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrSessionNotFound
	}
	return nil
}

// RevokeOtherSessions closes every session of an account except the one making
// the request. The account's generation goes up as well, which also ends the
// cookies from before sessions were stored that have not been used since — no
// row exists for those to close — and the current session moves to the new
// generation so it stays open.
func RevokeOtherSessions(ctx context.Context, db *sql.DB, userID int, current int64) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `UPDATE users SET password_version = password_version + 1 WHERE id = ?`, userID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE sessions SET revoked = 1 WHERE user_id = ? AND id != ?`, userID, current); err != nil {
		return err
	}
	res, err := tx.ExecContext(ctx, `UPDATE sessions SET generation = (SELECT password_version FROM users WHERE id = ?)
		WHERE id = ? AND user_id = ?`, userID, current, userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n != 1 {
		return ErrSessionNotFound
	}
	return tx.Commit()
}

// PruneSessions forgets the sessions that have run out. A closed one is kept
// until then: it is what refuses the old cookie it came from.
func PruneSessions(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `DELETE FROM sessions WHERE expires_at < ?`, time.Now().Unix())
	return err
}
