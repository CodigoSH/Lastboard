package api_test

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/password"
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

func putJSONAs(t *testing.T, s *userSession, url, body string) (int, string) {
	t.Helper()
	req, _ := http.NewRequest("PUT", url, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, strings.TrimSpace(string(raw))
}

// Editing an account from the administration panel has to mean something: an id
// that is nobody's is not "updated", a name already taken is a conflict the
// panel can word, and the administrator's own password is not changed from here
// — that goes through the profile, which asks for the current one, so a stolen
// session cannot be used to set a new password nobody had to know the old one for.
func TestEditingAccountsFromTheAdminPanel(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()
	createUser(t, db.DB, "boss", "correcthorse", "admin")
	createUser(t, db.DB, "bob", "password123", "user")
	boss := doLogin(t, server.URL, "boss", "correcthorse")
	var bossID, bobID int
	db.DB.QueryRow(`SELECT id FROM users WHERE username='boss'`).Scan(&bossID)
	db.DB.QueryRow(`SELECT id FROM users WHERE username='bob'`).Scan(&bobID)
	url := server.URL + "/api/users"

	if code, _ := putJSONAs(t, boss, url, `{"id":9999,"username":"ghost"}`); code != http.StatusNotFound {
		t.Errorf("editing an account that does not exist answered %d, want 404", code)
	}

	code, body := putJSONAs(t, boss, url, fmt.Sprintf(`{"id":%d,"username":"boss"}`, bobID))
	if code != http.StatusConflict || body != "error.username_taken" {
		t.Errorf("renaming to a name that is taken answered %d %q, want 409 error.username_taken", code, body)
	}

	if code, _ := putJSONAs(t, boss, url, fmt.Sprintf(`{"id":%d,"username":"boss","password":"stolen-session-pass"}`, bossID)); code != http.StatusForbidden {
		t.Errorf("changing the administrator's own password from the panel answered %d, want 403", code)
	}
	var hash string
	db.DB.QueryRow(`SELECT password FROM users WHERE id = ?`, bossID).Scan(&hash)
	if err := password.Verify("correcthorse", hash); err != nil {
		t.Error("the administrator's password was changed anyway")
	}

	// What the panel does for real still works.
	if code, _ := putJSONAs(t, boss, url, fmt.Sprintf(`{"id":%d,"username":"robert","password":"a-new-passphrase"}`, bobID)); code != http.StatusOK {
		t.Errorf("editing another account answered %d, want 200", code)
	}

	// Creating an account with a name that is taken says so, too.
	if code := postJSONAs(t, boss, url, `{"username":"robert","password":"another-passphrase"}`); code != http.StatusConflict {
		t.Errorf("creating a duplicate answered %d, want 409", code)
	}
}

func preferencesAs(t *testing.T, s *userSession, url, body string) int {
	t.Helper()
	return postJSONAs(t, s, url+"/api/user/preferences", body)
}

func backgroundOf(t *testing.T, db interface {
	QueryRow(string, ...any) *sql.Row
}, name string) string {
	t.Helper()
	var v string
	db.QueryRow(`SELECT COALESCE(dashboard_background, '') FROM users WHERE username = ?`, name).Scan(&v)
	return v
}

// The dashboard background is written into the page's CSS as url(…), so it has to
// be an image address and nothing that could close that url( and add something of
// its own. Leaving it out of a request keeps what is there, like the logo: a
// request that sets only the theme must not wipe the background.
func TestTheDashboardBackground(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()
	createUser(t, db.DB, "bob", "password123", "user")
	s := doLogin(t, server.URL, "bob", "password123")
	const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

	if code := preferencesAs(t, s, server.URL, `{"dashboard_background":"`+png+`"}`); code != http.StatusOK {
		t.Fatalf("a data URL answered %d", code)
	}
	if got := backgroundOf(t, db.DB, "bob"); got != png {
		t.Fatalf("the background was not stored")
	}

	// A request about something else leaves it alone.
	if code := preferencesAs(t, s, server.URL, `{"theme":"light"}`); code != http.StatusOK {
		t.Fatalf("theme answered %d", code)
	}
	if got := backgroundOf(t, db.DB, "bob"); got != png {
		t.Errorf("a request that did not mention the background cleared it")
	}

	// Sending it empty is how it is cleared.
	preferencesAs(t, s, server.URL, `{"dashboard_background":""}`)
	if got := backgroundOf(t, db.DB, "bob"); got != "" {
		t.Errorf("an empty background did not clear it: %q", got)
	}

	for _, ok := range []string{"https://images.example.com/a.png", "/images/mine.png"} {
		if code := preferencesAs(t, s, server.URL, `{"dashboard_background":"`+ok+`"}`); code != http.StatusOK {
			t.Errorf("%q answered %d, want 200", ok, code)
		}
	}
	for _, bad := range []string{
		"https://x.example/a.png) , url(https://evil.example/track.png",
		"data:image/png;base64,AAAA\"); background:url(//evil",
		"javascript:alert(1)",
		"https://x.example/a b.png",
		"//evil.example/a.png",
	} {
		body, _ := json.Marshal(map[string]string{"dashboard_background": bad})
		if code := preferencesAs(t, s, server.URL, string(body)); code != http.StatusBadRequest {
			t.Errorf("%q answered %d, want 400", bad, code)
		}
	}

	// Something already stored in another shape must not make every other
	// preference fail to save: only a value that changes is checked.
	db.DB.Exec(`UPDATE users SET dashboard_background = 'old shape (kept)' WHERE username = 'bob'`)
	if code := preferencesAs(t, s, server.URL, `{"theme":"dark","dashboard_background":"old shape (kept)"}`); code != http.StatusOK {
		t.Errorf("resending the value already stored answered %d, want 200", code)
	}
}
