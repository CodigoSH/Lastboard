package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/alerttext"
	"git.codigosh.com/CodigoSH/Lastboard/internal/version"
)

// recorder is a server that keeps what it was sent.
type recorder struct {
	srv    *httptest.Server
	mu     sync.Mutex
	bodies [][]byte
	heads  []http.Header
}

func newRecorder(t *testing.T, status int) *recorder {
	t.Helper()
	r := &recorder{}
	r.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		b, _ := io.ReadAll(req.Body)
		r.mu.Lock()
		r.bodies, r.heads = append(r.bodies, b), append(r.heads, req.Header.Clone())
		r.mu.Unlock()
		w.WriteHeader(status)
	}))
	t.Cleanup(r.srv.Close)
	return r
}

func (r *recorder) count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.bodies)
}

func (r *recorder) last(t *testing.T) (map[string]any, http.Header) {
	t.Helper()
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.bodies) == 0 {
		t.Fatal("nothing was sent")
	}
	var m map[string]any
	_ = json.Unmarshal(r.bodies[len(r.bodies)-1], &m)
	return m, r.heads[len(r.heads)-1]
}

// updateFixture is an administrator with the channels given, and a handler whose forge answers with `latest`.
type updateFixture struct {
	h      *UpdateHandler
	store  *UserSettings
	admin  int
	asked  []bool // the beta flag of each question to the forge
	latest string
}

func newUpdateFixture(t *testing.T, channels []notifyChannel) *updateFixture {
	t.Helper()
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(`INSERT INTO users (username, password, role) VALUES ('boss', 'x', 'admin')`); err != nil {
		t.Fatal(err)
	}
	f := &updateFixture{store: NewUserSettings(db), admin: 1, latest: "v99.0.0"}
	if err := saveChannels(f.store, f.admin, channels); err != nil {
		t.Fatal(err)
	}
	f.h = &UpdateHandler{DB: db, Texts: alerttext.New(nil)}
	f.h.latest = func(beta bool) (string, string, error) {
		f.asked = append(f.asked, beta)
		return f.latest, "", nil
	}
	return f
}

// A new version is told once, to the channels that carry updates and to no other; the next one is told again.
func TestANewVersionIsToldOnceToTheChannelsThatCarryUpdates(t *testing.T) {
	updates, alertsOnly := newRecorder(t, 200), newRecorder(t, 200)
	f := newUpdateFixture(t, []notifyChannel{
		{ID: "nc-up", Type: "webhook", URL: updates.srv.URL, Enabled: true, Updates: true},
		{ID: "nc-alerts", Type: "webhook", URL: alertsOnly.srv.URL, Enabled: true},
	})

	f.h.notifyUpdate(context.Background())
	f.h.notifyUpdate(context.Background()) // the same version again: nothing
	if updates.count() != 1 {
		t.Fatalf("the channel that carries updates was told %d times, want once", updates.count())
	}
	if alertsOnly.count() != 0 {
		t.Error("a channel that did not ask for updates was told of one")
	}
	body, _ := updates.last(t)
	if body["event"] != "update" || body["status"] != "update_available" || body["version"] != "v99.0.0" ||
		body["current_version"] != version.Current || body["service"] != "Lastboard" {
		t.Errorf("the webhook said %v", body)
	}
	if s, _ := body["title"].(string); s != "Lastboard v99.0.0 is available" {
		t.Errorf("title %q", s)
	}

	f.latest = "v99.0.1"
	f.h.notifyUpdate(context.Background())
	if updates.count() != 2 {
		t.Errorf("the next version was told %d times in all, want 2", updates.count())
	}
}

// A channel that is off hears nothing, and neither does a version that is not newer.
func TestNothingIsToldWhenTheChannelIsOffOrTheVersionIsNotNewer(t *testing.T) {
	off, on := newRecorder(t, 200), newRecorder(t, 200)
	f := newUpdateFixture(t, []notifyChannel{
		{ID: "nc-off", Type: "webhook", URL: off.srv.URL, Enabled: false, Updates: true},
		{ID: "nc-on", Type: "webhook", URL: on.srv.URL, Enabled: true, Updates: true},
	})
	f.latest = version.Current
	f.h.notifyUpdate(context.Background())
	f.latest = "v0.0.1"
	f.h.notifyUpdate(context.Background())
	if on.count() != 0 {
		t.Error("the version that runs, or an older one, was told as new")
	}
	f.latest = "v99.0.0"
	f.h.notifyUpdate(context.Background())
	if off.count() != 0 || on.count() != 1 {
		t.Errorf("off heard %d, on heard %d", off.count(), on.count())
	}
}

