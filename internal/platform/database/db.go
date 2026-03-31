package database

import (
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
	_, err := db.Exec(`ALTER TABLE items ADD COLUMN dashboard_id INTEGER REFERENCES dashboards(id) ON DELETE CASCADE`)
	if err != nil {
		if containsAny(err.Error(), "duplicate column name") {
			slog.Debug("migrateSchema: dashboard_id column already exists, skipping")
			return nil
		}
		return err
	}
	return nil
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
