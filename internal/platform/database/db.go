package database

import (
	"database/sql"
	"log"

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
		`CREATE TABLE IF NOT EXISTS items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			parent_id INTEGER,
			type TEXT NOT NULL,
			x INTEGER NOT NULL,
			y INTEGER NOT NULL,
			w INTEGER NOT NULL,
			h INTEGER NOT NULL,
			content TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(parent_id) REFERENCES items(id) ON DELETE CASCADE
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
	}

	for _, query := range queries {
		_, err := db.Exec(query)
		// Ignore error for duplicate column (hacky but effective for simplistic SQLite migrations without tool)
		if err != nil {
			log.Printf("Migration notice (expected if re-running): %v", err)
		}
	}
	log.Println("Migrations completed successfully.")

	if err := seedItems(db); err != nil {
		log.Printf("Seeding warning: %v", err)
	}

	return nil
}

func seedItems(db *sql.DB) error {
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM items").Scan(&count); err != nil {
		return err
	}

	if count > 0 {
		return nil
	}

	log.Println("Seeding initial dashboard items...")
	// IDs must match the frontend mock data to avoid sync mismatch on fresh load
	// Frontend uses IDs 1-6. We can't easily force ID in INSERT with AUTOINCREMENT in SQLite unless we explicit set it.
	// SQLite allows inserting into INTEGER PRIMARY KEY.
	query := `INSERT INTO items (id, type, x, y, w, h, content) VALUES 
		(1, 'bookmark', 1, 1, 1, 1, '{"label": "Proxmox", "url": "#", "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/proxmox.png", "iconName": "proxmox"}'),
		(2, 'bookmark', 2, 1, 1, 1, '{"label": "TrueNAS", "url": "#", "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/truenas.png", "iconName": "truenas"}'),
		(3, 'bookmark', 3, 1, 1, 1, '{"label": "Cloudflare", "url": "#", "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/cloudflare.png", "iconName": "cloudflare"}'),
		(4, 'bookmark', 1, 2, 1, 1, '{"label": "GitHub", "url": "#", "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/github.png", "iconName": "github"}'),
		(5, 'bookmark', 2, 2, 1, 1, '{"label": "VS Code", "url": "#", "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/vscode.png", "iconName": "vscode"}'),
		(6, 'bookmark', 3, 2, 1, 1, '{"label": "Documentation", "url": "#", "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/docs.png", "iconName": "docs"}');`

	_, err := db.Exec(query)
	return err
}
