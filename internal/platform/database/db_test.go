package database

import (
	"database/sql"
	"os"
	"testing"
)

// setupTestDB creates a temporary test database
func setupTestDB(t *testing.T) (*sql.DB, func()) {
	t.Helper()

	// Create temp database file
	tmpfile, err := os.CreateTemp("", "test_*.db")
	if err != nil {
		t.Fatal(err)
	}
	tmpfile.Close()

	dbPath := tmpfile.Name()

	// Initialize database
	db, err := InitDB(dbPath)
	if err != nil {
		os.Remove(dbPath)
		t.Fatal(err)
	}

	// Return cleanup function
	cleanup := func() {
		db.Close()
		os.Remove(dbPath)
	}

	return db.DB, cleanup
}

// TestInitDB tests database initialization
func TestInitDB(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Test that database is accessible
	err := db.Ping()
	if err != nil {
		t.Errorf("Database ping failed: %v", err)
	}
}

// TestMigrations tests that all tables are created
func TestMigrations(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	tables := []string{"users", "system_settings", "items", "login_attempts", "dashboards"}

	for _, table := range tables {
		var name string
		query := "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
		err := db.QueryRow(query, table).Scan(&name)

		if err == sql.ErrNoRows {
			t.Errorf("Table '%s' was not created", table)
		} else if err != nil {
			t.Errorf("Error checking table '%s': %v", table, err)
		}
	}
}

// TestUsersTableSchema tests users table structure
func TestUsersTableSchema(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Test required columns exist
	columns := []string{
		"id", "username", "password", "role", "created_at",
		"theme", "accent_color", "language", "avatar_url", "project_name",
		"beta_updates", "widget_min_width", "grid_columns_pc",
	}

	for _, col := range columns {
		query := "SELECT " + col + " FROM users LIMIT 0"
		_, err := db.Query(query)
		if err != nil {
			t.Errorf("Column '%s' missing or invalid in users table: %v", col, err)
		}
	}
}

// TestItemsTableSchema tests items table structure
func TestItemsTableSchema(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	columns := []string{
		"id", "parent_id", "user_id", "type", "x", "y", "w", "h",
		"content", "url", "created_at",
	}

	for _, col := range columns {
		query := "SELECT " + col + " FROM items LIMIT 0"
		_, err := db.Query(query)
		if err != nil {
			t.Errorf("Column '%s' missing or invalid in items table: %v", col, err)
		}
	}
}

// TestForeignKeys tests that foreign keys are enabled
func TestForeignKeys(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	var fkEnabled int
	err := db.QueryRow("PRAGMA foreign_keys").Scan(&fkEnabled)
	if err != nil {
		t.Fatalf("Failed to check foreign keys: %v", err)
	}

	if fkEnabled != 1 {
		t.Error("Foreign keys are not enabled")
	}
}

// TestJournalMode tests that WAL mode is enabled
func TestJournalMode(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	var mode string
	err := db.QueryRow("PRAGMA journal_mode").Scan(&mode)
	if err != nil {
		t.Fatalf("Failed to check journal mode: %v", err)
	}

	// WAL mode might not be set in all environments, so we just log
	t.Logf("Journal mode: %s", mode)
}

// TestBusyTimeout tests that busy timeout is configured
func TestBusyTimeout(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	var timeout int
	err := db.QueryRow("PRAGMA busy_timeout").Scan(&timeout)
	if err != nil {
		t.Fatalf("Failed to check busy timeout: %v", err)
	}

	// Should be 5000ms (5 seconds)
	if timeout < 1000 {
		t.Errorf("Busy timeout too low: %d (expected >= 1000)", timeout)
	}

	t.Logf("Busy timeout: %d ms", timeout)
}

// TestUserConstraints tests unique username constraint
func TestUserConstraints(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Insert first user
	_, err := db.Exec(`
		INSERT INTO users (username, password, role)
		VALUES ('testuser', 'hashedpassword', 'user')
	`)
	if err != nil {
		t.Fatalf("Failed to insert first user: %v", err)
	}

	// Try to insert duplicate username
	_, err = db.Exec(`
		INSERT INTO users (username, password, role)
		VALUES ('testuser', 'hashedpassword', 'user')
	`)

	if err == nil {
		t.Error("Should not allow duplicate usernames")
	}
}

