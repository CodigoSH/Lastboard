package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"mime"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/alerttext"
)

// textsFixture is a scheduler with the real translations, one account in the language asked for, and
// a channel of the type asked for that records what it was sent.
type textsFixture struct {
	sched *MonitorScheduler
	db    *sql.DB
	uid   int
	mu    sync.Mutex
	posts []recorded
}

type recorded struct {
	Title string // the Title header, which is where ntfy reads it
	Body  string
}

func newTextsFixture(t *testing.T, lang, channel string) *textsFixture {
	t.Helper()
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	f := &textsFixture{db: db}
	res, err := db.Exec(`INSERT INTO users (username, password, role, language) VALUES ('owner', 'x', 'admin', ?)`, lang)
	if err != nil {
		t.Fatal(err)
	}
	id, _ := res.LastInsertId()
	f.uid = int(id)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		f.mu.Lock()
		f.posts = append(f.posts, recorded{Title: r.Header.Get("Title"), Body: string(b)})
		f.mu.Unlock()
	}))
	t.Cleanup(srv.Close)
	for k, v := range map[string]string{
		"monitoring_alerts_enabled": "1", "monitoring_notify_type": channel,
		"monitoring_notify_url": srv.URL, "monitoring_fail_threshold": "1",
	} {
		if _, err := db.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (?, ?, ?)`, f.uid, k, v); err != nil {
			t.Fatal(err)
		}
	}
	f.sched = NewMonitorScheduler(db).WithCatalog(alerttext.New(os.DirFS("../../../web/public")))
	return f
}

func (f *textsFixture) set(t *testing.T, key, value string) {
	t.Helper()
	if _, err := f.db.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (?, ?, ?)
		ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value`, f.uid, key, value); err != nil {
		t.Fatal(err)
	}
}

// next waits for the n-th message the channel received.
func (f *textsFixture) next(t *testing.T, n int) recorded {
	t.Helper()
	for deadline := time.Now().Add(3 * time.Second); time.Now().Before(deadline); time.Sleep(10 * time.Millisecond) {
		f.mu.Lock()
		if len(f.posts) >= n {
			p := f.posts[n-1]
			f.mu.Unlock()
			return p
		}
		f.mu.Unlock()
	}
	t.Fatalf("the channel never received message %d", n)
	return recorded{}
}

// flap takes a service from up to down, the way the scheduler sees it.
func (f *textsFixture) flap(it MonitoredItem, code int) {
	cfg := f.sched.notifyCfg(f.uid)
	f.sched.evalAlertCode(context.Background(), it, true, 0, cfg)     // first sight seeds silently
	f.sched.evalAlertCode(context.Background(), it, false, code, cfg) // down
}

func (f *textsFixture) recover(it MonitoredItem) {
	f.sched.evalAlertCode(context.Background(), it, true, 0, f.sched.notifyCfg(f.uid))
}

func TestAnOutageAndItsRecoveryAreWrittenInTheLanguageOfTheOwner(t *testing.T) {
	f := newTextsFixture(t, "es", "webhook")
	it := MonitoredItem{ID: 5, UserID: f.uid, Name: "Router", URL: "http://r"}

	f.flap(it, 503)
	var down map[string]any
	if err := json.Unmarshal([]byte(f.next(t, 1).Body), &down); err != nil {
		t.Fatal(err)
	}
	if down["title"] != "Router está caído" || down["message"] != "Respondió con HTTP 503 · Comprobaciones fallidas seguidas: 1" {
		t.Errorf("outage: %v", down)
	}

	f.recover(it)
	var up map[string]any
	if err := json.Unmarshal([]byte(f.next(t, 2).Body), &up); err != nil {
		t.Fatal(err)
	}
	if up["title"] != "Router vuelve a funcionar" || up["message"] != "Tiempo caído: 1 min" {
		t.Errorf("recovery: %v", up)
	}
}

// What another system reads from a webhook is service, status and timestamp. They do not change with
// the language, and the text for people is added beside them.
func TestTheWebhookKeepsTheFieldsAnotherSystemReadsWhateverTheLanguage(t *testing.T) {
	for _, lang := range []string{"en", "ja", "ar"} {
		f := newTextsFixture(t, lang, "webhook")
		it := MonitoredItem{ID: 1, UserID: f.uid, Name: "Plex", URL: "http://p"}
		f.flap(it, 0)
		var m map[string]any
		if err := json.Unmarshal([]byte(f.next(t, 1).Body), &m); err != nil {
			t.Fatal(err)
		}
		if m["service"] != "Plex" || m["status"] != "down" {
			t.Errorf("%s: %v", lang, m)
		}
		if ts, _ := m["timestamp"].(string); ts == "" {
			t.Errorf("%s: no timestamp", lang)
		}
		if m["title"] == "" || m["message"] == "" {
			t.Errorf("%s: no text for people: %v", lang, m)
		}
	}
}

