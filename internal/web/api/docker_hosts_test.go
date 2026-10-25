package api

import (
	"encoding/json"
	"testing"
)

func TestDockerHostAddress(t *testing.T) {
	cases := []struct {
		host dockerHost
		want string
	}{
		{dockerHost{Type: dockerLocal, URL: "ignored"}, "local"},
		{dockerHost{Type: dockerTCP, URL: "tcp://10.0.0.5:2375/"}, "10.0.0.5:2375"},
		{dockerHost{Type: dockerTLS, URL: "10.0.0.5:2376"}, "https://10.0.0.5:2376"},
		{dockerHost{Type: dockerAgent, URL: "10.0.0.5:9876", Token: "t k"}, "agent://10.0.0.5:9876?token=t+k"},
		// An agent behind a reverse proxy is reached over HTTPS, as its address says.
		{dockerHost{Type: dockerAgent, URL: "https://agent.lan", Token: "t"}, "agent://agent.lan?tls=1&token=t"},
		{dockerHost{Type: dockerAgent, URL: "agent.lan:9876"}, "agent://agent.lan:9876"},
	}
	for _, c := range cases {
		if got := c.host.address(); got != c.want {
			t.Errorf("%+v: address() = %q, want %q", c.host, got, c.want)
		}
	}
}

// The rule in one place: a member reaches a Docker only with a credential.
func TestOnlyTheAgentIsAMembersKind(t *testing.T) {
	for kind, want := range map[string]bool{dockerLocal: true, dockerTCP: true, dockerTLS: true, dockerAgent: false} {
		if needsAdmin(kind) != want {
			t.Errorf("needsAdmin(%s) = %v, want %v", kind, !want, want)
		}
	}
}

func TestMigrateDockerHostsMovesThemToTheAccount(t *testing.T) {
	db, _ := setupTestDB(t)
	db.Exec(`INSERT INTO users (id, username, password, role) VALUES (1, 'admin', 'p', 'admin'), (2, 'ana', 'p', 'user')`)

	add := func(owner int, content map[string]any) int {
		t.Helper()
		b, _ := json.Marshal(content)
		res, err := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'widget', 0, 0, 3, 3, ?)`, owner, string(b))
		if err != nil {
			t.Fatal(err)
		}
		id, _ := res.LastInsertId()
		return int(id)
	}
	// The administrator: two widgets, one agent shared between them (configured
	// twice, with two ids), a local socket in the first only.
	first := add(1, map[string]any{
		"widgetId": "docker",
		"hosts": []any{
			map[string]any{"id": "h1", "name": "This server", "type": "local"},
			map[string]any{"id": "h2", "name": "NAS", "type": "agent", "url": "10.0.0.5:9876"},
		},
		"containerConfig": map[string]any{"h2/plex": map[string]any{"hidden": true}, "abcdef01": map[string]any{"label": "old"}},
		"containerOrder":  map[string]any{"h2": []any{"plex", "jellyfin"}},
		"activeHost":      "h2",
	})
	second := add(1, map[string]any{
		"widgetId":        "docker",
		"hosts":           []any{map[string]any{"id": "x9", "name": "NAS again", "type": "agent", "url": "10.0.0.5:9876"}},
		"containerConfig": map[string]any{"x9/plex": map[string]any{"label": "Movies"}},
		"containerOrder":  map[string]any{"x9": []any{"plex"}},
	})
	for _, item := range []int{first, second} {
		old := map[int]string{first: "h2", second: "x9"}[item]
		if _, err := db.Exec(`INSERT INTO widget_secrets (item_id, name, value) VALUES (?, ?, 'the-token')`, item, dockerSecretName(old)); err != nil {
			t.Fatal(err)
		}
	}
	// A member with the server's own socket, which is not a member's kind.
	member := add(2, map[string]any{"widgetId": "docker", "hosts": []any{map[string]any{"id": "m1", "type": "local"}}})

	n, err := MigrateDockerHosts(db)
	if err != nil {
		t.Fatal(err)
	}
	if n != 3 {
		t.Errorf("moved %d widgets, want 3", n)
	}

	admin := dockerHostsOf(NewUserSettings(db), 1)
	if len(admin) != 2 {
		t.Fatalf("the administrator's account has %d hosts, want 2 (the agent configured twice is one): %+v", len(admin), admin)
	}
	if admin[0].ID != "h1" || admin[0].Type != dockerLocal || admin[1].ID != "h2" || admin[1].Token != "the-token" {
		t.Errorf("account hosts = %+v, want the local socket h1 and the agent h2 with its token", admin)
	}

	read := func(id int) map[string]any {
		var raw string
		db.QueryRow(`SELECT content FROM items WHERE id = ?`, id).Scan(&raw)
		var c map[string]any
		json.Unmarshal([]byte(raw), &c)
		return c
	}
	c1, c2 := read(first), read(second)
	if _, still := c1["hosts"]; still {
		t.Error("the first widget still holds its hosts")
	}
	// It showed every host its owner has: it keeps showing every one, new ones too.
	if _, chosen := c1["hostIds"]; chosen {
		t.Errorf("a widget that showed all its owner's hosts should not pin a list, got %v", c1["hostIds"])
	}
	// The second showed only the agent, under another id: it keeps showing that one,
	// and what it set on its containers follows the host to its account id.
	if ids, _ := c2["hostIds"].([]any); len(ids) != 1 || ids[0] != "h2" {
		t.Errorf("second widget hostIds = %v, want [h2]", c2["hostIds"])
	}
	if cfg, _ := c2["containerConfig"].(map[string]any); cfg["h2/plex"] == nil || cfg["x9/plex"] != nil {
		t.Errorf("second widget containerConfig = %v, want its key moved to h2/plex", cfg)
	}
	if ord, _ := c2["containerOrder"].(map[string]any); ord["h2"] == nil || ord["x9"] != nil {
		t.Errorf("second widget containerOrder = %v, want it under h2", ord)
	}
	if cfg, _ := c1["containerConfig"].(map[string]any); cfg["abcdef01"] == nil {
		t.Error("a setting from before names were keys is left as it was")
	}
	var left int
	db.QueryRow(`SELECT COUNT(*) FROM widget_secrets WHERE name LIKE 'docker.%'`).Scan(&left)
	if left != 0 {
		t.Errorf("%d agent tokens were left in the widgets; they belong to the account now", left)
	}

	// The member keeps its host, as its own data, though it cannot use it.
	if m := dockerHostsOf(NewUserSettings(db), 2); len(m) != 1 || m[0].Type != dockerLocal {
		t.Errorf("the member's host = %+v, want it kept", m)
	}
	if _, still := read(member)["hosts"]; still {
		t.Error("the member's widget still holds its hosts")
	}

	// Again: nothing left to move, nothing changes.
	if n, err := MigrateDockerHosts(db); err != nil || n != 0 {
		t.Errorf("a second run moved %d (err %v), want none", n, err)
	}
	if again := dockerHostsOf(NewUserSettings(db), 1); len(again) != 2 {
		t.Errorf("a second run changed the account: %+v", again)
	}
}
