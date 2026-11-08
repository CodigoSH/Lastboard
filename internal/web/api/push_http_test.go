package api_test

import (
	"crypto/ecdh"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/webpush"
	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

func setupPushServer(t *testing.T) (*httptest.Server, *database.DB, *api.PushHandler) {
	t.Helper()
	tmp, err := os.CreateTemp("", "lastboard_push_*.db")
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
	h := api.NewPushHandler(db.DB)

	mux := http.NewServeMux()
	mux.Handle("POST /api/login", http.HandlerFunc(auth.Login))
	mux.Handle("GET /api/push/key", protect(http.HandlerFunc(h.Key)))
	mux.Handle("GET /api/push/subscriptions", protect(http.HandlerFunc(h.List)))
	mux.Handle("POST /api/push/subscriptions", protect(http.HandlerFunc(h.Subscribe)))
	mux.Handle("DELETE /api/push/subscriptions/{id}", protect(http.HandlerFunc(h.Delete)))
	mux.Handle("POST /api/push/test", protect(http.HandlerFunc(h.Test)))
	server := httptest.NewServer(mux)
	t.Cleanup(func() {
		server.Close()
		db.Close()
		os.Remove(tmp.Name())
	})
	return server, db, h
}

// browserKeys are the two values a browser hands over with a subscription.
func browserKeys(t *testing.T) (p256dh, auth string) {
	t.Helper()
	k, err := ecdh.P256().GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	secret := make([]byte, 16)
	if _, err := rand.Read(secret); err != nil {
		t.Fatal(err)
	}
	return webpush.Encode(k.PublicKey().Bytes()), webpush.Encode(secret)
}

func pushCall(t *testing.T, s *userSession, method, url, body string) (int, string) {
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
	b, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(b)
}

func subscriptionBody(t *testing.T, endpoint, label string) string {
	t.Helper()
	p, a := browserKeys(t)
	return fmt.Sprintf(`{"endpoint":%q,"keys":{"p256dh":%q,"auth":%q},"label":%q}`, endpoint, p, a, label)
}

const fcm = "https://fcm.googleapis.com/fcm/send/"

func TestADeviceIsSubscribedListedAndRemovedByItsOwnerAndNobodyElse(t *testing.T) {
	server, db, _ := setupPushServer(t)
	createUser(t, db.DB, "ana", "password1", "admin")
	createUser(t, db.DB, "ben", "password2", "user")
	ana, ben := doLogin(t, server.URL, "ana", "password1"), doLogin(t, server.URL, "ben", "password2")

	if code, body := pushCall(t, ana, "POST", server.URL+"/api/push/subscriptions", subscriptionBody(t, fcm+"AAA", "Chrome on Android")); code != 200 {
		t.Fatalf("subscribe: %d %s", code, body)
	}
	code, list := pushCall(t, ana, "GET", server.URL+"/api/push/subscriptions", "")
	var devices []map[string]any
	if err := json.Unmarshal([]byte(list), &devices); err != nil || code != 200 || len(devices) != 1 {
		t.Fatalf("list: %d %s", code, list)
	}
	if devices[0]["label"] != "Chrome on Android" {
		t.Errorf("listed as %v", devices[0]["label"])
	}
	// The page tells which row is its own by a reference both sides compute (the same eight bytes of a
	// SHA-256 as web/src/services/pushSupport.ts), so the address itself does not have to come back.
	sum := sha256.Sum256([]byte(fcm + "AAA"))
	if devices[0]["ref"] != hex.EncodeToString(sum[:8]) || devices[0]["ref"] != api.PushRef(fcm+"AAA") {
		t.Errorf("reference %v", devices[0]["ref"])
	}
	// What lets a message reach the device is never sent back to a page.
	for _, secret := range []string{"fcm.googleapis.com", "endpoint", "p256dh", "auth\""} {
		if strings.Contains(list, secret) {
			t.Errorf("the list carries %q", secret)
		}
	}

	// Another account sees none of it, and cannot remove it.
	if _, other := pushCall(t, ben, "GET", server.URL+"/api/push/subscriptions", ""); strings.TrimSpace(other) != "[]" {
		t.Errorf("another account's list: %s", other)
	}
	id := int(devices[0]["id"].(float64))
	if code, _ := pushCall(t, ben, "DELETE", fmt.Sprintf("%s/api/push/subscriptions/%d", server.URL, id), ""); code != http.StatusNotFound {
		t.Errorf("another account deleting the device: %d, want 404", code)
	}
	if _, still := pushCall(t, ana, "GET", server.URL+"/api/push/subscriptions", ""); strings.TrimSpace(still) == "[]" {
		t.Fatal("the device was removed by another account")
	}
	if code, _ := pushCall(t, ana, "DELETE", fmt.Sprintf("%s/api/push/subscriptions/%d", server.URL, id), ""); code != 200 {
		t.Errorf("the owner removing it: %d", code)
	}
	if _, gone := pushCall(t, ana, "GET", server.URL+"/api/push/subscriptions", ""); strings.TrimSpace(gone) != "[]" {
		t.Errorf("after removing: %s", gone)
	}
}

func TestSubscribingTheSameBrowserAgainUpdatesItInsteadOfAddingAnother(t *testing.T) {
	server, db, _ := setupPushServer(t)
	createUser(t, db.DB, "ana", "password1", "admin")
	ana := doLogin(t, server.URL, "ana", "password1")
	for _, label := range []string{"Chrome", "Chrome on Android"} {
		if code, body := pushCall(t, ana, "POST", server.URL+"/api/push/subscriptions", subscriptionBody(t, fcm+"SAME", label)); code != 200 {
			t.Fatalf("%d %s", code, body)
		}
	}
	var n int
	var label string
	_ = db.DB.QueryRow(`SELECT COUNT(*), MAX(label) FROM push_subscriptions`).Scan(&n, &label)
	if n != 1 || label != "Chrome on Android" {
		t.Fatalf("%d rows, label %q: one device, under its latest name", n, label)
	}
}

func TestAnAccountHasAtMostTwentyDevicesButAKnownOneCanAlwaysRenewItself(t *testing.T) {
	server, db, _ := setupPushServer(t)
	createUser(t, db.DB, "ana", "password1", "admin")
	ana := doLogin(t, server.URL, "ana", "password1")
	for i := 0; i < 20; i++ {
		if code, body := pushCall(t, ana, "POST", server.URL+"/api/push/subscriptions", subscriptionBody(t, fmt.Sprintf("%s%d", fcm, i), "d")); code != 200 {
			t.Fatalf("device %d: %d %s", i, code, body)
		}
	}
	if code, body := pushCall(t, ana, "POST", server.URL+"/api/push/subscriptions", subscriptionBody(t, fcm+"21st", "d")); code != http.StatusConflict || !strings.Contains(body, "push.too_many_devices") {
		t.Errorf("the 21st device: %d %s", code, body)
	}
	if code, body := pushCall(t, ana, "POST", server.URL+"/api/push/subscriptions", subscriptionBody(t, fcm+"7", "renewed")); code != 200 {
		t.Errorf("a device at the limit renewing its subscription: %d %s", code, body)
	}
}

func TestOnlyAPushServicesAddressWithRealKeysIsAccepted(t *testing.T) {
	server, db, _ := setupPushServer(t)
	createUser(t, db.DB, "ana", "password1", "admin")
	ana := doLogin(t, server.URL, "ana", "password1")
	p, a := browserKeys(t)
	for name, body := range map[string]string{
		"another host":     fmt.Sprintf(`{"endpoint":"https://evil.example/x","keys":{"p256dh":%q,"auth":%q}}`, p, a),
		"plain http":       fmt.Sprintf(`{"endpoint":"http://fcm.googleapis.com/x","keys":{"p256dh":%q,"auth":%q}}`, p, a),
		"the metadata":     fmt.Sprintf(`{"endpoint":"https://169.254.169.254/x","keys":{"p256dh":%q,"auth":%q}}`, p, a),
		"no endpoint":      fmt.Sprintf(`{"keys":{"p256dh":%q,"auth":%q}}`, p, a),
		"keys not a point": fmt.Sprintf(`{"endpoint":%q,"keys":{"p256dh":"AAAA","auth":%q}}`, fcm+"x", a),
		"a short secret":   fmt.Sprintf(`{"endpoint":%q,"keys":{"p256dh":%q,"auth":"AAAA"}}`, fcm+"x", p),
		"not json":         `{`,
		"a huge body":      `{"endpoint":"` + fcm + strings.Repeat("a", 9000) + `"}`,
	} {
		if code, _ := pushCall(t, ana, "POST", server.URL+"/api/push/subscriptions", body); code != http.StatusBadRequest {
			t.Errorf("%s: %d, want 400", name, code)
		}
	}
	var n int
	_ = db.DB.QueryRow(`SELECT COUNT(*) FROM push_subscriptions`).Scan(&n)
	if n != 0 {
		t.Fatalf("%d subscriptions stored from refused requests", n)
	}
}

func TestTheSigningKeyIsGivenToSignedInAccountsOnlyAndIsAlwaysTheSame(t *testing.T) {
	server, db, h := setupPushServer(t)
	createUser(t, db.DB, "ana", "password1", "admin")
	ana := doLogin(t, server.URL, "ana", "password1")
	if code, _ := pushCall(t, nil, "GET", server.URL+"/api/push/key", ""); code == http.StatusOK {
		t.Fatal("the key was given to somebody who is not signed in")
	}
	var first, second struct {
		PublicKey string `json:"public_key"`
	}
	_, b1 := pushCall(t, ana, "GET", server.URL+"/api/push/key", "")
	_, b2 := pushCall(t, ana, "GET", server.URL+"/api/push/key", "")
	_ = json.Unmarshal([]byte(b1), &first)
	_ = json.Unmarshal([]byte(b2), &second)
	if first.PublicKey == "" || first.PublicKey != second.PublicKey {
		t.Fatalf("keys %q and %q", first.PublicKey, second.PublicKey)
	}
	if raw, _ := webpush.Decode(first.PublicKey); len(raw) != 65 {
		t.Errorf("the key is %d bytes, want an uncompressed P-256 point of 65", len(raw))
	}
	// Only the public half ever leaves.
	priv, _, _ := h.Sender.VAPIDKeys()
	if strings.Contains(b1, priv) {
		t.Fatal("the private key was sent to a page")
	}
}

func TestATestNotificationNeedsADeviceAndReportsWhatBecameOfIt(t *testing.T) {
	server, db, h := setupPushServer(t)
	createUser(t, db.DB, "ana", "password1", "admin")
	ana := doLogin(t, server.URL, "ana", "password1")
	if code, body := pushCall(t, ana, "POST", server.URL+"/api/push/test", ""); code != http.StatusBadRequest || !strings.Contains(body, "push.no_devices") {
		t.Fatalf("no devices: %d %s", code, body)
	}

	// A push service of the test's own, over TLS, which takes the message.
	var hits int
	service := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { hits++; w.WriteHeader(http.StatusCreated) }))
	defer service.Close()
	restore := api.AllowAnyPushEndpointForTest()
	defer restore()
	h.Sender.Client = service.Client()
	if code, body := pushCall(t, ana, "POST", server.URL+"/api/push/subscriptions", subscriptionBody(t, service.URL+"/p", "test")); code != 200 {
		t.Fatalf("subscribe: %d %s", code, body)
	}
	code, body := pushCall(t, ana, "POST", server.URL+"/api/push/test", "")
	if code != 200 || hits != 1 || !strings.Contains(body, `"sent":1`) {
		t.Fatalf("test notification: %d %s, the service was hit %d times", code, body, hits)
	}

	// A push service that refuses is not reported as delivered.
	refusing := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusInternalServerError) }))
	defer refusing.Close()
	if _, err := db.DB.Exec(`DELETE FROM push_subscriptions`); err != nil {
		t.Fatal(err)
	}
	h.Sender.Client = refusing.Client()
	pushCall(t, ana, "POST", server.URL+"/api/push/subscriptions", subscriptionBody(t, refusing.URL+"/p", "test"))
	if code, body := pushCall(t, ana, "POST", server.URL+"/api/push/test", ""); code != http.StatusBadGateway || !strings.Contains(body, "push.not_delivered") {
		t.Errorf("a refusing push service: %d %s", code, body)
	}
}
