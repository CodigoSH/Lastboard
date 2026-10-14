package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
)

// What an earlier version kept for the whole server — the alert channel, the
// Proxmox connections — becomes the first administrator's. The mode, interval
// and threshold stay as the starting point of every account that chose nothing.
func TestTheServersOldSettingsBecomeTheFirstAdministratorsAndNobodyElses(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")
	createUser(t, db, "second", "correcthorse", "admin")
	createUser(t, db, "guest", "correcthorse", "user")
	for k, v := range map[string]string{
		"monitoring_mode": "background", "monitoring_interval_sec": "90", "monitoring_fail_threshold": "3",
		"monitoring_alerts_enabled": "1", "monitoring_notify_type": "ntfy",
		"monitoring_notify_url": "https://ntfy.sh/the-old-topic", "monitoring_notify_token": "tk_old",
		"proxmox_hosts": testProxmoxHosts, "proxmox_icons": `{"h1|pve|100":"/api/icons/x"}`,
	} {
		db.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)`, k, v)
	}

	for i := 0; i < 2; i++ { // twice: nothing is moved a second time
		if err := api.MigrateUserSettings(db); err != nil {
			t.Fatal(err)
		}
	}

	owned := func(user, key string) string {
		var v string
		db.QueryRow(`SELECT s.value FROM user_settings s JOIN users u ON u.id = s.user_id WHERE u.username = ? AND s.key = ?`, user, key).Scan(&v)
		return v
	}
	for key, want := range map[string]string{
		"monitoring_notify_url": "https://ntfy.sh/the-old-topic", "monitoring_notify_token": "tk_old",
		"monitoring_alerts_enabled": "1", "proxmox_hosts": testProxmoxHosts,
	} {
		if got := owned("boss", key); got != want {
			t.Errorf("the first administrator's %s = %q, want %q", key, got, want)
		}
		for _, other := range []string{"second", "guest"} {
			if got := owned(other, key); got != "" {
				t.Errorf("%s was handed %s = %q", other, key, got)
			}
		}
	}
	// The credentials are moved, not copied: nothing is left in the server-wide table.
	var left int
	db.QueryRow(`SELECT COUNT(*) FROM system_settings WHERE key IN ('monitoring_notify_token','monitoring_notify_url','monitoring_notify_type','monitoring_alerts_enabled','proxmox_hosts','proxmox_icons')`).Scan(&left)
	if left != 0 {
		t.Errorf("%d moved setting(s) are still in the server-wide table", left)
	}

	// Everybody starts from the server's old mode, interval and threshold.
	cookie := loginAndGetCookie(t, server, "guest", "correcthorse")
	req, _ := http.NewRequest("GET", server.URL+"/api/monitor/settings", nil)
	req.AddCookie(cookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var got map[string]any
	json.NewDecoder(resp.Body).Decode(&got)
	if got["mode"] != "background" || got["interval_sec"] != float64(90) || got["fail_threshold"] != float64(3) || got["notify_url"] != "" {
		t.Errorf("a guest's starting settings = %v", got)
	}

	// An account that chose its own is never touched again.
	db.Exec(`INSERT INTO system_settings (key, value) VALUES ('monitoring_notify_type', 'webhook'), ('monitoring_notify_url', 'https://later.example')`)
	api.MigrateUserSettings(db)
	if got := owned("boss", "monitoring_notify_url"); got != "https://ntfy.sh/the-old-topic" {
		t.Errorf("a later run overwrote the administrator's own channel with %q", got)
	}
}

// A backup written before accounts had their own settings carries them for the
// whole server. Restoring it hands them to the first administrator, and a new
// backup brings every account's back.
func TestRestoringBackupsFromBeforeAndAfter(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")
	createUser(t, db, "guest", "correcthorse", "user")
	cookie := loginAndGetCookie(t, server, "boss", "correcthorse")

	db.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (1, 'proxmox_hosts', ?), (2, 'monitoring_notify_url', 'https://hooks.example/guest'), (2, 'monitoring_notify_token', 'guest-tok')`, testProxmoxHosts)
	req, _ := http.NewRequest("GET", server.URL+"/api/system/backup", nil)
	req.AddCookie(cookie)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if !bytes.Contains(raw, []byte(`"user_settings"`)) || !bytes.Contains(raw, []byte("guest-tok")) {
		t.Fatalf("the backup does not carry each account's settings: %s", raw)
	}

	restore := func(body []byte) {
		t.Helper()
		var b bytes.Buffer
		w := multipart.NewWriter(&b)
		part, _ := w.CreateFormFile("backup_file", "backup.json")
		part.Write(body)
		w.Close()
		rr, _ := http.NewRequest("POST", server.URL+"/api/system/restore", &b)
		rr.AddCookie(cookie)
		rr.AddCookie(&http.Cookie{Name: "csrf_token", Value: "test-csrf-token"})
		rr.Header.Set("X-CSRF-Token", "test-csrf-token")
		rr.Header.Set("Content-Type", w.FormDataContentType())
		rresp, err := http.DefaultClient.Do(rr)
		if err != nil {
			t.Fatal(err)
		}
		rresp.Body.Close()
		if rresp.StatusCode != http.StatusOK {
			t.Fatalf("restore: %d", rresp.StatusCode)
		}
		// A restore replaces every account, so the accounts get new ids and the
		// sessions bound to the old ones end — which is why the response tells the
		// browser to drop its cookies. The person signs in again.
		cookie = loginAndGetCookie(t, server, "boss", "correcthorse")
	}
	owned := func(user, key string) string {
		var v string
		db.QueryRow(`SELECT s.value FROM user_settings s JOIN users u ON u.id = s.user_id WHERE u.username = ? AND s.key = ?`, user, key).Scan(&v)
		return v
	}

	// After: each account's own come back, by name, on new ids.
	db.Exec(`DELETE FROM user_settings`)
	restore(raw)
	if owned("guest", "monitoring_notify_token") != "guest-tok" || owned("boss", "proxmox_hosts") != testProxmoxHosts {
		t.Errorf("a new backup did not bring each account's settings back")
	}

	// Before: the settings are in the server-wide block, as the earlier version wrote them.
	var old map[string]any
	json.Unmarshal(raw, &old)
	delete(old, "user_settings")
	old["settings"] = map[string]string{"proxmox_hosts": testProxmoxHosts, "monitoring_notify_token": "tk_old", "monitoring_notify_type": "ntfy", "monitoring_notify_url": "https://ntfy.sh/old", "monitoring_interval_sec": "75"}
	oldRaw, _ := json.Marshal(old)
	restore(oldRaw)
	if owned("boss", "proxmox_hosts") != testProxmoxHosts || owned("boss", "monitoring_notify_token") != "tk_old" {
		t.Errorf("an old backup's settings did not go to the first administrator")
	}
	if owned("guest", "monitoring_notify_token") != "" || owned("guest", "proxmox_hosts") != "" {
		t.Errorf("an old backup's credentials went to a plain account")
	}
	var interval string
	db.QueryRow(`SELECT value FROM system_settings WHERE key = 'monitoring_interval_sec'`).Scan(&interval)
	if interval != "75" {
		t.Errorf("the old interval did not come back as the starting point: %q", interval)
	}
	if strings.Contains(owned("boss", "monitoring_notify_url"), "guest") {
		t.Error("account settings leaked across the restore")
	}
}

// A deleted account takes its settings with it.
func TestDeletingAnAccountDeletesItsSettings(t *testing.T) {
	_, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "gone", "correcthorse", "user")
	db.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (1, 'monitoring_notify_token', 'x')`)
	db.Exec(`DELETE FROM users WHERE id = 1`)
	var n int
	db.QueryRow(`SELECT COUNT(*) FROM user_settings`).Scan(&n)
	if n != 0 {
		t.Errorf("%d setting(s) outlived their account", n)
	}
}
