package api_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/webauthn"
	"git.codigosh.com/CodigoSH/Lastboard/internal/core/webauthn/softkey"
	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

// The tests reach the server at 127.0.0.1 but say they are at localhost — the
// one name a browser allows passkeys on without https.
const (
	pkHost   = "localhost"
	pkOrigin = "http://localhost"
	pkBoth   = softkey.UserPresent | softkey.UserVerified
)

var b64 = webauthn.B64

func setupPasskeyServer(t *testing.T) (*httptest.Server, *database.DB) {
	t.Helper()
	tmp, err := os.CreateTemp("", "lastboard_passkeys_*.db")
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
	pk := &api.PasskeyHandler{DB: db.DB}
	tf := &api.TwoFactorHandler{DB: db.DB}
	system := api.NewSystemHandler(db.DB)

	mux := http.NewServeMux()
	mux.Handle("POST /api/login", http.HandlerFunc(auth.Login))
	mux.Handle("POST /api/login/passkey/begin", http.HandlerFunc(auth.PasskeyLoginBegin))
	mux.Handle("POST /api/login/passkey/finish", http.HandlerFunc(auth.PasskeyLoginFinish))
	mux.Handle("GET /api/me", protect(http.HandlerFunc(users.GetMe)))
	mux.Handle("GET /api/passkeys", protect(http.HandlerFunc(pk.List)))
	mux.Handle("POST /api/passkeys/register/begin", protect(http.HandlerFunc(pk.RegisterBegin)))
	mux.Handle("POST /api/passkeys/register/finish", protect(http.HandlerFunc(pk.RegisterFinish)))
	mux.Handle("DELETE /api/passkeys/{id}", protect(http.HandlerFunc(pk.Delete)))
	mux.Handle("POST /api/2fa/setup", protect(http.HandlerFunc(tf.Setup)))
	mux.Handle("POST /api/2fa/enable", protect(http.HandlerFunc(tf.Enable)))
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

// at sends a request as a browser at host would, with a session if given.
func at(t *testing.T, host string, s *userSession, method, url string, body any) (int, []byte, *http.Response) {
	t.Helper()
	var rd io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, url, rd)
	req.Host = host
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
	return resp.StatusCode, bytes.TrimSpace(out), resp
}

// addPasskey makes a passkey for a signed-in account, as the browser and the
// device do together, and returns the server's answer.
func addPasskey(t *testing.T, base string, s *userSession, k *softkey.Key, flags byte, origin, rpID string) (int, string) {
	t.Helper()
	code, body, _ := at(t, pkHost, s, "POST", base+"/api/passkeys/register/begin", nil)
	if code != http.StatusOK {
		t.Fatalf("register/begin = %d %s", code, body)
	}
	var opts struct {
		Challenge string
		User      struct{ ID string }
	}
	json.Unmarshal(body, &opts)
	challenge, _ := b64.DecodeString(opts.Challenge)
	k.UserHandle, _ = b64.DecodeString(opts.User.ID)
	cd := softkey.ClientData(webauthn.TypeCreate, challenge, origin)
	code, body, _ = at(t, pkHost, s, "POST", base+"/api/passkeys/register/finish", map[string]string{
		"name":              "Test key",
		"clientDataJSON":    b64.EncodeToString(cd),
		"attestationObject": b64.EncodeToString(k.Create(rpID, flags)),
	})
	return code, string(body)
}

type assertion map[string]string

