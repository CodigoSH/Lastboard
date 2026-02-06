package database

import (
	"database/sql"
	"log"
	"strings"

	_ "modernc.org/sqlite"
)

type DB struct {
	*sql.DB
}

func InitDB(dsn string) (*DB, error) {
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
		log.Printf("Warning: failed to set WAL mode: %v", err)
	}
	// Busy timeout to prevent "database is locked" errors in high concurrency
	if _, err := db.Exec("PRAGMA busy_timeout = 5000"); err != nil {
		log.Printf("Warning: failed to set busy_timeout: %v", err)
	}

	if err := runMigrations(db); err != nil {
		return nil, err
	}

	return &DB{DB: db}, nil
}

func runMigrations(db *sql.DB) error {
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
		// Add new columns if they don't exist (SQLite ignores ADD COLUMN if exists usually, but modernc might strict.
		// We'll wrap in try-catch block style or just append.
		// Simplest for this demo: Try add each. If fail, assume exists.
		`ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'system';`,
		`ALTER TABLE users ADD COLUMN accent_color TEXT DEFAULT 'blue';`,
		`ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en';`,
		`ALTER TABLE users ADD COLUMN grid_columns_pc INTEGER DEFAULT 12;`,
		`ALTER TABLE users ADD COLUMN grid_columns_tablet INTEGER DEFAULT 4;`,
		`ALTER TABLE users ADD COLUMN grid_columns_mobile INTEGER DEFAULT 2;`,
		`ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT '';`,
		`ALTER TABLE users ADD COLUMN project_name TEXT DEFAULT 'Kashboard';`,
		// Add url column for direct access (required for some strict persistence modes)
		`ALTER TABLE items ADD COLUMN url TEXT;`,
		// M5: per-user dashboard isolation — backfill column on existing tables
		`ALTER TABLE items ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0;`,
		`ALTER TABLE items ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0;`,
		`ALTER TABLE users ADD COLUMN beta_updates BOOLEAN DEFAULT 0;`,
		`ALTER TABLE users ADD COLUMN widget_min_width INTEGER DEFAULT 140;`,
	}

	for _, query := range queries {
		_, err := db.Exec(query)
		if err != nil {
			// Check if error is about duplicate column
			errStr := err.Error()
			if strings.Contains(errStr, "duplicate column name") {
				// Silently ignore
				continue
			}
			log.Printf("Migration notice: %v", err)
		}
	}
	log.Println("Migrations completed successfully.")

	// M5: assign any items still at user_id = 0 to the first admin.
	// On a fresh install the admin does not exist yet; that path is
	// handled by SetupHandler after the account is created.
	if err := migrateOrphanedItems(db); err != nil {
		log.Printf("Orphan migration warning: %v", err)
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
		log.Printf("Legacy migration: assigned %d orphaned item(s) to admin user id=%d", rows, adminID)
	}
	return nil
}
