package database

import (
	"database/sql"
	"fmt"
)

// userAccessTable holds what each account may do and the label it wears.
//
// Its own table, not user_settings: those are the account's to change, and these
// are only ever written by the administrator. The administrator has a row too,
// for its label; its grants are never read, because it may do everything.
const userAccessTable = `CREATE TABLE IF NOT EXISTS user_access (
	user_id INTEGER PRIMARY KEY,
	grants  TEXT NOT NULL,
	label   TEXT NOT NULL DEFAULT '',
	FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)`

// migrateUserAccess creates the table. What goes in it for the members that
// already exist is decided above this layer, which knows what permissions are:
// see GiveMembersTheirAccess.
func migrateUserAccess(db *sql.DB) error {
	if _, err := db.Exec(userAccessTable); err != nil {
		return fmt.Errorf("user access (table): %w", err)
	}
	return nil
}

// GiveMembersTheirAccess writes grants — the stored text of the permissions — for
// every member that has none. The caller passes what members could do before
// permissions existed; it runs at every start and after a restore, so a backup
// taken by a version without permissions comes back with its members working as
// they did. Re-running it is harmless: it only writes rows that are missing, so a
// choice the administrator made is never touched again. It returns how many it wrote.
func GiveMembersTheirAccess(db *sql.DB, grants string) (int, error) {
	if _, err := db.Exec(userAccessTable); err != nil {
		return 0, fmt.Errorf("user access (table): %w", err)
	}
	res, err := db.Exec(`INSERT INTO user_access (user_id, grants)
		SELECT id, ? FROM users
		WHERE role = 'user' AND id NOT IN (SELECT user_id FROM user_access)`,
		grants)
	if err != nil {
		return 0, fmt.Errorf("user access (members): %w", err)
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}