// signIn asks for a challenge and answers it with the passkey.
func signIn(t *testing.T, base string, k *softkey.Key, flags byte, origin, rpID string) assertion {
	t.Helper()
	code, body, _ := at(t, pkHost, nil, "POST", base+"/api/login/passkey/begin", map[string]bool{"remember_me": true})
	if code != http.StatusOK {
		t.Fatalf("login/passkey/begin = %d %s", code, body)
	}
	var opts struct{ Challenge, RpID string }
	json.Unmarshal(body, &opts)
	if opts.RpID != pkHost {
		t.Fatalf("the challenge is for %q, want %q", opts.RpID, pkHost)
	}
	challenge, _ := b64.DecodeString(opts.Challenge)
	cd := softkey.ClientData(webauthn.TypeGet, challenge, origin)
	ad, sig := k.Get(rpID, flags, cd)
	return assertion{
		"credentialId":      b64.EncodeToString(k.CredentialID),
		"clientDataJSON":    b64.EncodeToString(cd),
		"authenticatorData": b64.EncodeToString(ad),
		"signature":         b64.EncodeToString(sig),
		"userHandle":        b64.EncodeToString(k.UserHandle),
	}
}

// finish sends an answer and returns the status and the session, if one came.
func finish(t *testing.T, base string, a assertion) (int, string, *userSession) {
	t.Helper()
	code, body, resp := at(t, pkHost, nil, "POST", base+"/api/login/passkey/finish", a)
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
		return code, string(body), nil
	}
	return code, string(body), s
}

// A passkey made while signed in then signs in alone — no password, and no
// second step even for an account that has one: the device verified the person.
func TestAPasskeySignsInWithoutThePassword(t *testing.T) {
	server, db := setupPasskeyServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	s := doLogin(t, server.URL, "ana", "anapass123")
	turnOn(t, s, server.URL) // a second step that a passkey does not ask for

	for _, alg := range []int64{webauthn.AlgES256, webauthn.AlgEdDSA} {
		k := softkey.New(alg)
		if code, body := addPasskey(t, server.URL, s, k, pkBoth, pkOrigin, pkHost); code != http.StatusCreated {
			t.Fatalf("alg %d: adding a passkey = %d %s", alg, code, body)
		}
		code, body, session := finish(t, server.URL, signIn(t, server.URL, k, pkBoth, pkOrigin, pkHost))
		if code != http.StatusOK || session == nil {
			t.Fatalf("alg %d: signing in = %d %s, want a session", alg, code, body)
		}
		if code, _, _ := at(t, pkHost, session, "GET", server.URL+"/api/me", nil); code != http.StatusOK {
			t.Fatalf("alg %d: the session the passkey opened = %d", alg, code)
		}
	}
	_, body, _ := at(t, pkHost, s, "GET", server.URL+"/api/passkeys", nil)
	if !strings.Contains(string(body), `"available":true`) || strings.Count(string(body), `"name":"Test key"`) != 2 {
		t.Errorf("the list = %s", body)
	}
}

// Everything a passkey sign-in checks, each broken on its own.
func TestAPasskeySignInRefusesWhatIsNotRight(t *testing.T) {
	server, db := setupPasskeyServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	s := doLogin(t, server.URL, "ana", "anapass123")
	k := softkey.New(webauthn.AlgES256)
	if code, body := addPasskey(t, server.URL, s, k, pkBoth, pkOrigin, pkHost); code != http.StatusCreated {
		t.Fatalf("adding a passkey = %d %s", code, body)
	}

	cases := map[string]func() assertion{
		"another origin": func() assertion { return signIn(t, server.URL, k, pkBoth, "http://localhost.evil.example", pkHost) },
		"another site":   func() assertion { return signIn(t, server.URL, k, pkBoth, pkOrigin, "evil.example") },
		"not verified":   func() assertion { return signIn(t, server.URL, k, softkey.UserPresent, pkOrigin, pkHost) },
		"another passkey's signature": func() assertion {
			a := signIn(t, server.URL, k, pkBoth, pkOrigin, pkHost)
			stranger := softkey.New(webauthn.AlgES256)
			cd, _ := b64.DecodeString(a["clientDataJSON"])
			ad, _ := b64.DecodeString(a["authenticatorData"])
			a["signature"] = b64.EncodeToString(stranger.Sign(ad, cd))
			return a
		},
		"another account's handle": func() assertion {
			a := signIn(t, server.URL, k, pkBoth, pkOrigin, pkHost)
			a["userHandle"] = b64.EncodeToString([]byte("somebody-else-16"))
			return a
		},
		"an unknown passkey": func() assertion {
			stranger := softkey.New(webauthn.AlgES256)
			return signIn(t, server.URL, stranger, pkBoth, pkOrigin, pkHost)
		},
	}
	for name, make := range cases {
		code, body, session := finish(t, server.URL, make())
		if session != nil || code == http.StatusOK {
			t.Errorf("%s: %d %s, want refused", name, code, body)
		}
		// Each refusal counts toward the lockout; start each case afresh.
		db.DB.Exec(`DELETE FROM login_attempts`)
	}
}