func TestAnAccountsOwnTextsReplaceTheDefaultsFieldByField(t *testing.T) {
	f := newTextsFixture(t, "es", "webhook")
	f.set(t, "monitoring_text_down_title", "🔥 {service} ha caído")
	f.set(t, "monitoring_text_up_body", "Vuelve tras {duration}")
	it := MonitoredItem{ID: 9, UserID: f.uid, Name: "NAS", URL: "http://n"}

	f.flap(it, 0)
	var down map[string]string
	_ = json.Unmarshal([]byte(f.next(t, 1).Body), &down)
	// One field written, the other still the Spanish default.
	if down["title"] != "🔥 NAS ha caído" || down["message"] != "Sin respuesta · Comprobaciones fallidas seguidas: 1" {
		t.Errorf("outage: %v", down)
	}
	f.recover(it)
	var up map[string]string
	_ = json.Unmarshal([]byte(f.next(t, 2).Body), &up)
	if up["title"] != "NAS vuelve a funcionar" || up["message"] != "Vuelve tras 1 min" {
		t.Errorf("recovery: %v", up)
	}
}

// ntfy reads its title from a header, and a header carries ASCII. Text that is not is sent as an RFC
// 2047 word, which ntfy decodes; sent raw, a Japanese title would arrive as garbage.
func TestANtfyTitleThatIsNotAsciiTravelsAsAnEncodedWord(t *testing.T) {
	f := newTextsFixture(t, "ja", "ntfy")
	f.flap(MonitoredItem{ID: 2, UserID: f.uid, Name: "ルーター", URL: "http://r"}, 0)
	got := f.next(t, 1)
	for _, b := range []byte(got.Title) {
		if b > 126 {
			t.Fatalf("raw non-ASCII in the header: %q", got.Title)
		}
	}
	title, err := new(mime.WordDecoder).DecodeHeader(got.Title)
	if err != nil || title != "ルーター が停止しています" {
		t.Errorf("decoded %q, %v", title, err)
	}
	if !strings.Contains(got.Body, "応答なし") {
		t.Errorf("body %q", got.Body)
	}
}

func TestHeaderTextKeepsPlainTextAsItIsAndNeverCarriesALineBreak(t *testing.T) {
	if got := headerText("Router is down"); got != "Router is down" {
		t.Errorf("plain text changed: %q", got)
	}
	if got := headerText("a\r\nInjected: yes"); strings.ContainsAny(got, "\r\n") {
		t.Errorf("a line break got through: %q", got)
	}
}

func TestTheTestNotificationSaysItIsATestInTheAccountsLanguage(t *testing.T) {
	cat := alerttext.New(os.DirFS("../../../web/public"))
	n := notifyConfig{Lang: "es", Catalog: cat}.testNotice()
	if n.Title != "Prueba · Lastboard está caído" || !n.Up {
		t.Errorf("%+v", n)
	}
	// And with the account's own wording the test shows it.
	n = notifyConfig{Lang: "es", Catalog: cat, Texts: alerttext.Templates{DownTitle: "SOS {service}"}}.testNotice()
	if n.Title != "Prueba · SOS Lastboard" {
		t.Errorf("%+v", n)
	}
}

// A recovery after a restart does not know when the outage began.
func TestARecoveryOfAServiceThatWasAlreadyDownAtStartDoesNotInventALength(t *testing.T) {
	f := newTextsFixture(t, "en", "webhook")
	it := MonitoredItem{ID: 3, UserID: f.uid, Name: "Old", URL: "http://o"}
	cfg := f.sched.notifyCfg(f.uid)
	f.sched.evalAlertCode(context.Background(), it, false, 500, cfg) // first sight, already down: seeded silently
	f.recover(it)
	var m map[string]string
	_ = json.Unmarshal([]byte(f.next(t, 1).Body), &m)
	if m["message"] != "Responding normally again." {
		t.Errorf("%v", m)
	}
}
