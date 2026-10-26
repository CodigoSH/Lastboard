package database

import (
	"database/sql"
	"fmt"
)

// The second step of signing in.
//
// user_totp holds an account's authenticator secret. It is kept as it is, like
// every other secret here (the house rule: the database is the operator's, and
// a key kept beside it would protect nothing). enabled is 0 while the person is
// still scanning it, and last_step is the period of the last code accepted, so a
// code is never accepted twice.
//
// user_recovery_codes keeps only the hash of each recovery code, and when it was
// used. login_challenges is the half-finished sign-in between the password and
// the code: the hash of what the browser holds, whose it is, until when, and how
// many wrong codes it has had.
const twoFactorTables = `
CREATE TABLE IF NOT EXISTS user_totp (
	user_id    INTEGER PRIMARY KEY,
	secret     TEXT NOT NULL,
	enabled    INTEGER NOT NULL DEFAULT 0,
	last_step  INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL,
	FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS user_recovery_codes (
	id        INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id   INTEGER NOT NULL,
	code_hash TEXT NOT NULL,
	used_at   INTEGER,
	FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_user ON user_recovery_codes(user_id);
CREATE TABLE IF NOT EXISTS login_challenges (
	token_hash TEXT PRIMARY KEY,
	user_id    INTEGER NOT NULL,
	expires_at INTEGER NOT NULL,
	remember   INTEGER NOT NULL DEFAULT 0,
	attempts   INTEGER NOT NULL DEFAULT 0,
	FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);`

// migrateTwoFactor creates the tables. Nobody has a second step until they turn
// it on, so there is nothing to move.
func migrateTwoFactor(db *sql.DB) error {
	if _, err := db.Exec(twoFactorTables); err != nil {
		return fmt.Errorf("two-factor (tables): %w", err)
	}
	return nil
}
