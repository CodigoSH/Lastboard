package api

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/hkdf"
	"crypto/rand"
	"crypto/sha256"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/webpush"
	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
)

// ── Which addresses are ever sent to ─────────────────────────────────────────

func TestOnlyAPushServicesOwnHTTPSAddressIsEverSentTo(t *testing.T) {
	yes := []string{
		"https://fcm.googleapis.com/fcm/send/abc",
		"https://updates.push.services.mozilla.com/wpush/v2/abc",
		"https://autopush.push.services.mozilla.com/wpush/v2/abc",
		"https://web.push.apple.com/QWxhZGRpbg",
		"https://wns2-par02p.notify.windows.com/w/?token=abc",
		"https://FCM.GOOGLEAPIS.COM/fcm/send/abc",
		"https://fcm.googleapis.com:443/fcm/send/abc",
	}
	no := map[string]string{
		"http://fcm.googleapis.com/fcm/send/abc":                  "not https",
		"https://fcm.googleapis.com.evil.example/x":               "a look-alike that ends elsewhere",
		"https://evilfcm.googleapis.com/x":                        "another host under the same suffix",
		"https://evil.example/fcm.googleapis.com":                 "the name only in the path",
		"https://fcm.googleapis.com@evil.example/x":               "credentials in front of another host",
		"https://user:pw@fcm.googleapis.com/x":                    "credentials in the address",
		"https://fcm.googleapis.com:8443/x":                       "another port",
		"https://push.apple.com/x":                                "the bare domain, not a host under it",
		"https://notify.windows.com/x":                            "the bare domain, not a host under it",
		"https://169.254.169.254/latest/meta-data":                "a metadata service",
		"https://localhost/x":                                     "this machine",
		"https://192.168.1.10/x":                                  "the local network",
		"https://[::1]/x":                                         "this machine, in IPv6",
		"https:///x":                                              "no host",
		"fcm.googleapis.com/x":                                    "no scheme",
		"":                                                        "nothing",
		"https://fcm.googleapis.com/" + strings.Repeat("a", 2100): "longer than any push service's",
	}
	for _, u := range yes {
		if !allowedPushEndpoint(u) {
			t.Errorf("%q refused, it is a push service's", u)
		}
	}
	for u, why := range no {
		if allowedPushEndpoint(u) {
			t.Errorf("%q accepted: %s", u[:min(len(u), 60)], why)
		}
	}
}

func TestADeviceIsListedUnderItsOwnNameCleaned(t *testing.T) {
	for in, want := range map[string]string{
		"":                            "Browser",
		"   ":                         "Browser",
		"Chrome on Android":           "Chrome on Android",
		"  Chrome \n\t on   Android ": "Chrome on Android",
		"A\x00B\x07C":                 "ABC",
		strings.Repeat("é", 80):       strings.Repeat("é", 60),
	} {
		if got := pushLabel(in); got != want {
			t.Errorf("pushLabel(%q) = %q, want %q", in, got, want)
		}
	}
}

// ── A push service of the test's own ─────────────────────────────────────────

// fakePushService stands where Google's, Apple's or Mozilla's would, over TLS as theirs are. It keeps
// what it was sent and answers with the status it is told to.
type fakePushService struct {
	*httptest.Server
	mu       sync.Mutex
	requests []pushRequest
}

type pushRequest struct {
	header http.Header
	body   []byte
	path   string
}

func newFakePushService(t *testing.T, status int) *fakePushService {
	t.Helper()
	f := &fakePushService{}
	f.Server = httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		f.mu.Lock()
		f.requests = append(f.requests, pushRequest{header: r.Header.Clone(), body: body, path: r.URL.Path})
		f.mu.Unlock()
		w.WriteHeader(status)
	}))
	t.Cleanup(f.Close)
	return f
}

func (f *fakePushService) got() []pushRequest {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]pushRequest{}, f.requests...)
}

