package api

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/totp"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

/* ---------------------------------------------------------------------------
 * The second step of signing in
 *
 * An account that turns it on signs in with its password and then a code from
 * an authenticator app — or one of its recovery codes, each good once. Between
 * the two the browser holds a challenge: it lasts a few minutes, takes a few
 * wrong codes, and is all the password buys on its own.
 *
 * The way back when both the phone and the codes are lost is the administrator,
 * who can take the second step off any account, and for the administrator's own
 * account, `lastboard 2fa reset <username>` on the machine itself.
 * ------------------------------------------------------------------------ */

const (
	// totpIssuer is the name an authenticator app files the account under.
	totpIssuer = "Lastboard"
	// challengeLifetime is how long the code may take to arrive after the password.
	challengeLifetime = 5 * time.Minute
	// challengeAttempts is how many wrong codes one challenge takes before the
	// password has to be typed again.
	challengeAttempts = 5
)

// secondStepAttemptKey is the limiter key of an account's codes. It cannot be an
// address: no IP address contains a hyphen or the letters after "f".
func secondStepAttemptKey(userID int) string { return fmt.Sprintf("second-step:%d", userID) }

func twoFactorEnabled(ctx context.Context, db *sql.DB, userID int) (bool, error) {
	var enabled int
	err := db.QueryRowContext(ctx, `SELECT enabled FROM user_totp WHERE user_id = ?`, userID).Scan(&enabled)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return enabled == 1, err
}

func challengeHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// newLoginChallenge records a sign-in that has passed the password, and returns
// what the browser presents with the code.
func newLoginChallenge(ctx context.Context, db *sql.DB, userID int, remember bool) (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	now := time.Now()
	if _, err := db.ExecContext(ctx, `DELETE FROM login_challenges WHERE expires_at < ?`, now.Unix()); err != nil {
		return "", err
	}
	rem := 0
	if remember {
		rem = 1
	}
	_, err := db.ExecContext(ctx, `INSERT INTO login_challenges (token_hash, user_id, expires_at, remember) VALUES (?, ?, ?, ?)`,
		challengeHash(token), userID, now.Add(challengeLifetime).Unix(), rem)
	return token, err
}

// errCodeRejected: neither a current code nor an unused recovery code.
var errCodeRejected = errors.New("code rejected")

// acceptSecondStep checks a code for an account and spends it: a code from the
// app moves the account's last accepted period forward, a recovery code is
// marked used. Both are single statements that only succeed once, so two
// requests carrying the same code cannot both sign in.
func acceptSecondStep(ctx context.Context, db *sql.DB, userID int, code string) error {
	if totp.LooksLikeTOTP(code) {
		var (
			encoded  string
			lastStep int64
		)
		err := db.QueryRowContext(ctx, `SELECT secret, last_step FROM user_totp WHERE user_id = ? AND enabled = 1`, userID).
			Scan(&encoded, &lastStep)
		if errors.Is(err, sql.ErrNoRows) {
			return errCodeRejected
		}
		if err != nil {
			return err
		}
		secret, err := totp.DecodeSecret(encoded)
		if err != nil {
			return err
		}
		used, ok := totp.Verify(secret, code, time.Now(), lastStep)
		if !ok {
			return errCodeRejected
		}
		res, err := db.ExecContext(ctx, `UPDATE user_totp SET last_step = ? WHERE user_id = ? AND last_step < ?`, used, userID, used)
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n != 1 {
			return errCodeRejected
		}
		return nil
	}
	res, err := db.ExecContext(ctx, `UPDATE user_recovery_codes SET used_at = ?
		WHERE user_id = ? AND code_hash = ? AND used_at IS NULL`, time.Now().Unix(), userID, totp.HashRecoveryCode(code))
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n != 1 {
		return errCodeRejected
	}
	return nil
}

