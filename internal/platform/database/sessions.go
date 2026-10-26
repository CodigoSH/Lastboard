package database

import (
	"database/sql"
	"fmt"
)

// sessionsTable is where a sign-in lives on the server, so that signing out,
// or closing a session from another device, ends it for good. Before it, a
// session was only a signed cookie: signing out deleted the browser's copy, and
// a copy taken elsewhere kept working until it ran out, a month later at most.
//
// What the cookie carries is never stored, only its hash, so the table cannot be
// turned back into cookies. generation is the account's password_version when
// the session began: a session from before a password change is over without
// anyone having to remember to end it. A closed session keeps its row, marked
// revoked, until it would have run out; that is what stops a cookie from before
// this table from being converted into a session again once it was closed.
const sessionsTable = `CREATE TABLE IF NOT EXISTS sessions (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	token_hash  TEXT NOT NULL UNIQUE,
	user_id     INTEGER NOT NULL,
	generation  INTEGER NOT NULL,
	created_at  INTEGER NOT NULL,
	last_seen   INTEGER NOT NULL,
	expires_at  INTEGER NOT NULL,
	remember    INTEGER NOT NULL DEFAULT 0,
	user_agent  TEXT NOT NULL DEFAULT '',
	ip          TEXT NOT NULL DEFAULT '',
	revoked     INTEGER NOT NULL DEFAULT 0,
	FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)`

// migrateSessions creates the table and its index, and notes when. The sessions
// open before it existed are not touched here: each one becomes a row the first
// time it is used (see middleware.AuthRequired), so updating signs nobody out.
func migrateSessions(db *sql.DB) error {
	if _, err := db.Exec(sessionsTable); err != nil {
		return fmt.Errorf("sessions (table): %w", err)
	}
	if _, err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`); err != nil {
		return fmt.Errorf("sessions (index): %w", err)
	}
	// When sessions started being stored. A cookie of the kind minted before
	// this can only be genuine if it runs out within the month it could last;
	// see middleware.legacyMayStillBeGenuine. Written once and never moved.
	if _, err := db.Exec(`INSERT OR IGNORE INTO system_settings (key, value)
		VALUES ('sessions_since', CAST(strftime('%s', 'now') AS TEXT))`); err != nil {
		return fmt.Errorf("sessions (since): %w", err)
	}
	return nil
}
