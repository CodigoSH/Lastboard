package api_test

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
)

// loginStatus is the answer of the sign-in to a name and a password.
func loginStatus(t *testing.T, base, username, password string) int {
	t.Helper()
	body := fmt.Sprintf(`{"username":%q,"password":%q}`, username, password)
	resp, err := http.Post(base+"/api/login", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	return resp.StatusCode
}

// The way back for an administrator who has forgotten the password: the
// command on the machine sets a new one, the old one stops working, and so does
// every session the account had.
func TestResetPasswordIsTheWayBackForAnAdministrator(t *testing.T) {
	server, db := setupTwoFactorServer(t)
	createUser(t, db.DB, "boss", "bosspass123", "admin")
	session := doLogin(t, server.URL, "boss", "bosspass123")
	if code, _ := send(t, session, "GET", server.URL+"/api/me", ""); code != http.StatusOK {
		t.Fatalf("a session before the reset = %d, want 200", code)
	}

	if err := api.ResetPassword(context.Background(), db.DB, "boss", "a-brand-new-pass"); err != nil {
		t.Fatal(err)
	}

	if code := loginStatus(t, server.URL, "boss", "bosspass123"); code != http.StatusUnauthorized {
		t.Errorf("the old password after the reset = %d, want 401", code)
	}
	if code, _ := send(t, session, "GET", server.URL+"/api/me", ""); code != http.StatusUnauthorized {
		t.Errorf("a session from before the reset = %d, want 401", code)
	}
	doLogin(t, server.URL, "boss", "a-brand-new-pass")
}

// What is not a password the server would accept is not accepted here either,
// and nothing is written.
func TestResetPasswordRefusesWhatChangingItWouldRefuse(t *testing.T) {
	server, db := setupTwoFactorServer(t)
	createUser(t, db.DB, "boss", "bosspass123", "admin")

	for name, plain := range map[string]string{
		"too short": "short",
		"too long":  strings.Repeat("x", 300),
	} {
		if err := api.ResetPassword(context.Background(), db.DB, "boss", plain); err == nil {
			t.Errorf("%s: the reset said nothing", name)
		}
	}
	doLogin(t, server.URL, "boss", "bosspass123")
	var version int
	db.DB.QueryRow(`SELECT password_version FROM users WHERE username = 'boss'`).Scan(&version)
	if version != 0 {
		t.Errorf("a refused reset still moved the generation to %d", version)
	}
}

func TestResetPasswordNamesAnAccountThatDoesNotExist(t *testing.T) {
	_, db := setupTwoFactorServer(t)
	err := api.ResetPassword(context.Background(), db.DB, "nobody", "a-brand-new-pass")
	if err == nil || !strings.Contains(err.Error(), "nobody") {
		t.Errorf("an account that does not exist: %v", err)
	}
	if err := api.AccountExists(context.Background(), db.DB, "nobody"); err == nil {
		t.Error("AccountExists said an account that is not there is")
	}
	createUser(t, db.DB, "boss", "bosspass123", "admin")
	if err := api.AccountExists(context.Background(), db.DB, "boss"); err != nil {
		t.Errorf("AccountExists on an account that is there: %v", err)
	}
}

// Someone who has forgotten a password has usually been guessing it: the
// account's own lockout goes with the old password, and an address's does not.
func TestResetPasswordClearsTheAccountsLockoutOnly(t *testing.T) {
	_, db := setupTwoFactorServer(t)
	createUser(t, db.DB, "boss", "bosspass123", "admin")
	var id int
	db.DB.QueryRow(`SELECT id FROM users WHERE username = 'boss'`).Scan(&id)
	until := time.Now().Add(5 * time.Minute)
	for _, key := range []string{fmt.Sprintf("account:%d", id), "203.0.113.7"} {
		if _, err := db.DB.Exec(`INSERT INTO login_attempts (ip, count, first_seen, locked_until) VALUES (?, 5, ?, ?)`, key, time.Now(), until); err != nil {
			t.Fatal(err)
		}
	}

	if err := api.ResetPassword(context.Background(), db.DB, "boss", "a-brand-new-pass"); err != nil {
		t.Fatal(err)
	}

	var rows int
	db.DB.QueryRow(`SELECT COUNT(*) FROM login_attempts WHERE ip = ?`, fmt.Sprintf("account:%d", id)).Scan(&rows)
	if rows != 0 {
		t.Error("the account's lockout survived the reset")
	}
	db.DB.QueryRow(`SELECT COUNT(*) FROM login_attempts WHERE ip = '203.0.113.7'`).Scan(&rows)
	if rows != 1 {
		t.Error("an address's lockout was cleared by an account's reset")
	}
}

// The command changes a password and nothing else: the second step stays, and
// so does every other account.
func TestResetPasswordTouchesNothingElse(t *testing.T) {
	server, db := setupTwoFactorServer(t)
	createUser(t, db.DB, "boss", "bosspass123", "admin")
	createUser(t, db.DB, "ana", "anapass123", "user")
	turnOn(t, doLogin(t, server.URL, "ana", "anapass123"), server.URL)

	if err := api.ResetPassword(context.Background(), db.DB, "ana", "a-brand-new-pass"); err != nil {
		t.Fatal(err)
	}

	var totp int
	db.DB.QueryRow(`SELECT COUNT(*) FROM user_totp`).Scan(&totp)
	if totp != 1 {
		t.Errorf("the second step rows after the reset = %d, want 1", totp)
	}
	doLogin(t, server.URL, "boss", "bosspass123")
}