// With no channel that carries updates the forge is not even asked, and the version is not marked as told, so a
// channel that starts listening later hears of the one that is waiting.
func TestAVersionWithNobodyListeningIsToldWhenSomebodyStarts(t *testing.T) {
	late := newRecorder(t, 200)
	f := newUpdateFixture(t, []notifyChannel{{ID: "nc", Type: "webhook", URL: late.srv.URL, Enabled: true}})
	f.h.notifyUpdate(context.Background())
	if len(f.asked) != 0 {
		t.Error("the release server was asked although nobody listens for updates")
	}
	if err := saveChannels(f.store, f.admin, []notifyChannel{{ID: "nc", Type: "webhook", URL: late.srv.URL, Enabled: true, Updates: true}}); err != nil {
		t.Fatal(err)
	}
	f.h.notifyUpdate(context.Background())
	if late.count() != 1 {
		t.Errorf("the channel that began listening was told %d times, want once", late.count())
	}
}

// A version that reached no channel is tried again at the next check.
func TestAVersionThatReachedNobodyIsTriedAgain(t *testing.T) {
	down := newRecorder(t, 500)
	f := newUpdateFixture(t, []notifyChannel{{ID: "nc", Type: "webhook", URL: down.srv.URL, Enabled: true, Updates: true}})
	f.h.notifyUpdate(context.Background())
	f.h.notifyUpdate(context.Background())
	if down.count() != 2 {
		t.Errorf("a failing channel was tried %d times, want 2", down.count())
	}
	if told, _ := f.store.Get(f.admin, keyUpdateNotified); told != "" {
		t.Errorf("a version that reached nobody was marked as told: %q", told)
	}
	if res := channelResults(f.store, f.admin)["nc"]; res.OK || res.Error != "http_500" {
		t.Errorf("what it came to: %+v", res)
	}
}

// What is looked for follows the administrator's own choice of pre-releases, and a member is never asked.
func TestOnlyTheAdministratorIsToldAndAPreReleaseOnlyIfTheyReceiveThem(t *testing.T) {
	rec := newRecorder(t, 200)
	f := newUpdateFixture(t, []notifyChannel{{ID: "nc", Type: "webhook", URL: rec.srv.URL, Enabled: true, Updates: true}})
	if _, err := f.h.DB.Exec(`INSERT INTO users (username, password, role) VALUES ('member', 'x', 'user')`); err != nil {
		t.Fatal(err)
	}
	other := newRecorder(t, 200)
	if err := saveChannels(f.store, 2, []notifyChannel{{ID: "nm", Type: "webhook", URL: other.srv.URL, Enabled: true, Updates: true}}); err != nil {
		t.Fatal(err)
	}

	f.h.notifyUpdate(context.Background())
	if other.count() != 0 {
		t.Error("a member was told of an update they cannot install")
	}
	if len(f.asked) != 1 || f.asked[0] {
		t.Errorf("asked with beta=%v: the administrator does not receive pre-releases", f.asked)
	}

	f.h.DB.Exec(`UPDATE users SET beta_updates = 1 WHERE id = 1`)
	f.latest = "v99.0.1"
	f.h.notifyUpdate(context.Background())
	if len(f.asked) != 2 || !f.asked[1] {
		t.Errorf("asked with %v: the administrator receives pre-releases now", f.asked)
	}
}