// browser is a subscription with the private half kept, so a test can open what it was sent.
type browser struct {
	private *ecdh.PrivateKey
	p256dh  string
	auth    string
}

func newBrowser(t *testing.T) browser {
	t.Helper()
	k, err := ecdh.P256().GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	secret := make([]byte, 16)
	if _, err := rand.Read(secret); err != nil {
		t.Fatal(err)
	}
	return browser{private: k, p256dh: webpush.Encode(k.PublicKey().Bytes()), auth: webpush.Encode(secret)}
}

// open reads a push body as the browser does (RFC 8291): the sender's public key is in its header.
func (b browser) open(t *testing.T, body []byte) []byte {
	t.Helper()
	salt, idLen := body[:16], int(body[20])
	asPublicRaw := body[21 : 21+idLen]
	asPublic, err := ecdh.P256().NewPublicKey(asPublicRaw)
	if err != nil {
		t.Fatal(err)
	}
	shared, err := b.private.ECDH(asPublic)
	if err != nil {
		t.Fatal(err)
	}
	auth, _ := webpush.Decode(b.auth)
	info := append([]byte("WebPush: info\x00"), b.private.PublicKey().Bytes()...)
	info = append(info, asPublicRaw...)
	prkKey, _ := hkdf.Extract(sha256.New, shared, auth)
	ikm, _ := hkdf.Expand(sha256.New, prkKey, string(info), 32)
	prk, _ := hkdf.Extract(sha256.New, ikm, salt)
	cek, _ := hkdf.Expand(sha256.New, prk, "Content-Encoding: aes128gcm\x00", 16)
	nonce, _ := hkdf.Expand(sha256.New, prk, "Content-Encoding: nonce\x00", 12)
	block, _ := aes.NewCipher(cek)
	gcm, _ := cipher.NewGCM(block)
	record, err := gcm.Open(nil, nonce, body[21+idLen:], nil)
	if err != nil {
		t.Fatalf("the body does not open for the browser it was sent to: %v", err)
	}
	return record[:len(record)-1]
}

// senderTo is a sender over the test database whose client trusts the fake service and whose rule
// lets that service's address through.
func senderTo(t *testing.T, f *fakePushService) (*PushSender, int) {
	t.Helper()
	db, _ := setupTestDB(t)
	store := &MonitorStore{DB: db}
	owner := ownerOf(t, store, seedItem(t, store))
	restore := AllowAnyPushEndpointForTest()
	t.Cleanup(restore)
	s := NewPushSender(db)
	s.Client = f.Client()
	return s, owner
}

func subscribe(t *testing.T, s *PushSender, userID int, endpoint string, b browser) {
	t.Helper()
	if _, err := s.DB.Exec(`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, label, created_at) VALUES (?, ?, ?, ?, 'test', 1)`,
		userID, endpoint, b.p256dh, b.auth); err != nil {
		t.Fatal(err)
	}
}