// LoginSecondStep completes a sign-in that passed the password: the challenge
// and a code. It answers like the sign-in does when it succeeds.
func (h *AuthHandler) LoginSecondStep(w http.ResponseWriter, r *http.Request) {
	ip := util.ClientIP(r)
	if locked, err := attemptsLockedOut(r.Context(), h.DB, ip); err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	} else if locked {
		http.Error(w, "auth.too_many_attempts", http.StatusTooManyRequests)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
	var input struct {
		Challenge string `json:"challenge"`
		Code      string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Challenge == "" {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	hash := challengeHash(input.Challenge)
	var (
		userID, remember int
		expiresAt        int64
	)
	err := h.DB.QueryRowContext(r.Context(), `SELECT user_id, remember, expires_at FROM login_challenges WHERE token_hash = ?`, hash).
		Scan(&userID, &remember, &expiresAt)
	if errors.Is(err, sql.ErrNoRows) || (err == nil && time.Now().Unix() > expiresAt) {
		// Gone, used, or out of time: the browser starts again from the password.
		http.Error(w, "auth.challenge_expired", http.StatusUnauthorized)
		return
	}
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	account := secondStepAttemptKey(userID)
	if locked, err := attemptsLockedOut(r.Context(), h.DB, account); err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	} else if locked {
		http.Error(w, "auth.too_many_attempts", http.StatusTooManyRequests)
		return
	}

	switch err := acceptSecondStep(r.Context(), h.DB, userID, input.Code); {
	case errors.Is(err, errCodeRejected):
		recordFailedAttempt(h.DB, ip)
		recordFailedAttempt(h.DB, account)
		// The challenge counts its own failures and is gone after the last one,
		// so a guessed password buys a handful of tries, not an afternoon.
		_, _ = h.DB.ExecContext(r.Context(), `UPDATE login_challenges SET attempts = attempts + 1 WHERE token_hash = ?`, hash)
		_, _ = h.DB.ExecContext(r.Context(), `DELETE FROM login_challenges WHERE token_hash = ? AND attempts >= ?`, hash, challengeAttempts)
		http.Error(w, "auth.invalid_code", http.StatusUnauthorized)
		return
	case err != nil:
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	// A challenge is good for one sign-in.
	res, err := h.DB.ExecContext(r.Context(), `DELETE FROM login_challenges WHERE token_hash = ?`, hash)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	if n, _ := res.RowsAffected(); n != 1 {
		http.Error(w, "auth.challenge_expired", http.StatusUnauthorized)
		return
	}
	clearAttempts(h.DB, ip)
	clearAttempts(h.DB, account)

	var passwordVersion int
	if err := h.DB.QueryRowContext(r.Context(), `SELECT password_version FROM users WHERE id = ?`, userID).Scan(&passwordVersion); err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	h.startSession(w, r, userID, passwordVersion, remember == 1)
}

/* ---------------------------------------------------------------------------
 * Turning it on and off, for the account signed in
 * ------------------------------------------------------------------------ */

// TwoFactorHandler is the account's own second step.
type TwoFactorHandler struct {
	DB *sql.DB
}

type twoFactorStatus struct {
	Enabled      bool `json:"enabled"`
	RecoveryLeft int  `json:"recovery_left"`
}

func twoFactorStatusOf(ctx context.Context, db *sql.DB, userID int) (twoFactorStatus, error) {
	var s twoFactorStatus
	enabled, err := twoFactorEnabled(ctx, db, userID)
	if err != nil {
		return s, err
	}
	s.Enabled = enabled
	if enabled {
		err = db.QueryRowContext(ctx, `SELECT COUNT(*) FROM user_recovery_codes WHERE user_id = ? AND used_at IS NULL`, userID).
			Scan(&s.RecoveryLeft)
	}
	return s, err
}

// Status says whether the account has a second step, and how many recovery
// codes it has left.
func (h *TwoFactorHandler) Status(w http.ResponseWriter, r *http.Request) {
	s, err := twoFactorStatusOf(r.Context(), h.DB, middleware.GetUserIDFromContext(r))
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, s)
}

// Setup draws a new secret for the account to scan. It is not in force until a
// code from it is confirmed with Enable; drawing again replaces one that never
// was. An account that already has a second step turns it off first.
func (h *TwoFactorHandler) Setup(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r)
	if enabled, err := twoFactorEnabled(r.Context(), h.DB, userID); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	} else if enabled {
		http.Error(w, "two_factor.already_on", http.StatusConflict)
		return
	}
	secret, err := totp.NewSecret()
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	encoded := totp.EncodeSecret(secret)
	if _, err := h.DB.ExecContext(r.Context(), `INSERT INTO user_totp (user_id, secret, enabled, last_step, created_at)
		VALUES (?, ?, 0, 0, ?)
		ON CONFLICT (user_id) DO UPDATE SET secret = excluded.secret, last_step = 0, created_at = excluded.created_at
		WHERE user_totp.enabled = 0`, userID, encoded, time.Now().Unix()); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{
		"secret": encoded,
		"uri":    totp.URI(totpIssuer, middleware.GetUserFromContext(r), secret),
	})
}

