package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

// An account that configured one channel before there was a list finds it as the first entry, on or off as its
// alerts switch was, and nothing is done twice.
func TestTheSingleChannelOfBeforeBecomesTheFirstEntryOfTheList(t *testing.T) {
	db, _ := setupTestDB(t)
	store := NewUserSettings(db)
	for _, name := range []string{"ntfy-on", "webhook-off", "none", "push-on", "already"} {
		if _, err := db.Exec(`INSERT INTO users (username, password, role) VALUES (?, 'x', 'admin')`, name); err != nil {
			t.Fatal(err)
		}
	}
	set := func(uid int, kv map[string]string) {
		for k, v := range kv {
			if err := store.Set(uid, k, v); err != nil {
				t.Fatal(err)
			}
		}
	}
	set(1, map[string]string{keyMonType: "ntfy", keyMonURL: "https://ntfy.sh/a", keyMonToken: "tk", keyMonAlerts: "1"})
	set(2, map[string]string{keyMonType: "webhook", keyMonURL: "https://hooks.example/b", keyMonAlerts: "0"})
	set(3, map[string]string{keyMonType: "none", keyMonURL: "https://ignored.example", keyMonAlerts: "1"})
	set(4, map[string]string{keyMonType: "push", keyMonURL: "https://not-for-push.example", keyMonToken: "nor-this", keyMonAlerts: "1"})
	set(5, map[string]string{keyMonType: "ntfy", keyMonURL: "https://old.example", keyMonAlerts: "1", keyMonChannels: `[{"id":"nc1","type":"gotify","url":"https://mine.example","enabled":false}]`})

	for i := 0; i < 2; i++ { // twice: the second changes nothing
		if err := MigrateNotifyChannels(db); err != nil {
			t.Fatal(err)
		}
	}

	one := func(uid int) notifyChannel {
		t.Helper()
		raw, has := store.Get(uid, keyMonChannels)
		if !has {
			t.Fatalf("account %d has no list", uid)
		}
		var list []notifyChannel
		if err := json.Unmarshal([]byte(raw), &list); err != nil || len(list) != 1 {
			t.Fatalf("account %d: %q %v", uid, raw, err)
		}
		return list[0]
	}
	if c := one(1); c.Type != "ntfy" || c.URL != "https://ntfy.sh/a" || c.Token != "tk" || !c.Enabled || c.ID == "" || c.ID == legacyChannelID {
		t.Errorf("on: %+v", c)
	}
	if c := one(2); c.Type != "webhook" || c.Enabled {
		t.Errorf("an account whose alerts were off gets its channel off: %+v", c)
	}
	if _, has := store.Get(3, keyMonChannels); has {
		t.Error("an account that chose no method got a list")
	}
	if c := one(4); c.Type != "push" || c.URL != "" || c.Token != "" || !c.Enabled {
		t.Errorf("push has no address or token to carry over: %+v", c)
	}
	if c := one(5); c.ID != "nc1" || c.URL != "https://mine.example" {
		t.Errorf("an account that has a list is never touched: %+v", c)
	}
	// The older keys stay where they are, unread.
	if v, _ := store.Get(1, keyMonToken); v != "tk" {
		t.Errorf("the older token was removed: %q", v)
	}
}

// Until it is migrated, or when a restore brings the older keys back, the account is still heard.
func TestAnAccountThatIsNotMigratedYetIsStillHeard(t *testing.T) {
	db, _ := setupTestDB(t)
	store := NewUserSettings(db)
	db.Exec(`INSERT INTO users (username, password, role) VALUES ('a', 'x', 'admin')`)
	store.Set(1, keyMonType, "gotify")
	store.Set(1, keyMonURL, "https://g.example")
	store.Set(1, keyMonAlerts, "1")
	got := channelsOf(store, 1)
	if len(got) != 1 || got[0].ID != legacyChannelID || got[0].Type != "gotify" || !got[0].Enabled {
		t.Errorf("%+v", got)
	}
}

type channelProbe struct {
	srv  *httptest.Server
	mu   sync.Mutex
	hits int
}

func newChannelProbe(t *testing.T, status int) *channelProbe {
	t.Helper()
	p := &channelProbe{}
	p.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p.mu.Lock()
		p.hits++
		p.mu.Unlock()
		w.WriteHeader(status)
	}))
	t.Cleanup(p.srv.Close)
	return p
}

func (p *channelProbe) count() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.hits
}

func waitUntilTrue(t *testing.T, what string, ok func() bool) {
	t.Helper()
	for deadline := time.Now().Add(3 * time.Second); time.Now().Before(deadline); time.Sleep(10 * time.Millisecond) {
		if ok() {
			return
		}
	}
	t.Fatalf("never happened: %s", what)
}