func countSubscriptions(t *testing.T, s *PushSender) int {
	t.Helper()
	var n int
	if err := s.DB.QueryRow(`SELECT COUNT(*) FROM push_subscriptions`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

// ── Sending ──────────────────────────────────────────────────────────────────

func TestAMessageReachesThePushServiceSignedAndEncryptedForTheBrowser(t *testing.T) {
	f := newFakePushService(t, http.StatusCreated)
	s, owner := senderTo(t, f)
	b := newBrowser(t)
	subscribe(t, s, owner, f.URL+"/push/abc", b)

	res, err := s.SendToUser(context.Background(), owner, PushMessage{Title: "Plex", Body: "Service is down", Tag: "service:Plex", URL: "/?view=monitor"})
	if err != nil || res.Sent != 1 || res.Failed != 0 || res.Removed != 0 {
		t.Fatalf("result %+v, %v", res, err)
	}
	reqs := f.got()
	if len(reqs) != 1 {
		t.Fatalf("%d requests, want 1", len(reqs))
	}
	r := reqs[0]
	if r.path != "/push/abc" {
		t.Errorf("sent to %q: the subscription's own address", r.path)
	}
	_, public, _ := s.VAPIDKeys()
	if got := r.header.Get("Authorization"); !strings.HasPrefix(got, "vapid t=") || !strings.HasSuffix(got, ", k="+public) {
		t.Errorf("Authorization = %q: signed for the instance's own key", got)
	}
	if r.header.Get("Content-Encoding") != "aes128gcm" || r.header.Get("TTL") != "43200" || r.header.Get("Urgency") != "high" {
		t.Errorf("headers %v: an outage is urgent, kept twelve hours, in the coding the services read", r.header)
	}

	var got PushMessage
	if err := json.Unmarshal(b.open(t, r.body), &got); err != nil {
		t.Fatal(err)
	}
	if got.Title != "Plex" || got.Body != "Service is down" || got.Tag != "service:Plex" || got.URL != "/?view=monitor" || got.Up {
		t.Errorf("the browser read %+v", got)
	}
	if strings.Contains(string(r.body), "Plex") {
		t.Error("the push service could read the message")
	}
	var lastOK *int64
	_ = s.DB.QueryRow(`SELECT last_ok_at FROM push_subscriptions`).Scan(&lastOK)
	if lastOK == nil {
		t.Error("the device is not marked as reached")
	}
}

func TestAMessageForGoodNewsIsNotUrgentAndATapOnlyEverOpensTheInstance(t *testing.T) {
	f := newFakePushService(t, http.StatusCreated)
	s, owner := senderTo(t, f)
	b := newBrowser(t)
	subscribe(t, s, owner, f.URL+"/x", b)

	for _, url := range []string{"https://evil.example/phish", "//evil.example", "javascript:alert(1)", ""} {
		if _, err := s.SendToUser(context.Background(), owner, PushMessage{Title: "a", Body: "b", URL: url, Up: true}); err != nil {
			t.Fatal(err)
		}
	}
	for _, r := range f.got() {
		if r.header.Get("Urgency") != "normal" {
			t.Errorf("urgency %q for good news", r.header.Get("Urgency"))
		}
		var m PushMessage
		_ = json.Unmarshal(b.open(t, r.body), &m)
		if m.URL != "/" {
			t.Errorf("a tap would go to %q: only inside the instance", m.URL)
		}
	}
}

func TestADeviceThePushServiceSaysIsGoneIsForgottenAndOneItRefusedIsKept(t *testing.T) {
	for _, tc := range []struct {
		status  int
		removed int
		failed  int
		kept    int
	}{
		{http.StatusGone, 1, 0, 0},
		{http.StatusNotFound, 1, 0, 0},
		{http.StatusInternalServerError, 0, 1, 1},
		{http.StatusTooManyRequests, 0, 1, 1},
		{http.StatusForbidden, 0, 1, 1}, // a rejected signature is ours to fix, not a reason to forget the device
	} {
		f := newFakePushService(t, tc.status)
		s, owner := senderTo(t, f)
		subscribe(t, s, owner, f.URL+"/x", newBrowser(t))
		res, err := s.SendToUser(context.Background(), owner, PushMessage{Title: "a", Body: "b"})
		if err != nil {
			t.Fatal(err)
		}
		if res.Sent != 0 || res.Removed != tc.removed || res.Failed != tc.failed || countSubscriptions(t, s) != tc.kept {
			t.Errorf("status %d: %+v, %d kept; want removed %d failed %d kept %d", tc.status, res, countSubscriptions(t, s), tc.removed, tc.failed, tc.kept)
		}
	}
}

func TestARedirectToAnotherServerIsNotFollowed(t *testing.T) {
	elsewhere := newFakePushService(t, http.StatusCreated)
	f := newFakePushService(t, http.StatusTemporaryRedirect)
	// The push service sends the client on to a different origin, which would carry the signed token with it.
	f.Server.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, elsewhere.URL+"/stolen", http.StatusTemporaryRedirect)
	})
	s, owner := senderTo(t, f)
	// The test's client trusts the fake service's certificate, but the rule about redirects is the
	// real client's: that is what is being checked.
	client := *f.Client()
	client.CheckRedirect = pushClient.CheckRedirect
	s.Client = &client
	subscribe(t, s, owner, f.URL+"/x", newBrowser(t))
	res, _ := s.SendToUser(context.Background(), owner, PushMessage{Title: "a", Body: "b"})
	if res.Sent != 0 || len(elsewhere.got()) != 0 {
		t.Fatalf("result %+v, and the other server was sent %d requests", res, len(elsewhere.got()))
	}
}

