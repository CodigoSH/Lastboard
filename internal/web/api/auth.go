package api

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"golang.org/x/crypto/bcrypt"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

const (
	maxLoginAttempts = 5
	lockoutDuration  = 5 * time.Minute
	attemptWindow    = 1 * time.Minute
	defaultSession   = 24 * time.Hour
	extendedSession  = 30 * 24 * time.Hour

	// dummyHash is used in timing-safe comparisons when a user does not exist,
	// preventing user enumeration via response time differences.
	dummyHash = "$2b$10$KIWAy9N7gtNA4CHEO4YXrOQgZw.wye/ZD98.n6hwFVrEVb.SoU/ya"
)

type AuthHandler struct {
	DB     *sql.DB
	Secret []byte
}

func NewAuthHandler(db *sql.DB, secret []byte) *AuthHandler {
	return &AuthHandler{DB: db, Secret: secret}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	ip := util.ClientIP(r)
	now := time.Now()

	// Inline cleanup: remove expired lockouts to keep the table lean. Best-effort,
	// but log failures so a persistently stuck lockout leaves a diagnostic trail.
	if _, err := h.DB.Exec("DELETE FROM login_attempts WHERE locked_until IS NOT NULL AND locked_until < ?", now); err != nil {
		log.Printf("login: failed to clean expired lockouts: %v", err)
	}

	// Check current state for this IP
	var count int
	var firstSeen time.Time
	var lockedUntil sql.NullTime

	err := h.DB.QueryRow(
		"SELECT count, first_seen, locked_until FROM login_attempts WHERE ip = ?", ip,
	).Scan(&count, &firstSeen, &lockedUntil)

	if err != nil && err != sql.ErrNoRows {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	if err == nil { // record exists
		// Locked out?
		if lockedUntil.Valid && now.Before(lockedUntil.Time) {
			http.Error(w, "auth.too_many_attempts", http.StatusTooManyRequests)
			return
		}
		// Attempt window expired — reset stale record
		if !lockedUntil.Valid && now.Sub(firstSeen) > attemptWindow {
			if _, err := h.DB.Exec("DELETE FROM login_attempts WHERE ip = ?", ip); err != nil {
				log.Printf("login: failed to reset stale attempts for %s: %v", ip, err)
			}
			count = 0
		}
	}

	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
	var input struct {
		Username   string `json:"username"`
		Password   string `json:"password"`
		RememberMe bool   `json:"remember_me"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	if len(input.Password) > 72 {
		// Dummy bcrypt call to maintain constant timing regardless of failure reason
		bcrypt.CompareHashAndPassword([]byte(dummyHash), []byte(input.Password))
		h.recordFailedAttempt(ip, count)
		http.Error(w, "auth.invalid_credentials", http.StatusUnauthorized)
		return
	}

	// Fetch user
	var storedHash string
	var passwordVersion int
	err = h.DB.QueryRow("SELECT password, password_version FROM users WHERE username = ?", input.Username).
		Scan(&storedHash, &passwordVersion)
	if err != nil {
		bcrypt.CompareHashAndPassword([]byte(dummyHash), []byte(input.Password))
		h.recordFailedAttempt(ip, count)
		http.Error(w, "auth.invalid_credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(input.Password)); err != nil {
		h.recordFailedAttempt(ip, count)
		http.Error(w, "auth.invalid_credentials", http.StatusUnauthorized)
		return
	}

	// Success: clear rate limit record for this IP
	if _, err := h.DB.Exec("DELETE FROM login_attempts WHERE ip = ?", ip); err != nil {
		log.Printf("login: failed to clear attempts for %s: %v", ip, err)
	}

	duration := defaultSession
	if input.RememberMe {
		duration = extendedSession
	}
	expiry := time.Now().Add(duration)
	// The password generation rides along, so changing the password ends every
	// session that was open under the old one.
	token := util.SignToken(util.SessionPayload(input.Username, passwordVersion), h.Secret, expiry)
	secure := util.IsSecureRequest(r)

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		Expires:  expiry,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})

	// CSRF double-submit cookie (non-HttpOnly so JS can read it)
	csrfToken, err := generateCSRFToken()
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "csrf_token",
		Value:    csrfToken,
		Path:     "/",
		Expires:  expiry,
		HttpOnly: false,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "auth.welcome"})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	invalidateSession(w, r)
	w.WriteHeader(http.StatusOK)
}

// recordFailedAttempt increments the failed login count for an IP in SQLite.
// If the count reaches maxLoginAttempts, sets locked_until.
func (h *AuthHandler) recordFailedAttempt(ip string, currentCount int) {
	now := time.Now()
	newCount := currentCount + 1

	if currentCount == 0 {
		if _, err := h.DB.Exec(
			"INSERT OR IGNORE INTO login_attempts (ip, count, first_seen) VALUES (?, 1, ?)",
			ip, now,
		); err != nil {
			log.Printf("rate-limit: failed to record attempt for %s: %v", ip, err)
		}
		return
	}

	if newCount >= maxLoginAttempts {
		lockedUntil := now.Add(lockoutDuration)
		if _, err := h.DB.Exec(
			"UPDATE login_attempts SET count = ?, locked_until = ? WHERE ip = ?",
			newCount, lockedUntil, ip,
		); err != nil {
			log.Printf("rate-limit: failed to lock %s: %v", ip, err)
		}
	} else {
		if _, err := h.DB.Exec(
			"UPDATE login_attempts SET count = ? WHERE ip = ?",
			newCount, ip,
		); err != nil {
			log.Printf("rate-limit: failed to update count for %s: %v", ip, err)
		}
	}
}

func generateCSRFToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
