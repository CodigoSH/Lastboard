package api

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/CodigoSH/Lashboard/internal/web/util"
)

const (
	maxLoginAttempts = 5
	lockoutDuration  = 5 * time.Minute
	attemptWindow    = 1 * time.Minute
	sessionDuration  = 24 * time.Hour
)

type loginAttempt struct {
	count     int
	firstSeen time.Time
	lockedAt  time.Time
}

var (
	rateLimiter   = make(map[string]*loginAttempt)
	rateLimiterMu sync.Mutex
)

func init() {
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			rateLimiterMu.Lock()
			now := time.Now()
			for ip, entry := range rateLimiter {
				if !entry.lockedAt.IsZero() && now.After(entry.lockedAt.Add(lockoutDuration)) {
					delete(rateLimiter, ip)
				} else if entry.lockedAt.IsZero() && now.Sub(entry.firstSeen) > attemptWindow {
					delete(rateLimiter, ip)
				}
			}
			rateLimiterMu.Unlock()
		}
	}()
}

type AuthHandler struct {
	DB     *sql.DB
	Secret []byte
}

func NewAuthHandler(db *sql.DB, secret []byte) *AuthHandler {
	return &AuthHandler{DB: db, Secret: secret}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)

	rateLimiterMu.Lock()
	entry := rateLimiter[ip]
	now := time.Now()
	if entry != nil {
		// Check if locked out
		if !entry.lockedAt.IsZero() && now.Before(entry.lockedAt.Add(lockoutDuration)) {
			rateLimiterMu.Unlock()
			http.Error(w, "auth.too_many_attempts", http.StatusTooManyRequests)
			return
		}
		// Clear stale window
		if now.Sub(entry.firstSeen) > attemptWindow {
			entry.count = 0
			entry.firstSeen = now
			entry.lockedAt = time.Time{}
		}
	}
	rateLimiterMu.Unlock()

	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	if len(input.Password) > 72 {
		// Dummy bcrypt call to maintain constant timing regardless of failure reason
		bcrypt.CompareHashAndPassword([]byte("$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01"), []byte(input.Password))
		h.recordFailedAttempt(ip)
		http.Error(w, "auth.invalid_credentials", http.StatusUnauthorized)
		return
	}

	// Fetch user
	var storedHash string
	err := h.DB.QueryRow("SELECT password FROM users WHERE username = ?", input.Username).Scan(&storedHash)
	if err != nil {
		bcrypt.CompareHashAndPassword([]byte("$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01"), []byte(input.Password))
		h.recordFailedAttempt(ip)
		http.Error(w, "auth.invalid_credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(input.Password)); err != nil {
		h.recordFailedAttempt(ip)
		http.Error(w, "auth.invalid_credentials", http.StatusUnauthorized)
		return
	}

	// Success: clear rate limit
	rateLimiterMu.Lock()
	delete(rateLimiter, ip)
	rateLimiterMu.Unlock()

	expiry := time.Now().Add(sessionDuration)
	token := util.SignToken(input.Username, h.Secret, expiry)
	secure := isSecureRequest(r)

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

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "auth.welcome"})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	expired := time.Now().Add(-1 * time.Hour)

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		Expires:  expired,
		HttpOnly: true,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "csrf_token",
		Value:    "",
		Path:     "/",
		Expires:  expired,
		HttpOnly: false,
	})
	w.WriteHeader(http.StatusOK)
}

func (h *AuthHandler) recordFailedAttempt(ip string) {
	rateLimiterMu.Lock()
	defer rateLimiterMu.Unlock()

	entry := rateLimiter[ip]
	if entry == nil {
		entry = &loginAttempt{firstSeen: time.Now()}
		rateLimiter[ip] = entry
	}
	entry.count++
	if entry.count >= maxLoginAttempts {
		entry.lockedAt = time.Now()
	}
}

func isSecureRequest(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	return r.Header.Get("X-Forwarded-Proto") == "https"
}

func generateCSRFToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
