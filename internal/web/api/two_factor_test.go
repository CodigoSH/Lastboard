package api_test

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/totp"
	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

func setupTwoFactorServer(t *testing.T) (*httptest.Server, *database.DB) {
	t.Helper()
	tmp, err := os.CreateTemp("", "lastboard_2fa_*.db")
	if err != nil {
		t.Fatal(err)
	}
	tmp.Close()
	db, err := database.InitDB(tmp.Name())
	if err != nil {
		t.Fatal(err)
	}
	protect := middleware.AuthRequired(db.DB, testSecret)
	auth := api.NewAuthHandler(db.DB, testSecret)
	users := api.NewUserHandler(db.DB)
	tf := &api.TwoFactorHandler{DB: db.DB}
	system := api.NewSystemHandler(db.DB)

	mux := http.NewServeMux()
	mux.Handle("POST /api/login", http.HandlerFunc(auth.Login))
	mux.Handle("POST /api/login/2fa", http.HandlerFunc(auth.LoginSecondStep))
	mux.Handle("GET /api/me", protect(http.HandlerFunc(users.GetMe)))
	mux.Handle("GET /api/2fa", protect(http.HandlerFunc(tf.Status)))
	mux.Handle("POST /api/2fa/setup", protect(http.HandlerFunc(tf.Setup)))
	mux.Handle("POST /api/2fa/enable", protect(http.HandlerFunc(tf.Enable)))
	mux.Handle("POST /api/2fa/disable", protect(http.HandlerFunc(tf.Disable)))
	mux.Handle("POST /api/2fa/recovery-codes", protect(http.HandlerFunc(tf.RecoveryCodes)))
	mux.Handle("POST /api/users/2fa/remove", protect(http.HandlerFunc(tf.RemoveForUser)))
	mux.Handle("GET /api/system/backup", protect(http.HandlerFunc(system.DownloadBackup)))
	mux.Handle("POST /api/system/restore", protect(http.HandlerFunc(system.RestoreBackup)))
	server := httptest.NewServer(mux)
	t.Cleanup(func() {
		server.Close()
		db.Close()
		os.Remove(tmp.Name())
	})
	return server, db
}