// replaceRecoveryCodes draws a new set for an account, in place of every code it
// had, and returns them — the only time they are shown.
func replaceRecoveryCodes(ctx context.Context, tx *sql.Tx, userID int) ([]string, error) {
	codes, err := totp.NewRecoveryCodes()
	if err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM user_recovery_codes WHERE user_id = ?`, userID); err != nil {
		return nil, err
	}
	for _, c := range codes {
		if _, err := tx.ExecContext(ctx, `INSERT INTO user_recovery_codes (user_id, code_hash) VALUES (?, ?)`,
			userID, totp.HashRecoveryCode(c)); err != nil {
			return nil, err
		}
	}
	return codes, nil
}

// Enable puts the scanned secret in force, once a code from it proves the app
// has it, and answers with the recovery codes.
func (h *TwoFactorHandler) Enable(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r)
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
	var input struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	var (
		encoded string
		enabled int
	)
	err := h.DB.QueryRowContext(r.Context(), `SELECT secret, enabled FROM user_totp WHERE user_id = ?`, userID).Scan(&encoded, &enabled)
	if errors.Is(err, sql.ErrNoRows) {
		http.Error(w, "two_factor.not_set_up", http.StatusConflict)
		return
	}
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if enabled == 1 {
		http.Error(w, "two_factor.already_on", http.StatusConflict)
		return
	}
	secret, err := totp.DecodeSecret(encoded)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	used, ok := totp.Verify(secret, input.Code, time.Now(), 0)
	if !ok {
		http.Error(w, "auth.invalid_code", http.StatusBadRequest)
		return
	}

	tx, err := h.DB.BeginTx(r.Context(), nil)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()
	res, err := tx.ExecContext(r.Context(), `UPDATE user_totp SET enabled = 1, last_step = ? WHERE user_id = ? AND enabled = 0 AND secret = ?`,
		used, userID, encoded)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if n, _ := res.RowsAffected(); n != 1 {
		// Turned on, or drawn again, by another request in the meantime.
		http.Error(w, "two_factor.not_set_up", http.StatusConflict)
		return
	}
	codes, err := replaceRecoveryCodes(r.Context(), tx, userID)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if err := tx.Commit(); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"recovery_codes": codes})
}

// confirmOwnPassword asks for the password of the account signed in, held to the
// per-account lockout like every other place that asks again. It writes the
// refusal itself and reports whether to go on.
func confirmOwnPassword(w http.ResponseWriter, r *http.Request, db *sql.DB, plain string) bool {
	userID := middleware.GetUserIDFromContext(r)
	var stored string
	if err := db.QueryRowContext(r.Context(), `SELECT password FROM users WHERE id = ?`, userID).Scan(&stored); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return false
	}
	switch err := confirmAccountPassword(r.Context(), db, userID, stored, plain); {
	case errors.Is(err, errLockedOut):
		http.Error(w, "auth.too_many_attempts", http.StatusTooManyRequests)
		return false
	case errors.Is(err, errWrongPassword):
		http.Error(w, "error.current_password_incorrect", http.StatusUnauthorized)
		return false
	case err != nil:
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return false
	}
	return true
}

func readCurrentPassword(w http.ResponseWriter, r *http.Request) (string, bool) {
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
	var input struct {
		CurrentPassword string `json:"current_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.CurrentPassword == "" {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return "", false
	}
	return input.CurrentPassword, true
}

// removeTwoFactor takes the second step off an account: its secret, its recovery
// codes and any sign-in waiting for a code.
func removeTwoFactor(ctx context.Context, db *sql.DB, userID int) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, q := range []string{
		`DELETE FROM user_totp WHERE user_id = ?`,
		`DELETE FROM user_recovery_codes WHERE user_id = ?`,
		`DELETE FROM login_challenges WHERE user_id = ?`,
	} {
		if _, err := tx.ExecContext(ctx, q, userID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// Disable turns the account's second step off, with its password.
func (h *TwoFactorHandler) Disable(w http.ResponseWriter, r *http.Request) {
	pw, ok := readCurrentPassword(w, r)
	if !ok || !confirmOwnPassword(w, r, h.DB, pw) {
		return
	}
	if err := removeTwoFactor(r.Context(), h.DB, middleware.GetUserIDFromContext(r)); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// RecoveryCodes draws a new set in place of the old one, with the password.
func (h *TwoFactorHandler) RecoveryCodes(w http.ResponseWriter, r *http.Request) {
	pw, ok := readCurrentPassword(w, r)
	if !ok || !confirmOwnPassword(w, r, h.DB, pw) {
		return
	}
	userID := middleware.GetUserIDFromContext(r)
	if enabled, err := twoFactorEnabled(r.Context(), h.DB, userID); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	} else if !enabled {
		http.Error(w, "two_factor.not_set_up", http.StatusConflict)
		return
	}
	tx, err := h.DB.BeginTx(r.Context(), nil)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()
	codes, err := replaceRecoveryCodes(r.Context(), tx, userID)
	if err != nil || tx.Commit() != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"recovery_codes": codes})
}

// RemoveForUser is the administrator taking the second step off an account —
// the way back for somebody who lost both the phone and the recovery codes.
func (h *TwoFactorHandler) RemoveForUser(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
	var input struct {
		ID int `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.ID <= 0 {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	var exists int
	if err := h.DB.QueryRowContext(r.Context(), `SELECT 1 FROM users WHERE id = ?`, input.ID).Scan(&exists); err != nil {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}
	if err := removeTwoFactor(r.Context(), h.DB, input.ID); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ResetTwoFactor is what `lastboard 2fa reset <username>` does on the machine
// itself: the way back for the administrator's own account, which nobody above
// it can reset.
func ResetTwoFactor(ctx context.Context, db *sql.DB, username string) error {
	var userID int
	if err := db.QueryRowContext(ctx, `SELECT id FROM users WHERE username = ?`, username).Scan(&userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("no account is called %q", username)
		}
		return err
	}
	return removeTwoFactor(ctx, db, userID)
}
