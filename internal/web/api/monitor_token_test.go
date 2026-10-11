package api_test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// The notification token is a credential its owner types once. After saving it
// stays out of the page, like the Proxmox secret and the sibling products' tokens:
// the form learns that one is saved (notify_has_token) and never receives it.
func TestNotifyTokenIsWriteOnly(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")
	cookie := loginAndGetCookie(t, server, "boss", "correcthorse")

	send := func(method, body string) map[string]any {
		t.Helper()
		req, err := http.NewRequest(method, server.URL+"/api/monitor/settings", strings.NewReader(body))
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
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("%s %s: %d", method, body, resp.StatusCode)
		}
		var out map[string]any
		if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
			t.Fatal(err)
		}
		return out
	}
	stored := func() string {
		var v string
		db.QueryRow(`SELECT value FROM user_settings WHERE key = 'monitoring_notify_token'`).Scan(&v)
		return v
	}
	noToken := func(label string, got map[string]any) {
		t.Helper()
		if tok, present := got["notify_token"]; present && tok != "" {
			t.Errorf("%s: the token came back: %v", label, tok)
		}
	}
	const base = `"mode":"background","interval_sec":60,"alerts_enabled":true,"notify_type":"ntfy","notify_url":"https://ntfy.sh/x","fail_threshold":2`

	// Typing one saves it, and the answer says so without repeating it.
	got := send("POST", `{`+base+`,"notify_token":"tk_first"}`)
	if stored() != "tk_first" || got["notify_has_token"] != true {
		t.Fatalf("typed token not saved: stored=%q answer=%v", stored(), got)
	}
	noToken("save answer", got)
	noToken("read after save", send("GET", ""))

	// The form comes back with the field empty (a page that does not know the
	// token, or a browser that has not reloaded): the saved token stays.
	got = send("POST", `{`+base+`,"notify_token":""}`)
	if stored() != "tk_first" || got["notify_has_token"] != true {
		t.Errorf("an empty field wiped the saved token: stored=%q answer=%v", stored(), got)
	}

	// Typing a new one replaces it.
	send("POST", `{`+base+`,"notify_token":"tk_second"}`)
	if stored() != "tk_second" {
		t.Errorf("a new token did not replace the old one: %q", stored())
	}

	// Removing is explicit.
	got = send("POST", `{`+base+`,"clear_notify_token":true}`)
	if stored() != "" || got["notify_has_token"] != false {
		t.Errorf("remove did not clear it: stored=%q answer=%v", stored(), got)
	}
}
