package api_test

import (
	"net/http"
	"strings"
	"testing"
)

// TestSigningInMovesABcryptHashToArgon2id.
//
// Every account on an installation from before this change has a bcrypt hash
// (createUser writes one, as the old binary did). The first correct sign-in
// replaces it; a wrong one does not; the session generation does not move, so
// nobody is signed out elsewhere; and the account keeps signing in afterwards.
func TestSigningInMovesABcryptHashToArgon2id(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()

	createUser(t, db, "fromBefore", "old-password", "admin")
	hash := func() (string, int) {
		var h string
		var v int
		db.QueryRow("SELECT password, password_version FROM users WHERE username = 'fromBefore'").Scan(&h, &v)
		return h, v
	}
	before, generation := hash()
	if !strings.HasPrefix(before, "$2") {
		t.Fatalf("the fixture is not a bcrypt hash: %q", before)
	}

	resp, err := http.Post(server.URL+"/api/login", "application/json",
		strings.NewReader(`{"username":"fromBefore","password":"wrong-password"}`))
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if after, _ := hash(); after != before {
		t.Fatal("a failed sign-in changed the stored hash")
	}

	loginAndGetCookie(t, server, "fromBefore", "old-password")
	after, generationAfter := hash()
	if !strings.HasPrefix(after, "$argon2id$") {
		t.Fatalf("after a correct sign-in the hash is still %q", after[:7])
	}
	if generationAfter != generation {
		t.Errorf("password_version went from %d to %d: the upgrade signed people out", generation, generationAfter)
	}

	// And it still opens with the same password.
	loginAndGetCookie(t, server, "fromBefore", "old-password")
	if again, _ := hash(); again != after {
		t.Error("a second sign-in rehashed an Argon2id hash that was already current")
	}
}
