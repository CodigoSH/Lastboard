package api_test

import (
	"net/http"
	"strings"
	"testing"
)

// A limit on a name someone reads is a limit on how many characters fit on
// screen. It was a limit on bytes, and a Japanese character is three of them:
// a board name of 17 characters was refused as "too long" and an English one of
// 50 was fine. The limit is the same for every language.
func TestNameLimitsCountCharactersNotBytes(t *testing.T) {
	fiftyJapanese := strings.Repeat("あ", 50)
	fiftyOneJapanese := strings.Repeat("あ", 51)

	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "boss", "correcthorse", "admin")
	cookie := loginAndGetCookie(t, server, "boss", "correcthorse")

	t.Run("board name", func(t *testing.T) {
		if code, body := secretReq(t, "POST", server.URL+"/api/dashboards", cookie, `{"name":"`+fiftyJapanese+`"}`); code != 201 {
			t.Fatalf("50 characters refused: %d %s", code, body)
		}
		if code, _ := secretReq(t, "POST", server.URL+"/api/dashboards", cookie, `{"name":"`+fiftyOneJapanese+`"}`); code != 400 {
			t.Fatalf("51 characters accepted: %d", code)
		}
	})

	t.Run("renaming a board", func(t *testing.T) {
		code, body := secretReq(t, "POST", server.URL+"/api/dashboards", cookie, `{"name":"short"}`)
		if code != 201 {
			t.Fatalf("setup: %d %s", code, body)
		}
		var id string
		for _, f := range strings.FieldsFunc(body, func(r rune) bool { return r == ',' || r == '{' || r == '}' }) {
			if strings.HasPrefix(f, `"id":`) {
				id = strings.TrimPrefix(f, `"id":`)
			}
		}
		if id == "" {
			t.Fatalf("no id in %s", body)
		}
		if code, body := secretReq(t, "PATCH", server.URL+"/api/dashboards/"+id, cookie, `{"name":"`+fiftyJapanese+`"}`); code != 200 {
			t.Fatalf("renaming to 50 characters refused: %d %s", code, body)
		}
		if code, _ := secretReq(t, "PATCH", server.URL+"/api/dashboards/"+id, cookie, `{"name":"`+fiftyOneJapanese+`"}`); code != 400 {
			t.Fatalf("renaming to 51 characters accepted: %d", code)
		}
	})
}

func TestProjectNameLimitCountsCharactersNotBytes(t *testing.T) {
	server, db, cleanup := setupFullServer(t)
	defer cleanup()
	createUser(t, db.DB, "boss", "correcthorse", "admin")
	s := doLogin(t, server.URL, "boss", "correcthorse")

	post := func(name string) int {
		req, _ := http.NewRequest("POST", server.URL+"/api/user/preferences", strings.NewReader(`{"project_name":"`+name+`"}`))
		req.Header.Set("Content-Type", "application/json")
		s.attach(req)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		return resp.StatusCode
	}
	if code := post(strings.Repeat("あ", 64)); code != 200 {
		t.Fatalf("64 characters refused: %d", code)
	}
	if code := post(strings.Repeat("あ", 65)); code != 400 {
		t.Fatalf("65 characters accepted: %d", code)
	}
}
