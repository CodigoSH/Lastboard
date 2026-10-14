package api_test

import (
	"io"
	"net/http"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

func statusWith(t *testing.T, url string, c *http.Cookie) int {
	t.Helper()
	req, _ := http.NewRequest("GET", url+"/api/dashboard", nil)
	req.AddCookie(c)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	return resp.StatusCode
}

// Restoring replaces every account, so every session open before it has to end —
// including one minted before sessions carried an account id, which names the
// account and its password generation and would otherwise find the restored
// account with the same name and the same generation and carry on.
//
// And it must end them without rewriting the signing secret in the database
// while the running server keeps the old one in memory: that mismatch made every
// session opened after the restore die at the next restart.
func TestARestoreEndsEverySessionAndLeavesTheSigningSecretAlone(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "boss", "correcthorse", "admin")
	db.Exec(`INSERT INTO system_settings (key, value) VALUES ('session_secret', 'unchanged')`)

	current := loginAndGetCookie(t, server, "boss", "correcthorse")
	legacy := &http.Cookie{Name: "session_token",
		Value: util.SignToken(util.SessionPayload("boss", 0), testSecret, time.Now().Add(time.Hour))}

	if got := statusWith(t, server.URL, legacy); got != http.StatusOK {
		t.Fatalf("a session minted before ids existed should work before the restore, got %d", got)
	}

	req, _ := http.NewRequest("GET", server.URL+"/api/system/backup", nil)
	req.AddCookie(current)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	restoreBytes(t, server.URL, current, raw)

	if got := statusWith(t, server.URL, current); got != http.StatusUnauthorized {
		t.Errorf("a current session survived the restore: %d", got)
	}
	if got := statusWith(t, server.URL, legacy); got != http.StatusUnauthorized {
		t.Errorf("a session from before ids survived the restore: %d", got)
	}

	var secret string
	db.QueryRow(`SELECT value FROM system_settings WHERE key = 'session_secret'`).Scan(&secret)
	if secret != "unchanged" {
		t.Errorf("the restore rewrote the signing secret in the database to %q", secret)
	}

	if got := statusWith(t, server.URL, loginAndGetCookie(t, server, "boss", "correcthorse")); got != http.StatusOK {
		t.Errorf("signing in again after the restore should work, got %d", got)
	}
}