// An answer is good once: the challenge is spent by the first.
func TestAPasskeyAnswerIsNotAcceptedTwice(t *testing.T) {
	server, db := setupPasskeyServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	k := softkey.New(webauthn.AlgEdDSA)
	addPasskey(t, server.URL, doLogin(t, server.URL, "ana", "anapass123"), k, pkBoth, pkOrigin, pkHost)
	a := signIn(t, server.URL, k, pkBoth, pkOrigin, pkHost)
	if code, _, s := finish(t, server.URL, a); code != http.StatusOK || s == nil {
		t.Fatalf("the first answer = %d", code)
	}
	if code, body, s := finish(t, server.URL, a); s != nil || code == http.StatusOK {
		t.Errorf("the same answer again = %d %s, want refused", code, body)
	}
}

// A passkey whose counter goes back has been copied: the copy is refused.
func TestACopiedPasskeyIsRefused(t *testing.T) {
	server, db := setupPasskeyServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	k := softkey.New(webauthn.AlgES256)
	k.Count = 5
	addPasskey(t, server.URL, doLogin(t, server.URL, "ana", "anapass123"), k, pkBoth, pkOrigin, pkHost)
	copied := *k // the same key, the same counter, on another device

	if code, _, s := finish(t, server.URL, signIn(t, server.URL, k, pkBoth, pkOrigin, pkHost)); code != http.StatusOK || s == nil {
		t.Fatalf("the original = %d", code)
	}
	if code, body, s := finish(t, server.URL, signIn(t, server.URL, &copied, pkBoth, pkOrigin, pkHost)); s != nil || code == http.StatusOK {
		t.Errorf("the copy, counting from where the original was = %d %s, want refused", code, body)
	}
}

// Making a passkey: only for the account whose challenge it is, only with the
// person verified, and never on an address where browsers do not allow them.
func TestMakingAPasskeyIsChecked(t *testing.T) {
	server, db := setupPasskeyServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	createUser(t, db.DB, "luis", "luispass123", "user")
	ana := doLogin(t, server.URL, "ana", "anapass123")
	luis := doLogin(t, server.URL, "luis", "luispass123")

	if code, body := addPasskey(t, server.URL, ana, softkey.New(webauthn.AlgES256), softkey.UserPresent, pkOrigin, pkHost); code != http.StatusBadRequest {
		t.Errorf("a passkey made without verifying the person = %d %s, want 400", code, body)
	}

	// Ana asks; Luis answers with what was made for Ana's challenge.
	_, body, _ := at(t, pkHost, ana, "POST", server.URL+"/api/passkeys/register/begin", nil)
	var opts struct{ Challenge string }
	json.Unmarshal(body, &opts)
	challenge, _ := b64.DecodeString(opts.Challenge)
	k := softkey.New(webauthn.AlgES256)
	code, out, _ := at(t, pkHost, luis, "POST", server.URL+"/api/passkeys/register/finish", map[string]string{
		"clientDataJSON":    b64.EncodeToString(softkey.ClientData(webauthn.TypeCreate, challenge, pkOrigin)),
		"attestationObject": b64.EncodeToString(k.Create(pkHost, pkBoth)),
	})
	if code != http.StatusBadRequest || string(out) != "passkey.expired" {
		t.Errorf("another account's challenge = %d %s, want 400 passkey.expired", code, out)
	}

	// A bare IP address and plain http elsewhere than this machine.
	for _, host := range []string{"192.168.1.20:8080", "dash.example.lan"} {
		if code, body, _ := at(t, host, ana, "POST", server.URL+"/api/passkeys/register/begin", nil); code != http.StatusConflict || string(body) != "passkey.not_available" {
			t.Errorf("at %s: %d %s, want 409 passkey.not_available", host, code, body)
		}
	}
	// An IP address, even over https — a passkey belongs to a name.
	req, _ := http.NewRequest("POST", server.URL+"/api/passkeys/register/begin", nil)
	req.Host = "192.168.1.20"
	req.Header.Set("X-Forwarded-Proto", "https")
	ana.attach(req)
	if resp, err := http.DefaultClient.Do(req); err != nil || resp.StatusCode != http.StatusConflict {
		t.Errorf("at an IP address over https: %v %v, want 409", resp.StatusCode, err)
	} else {
		resp.Body.Close()
	}
	if _, body, _ := at(t, "192.168.1.20:8080", ana, "GET", server.URL+"/api/passkeys", nil); !strings.Contains(string(body), `"available":false`) {
		t.Errorf("the list at an IP address says %s", body)
	}
}