func TestASubscriptionOffAPushServicesDomainIsNeverSentTo(t *testing.T) {
	db, _ := setupTestDB(t)
	store := &MonitorStore{DB: db}
	owner := ownerOf(t, store, seedItem(t, store))
	var mu sync.Mutex
	hits := 0
	trap := httptest.NewTLSServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { mu.Lock(); hits++; mu.Unlock() }))
	defer trap.Close()
	s := NewPushSender(db) // the real rule
	s.Client = trap.Client()
	subscribe(t, s, owner, trap.URL+"/internal", newBrowser(t))
	res, err := s.SendToUser(context.Background(), owner, PushMessage{Title: "a", Body: "b"})
	mu.Lock()
	defer mu.Unlock()
	if err != nil || res.Sent != 0 || res.Failed != 1 || hits != 0 {
		t.Fatalf("result %+v, %v, the trap was hit %d times: a row written around the route must not make the server request it", res, err, hits)
	}
}

func TestAnAccountWithNoDevicesIsToldSo(t *testing.T) {
	db, _ := setupTestDB(t)
	store := &MonitorStore{DB: db}
	owner := ownerOf(t, store, seedItem(t, store))
	if _, err := NewPushSender(db).SendToUser(context.Background(), owner, PushMessage{Title: "a"}); err != ErrNoPushDevices {
		t.Fatalf("err = %v, want ErrNoPushDevices", err)
	}
}

func TestAnOverlongNameAndMessageAreCutBeforeTheyAreSent(t *testing.T) {
	f := newFakePushService(t, http.StatusCreated)
	s, owner := senderTo(t, f)
	b := newBrowser(t)
	subscribe(t, s, owner, f.URL+"/x", b)
	if res, err := s.SendToUser(context.Background(), owner, PushMessage{Title: strings.Repeat("é", 5000), Body: strings.Repeat("x", 9000)}); err != nil || res.Sent != 1 {
		t.Fatalf("a service with an enormous name must still be reported: %+v, %v", res, err)
	}
	var m PushMessage
	_ = json.Unmarshal(b.open(t, f.got()[0].body), &m)
	if n := len([]rune(m.Title)); n > 121 || len([]rune(m.Body)) > 301 {
		t.Errorf("title %d and body %d characters", n, len([]rune(m.Body)))
	}
}

// ── The signing keys ─────────────────────────────────────────────────────────

func TestTheInstanceMakesItsSigningKeysOnceAndKeepsThem(t *testing.T) {
	db, _ := setupTestDB(t)
	s := NewPushSender(db)
	priv1, pub1, err := s.VAPIDKeys()
	if err != nil || priv1 == "" || pub1 == "" {
		t.Fatalf("%q %q %v", priv1, pub1, err)
	}
	if derived, _ := webpush.PublicFromPrivate(priv1); derived != pub1 {
		t.Fatal("the stored public key is not the private key's")
	}
	// Asked again, by this sender or another one over the same database, it is the same pair: a new one
	// would strand every browser subscribed to the old.
	priv2, pub2, _ := NewPushSender(db).VAPIDKeys()
	if priv2 != priv1 || pub2 != pub1 {
		t.Fatal("the signing keys changed between two asks")
	}
}

