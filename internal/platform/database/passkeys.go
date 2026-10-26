package database

import (
	"database/sql"
	"fmt"
)

// Passkeys: signing in without a password.
//
// user_passkeys holds each passkey's public key — never anything secret: the
// private half never leaves the person's device — with the id the device knows
// it by, its signature counter and the name its owner gave it.
//
// user_passkey_handles is the id the device stores for the account: random, so
// it says nothing about the account to anybody who reads the device.
//
// passkey_challenges is a challenge handed to a browser, by its hash, until it
// is answered or runs out: one to create a passkey, for an account that is
// signed in; one to sign in, for nobody yet.
const passkeyTables = `
CREATE TABLE IF NOT EXISTS user_passkeys (
	id            INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id       INTEGER NOT NULL,
	credential_id TEXT NOT NULL UNIQUE,
	public_key    BLOB NOT NULL,
	alg           INTEGER NOT NULL,
	sign_count    INTEGER NOT NULL DEFAULT 0,
	name          TEXT NOT NULL DEFAULT '',
	created_at    INTEGER NOT NULL,
	last_used_at  INTEGER,
	FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_passkeys_user ON user_passkeys(user_id);
CREATE TABLE IF NOT EXISTS user_passkey_handles (
	user_id INTEGER PRIMARY KEY,
	handle  BLOB NOT NULL UNIQUE,
	FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS passkey_challenges (
	challenge_hash TEXT PRIMARY KEY,
	purpose        TEXT NOT NULL,
	user_id        INTEGER,
	remember       INTEGER NOT NULL DEFAULT 0,
	expires_at     INTEGER NOT NULL,
	FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);`

// migratePasskeys creates the tables. Nobody has a passkey until they add one.
func migratePasskeys(db *sql.DB) error {
	if _, err := db.Exec(passkeyTables); err != nil {
		return fmt.Errorf("passkeys (tables): %w", err)
	}
	return nil
}
