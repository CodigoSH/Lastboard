package api

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/password"
)

// AccountExists says whether an account of that name exists, so the command on
// the machine can refuse before it asks for a password nobody will use.
func AccountExists(ctx context.Context, db *sql.DB, username string) error {
	var id int
	if err := db.QueryRowContext(ctx, `SELECT id FROM users WHERE username = ?`, username).Scan(&id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("no account is called %q", username)
		}
		return err
	}
	return nil
}

// ResetPassword gives an account a new password from the machine the server
// runs on: the way back for an administrator who has forgotten theirs, and for
// any account nobody else can reach. Having a shell there is what proves the
// right to do it, as with ResetTwoFactor.
//
// It does what changing the password does — the generation goes up, so every
// session the account had stops working — and one thing more: it clears the
// account's own failed-attempt count, because a person who has forgotten the
// password has usually been guessing it. It leaves the second step, the
// passkeys and the other accounts alone.
func ResetPassword(ctx context.Context, db *sql.DB, username, plain string) error {
	switch err := validatePassword(plain); {
	case err == nil:
	case err.Error() == "error.password_min_length":
		return errors.New("the password must have at least 8 characters")
	case err.Error() == "error.password_max_length":
		return fmt.Errorf("the password must have at most %d characters", password.MaxLength)
	default:
		return err
	}

	var userID int
	if err := db.QueryRowContext(ctx, `SELECT id FROM users WHERE username = ?`, username).Scan(&userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("no account is called %q", username)
		}
		return err
	}

	// The hash is the slow part: it is made before the write begins.
	hash, err := password.Hash(plain)
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx,
		`UPDATE users SET password = ?, password_version = password_version + 1 WHERE id = ?`,
		hash, userID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM login_attempts WHERE ip = ?`, accountAttemptKey(userID)); err != nil {
		return err
	}
	return tx.Commit()
}
