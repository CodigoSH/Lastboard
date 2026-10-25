package database

import (
	"database/sql"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/access"
)

func addUser(t *testing.T, db *sql.DB, id int, name, role string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO users (id, username, password, role) VALUES (?, ?, 'x', ?)`, id, name, role); err != nil {
		t.Fatal(err)
	}
}

func grantsOf(t *testing.T, db *sql.DB, id int) (access.Grants, bool) {
	t.Helper()
	var raw string
	err := db.QueryRow(`SELECT grants FROM user_access WHERE user_id = ?`, id).Scan(&raw)
	if err == sql.ErrNoRows {
		return access.Grants{}, false
	}
	if err != nil {
		t.Fatal(err)
	}
	return access.Decode(raw), true
}

// Members that existed before permissions keep everything they could do; the
// administrator needs no grants, because it may do everything.
func TestMembersFromBeforePermissionsKeepWhatTheyHad(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	addUser(t, db, 1, "admin", "admin")
	addUser(t, db, 2, "ana", "user")
	addUser(t, db, 3, "luis", "user")

	n, err := GiveMembersTheirAccess(db, access.Encode(access.Existing()))
	if err != nil {
		t.Fatal(err)
	}
	if n != 2 {
		t.Errorf("wrote %d rows, want 2 (the two members)", n)
	}
	for _, id := range []int{2, 3} {
		g, ok := grantsOf(t, db, id)
		if !ok || g != access.Existing() {
			t.Errorf("member %d: got %+v (row=%v), want the grants it had before", id, g, ok)
		}
	}
	if _, ok := grantsOf(t, db, 1); ok {
		t.Error("the administrator was given grants; it may do everything without them")
	}
}

// The migration runs at every start. A choice the administrator made must
// survive every one of them.
func TestTheAdministratorsChoiceSurvivesARestart(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	addUser(t, db, 1, "admin", "admin")
	addUser(t, db, 2, "ana", "user")
	if _, err := GiveMembersTheirAccess(db, access.Encode(access.Existing())); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`UPDATE user_access SET grants = ? WHERE user_id = 2`, access.Encode(access.Viewer())); err != nil {
		t.Fatal(err)
	}
	if n, err := GiveMembersTheirAccess(db, access.Encode(access.Existing())); err != nil || n != 0 {
		t.Fatalf("second run wrote %d rows (err %v), want none", n, err)
	}
	if g, _ := grantsOf(t, db, 2); g != access.Viewer() {
		t.Errorf("a restricted member got %+v back after a restart", g)
	}
}

func TestAMembersPermissionsGoWithTheAccount(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	addUser(t, db, 1, "admin", "admin")
	addUser(t, db, 2, "ana", "user")
	if _, err := GiveMembersTheirAccess(db, access.Encode(access.Existing())); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`DELETE FROM users WHERE id = 2`); err != nil {
		t.Fatal(err)
	}
	if _, ok := grantsOf(t, db, 2); ok {
		t.Error("a deleted account's permissions stayed behind")
	}
}
