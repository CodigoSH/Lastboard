package api_test

import (
	"fmt"
	"net/http"
	"testing"
)

// `admin` and `ADMIN` look like one person on every screen, and a keyboard that
// capitalises the first letter is the way somebody signs in to the wrong one. A
// name that differs from another account's only by case is refused wherever a
// name is made or changed. Accounts that already share their letters (an older
// version allowed it) keep working and can still be saved unchanged.
func TestUsernamesThatDifferOnlyByCaseAreRefused(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()
	createUser(t, db.DB, "boss", "correcthorse", "admin")
	createUser(t, db.DB, "ana", "correcthorse", "user")
	cookie := loginAndGetCookie(t, server, "boss", "correcthorse")
	user := func(name string) string {
		return fmt.Sprintf(`{"username":%q,"password":"another long one 42","profile":"standard"}`, name)
	}

	t.Run("creating", func(t *testing.T) {
		for _, name := range []string{"BOSS", "Boss", "ANA"} {
			if code, body := secretReq(t, "POST", server.URL+"/api/users", cookie, user(name)); code != http.StatusConflict {
				t.Errorf("creating %q: got %d %s, want 409", name, code, body)
			}
		}
		if code, body := secretReq(t, "POST", server.URL+"/api/users", cookie, user("carla")); code != http.StatusCreated {
			t.Errorf("a new name: got %d %s, want 201", code, body)
		}
	})

	t.Run("an administrator renaming another account", func(t *testing.T) {
		id := userID(t, db.DB, "ana")
		put := func(name string) int {
			code, _ := secretReq(t, "PUT", server.URL+"/api/users", cookie, fmt.Sprintf(`{"id":%d,"username":%q}`, id, name))
			return code
		}
		if got := put("BOSS"); got != http.StatusConflict {
			t.Errorf("renaming onto another account's name: got %d, want 409", got)
		}
		if got := put("Ana"); got != http.StatusOK {
			t.Errorf("changing only the case of its own name: got %d, want 200", got)
		}
	})

	t.Run("somebody renaming themselves", func(t *testing.T) {
		own := loginAndGetCookie(t, server, "carla", "another long one 42")
		if code, body := secretReq(t, "POST", server.URL+"/api/user/update-profile", own, `{"username":"BOSS","avatar_url":""}`); code != http.StatusConflict {
			t.Errorf("renaming onto another account's name: got %d %s, want 409", code, body)
		}
	})

	t.Run("a pair from before the rule keeps working", func(t *testing.T) {
		createUser(t, db.DB, "OLD", "correcthorse", "user")
		createUser(t, db.DB, "old", "correcthorse", "user")
		id := userID(t, db.DB, "OLD")
		if code, body := secretReq(t, "PUT", server.URL+"/api/users", cookie, fmt.Sprintf(`{"id":%d,"username":"OLD"}`, id)); code != http.StatusOK {
			t.Errorf("saving one of them unchanged: got %d %s, want 200", code, body)
		}
		loginAndGetCookie(t, server, "OLD", "correcthorse")
		loginAndGetCookie(t, server, "old", "correcthorse")
	})
}