func TestRequestsAskingAtTheSameTimeEndUpWithOneKeyPair(t *testing.T) {
	// A file and not ":memory:": every new connection of the pool would get an empty database of its
	// own, and the requests would fail for a reason that has nothing to do with the keys.
	file := filepath.Join(t.TempDir(), "keys.db")
	handle, err := database.InitDB(file)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { handle.Close() })
	db := handle.DB
	var wg sync.WaitGroup
	pubs := make(chan string, 8)
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, pub, err := NewPushSender(db).VAPIDKeys(); err == nil {
				pubs <- pub
			}
		}()
	}
	wg.Wait()
	close(pubs)
	seen := map[string]bool{}
	for p := range pubs {
		seen[p] = true
	}
	if len(seen) != 1 {
		t.Fatalf("%d different public keys were handed out", len(seen))
	}
}

// ── As an alert channel ──────────────────────────────────────────────────────

func TestAnAlertThroughPushIsActiveOnlyWithAnAccountAndASenderAndAlertsOn(t *testing.T) {
	db, _ := setupTestDB(t)
	s := NewPushSender(db)
	if !(notifyConfig{Enabled: true, Type: "push", UserID: 1, Push: s}).active() {
		t.Error("push with a sender and an account is not active")
	}
	for name, c := range map[string]notifyConfig{
		"alerts off":       {Enabled: false, Type: "push", UserID: 1, Push: s},
		"no sender":        {Enabled: true, Type: "push", UserID: 1},
		"no account":       {Enabled: true, Type: "push", Push: s},
		"ntfy with no url": {Enabled: true, Type: "ntfy"},
	} {
		if c.active() {
			t.Errorf("%s: active", name)
		}
	}
	// The channels that go to an address still need one, and push needs none.
	if !(notifyConfig{Enabled: true, Type: "ntfy", URL: "http://x"}).active() {
		t.Error("ntfy with an address is not active")
	}
}

func TestAnAlertSentThroughPushTellsTheBrowserWhichServiceAndOpensTheStatusPage(t *testing.T) {
	f := newFakePushService(t, http.StatusCreated)
	s, owner := senderTo(t, f)
	b := newBrowser(t)
	subscribe(t, s, owner, f.URL+"/x", b)
	cfg := notifyConfig{Enabled: true, Type: "push", UserID: owner, Push: s}

	if err := sendNotification(context.Background(), cfg, "Plex", "Service is down", false); err != nil {
		t.Fatal(err)
	}
	if err := sendNotification(context.Background(), cfg, "Plex", "Service recovered", true); err != nil {
		t.Fatal(err)
	}
	reqs := f.got()
	if len(reqs) != 2 {
		t.Fatalf("%d pushes, want one for the outage and one for the recovery", len(reqs))
	}
	var down, up PushMessage
	_ = json.Unmarshal(b.open(t, reqs[0].body), &down)
	_ = json.Unmarshal(b.open(t, reqs[1].body), &up)
	if down.Title != "Plex" || down.Body != "Service is down" || down.Up || down.URL != "/?view=monitor" {
		t.Errorf("outage: %+v", down)
	}
	if !up.Up || up.Body != "Service recovered" {
		t.Errorf("recovery: %+v", up)
	}
	if down.Tag == "" || down.Tag != up.Tag {
		t.Errorf("tags %q and %q: the recovery has to replace the outage's notification", down.Tag, up.Tag)
	}
}

func TestAnAlertThroughPushThatReachedNoDeviceIsAnError(t *testing.T) {
	db, _ := setupTestDB(t)
	store := &MonitorStore{DB: db}
	owner := ownerOf(t, store, seedItem(t, store))
	cfg := notifyConfig{Enabled: true, Type: "push", UserID: owner, Push: NewPushSender(db)}
	if err := sendNotification(context.Background(), cfg, "Plex", "Service is down", false); err == nil {
		t.Fatal("an alert nobody could be told of was reported as sent")
	}
	if err := sendNotification(context.Background(), notifyConfig{Type: "push"}, "Plex", "x", false); err == nil {
		t.Fatal("push with no sender was reported as sent")
	}
}
