package api_test

import (
	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/password"
	"net/http"
	"strings"
	"sync"
	"testing"
)

// Passwords tried at the same time must all be counted. Each attempt used to
// read the count before hashing and write back "what I read, plus one", so a
// burst of N from one address recorded one failure and the lockout never came.
//
// Every attempt that was told "wrong password" has to be in the count. Not the
// whole burst: once the lockout lands, the attempts still arriving are refused
// before their password is looked at, and those are rightly not failures. How
// many get through first depends on how fast the hash is, so the burst size
// is not a number this test can promise.
func TestSimultaneousWrongPasswordsAreAllCounted(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")

	const burst = 12
	var wg sync.WaitGroup
	var mu sync.Mutex
	statuses := map[int]int{}
	for i := 0; i < burst; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			resp, err := http.Post(server.URL+"/api/login", "application/json",
				strings.NewReader(`{"username":"boss","password":"wrong-password"}`))
			if err != nil {
				return
			}
			resp.Body.Close()
			mu.Lock()
			statuses[resp.StatusCode]++
			mu.Unlock()
		}()
	}
	wg.Wait()

	wrong := statuses[http.StatusUnauthorized]
	if wrong+statuses[http.StatusTooManyRequests] != burst {
		t.Fatalf("every attempt should be refused as wrong or locked out, got %v", statuses)
	}

	var count int
	var locked *string
	if err := db.QueryRow(`SELECT count, locked_until FROM login_attempts`).Scan(&count, &locked); err != nil {
		t.Fatalf("no attempts recorded: %v", err)
	}
	if count != wrong {
		t.Errorf("%d simultaneous wrong passwords were recorded as %d", wrong, count)
	}
	if locked == nil {
		t.Errorf("the address was not locked out after %d failures", wrong)
	}
}

// A passphrase longer than bcrypt's 72 bytes is a normal thing to have with
// Argon2id, and signing in with it has to work: the login used to refuse
// anything over 72 before looking at the account.
func TestALongPassphraseCanSignIn(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	long := strings.Repeat("correct horse battery staple ", 5) // 145 characters
	hash, err := password.Hash(long)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO users (username, password, role) VALUES ('boss', ?, 'admin')`, hash); err != nil {
		t.Fatal(err)
	}

	resp, err := http.Post(server.URL+"/api/login", "application/json",
		strings.NewReader(`{"username":"boss","password":"`+long+`"}`))
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("a 145-character passphrase was refused with %d", resp.StatusCode)
	}
}