// An alert goes to every channel that is on, each on its own: one that fails does not stop the others, a
// channel that is off hears nothing, and what each came to is kept against it.
func TestAnAlertGoesToEveryChannelThatIsOnAndOneFailingDoesNotStopTheOthers(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := NewUserSettings(db)
	db.Exec(`INSERT INTO users (username, password, role) VALUES ('owner', 'x', 'admin')`)
	good, bad, off := newChannelProbe(t, 200), newChannelProbe(t, 500), newChannelProbe(t, 200)
	list := []notifyChannel{
		{ID: "nc-bad", Type: "webhook", URL: bad.srv.URL, Enabled: true},
		{ID: "nc-good", Type: "webhook", URL: good.srv.URL, Enabled: true},
		{ID: "nc-off", Type: "webhook", URL: off.srv.URL, Enabled: false},
	}
	if err := saveChannels(store, 1, list); err != nil {
		t.Fatal(err)
	}
	store.Set(1, keyMonThreshold, "1")

	sched := NewMonitorScheduler(db)
	cfg := sched.notifyCfg(1)
	if got := len(cfg.targets()); got != 2 {
		t.Fatalf("%d targets for two channels that are on", got)
	}
	it := MonitoredItem{ID: 9, UserID: 1, Name: "Router", URL: "http://r"}
	sched.evalAlertCode(context.Background(), it, true, 0, cfg)    // seeds
	sched.evalAlertCode(context.Background(), it, false, 500, cfg) // down

	waitUntilTrue(t, "both channels told", func() bool { return good.count() == 1 && bad.count() == 1 })
	waitUntilTrue(t, "their results noted", func() bool { return len(channelResults(store, 1)) == 2 })
	if off.count() != 0 {
		t.Errorf("a channel that is off heard %d alert(s)", off.count())
	}
	res := channelResults(store, 1)
	if r := res["nc-good"]; !r.OK || r.At == 0 || r.Error != "" {
		t.Errorf("the one that worked: %+v", r)
	}
	if r := res["nc-bad"]; r.OK || r.Error != "http_500" {
		t.Errorf("the one that failed: %+v", r)
	}
	if _, noted := res["nc-off"]; noted {
		t.Error("a channel that was not told has a result")
	}
}

// With no channel on there is nothing to send, and alerts held back by the instance stay quiet on all of them.
func TestWithNoChannelOnNothingIsSentAndAGateSilencesAllOfThem(t *testing.T) {
	db, _ := setupTestDB(t)
	store := NewUserSettings(db)
	db.Exec(`INSERT INTO users (username, password, role) VALUES ('owner', 'x', 'admin')`)
	sched := NewMonitorScheduler(db)
	if got := sched.notifyCfg(1).targets(); len(got) != 0 {
		t.Errorf("an account with no channels has %d target(s)", len(got))
	}
	saveChannels(store, 1, []notifyChannel{
		{ID: "a", Type: "webhook", URL: "http://a.example", Enabled: true},
		{ID: "b", Type: "ntfy", URL: "http://b.example", Enabled: true},
	})
	cfg := sched.notifyCfg(1)
	if got := len(cfg.targets()); got != 2 {
		t.Fatalf("%d targets", got)
	}
	if got := cfg.gate(false).targets(); len(got) != 0 {
		t.Errorf("alerts that may not be sent reached %d channel(s)", len(got))
	}
	if got := len(cfg.gate(true).targets()); got != 2 {
		t.Errorf("a gate that is open let %d through", got)
	}
}

func TestWhatWentWrongIsKeptInAWordAndNeverAsTheMessage(t *testing.T) {
	for name, c := range map[string]struct {
		err  error
		want string
	}{
		"refused":    {errors.New("notify failed: HTTP 401"), "http_401"},
		"timed out":  {context.DeadlineExceeded, "timeout"},
		"no devices": {errors.New("push: no device could be told (0 failed, 0 forgotten)"), "no_devices"},
		"no push":    {ErrNoPushDevices, "no_devices"},
		// The text of a failed request carries the address it went to, which can hold a credential.
		"unreachable": {errors.New(`Post "https://hooks.example/?key=SECRET": dial tcp: lookup hooks.example: no such host`), "unreachable"},
	} {
		if got := failureReason(c.err); got != c.want {
			t.Errorf("%s: %q, want %q", name, got, c.want)
		}
	}
}

func TestWhatWasKeptForAChannelGoesWithTheChannel(t *testing.T) {
	db, _ := setupTestDB(t)
	store := NewUserSettings(db)
	db.Exec(`INSERT INTO users (username, password, role) VALUES ('owner', 'x', 'admin')`)
	recordChannelResult(store, 1, "nc-a", nil)
	recordChannelResult(store, 1, "nc-b", errors.New("notify failed: HTTP 404"))
	recordChannelResult(store, 1, "", nil)              // a channel nobody saved
	recordChannelResult(store, 1, legacyChannelID, nil) // not a name to file anything under
	if got := channelResults(store, 1); len(got) != 2 {
		t.Fatalf("%v", got)
	}
	forgetChannelResults(store, 1, []notifyChannel{{ID: "nc-a"}})
	got := channelResults(store, 1)
	if _, has := got["nc-b"]; has || len(got) != 1 {
		t.Errorf("a removed channel kept its result: %v", got)
	}
}
