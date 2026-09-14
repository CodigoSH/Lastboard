package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

type DB struct {
	*sql.DB
}

// schemaVersion is what this binary knows how to read and write. It is stored
// in the database's PRAGMA user_version, and a database reporting a HIGHER one
// was written by a newer Lastboard than this.
//
// That is not hypothetical: Lastboard updates itself and offers a beta channel,
// so people move from beta to stable and back, which means downgrading is
// routine. An old binary opening a newer database used to notice nothing at
// all — it would run, and write, against a shape it does not understand.
//
// Raise this whenever a migration changes what an older binary could safely
// read. Adding a column an older binary simply ignores does not need a bump;
// changing the meaning of existing data does.
const schemaVersion = 1

// ErrSchemaTooNew is returned when the database was written by a newer version.
var ErrSchemaTooNew = errors.New("database schema is newer than this build")

// checkSchemaVersion refuses to touch a database from the future, and stamps
// the current version on one it has just migrated.
func checkSchemaVersion(db *sql.DB) error {
	var found int
	if err := db.QueryRow("PRAGMA user_version").Scan(&found); err != nil {
		return fmt.Errorf("reading schema version: %w", err)
	}
	if found > schemaVersion {
		return fmt.Errorf("%w: the database reports version %d and this build understands %d — "+
			"update Lastboard, or restore a backup taken with this version",
			ErrSchemaTooNew, found, schemaVersion)
	}
	if found < schemaVersion {
		// PRAGMA does not take parameters, and schemaVersion is a constant of
		// ours rather than anything a user can reach.
		if _, err := db.Exec(fmt.Sprintf("PRAGMA user_version = %d", schemaVersion)); err != nil {
			return fmt.Errorf("stamping schema version: %w", err)
		}
		slog.Info("Database schema stamped", "from", found, "to", schemaVersion)
	}
	return nil
}

func InitDB(dsn string) (*DB, error) {
	// 1. Ensure the directory for the database exists
	dir := filepath.Dir(dsn)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, fmt.Errorf("failed to create database directory %s: %v", dir, err)
	}

	// 2. Proactive check for write permissions to provide a better error message
	// than SQLite's confusing "out of memory (14)" which often means CANTOPEN.
	testFile := filepath.Join(dir, ".perm_test")
	if f, err := os.Create(testFile); err != nil {
		return nil, fmt.Errorf("database directory %s is not writable: %v (check Docker volume permissions)", dir, err)
	} else {
		f.Close()
		os.Remove(testFile)
	}

	// Embed per-connection pragmas into the DSN using SQLite URI format so they
	// are applied to every connection the pool creates, not just the first one.
	// A plain PRAGMA via db.Exec() only affects one connection; with MaxOpenConns>1
	// new pool connections would silently bypass foreign_key enforcement, allowing
	// DELETE operations that should cascade to leave orphaned child rows instead.
	if !strings.HasPrefix(dsn, "file:") {
		dsn = "file:" + dsn
	}
	if strings.Contains(dsn, "?") {
		dsn += "&_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)"
	} else {
		dsn += "?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)"
	}

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	// WAL mode is a persistent DB-file property; set it once at startup.
	if _, err := db.Exec("PRAGMA journal_mode = WAL"); err != nil {
		slog.Warn("Failed to set WAL mode", "error", err)
	}

	// Limit connection pool to prevent unbounded memory usage (modernc sqlite is pure go)
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(1 * time.Hour)

	// Checked before anything is written: a database from the future must not be
	// migrated, only refused.
	var found int
	if err := db.QueryRow("PRAGMA user_version").Scan(&found); err != nil {
		return nil, fmt.Errorf("reading schema version: %w", err)
	}
	if found > schemaVersion {
		return nil, fmt.Errorf("%w: the database reports version %d and this build understands %d — "+
			"update Lastboard, or restore a backup taken with this version",
			ErrSchemaTooNew, found, schemaVersion)
	}

	if err := initSchema(db); err != nil {
		return nil, err
	}

	if err := migrateSchema(db); err != nil {
		return nil, fmt.Errorf("schema migration failed: %w", err)
	}

	if err := checkSchemaVersion(db); err != nil {
		return nil, err
	}

	return &DB{DB: db}, nil
}