// A channel carries alerts unless it says not to, so one saved before there were kinds is unchanged, and one
// that opted out of alerts is left out of them without being off.
func TestAChannelCarriesAlertsUnlessItSaysNotToAndUpdatesOnlyIfItSaysSo(t *testing.T) {
	var old notifyChannel
	if err := json.Unmarshal([]byte(`{"id":"a","type":"ntfy","url":"https://x.example","enabled":true}`), &old); err != nil {
		t.Fatal(err)
	}
	if !old.takesAlerts() || old.takesUpdates() {
		t.Errorf("a channel saved before kinds: alerts=%v updates=%v, want alerts only", old.takesAlerts(), old.takesUpdates())
	}
	both := notifyChannel{Enabled: true, Updates: true}
	if !both.takesAlerts() || !both.takesUpdates() {
		t.Error("a channel with both")
	}
	updatesOnly := notifyChannel{Enabled: true, AlertsOff: true, Updates: true}
	if updatesOnly.takesAlerts() || !updatesOnly.takesUpdates() {
		t.Error("a channel for updates only still takes alerts")
	}
	off := notifyChannel{Enabled: false, Updates: true}
	if off.takesAlerts() || off.takesUpdates() {
		t.Error("a channel that is off takes something")
	}
}

// An alert is not sent to a channel that opted out of alerts, though it is on.
func TestAnAlertSkipsAChannelThatOptedOutOfAlerts(t *testing.T) {
	db, _ := setupTestDB(t)
	db.Exec(`INSERT INTO users (username, password, role) VALUES ('boss', 'x', 'admin')`)
	store := NewUserSettings(db)
	if err := saveChannels(store, 1, []notifyChannel{
		{ID: "n1", Type: "webhook", URL: "https://a.example/h", Enabled: true, AlertsOff: true, Updates: true},
		{ID: "n2", Type: "webhook", URL: "https://b.example/h", Enabled: true},
	}); err != nil {
		t.Fatal(err)
	}
	cfg := NewMonitorScheduler(db).notifyCfg(1)
	var urls []string
	for _, c := range cfg.targets() {
		urls = append(urls, c.URL)
	}
	if len(urls) != 1 || urls[0] != "https://b.example/h" {
		t.Errorf("an alert goes to %v, want only the channel that takes alerts", urls)
	}
}

// Every channel says the same thing in its own way, and an alert keeps its old shape with one more field.
func TestTheNoticeOfAVersionReachesEachKindOfChannelWithTheLowestUrgency(t *testing.T) {
	ctx := context.Background()
	common := notifyConfig{Lang: "en", Catalog: alerttext.New(nil)}
	notice := common.updateNotice("v2.0.0", "v1.0.0")

	ntfy, gotify, hook := newRecorder(t, 200), newRecorder(t, 200), newRecorder(t, 200)
	for _, c := range []notifyConfig{
		{Enabled: true, Type: "ntfy", URL: ntfy.srv.URL},
		{Enabled: true, Type: "gotify", URL: gotify.srv.URL},
		{Enabled: true, Type: "webhook", URL: hook.srv.URL},
	} {
		if err := sendNotice(ctx, c, notice); err != nil {
			t.Fatal(err)
		}
	}
	if _, h := ntfy.last(t); h.Get("Priority") != "low" || h.Get("Tags") != "package" {
		t.Errorf("ntfy priority %q tags %q", h.Get("Priority"), h.Get("Tags"))
	}
	if b, _ := gotify.last(t); b["priority"] != float64(3) {
		t.Errorf("gotify priority %v, want 3", b["priority"])
	}

	// An alert is what it was: high on ntfy, 5 on Gotify, and the webhook says it is an alert.
	alert := Notice{Service: "Plex", Title: "Plex is down", Body: "x"}
	ntfy2, gotify2, hook2 := newRecorder(t, 200), newRecorder(t, 200), newRecorder(t, 200)
	for _, c := range []notifyConfig{
		{Enabled: true, Type: "ntfy", URL: ntfy2.srv.URL},
		{Enabled: true, Type: "gotify", URL: gotify2.srv.URL},
		{Enabled: true, Type: "webhook", URL: hook2.srv.URL},
	} {
		if err := sendNotice(ctx, c, alert); err != nil {
			t.Fatal(err)
		}
	}
	if _, h := ntfy2.last(t); h.Get("Priority") != "high" {
		t.Errorf("an alert on ntfy has priority %q", h.Get("Priority"))
	}
	if b, _ := gotify2.last(t); b["priority"] != float64(5) {
		t.Errorf("an alert on gotify has priority %v", b["priority"])
	}
	if b, _ := hook2.last(t); b["event"] != "alert" || b["status"] != "down" || b["service"] != "Plex" {
		t.Errorf("an alert on the webhook: %v", b)
	}
	if b, _ := hook2.last(t); b["version"] != nil {
		t.Error("an alert carries a version")
	}
}

