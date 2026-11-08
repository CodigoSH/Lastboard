package api_test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// A backup is a file people copy to other machines and sometimes to a cloud drive. A push
// subscription is an address plus the keys a message to that one browser is encrypted with, and the
// instance's signing key is what makes it the only sender those subscriptions answer to, so neither
// goes in. Restoring on another instance means each device turns Push on again, which is the honest
// outcome: the old subscriptions would not know the new instance's key anyway.
func TestABackupCarriesNeitherPushSubscriptionsNorTheSigningKey(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()

	createUser(t, db, "adminPush", "password", "admin")
	var uid int
	if err := db.QueryRow(`SELECT id FROM users WHERE username = 'adminPush'`).Scan(&uid); err != nil {
		t.Fatal(err)
	}
	const endpoint = "https://fcm.googleapis.com/fcm/send/ENDPOINT-MUST-NOT-LEAVE"
	if _, err := db.Exec(`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, label, created_at) VALUES (?, ?, 'P256DH-MUST-NOT-LEAVE', 'AUTH-MUST-NOT-LEAVE', 'phone', 1)`, uid, endpoint); err != nil {
		t.Fatal(err)
	}
	for k, v := range map[string]string{"push_vapid_private": "PRIVATE-MUST-NOT-LEAVE", "push_vapid_public": "PUBLIC-MUST-NOT-LEAVE"} {
		if _, err := db.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)`, k, v); err != nil {
			t.Fatal(err)
		}
	}
	// The channel itself is a setting, and it does travel: a restored instance keeps asking for Push.
	if _, err := db.Exec(`INSERT OR REPLACE INTO user_settings (user_id, key, value) VALUES (?, 'monitoring_notify_type', 'push')`, uid); err != nil {
		t.Fatal(err)
	}
	cookie := loginAndGetCookie(t, server, "adminPush", "password")

	file := downloadBackup(t, server.URL, cookie, "GET", "")
	for _, secret := range []string{"ENDPOINT-MUST-NOT-LEAVE", "P256DH-MUST-NOT-LEAVE", "AUTH-MUST-NOT-LEAVE", "PRIVATE-MUST-NOT-LEAVE", "PUBLIC-MUST-NOT-LEAVE", "push_subscriptions", "push_vapid"} {
		if strings.Contains(string(file), secret) {
			t.Errorf("the backup contains %q", secret)
		}
	}
	if !strings.Contains(string(file), `"push"`) {
		t.Error("the alert channel (push) did not travel in the backup, so a restore would silently stop alerting")
	}

	// And a crafted file cannot plant a signing key of its own.
	var doc map[string]any
	if err := json.Unmarshal(file, &doc); err != nil {
		t.Fatal(err)
	}
	doc["settings"] = map[string]string{"push_vapid_private": "attacker-chosen", "push_vapid_public": "attacker-chosen"}
	crafted, _ := json.Marshal(doc)
	if code, msg := restoreBackup(t, server.URL, cookie, crafted, ""); code != http.StatusOK {
		t.Fatalf("restore: %d %q", code, msg)
	}
	var key string
	_ = db.QueryRow(`SELECT value FROM system_settings WHERE key = 'push_vapid_private'`).Scan(&key)
	if key == "attacker-chosen" {
		t.Error("a restore wrote the push signing key from the file")
	}
}
