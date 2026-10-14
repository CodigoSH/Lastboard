package api_test

import (
	"fmt"
	"net/http"
	"strings"
	"testing"
)

func postJSONAs(t *testing.T, s *userSession, url, body string) int {
	t.Helper()
	req, _ := http.NewRequest("POST", url, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	return resp.StatusCode
}

// Asking for the current password is a way to guess it, and a stolen session
// cookie is enough to ask. The sign-in page stops guessing after a few failures;
// the places that ask again — changing the password, deleting an account — stop
// it the same way, per account, so the cookie does not turn into a free password
// oracle.
func TestConfirmingAPasswordStopsAfterTooManyFailures(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()
	createUser(t, db.DB, "boss", "correcthorse", "admin")
	createUser(t, db.DB, "bob", "password123", "user")
	boss := doLogin(t, server.URL, "boss", "correcthorse")
	bob := doLogin(t, server.URL, "bob", "password123")

	change := func(s *userSession, current string) int {
		return postJSONAs(t, s, server.URL+"/api/user/change-password",
			fmt.Sprintf(`{"current_password":%q,"new_password":"a-brand-new-passphrase"}`, current))
	}

	for i := 0; i < 5; i++ {
		if code := change(boss, "wrong-guess"); code != http.StatusUnauthorized {
			t.Fatalf("failure %d answered %d, want 401", i+1, code)
		}
	}
	if code := change(boss, "correcthorse"); code != http.StatusTooManyRequests {
		t.Errorf("after five failures even the right password answered %d, want 429", code)
	}

	// The same account is locked out of the other places that ask, too.
	if code := postJSONAs(t, boss, server.URL+"/api/users/delete", `{"id":2,"admin_password":"correcthorse"}`); code != http.StatusTooManyRequests {
		t.Errorf("deleting an account after the failures answered %d, want 429", code)
	}

	// Somebody else's account is not.
	if code := change(bob, "password123"); code != http.StatusOK {
		t.Errorf("another account was locked out too: %d", code)
	}
}

// Failures that are followed by the right password start over.
func TestARightPasswordClearsTheFailures(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()
	createUser(t, db.DB, "bob", "password123", "user")

	for round := 0; round < 3; round++ {
		s := doLogin(t, server.URL, "bob", "password123")
		for i := 0; i < 3; i++ {
			postJSONAs(t, s, server.URL+"/api/user/change-password", `{"current_password":"nope","new_password":"a-brand-new-passphrase"}`)
		}
		// Three failures, then the right one: allowed, and the count is gone.
		code := postJSONAs(t, s, server.URL+"/api/user/change-password",
			`{"current_password":"password123","new_password":"password123"}`)
		if code != http.StatusOK {
			t.Fatalf("round %d: the right password answered %d after only three failures", round, code)
		}
	}
}

// The reset of the whole instance asks for the password too, and is the last
// place a guess should be free. Only wrong passwords are sent here: the right
// one would reset the instance.
func TestTheFactoryResetStopsAfterTooManyWrongPasswords(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")
	cookie := loginAndGetCookie(t, server, "boss", "correcthorse")

	reset := func(pw string) int {
		req, _ := http.NewRequest("POST", server.URL+"/api/system/reset", strings.NewReader(fmt.Sprintf(`{"password":%q}`, pw)))
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(cookie)
		req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "test-csrf-token"})
		req.Header.Set("X-CSRF-Token", "test-csrf-token")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		return resp.StatusCode
	}
	for i := 0; i < 5; i++ {
		if code := reset("wrong-guess"); code != http.StatusUnauthorized {
			t.Fatalf("failure %d answered %d, want 401", i+1, code)
		}
	}
	if code := reset("another-wrong-guess"); code != http.StatusTooManyRequests {
		t.Errorf("the sixth wrong password answered %d, want 429", code)
	}
}

// A lockout ends. Once it has, one more mistake counts as the first of a new
// round, not as the sixth of the old one.
func TestAnEndedLockoutStartsFromScratch(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()
	createUser(t, db.DB, "bob", "password123", "user")
	s := doLogin(t, server.URL, "bob", "password123")
	change := func(current string) int {
		return postJSONAs(t, s, server.URL+"/api/user/change-password",
			fmt.Sprintf(`{"current_password":%q,"new_password":"a-brand-new-passphrase"}`, current))
	}

	for i := 0; i < 5; i++ {
		change("wrong-guess")
	}
	if code := change("password123"); code != http.StatusTooManyRequests {
		t.Fatalf("not locked after five failures: %d", code)
	}

	// Time passes: the lockout ran out a minute ago.
	if _, err := db.DB.Exec(`UPDATE login_attempts SET locked_until = datetime('now', '-1 minute') WHERE ip LIKE 'account:%'`); err != nil {
		t.Fatal(err)
	}

	if code := change("wrong-guess"); code != http.StatusUnauthorized {
		t.Fatalf("one mistake after the lockout answered %d, want 401", code)
	}
	if code := change("password123"); code != http.StatusOK {
		t.Errorf("the right password after one mistake answered %d: the old failures were still counted", code)
	}
}