// Removing a passkey: one's own, and then it signs in no more.
func TestRemovingAPasskey(t *testing.T) {
	server, db := setupPasskeyServer(t)
	createUser(t, db.DB, "ana", "anapass123", "user")
	createUser(t, db.DB, "luis", "luispass123", "user")
	ana := doLogin(t, server.URL, "ana", "anapass123")
	k := softkey.New(webauthn.AlgES256)
	addPasskey(t, server.URL, ana, k, pkBoth, pkOrigin, pkHost)
	var id int64
	db.DB.QueryRow(`SELECT id FROM user_passkeys`).Scan(&id)

	luis := doLogin(t, server.URL, "luis", "luispass123")
	if code, _, _ := at(t, pkHost, luis, "DELETE", fmt.Sprintf("%s/api/passkeys/%d", server.URL, id), nil); code != http.StatusNotFound {
		t.Errorf("luis removing ana's passkey = %d, want 404", code)
	}
	if code, _, _ := at(t, pkHost, ana, "DELETE", fmt.Sprintf("%s/api/passkeys/%d", server.URL, id), nil); code != http.StatusNoContent {
		t.Fatalf("ana removing her passkey = %d", code)
	}
	if code, _, s := finish(t, server.URL, signIn(t, server.URL, k, pkBoth, pkOrigin, pkHost)); s != nil || code == http.StatusOK {
		t.Errorf("a removed passkey signing in = %d, want refused", code)
	}
}

// A backup brings passkeys back with the id their devices hold for the account,
// so they go on signing in after a restore.
func TestPasskeysTravelInTheBackup(t *testing.T) {
	server, db := setupPasskeyServer(t)
	createUser(t, db.DB, "boss", "bosspass123", "admin")
	admin := doLogin(t, server.URL, "boss", "bosspass123")
	k := softkey.New(webauthn.AlgEdDSA)
	if code, body := addPasskey(t, server.URL, admin, k, pkBoth, pkOrigin, pkHost); code != http.StatusCreated {
		t.Fatalf("adding = %d %s", code, body)
	}
	file := downloadBackup(t, server.URL, admin.sessionCookie, "GET", "")
	db.DB.Exec(`UPDATE user_passkey_handles SET handle = x'00'`)
	if code, body := restoreBackup(t, server.URL, admin.sessionCookie, file, ""); code != http.StatusOK {
		t.Fatalf("restore = %d %s", code, body)
	}
	if code, body, s := finish(t, server.URL, signIn(t, server.URL, k, pkBoth, pkOrigin, pkHost)); code != http.StatusOK || s == nil {
		t.Errorf("the passkey after restoring = %d %s, want a session", code, body)
	}
}