func initSchema(db *sql.DB) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id                   INTEGER PRIMARY KEY AUTOINCREMENT,
			username             TEXT NOT NULL UNIQUE,
			password             TEXT NOT NULL,
			role                 TEXT NOT NULL DEFAULT 'user',
			created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
			theme                TEXT DEFAULT 'dark',
			accent_color         TEXT DEFAULT 'orange',
			language             TEXT DEFAULT 'en',
			grid_columns_pc      INTEGER DEFAULT 12,
			grid_columns_tablet  INTEGER DEFAULT 4,
			grid_columns_mobile  INTEGER DEFAULT 2,
			avatar_url           TEXT DEFAULT '',
			project_name         TEXT DEFAULT 'Lastboard',
			beta_updates         BOOLEAN DEFAULT 0,
			widget_min_width     INTEGER DEFAULT 140,
			password_version     INTEGER NOT NULL DEFAULT 0,
			unit_system          TEXT DEFAULT 'metric',
			dashboard_background TEXT DEFAULT ''
		);`,
		`CREATE TABLE IF NOT EXISTS system_settings (
			key   TEXT PRIMARY KEY,
			value TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS items (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			parent_id  INTEGER,
			user_id    INTEGER NOT NULL DEFAULT 0,
			type       TEXT NOT NULL,
			x          INTEGER NOT NULL,
			y          INTEGER NOT NULL,
			w          INTEGER NOT NULL,
			h          INTEGER NOT NULL,
			content    TEXT,
			url        TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(parent_id) REFERENCES items(id) ON DELETE CASCADE,
			FOREIGN KEY(user_id)   REFERENCES users(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS login_attempts (
			ip           TEXT PRIMARY KEY,
			count        INTEGER NOT NULL DEFAULT 0,
			first_seen   DATETIME NOT NULL,
			locked_until DATETIME
		);`,
		`CREATE TABLE IF NOT EXISTS dashboards (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id    INTEGER NOT NULL,
			name       TEXT NOT NULL,
			position   INTEGER DEFAULT 0,
			is_default BOOLEAN DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		);`,
		`CREATE INDEX IF NOT EXISTS idx_dashboards_user_id ON dashboards(user_id);`,
		// Append-only monitoring history. Keyed by item_id (the monitor IS the
		// bookmark), so ON DELETE CASCADE prunes a bookmark's history with it.
		// latency_ms is NULL when the check failed; status_code is 0 with no response.
		`CREATE TABLE IF NOT EXISTS monitor_checks (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			item_id     INTEGER NOT NULL,
			checked_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			up          BOOLEAN NOT NULL,
			latency_ms  INTEGER,
			status_code INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
		);`,
		// Covering index for the overview's uptime aggregate: with `up` in the
		// index, COUNT(*)/SUM(up) is answered without touching the table at all
		// (EXPLAIN says COVERING INDEX; 39ms → 20ms over 144k rows).
		//
		// It replaces idx_monitor_checks_item rather than sitting beside it —
		// the leading columns are the same, so every lookup that used the old
		// one uses this, and a second index would only cost writes on each
		// check. The DROP matters: widening an index while keeping its NAME is
		// a no-op under CREATE INDEX IF NOT EXISTS, so existing databases would
		// silently keep the narrow one and never see the improvement.
		`DROP INDEX IF EXISTS idx_monitor_checks_item;`,
		`CREATE INDEX IF NOT EXISTS idx_monitor_checks_item_up ON monitor_checks(item_id, checked_at, up);`,
		// The retention prune filters on checked_at alone, which the index above
		// cannot serve (item_id is its leading column), so it would scan the
		// whole table. CREATE INDEX IF NOT EXISTS runs on every boot, so
		// existing databases pick this up without a dedicated migration.
		`CREATE INDEX IF NOT EXISTS idx_monitor_checks_time ON monitor_checks(checked_at);`,
		// Bookmark and container icons, downloaded once when they are chosen so
		// the dashboard stops asking a public CDN for them on every paint.
		// Content-addressed: the hash IS the name, so the same icon on twenty
		// bookmarks is stored once and its URL can be cached forever.
		//
		// A separate table, not a column on items: /api/dashboard returns every
		// item on each load, and inlining the bytes there would put megabytes of
		// base64 in a response the browser cannot cache separately.
		//
		// New table, so CREATE TABLE IF NOT EXISTS is enough — but any column
		// added to it later needs its own ALTER in migrateSchema, or databases
		// created before that column will never receive it.
		`CREATE TABLE IF NOT EXISTS icons (
			hash       TEXT PRIMARY KEY,
			mime       TEXT NOT NULL,
			data       BLOB NOT NULL,
			size       INTEGER NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
	}

	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			return fmt.Errorf("schema init failed: %v", err)
		}
	}

	return nil
}

