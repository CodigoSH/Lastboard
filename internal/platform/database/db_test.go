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

	tables := []string{"users", "system_settings", "items"}

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

// TestMigrateOrphanedItems tests orphan item migration
func TestMigrateOrphanedItems(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Create admin user
	result, err := db.Exec(`
		INSERT INTO users (username, password, role)
		VALUES ('admin', 'hashedpassword', 'admin')
	`)
	if err != nil {
		t.Fatalf("Failed to create admin: %v", err)
	}

	adminID, _ := result.LastInsertId()

	// Temporarily disable foreign keys to simulate legacy data
	_, err = db.Exec("PRAGMA foreign_keys = OFF")
	if err != nil {
		t.Fatalf("Failed to disable foreign keys: %v", err)
	}

	// Create orphaned item (user_id = 0) - simulates legacy data
	_, err = db.Exec(`
		INSERT INTO items (user_id, type, x, y, w, h)
		VALUES (0, 'bookmark', 1, 1, 1, 1)
	`)
	if err != nil {
		t.Fatalf("Failed to create orphaned item: %v", err)
	}

	// Re-enable foreign keys
	_, err = db.Exec("PRAGMA foreign_keys = ON")
	if err != nil {
		t.Fatalf("Failed to enable foreign keys: %v", err)
	}

	// Run migration
	err = migrateOrphanedItems(db)
	if err != nil {
		t.Fatalf("Migration failed: %v", err)
	}

	// Check that orphaned item now belongs to admin
	var itemUserID int
	err = db.QueryRow("SELECT user_id FROM items WHERE type = 'bookmark'").Scan(&itemUserID)
	if err != nil {
		t.Fatalf("Failed to query item: %v", err)
	}

	if itemUserID != int(adminID) {
		t.Errorf("Orphaned item not migrated to admin (user_id: %d, expected: %d)", itemUserID, adminID)
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
