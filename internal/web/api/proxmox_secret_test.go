package api_test

import (
	"net/http"
	"strings"
	"testing"
)

// The Proxmox token secret follows the same rule as every saved secret: the page
// learns that one is stored and never what it is; typing replaces it, emptying
// the box removes it, and a save that says nothing about it leaves it alone.
func TestTheProxmoxSecretIsReplacedKeptOrRemoved(t *testing.T) {
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")

	hasSecret := func() (bool, string) {
		_, body := pxGet(t, server.URL, "/api/proxmox/settings", s)
		h := pxOnlyHost(body)
		id, _ := h["id"].(string)
		return h["has_secret"] == true, id
	}
	save := func(host string) {
		t.Helper()
		resp := pxSave(t, server.URL, s, `{"hosts":[`+host+`]}`)
		resp.Body.Close()
		if resp.StatusCode != http.StatusNoContent {
			t.Fatalf("save: %d", resp.StatusCode)
		}
	}
	stored := func() string {
		var v string
		db.DB.QueryRow(`SELECT value FROM system_settings WHERE key = 'proxmox_hosts'`).Scan(&v)
		return v
	}
	const base = `"enabled":true,"url":"https://pve.home:8006","token_id":"lastboard@pve!lb"`

	save(`{` + base + `,"secret":"first-secret"}`)
	has, id := hasSecret()
	if !has {
		t.Fatal("a typed secret was not stored")
	}

	// Said nothing: kept (a page that has not reloaded, or an edit of another field).
	save(`{"id":"` + id + `",` + base + `,"secret":"","clear_secret":false}`)
	if has, _ := hasSecret(); !has {
		t.Error("a save that did not touch the secret removed it")
	}

	// Typed: replaced.
	save(`{"id":"` + id + `",` + base + `,"secret":"second-secret"}`)
	if got := stored(); !strings.Contains(got, "second-secret") || strings.Contains(got, "first-secret") {
		t.Errorf("a typed secret did not replace the old one: %s", got)
	}

	// Box emptied: removed.
	save(`{"id":"` + id + `",` + base + `,"secret":"","clear_secret":true}`)
	if has, _ := hasSecret(); has {
		t.Error("emptying the box did not remove the secret")
	}
	if got := stored(); strings.Contains(got, "second-secret") {
		t.Errorf("the removed secret is still stored: %s", got)
	}
}
