package api_test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// A channel's token is a credential its owner types once. After saving it stays
// out of the page, like the Proxmox secret and the sibling products' tokens: the
// list learns that one is saved (has_token) and never receives it.
func TestAChannelsTokenIsWriteOnly(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")
	cookie := loginAndGetCookie(t, server, "boss", "correcthorse")

	send := func(method, path, body string) (int, map[string]any) {
		t.Helper()
		req, err := http.NewRequest(method, server.URL+path, strings.NewReader(body))
		if err != nil {
			t.Fatal(err)
		}
		req.Header.Set("Content-Type", "application/json")
		req.AddCookie(cookie)
		req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "test-csrf-token"})
		req.Header.Set("X-CSRF-Token", "test-csrf-token")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		var out map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&out)
		return resp.StatusCode, out
	}
	save := func(channel string) []map[string]any {
		t.Helper()
		code, got := send("POST", "/api/monitor/channels", `{"channels":[`+channel+`]}`)
		if code != http.StatusOK {
			t.Fatalf("save %s: %d", channel, code)
		}
		var list []map[string]any
		for _, c := range got["channels"].([]any) {
			list = append(list, c.(map[string]any))
		}
		return list
	}
	// What the server holds for the first channel.
	stored := func() string {
		var raw string
		db.QueryRow(`SELECT value FROM user_settings WHERE key = 'monitoring_notify_channels'`).Scan(&raw)
		var list []struct {
			Token string `json:"token"`
		}
		json.Unmarshal([]byte(raw), &list)
		if len(list) == 0 {
			return ""
		}
		return list[0].Token
	}
	noToken := func(label string, list []map[string]any) {
		t.Helper()
		for _, c := range list {
			if _, present := c["token"]; present {
				t.Errorf("%s: the token came back: %v", label, c)
			}
		}
	}
	const ntfy = `"type":"ntfy","url":"https://ntfy.sh/x","enabled":true`

	// Typing one saves it, and the answer says so without repeating it.
	list := save(`{` + ntfy + `,"token":"tk_first"}`)
	if stored() != "tk_first" || list[0]["has_token"] != true {
		t.Fatalf("typed token not saved: stored=%q answer=%v", stored(), list)
	}
	noToken("save answer", list)
	_, read := send("GET", "/api/monitor/channels", "")
	for _, c := range read["channels"].([]any) {
		if _, present := c.(map[string]any)["token"]; present {
			t.Errorf("read after save: the token came back: %v", c)
		}
	}
	id := list[0]["id"].(string)

	// The list comes back with the field empty (a page does not know the token):
	// the saved token stays.
	list = save(`{"id":"` + id + `",` + ntfy + `,"token":""}`)
	if stored() != "tk_first" || list[0]["has_token"] != true || list[0]["id"] != id {
		t.Errorf("an empty field wiped the saved token or changed the id: stored=%q answer=%v", stored(), list)
	}

	// Typing a new one replaces it.
	save(`{"id":"` + id + `",` + ntfy + `,"token":"tk_second"}`)
	if stored() != "tk_second" {
		t.Errorf("a new token did not replace the old one: %q", stored())
	}

	// A channel the browser made up an id for is not an existing one: it takes no token from any.
	list = save(`{"id":"nc-made-up",` + ntfy + `}`)
	if stored() != "" || list[0]["has_token"] != false {
		t.Errorf("an id the server does not know inherited a token: stored=%q answer=%v", stored(), list)
	}

	// Changing the kind of a channel drops its token: it was for another service.
	list = save(`{"type":"gotify","url":"https://gotify.example","enabled":true,"token":"gk"}`)
	id = list[0]["id"].(string)
	list = save(`{"id":"` + id + `","type":"webhook","url":"https://hooks.example","enabled":true}`)
	if stored() != "" || list[0]["has_token"] != false {
		t.Errorf("a channel that changed kind kept the old token: stored=%q answer=%v", stored(), list)
	}

	// Removing is explicit.
	list = save(`{"type":"ntfy","url":"https://ntfy.sh/y","enabled":true,"token":"tk"}`)
	id = list[0]["id"].(string)
	list = save(`{"id":"` + id + `",` + ntfy + `,"clear_token":true}`)
	if stored() != "" || list[0]["has_token"] != false {
		t.Errorf("remove did not clear it: stored=%q answer=%v", stored(), list)
	}
}

// Saving the monitoring settings is one change. When a value cannot be stored the
// answer says so and none of the others were written: it used to answer "saved"
// after losing some of them, with the form showing values the server did not have.
func TestMonitoringSettingsAreSavedAllOrNoneAndFailuresAreReported(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")
	cookie := loginAndGetCookie(t, server, "boss", "correcthorse")

	save := func(body string) int {
		t.Helper()
		req, _ := http.NewRequest("POST", server.URL+"/api/monitor/settings", strings.NewReader(body))
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
	mode := func() string {
		var v string
		db.QueryRow(`SELECT value FROM user_settings WHERE key = 'monitoring_mode'`).Scan(&v)
		return v
	}

	if code := save(`{"mode":"tab","interval_sec":60,"fail_threshold":2}`); code != http.StatusOK {
		t.Fatalf("first save: %d", code)
	}
	if _, err := db.Exec(`CREATE TRIGGER no_threshold BEFORE INSERT ON user_settings
		WHEN NEW.key = 'monitoring_fail_threshold' BEGIN SELECT RAISE(ABORT, 'refused'); END`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`CREATE TRIGGER no_threshold_update BEFORE UPDATE ON user_settings
		WHEN NEW.key = 'monitoring_fail_threshold' BEGIN SELECT RAISE(ABORT, 'refused'); END`); err != nil {
		t.Fatal(err)
	}

	if code := save(`{"mode":"background","interval_sec":120,"fail_threshold":5}`); code != http.StatusInternalServerError {
		t.Errorf("a save that could not store a value answered %d, want 500", code)
	}
	if got := mode(); got != "tab" {
		t.Errorf("the mode became %q although the save failed: the settings were written in part", got)
	}
}
