package database

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

type DB struct {
	*sql.DB
}

func InitDB(dsn string) (*DB, error) {
	// 1. Ensure the directory for the database exists
	dir := filepath.Dir(dsn)
	if err := os.MkdirAll(dir, 0755); err != nil {
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

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return nil, err
	}
	if _, err := db.Exec("PRAGMA journal_mode = WAL"); err != nil {
		slog.Warn("Failed to set WAL mode", "error", err)
	}
	// Busy timeout to prevent "database is locked" errors in high concurrency
	if _, err := db.Exec("PRAGMA busy_timeout = 5000"); err != nil {
		slog.Warn("Failed to set busy_timeout", "error", err)
	}

	// Limit connection pool to prevent unbounded memory usage (modernc sqlite is pure go)
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(1 * time.Hour)

	if err := initSchema(db); err != nil {
		return nil, err
	}

	if err := migrateSchema(db); err != nil {
		return nil, fmt.Errorf("schema migration failed: %w", err)
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
			theme                TEXT DEFAULT 'system',
			accent_color         TEXT DEFAULT 'blue',
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
		`CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);`,
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
	}

	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			return fmt.Errorf("schema init failed: %v", err)
		}
	}

	return nil
}

func migrateSchema(db *sql.DB) error {
	// Migration 1: add dashboard_id column to items (safe to re-run)
	_, err := db.Exec(`ALTER TABLE items ADD COLUMN dashboard_id INTEGER REFERENCES dashboards(id) ON DELETE CASCADE`)
	if err != nil && !containsAny(err.Error(), "duplicate column name") {
		return err
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
		`INSERT INTO dashboards (user_id, name, position, is_default) VALUES (?, 'dashboard.default_name', 0, 1)`, userID,
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

func containsAny(s string, substrings ...string) bool {
	for _, sub := range substrings {
		if len(s) >= len(sub) {
			for i := 0; i <= len(s)-len(sub); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
		}
	}
	return false
}
