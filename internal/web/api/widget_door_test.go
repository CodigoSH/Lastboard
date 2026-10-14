package api_test

import (
	"encoding/json"
	"strings"
	"testing"
)

// A browser that has not reloaded since the update still writes a widget the way
// the earlier version taught it to: the key and the agent tokens inside the
// content. The content is what every request for the board carries back to every
// page, so a credential left there is exposed until something moves it — and the
// move used to happen only at start-up and after a restore. The write itself is
// the one door every path goes through, so that is where it is moved.
func TestAWidgetWrittenTheOldWayHasItsCredentialsMovedAtTheDoor(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "correcthorse", "user")
	cookie := loginAndGetCookie(t, server, "alice", "correcthorse")

	secrets := func(itemID string) map[string]string {
		out := map[string]string{}
		rows, err := db.Query(`SELECT name, value FROM widget_secrets WHERE item_id = ?`, itemID)
		if err != nil {
			t.Fatal(err)
		}
		defer rows.Close()
		for rows.Next() {
			var n, v string
			rows.Scan(&n, &v)
			out[n] = v
		}
		return out
	}
	stored := func(itemID string) string {
		var c string
		if err := db.QueryRow(`SELECT content FROM items WHERE id = ?`, itemID).Scan(&c); err != nil {
			t.Fatal(err)
		}
		return c
	}
	idOf := func(body string) string {
		var v struct{ ID int }
		if err := json.Unmarshal([]byte(body), &v); err != nil || v.ID == 0 {
			t.Fatalf("no id in %s", body)
		}
		return itoa(int64(v.ID))
	}

	t.Run("creating an API widget with its key in the content", func(t *testing.T) {
		code, body := secretReq(t, "POST", server.URL+"/api/dashboard/item", cookie,
			`{"type":"widget","x":1,"y":1,"w":2,"h":1,"content":"{\"widgetId\":\"api\",\"preset\":\"\",\"url\":\"https://x.example/a\",\"headers\":{\"X-Api-Key\":\"old-way-key\"}}"}`)
		if code != 200 {
			t.Fatalf("create: %d %s", code, body)
		}
		id := idOf(body)
		if strings.Contains(stored(id), "old-way-key") {
			t.Errorf("the key stayed in the content: %s", stored(id))
		}
		if got := secrets(id)["header.x-api-key"]; got != "old-way-key" {
			t.Errorf("the key was not moved to the secret store: %v", secrets(id))
		}
	})

	t.Run("updating an API widget with its key in the content", func(t *testing.T) {
		res, _ := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 3, 1, 2, 1, '{"widgetId":"api","url":"https://x.example/b"}')`)
		n, _ := res.LastInsertId()
		id := itoa(n)
		code, body := secretReq(t, "PATCH", server.URL+"/api/dashboard/item/"+id, cookie,
			`{"content":"{\"widgetId\":\"api\",\"preset\":\"sabnzbd\",\"url\":\"https://x.example/b?apikey=KEY123\",\"apiKey\":\"KEY123\"}"}`)
		if code != 200 {
			t.Fatalf("update: %d %s", code, body)
		}
		if strings.Contains(stored(id), "KEY123\"") || strings.Contains(stored(id), "apiKey") {
			t.Errorf("the key stayed in the content: %s", stored(id))
		}
		if secrets(id)["key"] != "KEY123" {
			t.Errorf("the key was not moved to the secret store: %v", secrets(id))
		}
	})

	t.Run("updating a Docker widget with an agent token in the content", func(t *testing.T) {
		res, _ := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 5, 1, 2, 2, '{"widgetId":"docker","hosts":[]}')`)
		n, _ := res.LastInsertId()
		id := itoa(n)
		code, body := secretReq(t, "PATCH", server.URL+"/api/dashboard/item/"+id, cookie,
			`{"content":"{\"widgetId\":\"docker\",\"hosts\":[{\"id\":\"h1\",\"name\":\"nas\",\"url\":\"agent://10.0.0.5:9\",\"token\":\"agent-tok\"}]}"}`)
		if code != 200 {
			t.Fatalf("update: %d %s", code, body)
		}
		if strings.Contains(stored(id), "agent-tok") {
			t.Errorf("the token stayed in the content: %s", stored(id))
		}
		if secrets(id)["docker.h1"] != "agent-tok" {
			t.Errorf("the token was not moved to the secret store: %v", secrets(id))
		}
		if !strings.Contains(stored(id), `"name":"nas"`) {
			t.Errorf("the rest of the host was lost: %s", stored(id))
		}
	})

	t.Run("content written the current way is stored as it is", func(t *testing.T) {
		res, _ := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 7, 1, 2, 1, '{"widgetId":"api"}')`)
		n, _ := res.LastInsertId()
		id := itoa(n)
		want := `{"widgetId":"api","preset":"sabnzbd","url":"https://x.example/c?apikey={{key|url}}"}`
		code, body := secretReq(t, "PATCH", server.URL+"/api/dashboard/item/"+id, cookie, `{"content":`+strconvQuote(want)+`}`)
		if code != 200 {
			t.Fatalf("update: %d %s", code, body)
		}
		if stored(id) != want {
			t.Errorf("content changed on its way in:\n got %s\nwant %s", stored(id), want)
		}
		if len(secrets(id)) != 0 {
			t.Errorf("invented secrets: %v", secrets(id))
		}
	})
}

func strconvQuote(s string) string { b, _ := json.Marshal(s); return string(b) }
