package api

import (
	"database/sql"
	"testing"

	"github.com/CodigoSH/Lastboard/internal/platform/database"
	"golang.org/x/crypto/bcrypt"
)

func setupHelpersDB(t *testing.T) (*sql.DB, func()) {
	t.Helper()
	db, err := database.InitDB(":memory:")
	if err != nil {
		t.Fatalf("InitDB: %v", err)
	}
	return db.DB, func() { db.Close() }
}

func insertUser(t *testing.T, db *sql.DB, username, role string) int {
	t.Helper()
	hash, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.MinCost)
	res, err := db.Exec("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", username, string(hash), role)
	if err != nil {
		t.Fatalf("insert user %s: %v", username, err)
	}
	id, _ := res.LastInsertId()
	return int(id)
}

// TestIsFirstAdmin verifies that only the admin with the lowest ID returns true.
func TestIsFirstAdmin(t *testing.T) {
	db, cleanup := setupHelpersDB(t)
	defer cleanup()

	adminID := insertUser(t, db, "admin", "admin")
	userID := insertUser(t, db, "regular", "user")
	secondAdminID := insertUser(t, db, "admin2", "admin")

	tests := []struct {
		name   string
		userID int
		want   bool
	}{
		{"first admin is true", adminID, true},
		{"regular user is false", userID, false},
		{"second admin is false", secondAdminID, false},
		{"non-existent id is false", 9999, false},
		{"zero id is false", 0, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isFirstAdmin(db, tt.userID); got != tt.want {
				t.Errorf("isFirstAdmin(%d) = %v, want %v", tt.userID, got, tt.want)
			}
		})
	}
}

// TestIsFirstAdmin_EmptyDB verifies behaviour when no admin exists.
func TestIsFirstAdmin_EmptyDB(t *testing.T) {
	db, cleanup := setupHelpersDB(t)
	defer cleanup()

	insertUser(t, db, "onlyuser", "user")

	if isFirstAdmin(db, 1) {
		t.Error("isFirstAdmin should be false when no admin role exists")
	}
}

// TestSeedDefaultItems verifies that seeding creates items without error
// and that parent-child relationships are valid (no orphan bookmarks).
func TestSeedDefaultItems(t *testing.T) {
	db, cleanup := setupHelpersDB(t)
	defer cleanup()

	userID := insertUser(t, db, "seeduser", "user")

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	if err := SeedDefaultItems(tx, userID); err != nil {
		tx.Rollback()
		t.Fatalf("SeedDefaultItems: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("commit: %v", err)
	}

	// At least some items must exist
	var total int
	db.QueryRow("SELECT COUNT(*) FROM items WHERE user_id = ?", userID).Scan(&total)
	if total == 0 {
		t.Error("SeedDefaultItems created no items")
	}

	// All child bookmarks must reference a valid parent
	var orphans int
	db.QueryRow(`
		SELECT COUNT(*) FROM items
		WHERE user_id = ? AND parent_id IS NOT NULL
		  AND parent_id NOT IN (SELECT id FROM items WHERE user_id = ?)
	`, userID, userID).Scan(&orphans)
	if orphans > 0 {
		t.Errorf("SeedDefaultItems created %d orphan bookmarks (invalid parent_id)", orphans)
	}
}

// TestSeedDefaultItems_Idempotent verifies seeding can be called twice
// (e.g. in separate transactions) without DB errors.
func TestSeedDefaultItems_Idempotent(t *testing.T) {
	db, cleanup := setupHelpersDB(t)
	defer cleanup()

	userID := insertUser(t, db, "seeduser2", "user")

	for i := 0; i < 2; i++ {
		tx, _ := db.Begin()
		if err := SeedDefaultItems(tx, userID); err != nil {
			tx.Rollback()
			t.Fatalf("SeedDefaultItems call %d: %v", i+1, err)
		}
		tx.Commit()
	}
}
