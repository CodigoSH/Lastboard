package api_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// channelsClient is one signed-in account talking to the channel endpoints.
type channelsClient struct {
	t      *testing.T
	server *httptest.Server
	cookie *http.Cookie
}

func (c channelsClient) do(method, path, body string) (int, string, map[string]any) {
	c.t.Helper()
	req, err := http.NewRequest(method, c.server.URL+path, strings.NewReader(body))
	if err != nil {
		c.t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(c.cookie)
	req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "test-csrf-token"})
	req.Header.Set("X-CSRF-Token", "test-csrf-token")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var out map[string]any
	_ = json.Unmarshal(raw, &out)
	return resp.StatusCode, string(raw), out
}

func (c channelsClient) list(v map[string]any) []map[string]any {
	var out []map[string]any
	items, _ := v["channels"].([]any)
	for _, i := range items {
		out = append(out, i.(map[string]any))
	}
	return out
}

func newChannelsClient(t *testing.T) (channelsClient, func()) {
	t.Helper()
	server, db, cleanup := setupTestServer(t)
	createUser(t, db, "boss", "correcthorse", "admin")
	return channelsClient{t, server, loginAndGetCookie(t, server, "boss", "correcthorse")}, cleanup
}

func TestTheListOfChannelsRefusesWhatCannotWork(t *testing.T) {
	c, cleanup := newChannelsClient(t)
	defer cleanup()
	for name, body := range map[string]string{
		"an unknown kind":        `{"channels":[{"type":"carrier-pigeon","url":"https://x.example","enabled":true}]}`,
		"no address":             `{"channels":[{"type":"ntfy","url":"","enabled":true}]}`,
		"an address that is not": `{"channels":[{"type":"webhook","url":"javascript:alert(1)","enabled":true}]}`,
		"the cloud metadata":     `{"channels":[{"type":"webhook","url":"http://169.254.169.254/latest","enabled":true}]}`,
		"two of push":            `{"channels":[{"type":"push","enabled":true},{"type":"push","enabled":false}]}`,
		"not a list":             `{"channels":"x"}`,
	} {
		if code, _, _ := c.do("POST", "/api/monitor/channels", body); code != http.StatusBadRequest {
			t.Errorf("%s: %d, want 400", name, code)
		}
	}
	many := func(n int) string {
		var items []string
		for i := 0; i < n; i++ {
			items = append(items, `{"type":"ntfy","url":"https://ntfy.sh/t","enabled":true}`)
		}
		return `{"channels":[` + strings.Join(items, ",") + `]}`
	}
	if code, _, _ := c.do("POST", "/api/monitor/channels", many(11)); code != http.StatusBadRequest {
		t.Errorf("eleven channels: %d, want 400", code)
	}
	if code, _, _ := c.do("POST", "/api/monitor/channels", many(10)); code != http.StatusOK {
		t.Errorf("ten channels, the most: %d, want 200", code)
	}
	if _, _, got := c.do("GET", "/api/monitor/channels", ""); len(c.list(got)) != 10 || got["max"] != float64(10) {
		t.Errorf("the list after the refusals: %v", got)
	}
}

func TestSeveralChannelsOfTheSameKindAreFineAndTheIdsAreTheServers(t *testing.T) {
	c, cleanup := newChannelsClient(t)
	defer cleanup()
	_, _, got := c.do("POST", "/api/monitor/channels", `{"channels":[
		{"id":"made-up","type":"ntfy","name":"`+strings.Repeat("ñ", 80)+`","url":"https://ntfy.sh/me","enabled":true},
		{"id":"made-up","type":"ntfy","name":"Partner","url":"https://ntfy.sh/partner","enabled":false},
		{"type":"push","url":"https://ignored.example","token":"ignored","enabled":true}]}`)
	list := c.list(got)
	if len(list) != 3 {
		t.Fatalf("%v", got)
	}
	if list[0]["id"] == "made-up" || list[1]["id"] == "made-up" || list[0]["id"] == list[1]["id"] || list[0]["id"] == "" {
		t.Errorf("the ids were the browser's or repeated: %v / %v", list[0]["id"], list[1]["id"])
	}
	if n := len([]rune(list[0]["name"].(string))); n != 40 {
		t.Errorf("a name of 80 characters kept %d, want 40", n)
	}
	if list[1]["enabled"] != false || list[1]["name"] != "Partner" {
		t.Errorf("a channel off: %v", list[1])
	}
	if list[2]["url"] != "" || list[2]["has_token"] != false {
		t.Errorf("push has no address or token: %v", list[2])
	}
	if _, _, settings := c.do("GET", "/api/monitor/settings", ""); settings["alerts_enabled"] != true {
		t.Errorf("alerts are on when any channel is: %v", settings)
	}
}

