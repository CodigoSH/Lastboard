package api

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/password"
)

// The failed-attempt limiter, shared by everything that asks for a password.
//
// The sign-in page counts failures per address. The places that ask again for
// the password of the account already signed in — changing it, deleting an
// account, resetting the instance — count per account, in the same table, so a
// stolen session cookie cannot be used to guess the password without limit.

var (
	errLockedOut     = errors.New("too many attempts")
	errWrongPassword = errors.New("wrong password")
)

// accountAttemptKey is the limiter key of an account's password confirmations.
// It cannot collide with an address: those never contain "account:".
func accountAttemptKey(userID int) string { return fmt.Sprintf("account:%d", userID) }

// attemptsLockedOut reports whether the key is locked out right now. An expired
// lockout, or a count whose window has run out, is cleared on the way.
func attemptsLockedOut(ctx context.Context, db *sql.DB, key string) (bool, error) {
	now := time.Now()
	var firstSeen time.Time
	var lockedUntil sql.NullTime
	err := db.QueryRowContext(ctx,
		"SELECT first_seen, locked_until FROM login_attempts WHERE ip = ?", key,
	).Scan(&firstSeen, &lockedUntil)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if lockedUntil.Valid && now.Before(lockedUntil.Time) {
		return true, nil
	}
	// A lockout that has ended, or failures from a window that has: start over.
	if lockedUntil.Valid || now.Sub(firstSeen) > attemptWindow {
		if _, err := db.ExecContext(ctx, "DELETE FROM login_attempts WHERE ip = ?", key); err != nil {
			log.Printf("rate-limit: failed to reset attempts for %s: %v", key, err)
		}
	}
	return false, nil
}

// recordFailedAttempt counts one failure for the key and, when that makes
// maxLoginAttempts, locks it. The increment happens inside the database, in one
// statement: attempts that arrive together are each counted, where reading the
// count first and writing back "count + 1" records a burst of N as one.
func recordFailedAttempt(db *sql.DB, key string) {
	now := time.Now()
	if _, err := db.Exec(`
		INSERT INTO login_attempts (ip, count, first_seen) VALUES (?, 1, ?)
		ON CONFLICT(ip) DO UPDATE SET
			count = login_attempts.count + 1,
			locked_until = CASE
				WHEN login_attempts.count + 1 >= ? THEN ?
				ELSE login_attempts.locked_until
			END`,
		key, now, maxLoginAttempts, now.Add(lockoutDuration),
	); err != nil {
		log.Printf("rate-limit: failed to record attempt for %s: %v", key, err)
	}
}

// clearAttempts forgets the failures of a key after a success.
func clearAttempts(db *sql.DB, key string) {
	if _, err := db.Exec("DELETE FROM login_attempts WHERE ip = ?", key); err != nil {
		log.Printf("rate-limit: failed to clear attempts for %s: %v", key, err)
	}
}

// confirmAccountPassword checks the password of the signed-in account again,
// counting failures against it. It returns errLockedOut while the account is
// locked (without looking at the password: a locked account answers the same
// whatever is guessed) and errWrongPassword when it does not match.
func confirmAccountPassword(ctx context.Context, db *sql.DB, userID int, storedHash, plain string) error {
	key := accountAttemptKey(userID)
	locked, err := attemptsLockedOut(ctx, db, key)
	if err != nil {
		return err
	}
	if locked {
		return errLockedOut
	}
	if password.Verify(plain, storedHash) != nil {
		recordFailedAttempt(db, key)
		return errWrongPassword
	}
	clearAttempts(db, key)
	return nil
}
