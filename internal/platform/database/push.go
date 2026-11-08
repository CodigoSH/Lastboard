package database

import (
	"database/sql"
	"fmt"
)

// Push subscriptions: the browsers an account asked to be told, by a notification, when a service of
// its falls over.
//
// A subscription is the address a push service gave a browser (endpoint) and the two values a
// message is encrypted with for that browser alone (p256dh, auth). Whoever holds them can send that
// browser a message, so they are kept as the account's own and never leave the server: not in a
// backup, since a restore on another instance could not use them, and not in an export.
//
// label is the name the browser gave itself ("Chrome on Android"), so the account can tell its
// devices apart when it removes one. last_ok_at is the last time a push service took a message for
// it, which says whether the device is still reachable.
const pushTables = `
CREATE TABLE IF NOT EXISTS push_subscriptions (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id     INTEGER NOT NULL,
	endpoint    TEXT NOT NULL UNIQUE,
	p256dh      TEXT NOT NULL,
	auth        TEXT NOT NULL,
	label       TEXT NOT NULL DEFAULT '',
	created_at  INTEGER NOT NULL,
	last_ok_at  INTEGER,
	FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);`

// migratePush creates the table. Nobody is subscribed until a browser asks.
func migratePush(db *sql.DB) error {
	if _, err := db.Exec(pushTables); err != nil {
		return fmt.Errorf("push (tables): %w", err)
	}
	return nil
}
