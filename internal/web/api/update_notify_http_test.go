package api_test

import (
	"net/http"
	"testing"
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