// migrateSchema applies the idempotent schema migrations at startup.
//
// The "Migration N" labels are the historical order in which each migration was
// introduced, not the execution order. Migration 2 (migrateOrphanedItems) runs
// LAST on purpose: it backfills dashboard_id, so it depends on the column added
// by Migration 1 and must run after all the ALTER TABLEs. The labels are kept
// stable (rather than renumbered) so they stay traceable to the changelog.
func migrateSchema(db *sql.DB) error {
	// Migration 0 (column backfill): re-add the per-column ALTERs that an earlier
	// refactor (eb6ceb1) folded into the CREATE TABLE statements. CREATE TABLE IF
	// NOT EXISTS is a no-op on an already-existing table, so a database created
	// before a given column existed never received it once it upgraded past that
	// refactor — and a read like /api/me's SELECT then fails with "no such column",
	// which surfaced (misleadingly) as "user not found". These must stay here in
	// perpetuity: removing a column's migration re-breaks every DB old enough to
	// still need it. Idempotent — an ALTER on an existing column returns
	// "duplicate column name", which we ignore.
	backfill := []string{
		`ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'dark'`,
		`ALTER TABLE users ADD COLUMN accent_color TEXT DEFAULT 'orange'`,
		`ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en'`,
		`ALTER TABLE users ADD COLUMN grid_columns_pc INTEGER DEFAULT 12`,
		`ALTER TABLE users ADD COLUMN grid_columns_tablet INTEGER DEFAULT 4`,
		`ALTER TABLE users ADD COLUMN grid_columns_mobile INTEGER DEFAULT 2`,
		`ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN project_name TEXT DEFAULT 'Lastboard'`,
		`ALTER TABLE users ADD COLUMN beta_updates BOOLEAN DEFAULT 0`,
		`ALTER TABLE users ADD COLUMN widget_min_width INTEGER DEFAULT 140`,
		`ALTER TABLE users ADD COLUMN password_version INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE users ADD COLUMN unit_system TEXT DEFAULT 'metric'`,
		`ALTER TABLE users ADD COLUMN dashboard_background TEXT DEFAULT ''`,
		`ALTER TABLE items ADD COLUMN url TEXT`,
		`ALTER TABLE items ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0`,
	}
	for _, q := range backfill {
		if _, err := db.Exec(q); err != nil && !strings.Contains(err.Error(), "duplicate column name") {
			return err
		}
	}

	// idx_items_user_id is created here (not in initSchema) so it runs only after
	// the user_id backfill above: an items table old enough to predate the column
	// would otherwise fail the CREATE INDEX with "no such column: user_id".
	if _, err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id)`); err != nil {
		return err
	}

	// Migration 1: add dashboard_id column to items (safe to re-run)
	_, err := db.Exec(`ALTER TABLE items ADD COLUMN dashboard_id INTEGER REFERENCES dashboards(id) ON DELETE CASCADE`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return err
	}

	// Migration 3: add project_logo column to users (safe to re-run)
	_, err = db.Exec(`ALTER TABLE users ADD COLUMN project_logo TEXT DEFAULT ''`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return err
	}

	// Migration 4: demote secondary admins to user — only the first admin by ID keeps the role.
	// Safe to re-run: only affects rows where role = 'admin' or 'administrator' and id != firstAdminID.
	_, err = db.Exec(`
		UPDATE users SET role = 'user'
		WHERE (role = 'admin' OR role = 'administrator')
		  AND id != (SELECT id FROM users WHERE role = 'admin' OR role = 'administrator' ORDER BY id ASC LIMIT 1)
	`)
	if err != nil {
		return fmt.Errorf("migration 4 (demote secondary admins) failed: %w", err)
	}

	// Migration 5: add mobile_order column to items for touch/mobile reordering (safe to re-run)
	_, err = db.Exec(`ALTER TABLE items ADD COLUMN mobile_order INTEGER`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return err
	}

	// Migration 6: the default dashboard's name. It was written as
	// 'Dashboard principal' by the handler that creates it lazily — Spanish
	// whatever language the owner picked — and as the untranslated key
	// 'dashboard.default_name' by the migration below, which no locale file ever
	// defined, so it reached the screen verbatim. Both become the English name
	// used everywhere now. Only untouched defaults match: a board the owner
	// renamed keeps the name they gave it.
	_, err = db.Exec(`
		UPDATE dashboards SET name = 'Main dashboard'
		WHERE name IN ('Dashboard principal', 'dashboard.default_name')
	`)
	if err != nil {
		return fmt.Errorf("migration 6 (default dashboard name) failed: %w", err)
	}

	// Migration 7: the theme is one of the three the interface offers.
	//
	// It used to sweep 'system' into 'dark' as well, because nothing could
	// choose it: it arrived solely as this column's default and landed on
	// accounts an administrator created, while the settings panel drew those
	// accounts as dark all along. 'system' is a real choice now, so sweeping it
	// here would undo that choice on the next restart — these migrations run on
	// every start, not once. The one-off clean-up moved to migration 8.
	_, err = db.Exec(`UPDATE users SET theme = 'dark' WHERE theme IS NULL OR theme NOT IN ('light', 'dark', 'system')`)
	if err != nil {
		return fmt.Errorf("migration 7 (theme is one of three) failed: %w", err)
	}

	// Migration 8, and it runs exactly once: accounts an administrator created
	// carry 'system' without having asked for it.
	//
	// CreateUser inserted 'system' as a default nobody could choose, and the
	// settings panel drew those accounts as dark. The moment 'system' means
	// "follow the device", every one of them would start following a phone its
	// owner was never asked about — a new feature changing what an existing user
	// sees, which is the one thing a new feature must not do. They keep the dark
	// they have been looking at, and can now choose otherwise.
	//
	// Remembered with a flag rather than by bumping the schema version: these
	// migrations re-run on every start, so an ungated sweep would undo the
	// choice each restart, and a version bump would stop an older binary opening
	// the database at all — a heavy price to pay for a preference.
	// A database old enough to need this may predate system_settings, and
	// migrateSchema runs against exactly that. Creating it here costs nothing on
	// every other start and keeps the flag from failing the whole migration.
	if _, err = db.Exec(
		`CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT)`,
	); err != nil {
		return fmt.Errorf("migration 8 (settings table) failed: %w", err)
	}

	var themeSwept string
	_ = db.QueryRow(`SELECT value FROM system_settings WHERE key = 'theme_system_swept'`).Scan(&themeSwept)
	if themeSwept != "1" {
		if _, err = db.Exec(`UPDATE users SET theme = 'dark' WHERE theme = 'system'`); err != nil {
			return fmt.Errorf("migration 8 (legacy system theme) failed: %w", err)
		}
		if _, err = db.Exec(
			`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('theme_system_swept', '1')`,
		); err != nil {
			return fmt.Errorf("migration 8 (recording the sweep) failed: %w", err)
		}
	}

	// Migration 2: users from versions without multi-dashboard support have items
	// with dashboard_id IS NULL. Create a default dashboard for each affected user
	// and assign those items to it so they continue to work without any manual action.
	return migrateOrphanedItems(db)
}

func migrateOrphanedItems(db *sql.DB) error {
	// Use a dedicated connection so we can safely toggle foreign_keys for the
	// duration of the migration. SQLite re-validates ALL FK columns on every
	// updated row; legacy data may have dangling parent_id values that would
	// cause spurious failures if we left FK enforcement on.
	ctx := context.Background()
	conn, err := db.Conn(ctx)
	if err != nil {
		return err
	}
	defer conn.Close()

	if _, err := conn.ExecContext(ctx, "PRAGMA foreign_keys = OFF"); err != nil {
		slog.Warn("migrateOrphanedItems: could not disable FK checks", "error", err)
	}
	defer conn.ExecContext(ctx, "PRAGMA foreign_keys = ON") //nolint:errcheck

	// Only migrate items that belong to a real user (user_id = 0 is a legacy default).
	rows, err := conn.QueryContext(ctx,
		`SELECT DISTINCT i.user_id FROM items i
		 WHERE i.dashboard_id IS NULL
		 AND EXISTS (SELECT 1 FROM users u WHERE u.id = i.user_id)`,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	var userIDs []int
	for rows.Next() {
		var uid int
		if err := rows.Scan(&uid); err != nil {
			return err
		}
		userIDs = append(userIDs, uid)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	rows.Close()

	for _, uid := range userIDs {
		defaultDashID, err := resolveDefaultDashboard(db, uid)
		if err != nil {
			return fmt.Errorf("user %d: %w", uid, err)
		}

		res, err := conn.ExecContext(ctx,
			`UPDATE items SET dashboard_id = ? WHERE user_id = ? AND dashboard_id IS NULL`,
			defaultDashID, uid,
		)
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n > 0 {
			slog.Info("Migrated legacy items to default dashboard",
				"user_id", uid, "dashboard_id", defaultDashID, "items", n)
		}
	}
	return nil
}

// resolveDefaultDashboard returns the default dashboard ID for a user.
// If none exists it creates one, ensuring every user has a home for their items.
func resolveDefaultDashboard(db *sql.DB, userID int) (int, error) {
	var id int

	// 1. Prefer an explicitly marked default.
	err := db.QueryRow(
		`SELECT id FROM dashboards WHERE user_id = ? AND is_default = 1 LIMIT 1`, userID,
	).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err != sql.ErrNoRows {
		return 0, err
	}

	// 2. Fall back to the first dashboard the user owns.
	err = db.QueryRow(
		`SELECT id FROM dashboards WHERE user_id = ? ORDER BY id ASC LIMIT 1`, userID,
	).Scan(&id)
	if err == nil {
		_, err = db.Exec(`UPDATE dashboards SET is_default = 1 WHERE id = ?`, id)
		return id, err
	}
	if err != sql.ErrNoRows {
		return 0, err
	}

	// 3. No dashboards at all — create the initial one for this legacy user.
	// The name is stored as an i18n key so the frontend renders it in the user's language.
	res, err := db.Exec(
		// A literal name, not a translation key: `dashboard.default_name` was
		// never added to any locale file, so every board created down this path
		// was displayed to its owner as that string, verbatim.
		`INSERT INTO dashboards (user_id, name, position, is_default) VALUES (?, 'Main dashboard', 0, 1)`, userID,
	)
	if err != nil {
		return 0, err
	}
	newID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	slog.Info("Created default dashboard for legacy user", "user_id", userID, "dashboard_id", newID)
	return int(newID), nil
}
