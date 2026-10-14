package api

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/password"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

const (
	maxLoginAttempts = 5
	lockoutDuration  = 5 * time.Minute
	attemptWindow    = 1 * time.Minute
	defaultSession   = 24 * time.Hour
	extendedSession  = 30 * 24 * time.Hour
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

	locked, err := attemptsLockedOut(r.Context(), h.DB, ip)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	if locked {
		http.Error(w, "auth.too_many_attempts", http.StatusTooManyRequests)
		return
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

	if password.TooLong(input.Password) {
		// Spend what a verification spends, so the reason for failing does not
		// show in how long it took.
		password.Waste(input.Password)
		recordFailedAttempt(h.DB, ip)
		http.Error(w, "auth.invalid_credentials", http.StatusUnauthorized)
		return
	}

	// Fetch user
	var userID, passwordVersion int
	var storedHash string
	err = h.DB.QueryRowContext(r.Context(), "SELECT id, password, password_version FROM users WHERE username = ?", input.Username).
		Scan(&userID, &storedHash, &passwordVersion)
	if err != nil {
		password.Waste(input.Password)
		recordFailedAttempt(h.DB, ip)
		http.Error(w, "auth.invalid_credentials", http.StatusUnauthorized)
		return
	}

	if err := password.Verify(input.Password, storedHash); err != nil {
		recordFailedAttempt(h.DB, ip)
		http.Error(w, "auth.invalid_credentials", http.StatusUnauthorized)
		return
	}

	h.upgradeHash(r, input.Username, input.Password, storedHash)

	// Success: clear rate limit record for this IP
	clearAttempts(h.DB, ip)

	duration := defaultSession
	if input.RememberMe {
		duration = extendedSession
	}
	expiry := time.Now().Add(duration)
	// The password generation rides along, so changing the password ends every
	// session that was open under the old one.
	token := util.SignToken(util.AccountSessionPayload(userID, passwordVersion), h.Secret, expiry)
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

func generateCSRFToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// upgradeHash replaces a hash from an earlier version — bcrypt, or Argon2id with
// other parameters — now that the password is known to be right. Nobody has to
// reset anything: the move happens at each account's next sign-in.
//
// password_version is left alone on purpose. It is the generation that ends
// sessions when a password changes, and the password has not changed.
// The UPDATE matches the old hash so a password changed in the meantime is not
// overwritten. A failure is logged and the sign-in goes on: the old hash still
// works, and the next sign-in tries again.
func (h *AuthHandler) upgradeHash(r *http.Request, username, plain, stored string) {
	if !password.NeedsRehash(stored) {
		return
	}
	fresh, err := password.Hash(plain)
	if err != nil {
		log.Printf("login: could not rehash password for %s: %v", username, err)
		return
	}
	if _, err := h.DB.ExecContext(r.Context(),
		"UPDATE users SET password = ? WHERE username = ? AND password = ?", fresh, username, stored); err != nil {
		log.Printf("login: could not store rehashed password for %s: %v", username, err)
	}
}