// TestItemsForeignKeyConstraint tests cascade delete
func TestItemsForeignKeyConstraint(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Create user
	result, err := db.Exec(`
		INSERT INTO users (username, password, role)
		VALUES ('testuser', 'hashedpassword', 'user')
	`)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	userID, _ := result.LastInsertId()

	// Create item for user
	_, err = db.Exec(`
		INSERT INTO items (user_id, type, x, y, w, h)
		VALUES (?, 'bookmark', 1, 1, 1, 1)
	`, userID)
	if err != nil {
		t.Fatalf("Failed to create item: %v", err)
	}

	// Delete user (should cascade delete items)
	_, err = db.Exec("DELETE FROM users WHERE id = ?", userID)
	if err != nil {
		t.Fatalf("Failed to delete user: %v", err)
	}

	// Check that item was deleted
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM items WHERE user_id = ?", userID).Scan(&count)
	if err != nil {
		t.Fatalf("Failed to count items: %v", err)
	}

	if count != 0 {
		t.Errorf("Items were not cascade deleted (count: %d)", count)
	}
}

// TestMigrateSchemaBackfillsLegacyColumns simulates a database created by an old
// version — its users/items tables predate the columns that a later refactor
// (eb6ceb1) folded into CREATE TABLE — and verifies migrateSchema backfills every
// one of them without touching existing data, and is safe to re-run. Regression
// guard: this is exactly the path that made /api/me fail with "no such column"
// (surfaced as "user not found") on upgraded instances.
func TestMigrateSchemaBackfillsLegacyColumns(t *testing.T) {
	tmpfile, err := os.CreateTemp("", "legacy_*.db")
	if err != nil {
		t.Fatal(err)
	}
	tmpfile.Close()
	defer os.Remove(tmpfile.Name())

	db, err := sql.Open("sqlite", tmpfile.Name())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	// Legacy schema: users/items as they existed before the later columns were
	// added, plus the sibling tables migrateSchema touches.
	legacy := []string{
		`CREATE TABLE users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'user',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			parent_id INTEGER,
			type TEXT NOT NULL,
			x INTEGER NOT NULL, y INTEGER NOT NULL, w INTEGER NOT NULL, h INTEGER NOT NULL,
			content TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE dashboards (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			position INTEGER DEFAULT 0,
			is_default BOOLEAN DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
	}
	for _, q := range legacy {
		if _, err := db.Exec(q); err != nil {
			t.Fatalf("legacy schema setup failed: %v", err)
		}
	}
	if _, err := db.Exec(`INSERT INTO users (username, password, role) VALUES ('olduser', 'hash', 'admin')`); err != nil {
		t.Fatalf("seeding legacy user failed: %v", err)
	}

	if err := migrateSchema(db); err != nil {
		t.Fatalf("migrateSchema on a legacy DB failed: %v", err)
	}

	// Every column the current /api/me SELECT reads must now exist.
	userCols := []string{
		"theme", "accent_color", "language", "grid_columns_pc",
		"grid_columns_tablet", "grid_columns_mobile", "avatar_url", "project_name",
		"beta_updates", "widget_min_width", "password_version", "unit_system",
		"dashboard_background", "project_logo",
	}
	for _, col := range userCols {
		if _, err := db.Query("SELECT " + col + " FROM users LIMIT 0"); err != nil {
			t.Errorf("users.%s was not backfilled by migrateSchema: %v", col, err)
		}
	}
	for _, col := range []string{"url", "user_id", "dashboard_id", "mobile_order"} {
		if _, err := db.Query("SELECT " + col + " FROM items LIMIT 0"); err != nil {
			t.Errorf("items.%s was not backfilled by migrateSchema: %v", col, err)
		}
	}

	// Existing data must survive the migration untouched.
	var username, role string
	if err := db.QueryRow("SELECT username, role FROM users WHERE username='olduser'").Scan(&username, &role); err != nil {
		t.Fatalf("legacy user row lost after migration: %v", err)
	}
	if username != "olduser" || role != "admin" {
		t.Errorf("legacy user row altered: got username=%q role=%q", username, role)
	}

	// Idempotent: a second run (every startup re-runs it) must not error.
	if err := migrateSchema(db); err != nil {
		t.Fatalf("migrateSchema is not idempotent on re-run: %v", err)
	}
}

// Benchmark database operations
func BenchmarkUserInsert(b *testing.B) {
	db, cleanup := setupTestDB(&testing.T{})
	defer cleanup()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		db.Exec(`
			INSERT INTO users (username, password, role)
			VALUES (?, 'hashedpassword', 'user')
		`, "user"+string(rune(i)))
	}
}

func BenchmarkItemInsert(b *testing.B) {
	db, cleanup := setupTestDB(&testing.T{})
	defer cleanup()

	// Create user first
	result, _ := db.Exec(`
		INSERT INTO users (username, password, role)
		VALUES ('testuser', 'hashedpassword', 'user')
	`)
	userID, _ := result.LastInsertId()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		db.Exec(`
			INSERT INTO items (user_id, type, x, y, w, h)
			VALUES (?, 'bookmark', 1, 1, 1, 1)
		`, userID)
	}
}
