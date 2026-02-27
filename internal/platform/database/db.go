package database

import (
	"database/sql"
	"encoding/json"
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

	if err := runMigrations(db); err != nil {
		return nil, err
	}

	return &DB{DB: db}, nil
}

func runMigrations(db *sql.DB) error {
	// 0. Ensure schema_version table exists
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);`)
	if err != nil {
		return fmt.Errorf("failed to create schema_version table: %v", err)
	}

	// 1. Get current version
	var currentVersion int
	err = db.QueryRow("SELECT version FROM schema_version").Scan(&currentVersion)
	if err == sql.ErrNoRows {
		currentVersion = 0
	} else if err != nil {
		return fmt.Errorf("failed to query schema version: %v", err)
	}

	// --- VERSION 1: Initial Schema & Legacy Migrations ---
	if currentVersion < 1 {
		slog.Info("Applying schema migration", "version", 1)
		queries := []string{
			`CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				username TEXT NOT NULL UNIQUE,
				password TEXT NOT NULL,
				role TEXT NOT NULL DEFAULT 'user',
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);`,
			`CREATE TABLE IF NOT EXISTS system_settings (
				key TEXT PRIMARY KEY,
				value TEXT
			);`,
			`CREATE TABLE IF NOT EXISTS items (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				parent_id INTEGER,
				user_id INTEGER NOT NULL DEFAULT 0,
				type TEXT NOT NULL,
				x INTEGER NOT NULL,
				y INTEGER NOT NULL,
				w INTEGER NOT NULL,
				h INTEGER NOT NULL,
				content TEXT,
				url TEXT,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY(parent_id) REFERENCES items(id) ON DELETE CASCADE,
				FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
			);`,
			`ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'system';`,
			`ALTER TABLE users ADD COLUMN accent_color TEXT DEFAULT 'blue';`,
			`ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en';`,
			`ALTER TABLE users ADD COLUMN grid_columns_pc INTEGER DEFAULT 12;`,
			`ALTER TABLE users ADD COLUMN grid_columns_tablet INTEGER DEFAULT 4;`,
			`ALTER TABLE users ADD COLUMN grid_columns_mobile INTEGER DEFAULT 2;`,
			`ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT '';`,
			`ALTER TABLE users ADD COLUMN project_name TEXT DEFAULT 'Lastboard';`,
			`ALTER TABLE items ADD COLUMN url TEXT;`,
			`ALTER TABLE items ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0;`,
			`ALTER TABLE users ADD COLUMN beta_updates BOOLEAN DEFAULT 0;`,
			`ALTER TABLE users ADD COLUMN widget_min_width INTEGER DEFAULT 140;`,
		}

		for _, query := range queries {
			_, err := db.Exec(query)
			if err != nil {
				// Fallback for existing installations that might have these columns already
				if strings.Contains(err.Error(), "duplicate column name") {
					continue
				}
				slog.Warn("Migration v1 notice", "error", err)
			}
		}

		// Mark as Version 1
		_, err = db.Exec("INSERT OR REPLACE INTO schema_version (version) VALUES (1)")
		if err != nil {
			return fmt.Errorf("failed to update schema version to 1: %v", err)
		}
		slog.Info("Schema migration applied", "version", 1)
	}

	// M5: assign any items still at user_id = 0 to the first admin.
	if err := migrateOrphanedItems(db); err != nil {
		slog.Warn("Orphan migration warning", "error", err)
	}

	// M6: migrate legacy visibility flags
	if err := migrateVisibilityFlags(db); err != nil {
		slog.Warn("Visibility migration warning", "error", err)
	}

	// --- VERSION 2: Login Attempts Persistence ---
	if currentVersion < 2 {
		slog.Info("Applying schema migration", "version", 2)
		_, err := db.Exec(`CREATE TABLE IF NOT EXISTS login_attempts (
			ip TEXT PRIMARY KEY,
			count INTEGER NOT NULL DEFAULT 0,
			first_seen DATETIME NOT NULL,
			locked_until DATETIME
		)`)
		if err != nil {
			return fmt.Errorf("migration v2 failed: %v", err)
		}
		_, err = db.Exec("INSERT OR REPLACE INTO schema_version (version) VALUES (2)")
		if err != nil {
			return fmt.Errorf("failed to update schema version to 2: %v", err)
		}
		slog.Info("Schema migration applied", "version", 2)
	}

	return nil
}

// migrateOrphanedItems assigns dashboard items with user_id = 0 to the first
// admin user.  This covers two scenarios:
//   - Existing installs upgrading to per-user isolation (items predate the column).
//   - Fresh installs where seedItems ran before the admin account was created;
//     SetupHandler calls the same UPDATE, but this is the safety net if that path
//     is ever bypassed.
func migrateOrphanedItems(db *sql.DB) error {
	var adminID int
	err := db.QueryRow("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").Scan(&adminID)
	if err != nil {
		// No admin yet (fresh install, pre-setup). SetupHandler will handle it.
		return nil
	}

	result, err := db.Exec("UPDATE items SET user_id = ? WHERE user_id = 0", adminID)
	if err != nil {
		return err
	}

	if rows, _ := result.RowsAffected(); rows > 0 {
		slog.Info("Legacy migration: assigned orphaned items to admin", "count", rows, "admin_id", adminID)
	}
	return nil
}

// migrateVisibilityFlags converts legacy per-device visibility flags
// (visibleMobile, visibleTablet) into the unified visibleTouch flag.
// Items that already have visibleTouch are left unchanged (only legacy
// keys are removed).  The migration is idempotent.
func migrateVisibilityFlags(db *sql.DB) error {
	rows, err := db.Query(`SELECT id, content FROM items WHERE content LIKE '%visibleMobile%' OR content LIKE '%visibleTablet%'`)
	if err != nil {
		return err
	}
	defer rows.Close()

	var migrated int
	for rows.Next() {
		var id int
		var content sql.NullString
		if err := rows.Scan(&id, &content); err != nil {
			continue
		}
		if !content.Valid || content.String == "" {
			continue
		}

		var data map[string]interface{}
		if err := json.Unmarshal([]byte(content.String), &data); err != nil {
			continue
		}

		// If visibleTouch is already set, just remove legacy keys
		if _, exists := data["visibleTouch"]; !exists {
			// Derive visibleTouch: default true unless a legacy flag was explicitly false
			visibleTouch := true
			if vm, ok := data["visibleMobile"]; ok {
				if vmBool, ok := vm.(bool); ok && !vmBool {
					visibleTouch = false
				}
			}
			if vt, ok := data["visibleTablet"]; ok {
				if vtBool, ok := vt.(bool); ok && !vtBool {
					visibleTouch = false
				}
			}
			data["visibleTouch"] = visibleTouch
		}

		// Remove legacy keys
		delete(data, "visibleMobile")
		delete(data, "visibleTablet")

		newContent, err := json.Marshal(data)
		if err != nil {
			continue
		}

		if _, err := db.Exec("UPDATE items SET content = ? WHERE id = ?", string(newContent), id); err != nil {
			slog.Warn("Visibility migration: failed to update item", "id", id, "error", err)
			continue
		}
		migrated++
	}

	if migrated > 0 {
		slog.Info("Visibility migration: converted legacy flags to visibleTouch", "count", migrated)
	}
	return rows.Err()
}
