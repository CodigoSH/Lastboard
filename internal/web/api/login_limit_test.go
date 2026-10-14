package api_test

import (
	"net/http"
	"strings"
	"sync"
	"testing"
)

// Passwords tried at the same time must all be counted. Each attempt used to
// read the count before hashing and write back "what I read, plus one", so a
// burst of N from one address recorded one failure and the lockout never came.
func TestSimultaneousWrongPasswordsAreAllCounted(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")

	const burst = 12
	var wg sync.WaitGroup
	for i := 0; i < burst; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			resp, err := http.Post(server.URL+"/api/login", "application/json",
				strings.NewReader(`{"username":"boss","password":"wrong-password"}`))
			if err == nil {
				resp.Body.Close()
			}
		}()
	}
	wg.Wait()

	var count int
	var locked *string
	if err := db.QueryRow(`SELECT count, locked_until FROM login_attempts`).Scan(&count, &locked); err != nil {
		t.Fatalf("no attempts recorded: %v", err)
	}
	if count < burst {
		t.Errorf("%d simultaneous failures were recorded as %d", burst, count)
	}
	if locked == nil {
		t.Errorf("the address was not locked out after %d failures", burst)
	}
}