// send posts JSON with a session (or none) and returns the status and body.
func send(t *testing.T, s *userSession, method, url, body string) (int, string) {
	t.Helper()
	req, _ := http.NewRequest(method, url, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if s != nil {
		s.attach(req)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	out, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, strings.TrimSpace(string(out))
}

// turnOn sets up and confirms a second step for a signed-in account, and
// returns its secret and recovery codes.
func turnOn(t *testing.T, s *userSession, base string) ([]byte, []string) {
	t.Helper()
	code, body := send(t, s, "POST", base+"/api/2fa/setup", "")
	if code != http.StatusOK {
		t.Fatalf("setup = %d %s", code, body)
	}
	var setup struct{ Secret, URI string }
	json.Unmarshal([]byte(body), &setup)
	secret, err := totp.DecodeSecret(setup.Secret)
	if err != nil || !strings.HasPrefix(setup.URI, "otpauth://totp/") {
		t.Fatalf("setup answered %s", body)
	}
	code, body = send(t, s, "POST", base+"/api/2fa/enable", fmt.Sprintf(`{"code":%q}`, totp.Code(secret, time.Now())))
	if code != http.StatusOK {
		t.Fatalf("enable = %d %s", code, body)
	}
	var on struct {
		RecoveryCodes []string `json:"recovery_codes"`
	}
	json.Unmarshal([]byte(body), &on)
	if len(on.RecoveryCodes) != totp.RecoveryCodes {
		t.Fatalf("enable gave %d recovery codes", len(on.RecoveryCodes))
	}
	return secret, on.RecoveryCodes
}

// passwordStep signs in with the password and returns the challenge, failing
// if the answer was a session instead.
func passwordStep(t *testing.T, base, user, pass string) string {
	t.Helper()
	resp, err := http.Post(base+"/api/login", "application/json",
		strings.NewReader(fmt.Sprintf(`{"username":%q,"password":%q}`, user, pass)))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	for _, c := range resp.Cookies() {
		if c.Name == "session_token" && c.Value != "" {
			t.Fatal("the password alone was given a session")
		}
	}
	var out struct {
		TwoFactor bool   `json:"two_factor"`
		Challenge string `json:"challenge"`
	}
	json.NewDecoder(resp.Body).Decode(&out)
	if resp.StatusCode != http.StatusOK || !out.TwoFactor || out.Challenge == "" {
		t.Fatalf("password step = %d %+v, want a challenge", resp.StatusCode, out)
	}
	return out.Challenge
}

// codeStep sends the code for a challenge and returns the status and the
// session that came back, if any.
func codeStep(t *testing.T, base, challenge, code string) (int, *userSession) {
	t.Helper()
	resp, err := http.Post(base+"/api/login/2fa", "application/json",
		strings.NewReader(fmt.Sprintf(`{"challenge":%q,"code":%q}`, challenge, code)))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	s := &userSession{}
	for _, c := range resp.Cookies() {
		switch c.Name {
		case "session_token":
			s.sessionCookie = c
		case "csrf_token":
			s.csrfCookie = c
		}
	}
	if s.sessionCookie == nil || s.sessionCookie.Value == "" {
		return resp.StatusCode, nil
	}
	return resp.StatusCode, s
}

// With a second step the password alone opens nothing: it earns a challenge,
// a wrong code is refused, and the right one signs in. The same code does not
// sign in twice.
func TestASecondStepIsAskedForAndACodeWorksOnce(t *testing.T) {
	server, db := setupTwoFactorServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	secret, _ := turnOn(t, doLogin(t, server.URL, "ana", "anapass123"), server.URL)

	challenge := passwordStep(t, server.URL, "ana", "anapass123")
	wrong := "000000"
	if totp.Code(secret, time.Now()) == wrong {
		wrong = "111111"
	}
	if code, s := codeStep(t, server.URL, challenge, wrong); code != http.StatusUnauthorized || s != nil {
		t.Fatalf("a wrong code = %d (session %v), want 401 and none", code, s != nil)
	}
	// The code from the app one period ahead: the one used to turn it on is spent.
	good := totp.Code(secret, time.Now().Add(totp.Period))
	code, s := codeStep(t, server.URL, challenge, good)
	if code != http.StatusOK || s == nil {
		t.Fatalf("the right code = %d, want a session", code)
	}
	if code, _ := call(t, s, "GET", server.URL+"/api/me"); code != http.StatusOK {
		t.Fatalf("the session the code opened = %d", code)
	}

	again := passwordStep(t, server.URL, "ana", "anapass123")
	if code, s := codeStep(t, server.URL, again, good); code != http.StatusUnauthorized || s != nil {
		t.Errorf("the same code a second time = %d, want 401", code)
	}
	// And the challenge it used is gone.
	if code, _ := codeStep(t, server.URL, challenge, totp.Code(secret, time.Now().Add(totp.Period))); code != http.StatusUnauthorized {
		t.Errorf("a used challenge = %d, want 401", code)
	}
}

// A recovery code signs in once, in place of the phone, and is counted.
func TestARecoveryCodeSignsInOnce(t *testing.T) {
	server, db := setupTwoFactorServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	_, codes := turnOn(t, doLogin(t, server.URL, "ana", "anapass123"), server.URL)

	// Typed as people type it: upper case, without the dashes.
	typed := strings.ToUpper(strings.ReplaceAll(codes[3], "-", ""))
	code, s := codeStep(t, server.URL, passwordStep(t, server.URL, "ana", "anapass123"), typed)
	if code != http.StatusOK || s == nil {
		t.Fatalf("a recovery code = %d, want a session", code)
	}
	if code, s := codeStep(t, server.URL, passwordStep(t, server.URL, "ana", "anapass123"), codes[3]); code != http.StatusUnauthorized || s != nil {
		t.Errorf("the same recovery code again = %d, want 401", code)
	}
	_, body := send(t, s, "GET", server.URL+"/api/2fa", "")
	if !strings.Contains(body, `"recovery_left":9`) {
		t.Errorf("status after one code = %s, want 9 left", body)
	}
}

// One challenge takes a handful of wrong codes; then the password is needed
// again, so a guessed password does not buy an afternoon of guessing codes.
func TestAChallengeEndsAfterItsWrongCodes(t *testing.T) {
	server, db := setupTwoFactorServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	secret, _ := turnOn(t, doLogin(t, server.URL, "ana", "anapass123"), server.URL)
	challenge := passwordStep(t, server.URL, "ana", "anapass123")
	right := totp.Code(secret, time.Now().Add(totp.Period))
	wrong := "999999"
	if right == wrong {
		wrong = "888888"
	}
	for i := 0; i < 5; i++ {
		codeStep(t, server.URL, challenge, wrong)
	}
	// The challenge itself is gone — not merely held back by the lockout that
	// the same wrong codes also start, which lifts in a few minutes. The answer
	// cannot tell the two apart (the lockout is checked first), so the table is
	// asked.
	var left int
	db.DB.QueryRow(`SELECT COUNT(*) FROM login_challenges`).Scan(&left)
	if left != 0 {
		t.Fatalf("after five wrong codes %d challenges are still open, want none", left)
	}
	if code, s := codeStep(t, server.URL, challenge, right); s != nil || code == http.StatusOK {
		t.Fatalf("the right code after five wrong ones = %d, want refused", code)
	}
}

// Requests that arrive together with one challenge — each with a code that
// would be accepted on its own — sign in once between them.
//
// What this does NOT catch, measured: removing the check that the challenge was
// still there to delete. Here the first request deletes it before the others
// look it up, so they are refused at the lookup either way. That check is for
// two requests that both pass the lookup before either deletes, which this test
// cannot bring about; it stays as a second line, not as what this test proves.
func TestAChallengeOpensOneSessionEvenAtOnce(t *testing.T) {
	server, db := setupTwoFactorServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	_, codes := turnOn(t, doLogin(t, server.URL, "ana", "anapass123"), server.URL)
	challenge := passwordStep(t, server.URL, "ana", "anapass123")

	var wg sync.WaitGroup
	sessions := make(chan bool, len(codes))
	start := make(chan struct{})
	for _, c := range codes {
		wg.Add(1)
		go func(c string) {
			defer wg.Done()
			<-start
			if _, s := codeStep(t, server.URL, challenge, c); s != nil {
				sessions <- true
			}
		}(c)
	}
	close(start)
	wg.Wait()
	close(sessions)
	if n := len(sessions); n != 1 {
		t.Fatalf("%d requests on one challenge opened %d sessions, want 1", len(codes), n)
	}
}

// Turning it on needs a code that proves the app has the secret; turning it
// off needs the password.
func TestTurningItOnAndOff(t *testing.T) {
	server, db := setupTwoFactorServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	s := doLogin(t, server.URL, "ana", "anapass123")

	if code, _ := send(t, s, "POST", server.URL+"/api/2fa/setup", ""); code != http.StatusOK {
		t.Fatalf("setup = %d", code)
	}
	if code, _ := send(t, s, "POST", server.URL+"/api/2fa/enable", `{"code":"12345"}`); code != http.StatusBadRequest {
		t.Errorf("enable with a bad code = %d, want 400", code)
	}
	if _, body := send(t, s, "GET", server.URL+"/api/2fa", ""); !strings.Contains(body, `"enabled":false`) {
		t.Errorf("a secret not yet confirmed is in force: %s", body)
	}
	// Sign-in still needs no code while it is only being set up.
	doLogin(t, server.URL, "ana", "anapass123")

	turnOn(t, s, server.URL)
	if code, _ := send(t, s, "POST", server.URL+"/api/2fa/setup", ""); code != http.StatusConflict {
		t.Errorf("setup while on = %d, want 409", code)
	}
	if code, _ := send(t, s, "POST", server.URL+"/api/2fa/disable", `{"current_password":"wrong-one"}`); code != http.StatusUnauthorized {
		t.Errorf("disable with a wrong password = %d, want 401", code)
	}
	if code, _ := send(t, s, "POST", server.URL+"/api/2fa/disable", `{"current_password":"anapass123"}`); code != http.StatusNoContent {
		t.Fatalf("disable = %d", code)
	}
	doLogin(t, server.URL, "ana", "anapass123") // a session for the password again
}

// The way back: the administrator takes it off an account, and the command on
// the machine takes it off any account, the administrator's own included.
func TestTheWaysBackWhenThePhoneIsLost(t *testing.T) {
	server, db := setupTwoFactorServer(t)
	createUser(t, db.DB, "boss", "bosspass123", "admin")
	createUser(t, db.DB, "ana", "anapass123", "user")
	admin := doLogin(t, server.URL, "boss", "bosspass123")
	turnOn(t, doLogin(t, server.URL, "ana", "anapass123"), server.URL)
	turnOn(t, admin, server.URL)

	var anaID int
	db.DB.QueryRow(`SELECT id FROM users WHERE username = 'ana'`).Scan(&anaID)
	if code, _ := send(t, admin, "POST", server.URL+"/api/users/2fa/remove", fmt.Sprintf(`{"id":%d}`, anaID)); code != http.StatusNoContent {
		t.Fatalf("the administrator removing ana's second step = %d", code)
	}
	doLogin(t, server.URL, "ana", "anapass123")

	if err := api.ResetTwoFactor(context.Background(), db.DB, "boss"); err != nil {
		t.Fatal(err)
	}
	doLogin(t, server.URL, "boss", "bosspass123")
	if err := api.ResetTwoFactor(context.Background(), db.DB, "nobody"); err == nil {
		t.Error("resetting an account that does not exist said nothing")
	}
}

// A backup carries each account's second step: after a restore the account
// still asks for the code from the same app, and a recovery code spent before
// stays spent.
func TestTheSecondStepTravelsInTheBackup(t *testing.T) {
	server, db := setupTwoFactorServer(t)
	createUser(t, db.DB, "boss", "bosspass123", "admin")
	admin := doLogin(t, server.URL, "boss", "bosspass123")
	secret, codes := turnOn(t, admin, server.URL)
	if code, _ := codeStep(t, server.URL, passwordStep(t, server.URL, "boss", "bosspass123"), codes[0]); code != http.StatusOK {
		t.Fatal("the recovery code did not sign in")
	}
	file := downloadBackup(t, server.URL, admin.sessionCookie, "GET", "")
	if strings.Contains(string(file), codes[1]) {
		t.Fatal("the backup carries a recovery code itself, not its hash")
	}

	db.DB.Exec(`UPDATE user_totp SET secret = 'AAAAAAAAAAAAAAAA'`)
	if code, body := restoreBackup(t, server.URL, admin.sessionCookie, file, ""); code != http.StatusOK {
		t.Fatalf("restore = %d %s", code, body)
	}

	challenge := passwordStep(t, server.URL, "boss", "bosspass123")
	if code, _ := codeStep(t, server.URL, challenge, codes[0]); code != http.StatusUnauthorized {
		t.Errorf("a recovery code spent before the backup = %d after restoring, want 401", code)
	}
	if code, s := codeStep(t, server.URL, passwordStep(t, server.URL, "boss", "bosspass123"), totp.Code(secret, time.Now().Add(totp.Period))); code != http.StatusOK || s == nil {
		t.Errorf("the app's code after restoring = %d, want a session", code)
	}
}
