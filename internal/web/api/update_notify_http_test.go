package api_test

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

// The two kinds a channel carries are the account's to choose, except that only the administrator can ask for
// updates: for a member the option is not kept, whatever the request says.
func TestOnlyTheAdministratorsChannelsCanCarryUpdatesAndAlertsAreOnUnlessSaidOtherwise(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")
	createUser(t, db, "ana", "anapass123", "user")
	boss := channelsClient{t, server, loginAndGetCookie(t, server, "boss", "correcthorse")}
	ana := channelsClient{t, server, loginAndGetCookie(t, server, "ana", "anapass123")}

	body := `{"channels":[
		{"type":"ntfy","url":"https://ntfy.sh/a","enabled":true},
		{"type":"ntfy","url":"https://ntfy.sh/b","enabled":true,"alerts":false,"updates":true},
		{"type":"ntfy","url":"https://ntfy.sh/c","enabled":true,"alerts":true,"updates":true}]}`

	code, raw, out := boss.do("POST", "/api/monitor/channels", body)
	if code != http.StatusOK {
		t.Fatalf("%d %s", code, raw)
	}
	got := boss.list(out)
	want := [][2]bool{{true, false}, {false, true}, {true, true}} // alerts, updates
	for i, w := range want {
		if got[i]["alerts"] != w[0] || got[i]["updates"] != w[1] {
			t.Errorf("administrator, channel %d: alerts=%v updates=%v, want %v", i, got[i]["alerts"], got[i]["updates"], w)
		}
	}

	_, _, out = ana.do("POST", "/api/monitor/channels", body)
	got = ana.list(out)
	if len(got) != 3 {
		t.Fatalf("a member's list: %v", got)
	}
	for i, w := range [][2]bool{{true, false}, {false, false}, {true, false}} {
		if got[i]["alerts"] != w[0] || got[i]["updates"] != w[1] {
			t.Errorf("member, channel %d: alerts=%v updates=%v, want %v: only the administrator can update", i, got[i]["alerts"], got[i]["updates"], w)
		}
	}

	// The list read back after saving is the one the server holds, for each of them.
	_, _, out = boss.do("GET", "/api/monitor/channels", "")
	got = boss.list(out)
	if got[1]["alerts"] != false || got[1]["updates"] != true {
		t.Errorf("read back: %v", got[1])
	}
}

// Switching a channel on for new versions asks for a look at once, so that the version already waiting is told without
// waiting for the next hourly one; nothing else about a channel does, and a member's choice never does.
func TestSwitchingAChannelOnForVersionsAsksForALookAtOnceAndNothingElseDoes(t *testing.T) {
	db, err := database.InitDB(filepath.Join(t.TempDir(), "lastboard.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	createUser(t, db.DB, "boss", "correcthorse", "admin")
	createUser(t, db.DB, "ana", "anapass123", "user")

	var asked atomic.Int32
	monitor := api.NewMonitorHandler(db.DB)
	monitor.OnUpdatesChannel = func() { asked.Add(1) }
	protect := middleware.AuthRequired(db.DB, testSecret)
	auth := api.NewAuthHandler(db.DB, testSecret)
	mux := http.NewServeMux()
	mux.Handle("POST /api/login", http.HandlerFunc(auth.Login))
	mux.Handle("POST /api/monitor/channels", protect(http.HandlerFunc(monitor.UpdateChannels)))
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)
	boss := channelsClient{t, server, loginAndGetCookie(t, server, "boss", "correcthorse")}
	ana := channelsClient{t, server, loginAndGetCookie(t, server, "ana", "anapass123")}

	waitFor := func(n int32, what string) {
		t.Helper()
		for deadline := time.Now().Add(2 * time.Second); time.Now().Before(deadline); time.Sleep(10 * time.Millisecond) {
			if asked.Load() == n {
				return
			}
		}
		t.Fatalf("%s: asked %d times, want %d", what, asked.Load(), n)
	}
	quiet := func(n int32, what string) {
		t.Helper()
		time.Sleep(150 * time.Millisecond) // the call is made in its own goroutine: give it the chance it would need
		if asked.Load() != n {
			t.Errorf("%s: asked %d times, want %d", what, asked.Load(), n)
		}
	}
	save := func(c channelsClient, body string) []map[string]any {
		t.Helper()
		code, raw, out := c.do("POST", "/api/monitor/channels", body)
		if code != http.StatusOK {
			t.Fatalf("%d %s", code, raw)
		}
		return c.list(out)
	}

	// A channel that carries alerts only does not ask.
	list := save(boss, `{"channels":[{"type":"ntfy","url":"https://ntfy.sh/a","enabled":true}]}`)
	quiet(0, "alerts only")

	// The same channel switched on for versions does, once.
	id := list[0]["id"].(string)
	save(boss, `{"channels":[{"id":"`+id+`","type":"ntfy","url":"https://ntfy.sh/a","enabled":true,"updates":true}]}`)
	waitFor(1, "switched on for versions")

	// Saving it again as it is, or adding a channel that does not carry versions, does not.
	save(boss, `{"channels":[{"id":"`+id+`","type":"ntfy","url":"https://ntfy.sh/a","enabled":true,"updates":true}]}`)
	quiet(1, "unchanged")
	save(boss, `{"channels":[{"id":"`+id+`","type":"ntfy","url":"https://ntfy.sh/a","enabled":true,"updates":true},{"type":"ntfy","url":"https://ntfy.sh/b","enabled":true}]}`)
	quiet(1, "another channel for alerts")

	// A new channel that carries versions does, and so does a switch that was off and is on.
	save(boss, `{"channels":[{"id":"`+id+`","type":"ntfy","url":"https://ntfy.sh/a","enabled":true,"updates":true},{"type":"ntfy","url":"https://ntfy.sh/b","enabled":true},{"type":"ntfy","url":"https://ntfy.sh/c","enabled":true,"updates":true}]}`)
	waitFor(2, "a new channel that carries versions")

	// A member cannot carry versions, so what they send asks for nothing.
	save(ana, `{"channels":[{"type":"ntfy","url":"https://ntfy.sh/m","enabled":true,"updates":true}]}`)
	quiet(2, "a member")
}