// For a phone, the notice of a version asks for low urgency and replaces the one before it, while every alert, and
// any value that is not a known urgency, stays high.
func TestPushUrgencyIsLowOnlyForTheNoticeOfAVersion(t *testing.T) {
	f := newFakePushService(t, 201)
	s, owner := senderTo(t, f)
	subscribe(t, s, owner, f.URL+"/x", newBrowser(t))

	send := func(m PushMessage) string {
		t.Helper()
		before := len(f.got())
		if _, err := s.SendToUser(context.Background(), owner, m); err != nil {
			t.Fatal(err)
		}
		all := f.got()
		if len(all) != before+1 {
			t.Fatalf("%d requests, want %d", len(all), before+1)
		}
		return all[len(all)-1].header.Get("Urgency")
	}
	if got := send(PushMessage{Title: "a", Body: "b", Urgency: "low"}); got != "low" {
		t.Errorf("a notice that asked for low went with %q", got)
	}
	if got := send(PushMessage{Title: "a", Body: "b"}); got != "high" {
		t.Errorf("an alert went with %q, want high", got)
	}
	if got := send(PushMessage{Title: "a", Body: "b", Urgency: "emergency"}); got != "high" {
		t.Errorf("a value that is no urgency went with %q, want high", got)
	}

	cfg := notifyConfig{Enabled: true, Type: "push", UserID: owner, Push: s, Lang: "en", Catalog: alerttext.New(nil)}
	if err := sendNotice(context.Background(), cfg, cfg.updateNotice("v2.0.0", "v1.0.0")); err != nil {
		t.Fatal(err)
	}
	all := f.got()
	if got := all[len(all)-1].header.Get("Urgency"); got != "low" {
		t.Errorf("the notice of a version went with urgency %q", got)
	}
}

// The notice of a new version is looked for every hour (here, every few milliseconds) and not only when the check of
// the day runs: a release that comes out after the server started is told within the hour, not the next day.
func TestAReleaseThatComesOutAfterTheServerStartedIsToldWithoutWaitingForTheDailyCheck(t *testing.T) {
	rec := newRecorder(t, 200)
	f := newUpdateFixture(t, []notifyChannel{{ID: "nc", Type: "webhook", URL: rec.srv.URL, Enabled: true, Updates: true}})

	// The forge answers with what the test says, read and written from different goroutines.
	var mu sync.Mutex
	latest := version.Current // nothing new at the start
	f.h.latest = func(bool) (string, string, error) {
		mu.Lock()
		defer mu.Unlock()
		return latest, "", nil
	}
	f.h.firstCheckDelay, f.h.noticeEvery = time.Nanosecond, 15*time.Millisecond

	ctx, cancel := context.WithCancel(context.Background())
	hub := NewHub()
	done := make(chan struct{})
	go hub.Run(ctx)
	go func() { f.h.CheckForUpdatesBackground(ctx, hub); close(done) }()
	t.Cleanup(func() { cancel(); <-done })

	time.Sleep(100 * time.Millisecond)
	if rec.count() != 0 {
		t.Fatalf("told %d times of a version that is not newer", rec.count())
	}
	mu.Lock()
	latest = "v99.0.0"
	mu.Unlock()
	waitUntilTrue(t, "the release that came out later is told", func() bool { return rec.count() == 1 })
	time.Sleep(100 * time.Millisecond)
	if rec.count() != 1 {
		t.Errorf("told %d times of one release, want once", rec.count())
	}
}

// A look made at the same moment by the hourly check and by a channel that has just been switched on finds the release
// untold in both, and tells it once.
func TestTwoLooksAtTheSameTimeTellAReleaseOnce(t *testing.T) {
	rec := newRecorder(t, 200)
	f := newUpdateFixture(t, []notifyChannel{{ID: "nc", Type: "webhook", URL: rec.srv.URL, Enabled: true, Updates: true}})
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); f.h.notifyUpdate(context.Background()) }()
	}
	wg.Wait()
	if rec.count() != 1 {
		t.Errorf("a release was told %d times by eight looks at once, want once", rec.count())
	}
}