// The channel that an account had before the list is offered under a stand-in name and keeps its token when
// the list is saved for the first time.
func TestTheOlderChannelIsOfferedAndKeepsItsTokenWhenTheListIsFirstSaved(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")
	for k, v := range map[string]string{"monitoring_notify_type": "gotify", "monitoring_notify_url": "https://gotify.example", "monitoring_notify_token": "gk-old", "monitoring_alerts_enabled": "1"} {
		db.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (1, ?, ?)`, k, v)
	}
	c := channelsClient{t, server, loginAndGetCookie(t, server, "boss", "correcthorse")}
	_, _, got := c.do("GET", "/api/monitor/channels", "")
	list := c.list(got)
	if len(list) != 1 || list[0]["type"] != "gotify" || list[0]["has_token"] != true || list[0]["enabled"] != true {
		t.Fatalf("the older channel is not offered: %v", got)
	}
	_, _, saved := c.do("POST", "/api/monitor/channels", `{"channels":[{"id":"`+list[0]["id"].(string)+`","type":"gotify","name":"Home","url":"https://gotify.example","enabled":true}]}`)
	list = c.list(saved)
	var raw string
	db.QueryRow(`SELECT value FROM user_settings WHERE key = 'monitoring_notify_channels'`).Scan(&raw)
	if list[0]["id"] == "legacy" || !strings.Contains(raw, `"token":"gk-old"`) {
		t.Errorf("the token was lost or the stand-in name kept: %v / %s", list[0], raw)
	}
}

// A test of a saved channel uses its saved token, says in a word when it fails, and the result shows on the
// channel; a channel being typed is tried without being saved.
func TestTheTestOfAChannelUsesItsSavedTokenAndLeavesItsResultOnTheList(t *testing.T) {
	c, cleanup := newChannelsClient(t)
	defer cleanup()
	var mu sync.Mutex
	var auth []string
	status := http.StatusOK
	hook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		auth = append(auth, r.Header.Get("Authorization"))
		st := status
		mu.Unlock()
		w.WriteHeader(st)
	}))
	defer hook.Close()

	_, _, got := c.do("POST", "/api/monitor/channels", `{"channels":[{"type":"webhook","url":"`+hook.URL+`","token":"s3cret","enabled":true}]}`)
	id := c.list(got)[0]["id"].(string)

	if code, body, _ := c.do("POST", "/api/monitor/channels/test", `{"id":"`+id+`","type":"webhook","url":"`+hook.URL+`"}`); code != http.StatusOK {
		t.Fatalf("test: %d %s", code, body)
	}
	mu.Lock()
	if len(auth) != 1 || auth[0] != "Bearer s3cret" {
		t.Errorf("the saved token was not used: %v", auth)
	}
	status = http.StatusUnauthorized
	mu.Unlock()
	code, body, _ := c.do("POST", "/api/monitor/channels/test", `{"id":"`+id+`","type":"webhook","url":"`+hook.URL+`"}`)
	if code != http.StatusBadGateway || strings.TrimSpace(body) != "http_401" {
		t.Errorf("a refused test: %d %q, want 502 and one word", code, body)
	}
	_, _, again := c.do("GET", "/api/monitor/channels", "")
	last, _ := c.list(again)[0]["last"].(map[string]any)
	if last == nil || last["ok"] != false || last["error"] != "http_401" {
		t.Errorf("the result is not on the channel: %v", last)
	}

	// One that is being typed, not saved, is tried and leaves nothing behind.
	mu.Lock()
	status = http.StatusOK
	mu.Unlock()
	if code, body, _ := c.do("POST", "/api/monitor/channels/test", `{"type":"webhook","url":"`+hook.URL+`","token":"typed"}`); code != http.StatusOK {
		t.Errorf("a channel being typed: %d %s", code, body)
	}
	if _, _, after := c.do("GET", "/api/monitor/channels", ""); len(c.list(after)) != 1 {
		t.Errorf("a test saved a channel: %v", after)
	}
	// An address that is not one is refused before anything is sent.
	if code, _, _ := c.do("POST", "/api/monitor/channels/test", `{"type":"ntfy","url":"file:///etc/passwd"}`); code != http.StatusBadRequest {
		t.Errorf("a bad address: %d, want 400", code)
	}
}
