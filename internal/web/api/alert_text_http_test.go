package api_test

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/alerttext"
	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

func setupAlertTextServer(t *testing.T) (*httptest.Server, *sql.DB) {
	t.Helper()
	tmp, err := os.CreateTemp("", "lastboard_alerttext_*.db")
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
	h := api.NewMonitorHandler(db.DB)
	h.Texts = alerttext.New(os.DirFS("../../../web/public"))

	mux := http.NewServeMux()
	mux.Handle("POST /api/login", http.HandlerFunc(auth.Login))
	mux.Handle("GET /api/monitor/settings", protect(http.HandlerFunc(h.GetSettings)))
	mux.Handle("POST /api/monitor/settings", protect(http.HandlerFunc(h.UpdateSettings)))
	mux.Handle("POST /api/monitor/test", protect(http.HandlerFunc(h.TestNotify)))
	server := httptest.NewServer(mux)
	t.Cleanup(func() {
		server.Close()
		db.Close()
		os.Remove(tmp.Name())
	})
	return server, db.DB
}

type alertSettings struct {
	Mode          string  `json:"mode"`
	IntervalSec   int     `json:"interval_sec"`
	AlertsEnabled bool    `json:"alerts_enabled"`
	NotifyType    string  `json:"notify_type"`
	FailThreshold int     `json:"fail_threshold"`
	TextDownTitle *string `json:"text_down_title"`
	TextDownBody  *string `json:"text_down_body"`
	TextUpTitle   *string `json:"text_up_title"`
	TextUpBody    *string `json:"text_up_body"`
}

func getAlertSettings(t *testing.T, s *userSession, base string) alertSettings {
	t.Helper()
	code, body := pushCall(t, s, "GET", base+"/api/monitor/settings", "")
	var out alertSettings
	if code != 200 || json.Unmarshal([]byte(body), &out) != nil {
		t.Fatalf("settings: %d %s", code, body)
	}
	return out
}

func str(p *string) string {
	if p == nil {
		return "<missing>"
	}
	return *p
}

func TestAnAccountSavesItsOwnAlertTextsAndNobodyElseSeesThem(t *testing.T) {
	server, db := setupAlertTextServer(t)
	createUser(t, db, "ana", "password1", "admin")
	createUser(t, db, "ben", "password2", "user")
	ana, ben := doLogin(t, server.URL, "ana", "password1"), doLogin(t, server.URL, "ben", "password2")

	// Nothing written yet: the fields are there, empty, so a page can tell "default" from a text.
	first := getAlertSettings(t, ana, server.URL)
	if str(first.TextDownTitle) != "" || str(first.TextUpBody) != "" {
		t.Fatalf("fresh account: %+v", first)
	}

	code, body := pushCall(t, ana, "POST", server.URL+"/api/monitor/settings",
		`{"mode":"background","interval_sec":60,"notify_type":"none","fail_threshold":1,"text_down_title":"  🔥 {service} down\r\n","text_up_body":"back after {duration}"}`)
	if code != 200 {
		t.Fatalf("save: %d %s", code, body)
	}
	got := getAlertSettings(t, ana, server.URL)
	if str(got.TextDownTitle) != "🔥 {service} down" || str(got.TextUpBody) != "back after {duration}" {
		t.Errorf("saved texts: %q / %q (control characters and edge spaces are taken out)", str(got.TextDownTitle), str(got.TextUpBody))
	}
	// Another account has its own.
	if other := getAlertSettings(t, ben, server.URL); str(other.TextDownTitle) != "" || str(other.TextUpBody) != "" {
		t.Errorf("the other account sees %q / %q", str(other.TextDownTitle), str(other.TextUpBody))
	}
}

// A page that has not reloaded since these fields existed sends the whole form without them. That must
// not wipe what the account wrote, and an explicit empty text must bring the default back.
func TestASaveThatDoesNotMentionTheTextsKeepsThemAndAnEmptyOneClearsIt(t *testing.T) {
	server, db := setupAlertTextServer(t)
	createUser(t, db, "ana", "password1", "admin")
	ana := doLogin(t, server.URL, "ana", "password1")
	pushCall(t, ana, "POST", server.URL+"/api/monitor/settings", `{"mode":"tab","interval_sec":60,"notify_type":"none","fail_threshold":1,"text_down_title":"mine","text_down_body":"also mine"}`)

	// An older page's save: no text fields at all.
	if code, body := pushCall(t, ana, "POST", server.URL+"/api/monitor/settings", `{"mode":"background","interval_sec":60,"notify_type":"none","fail_threshold":2}`); code != 200 {
		t.Fatalf("%d %s", code, body)
	}
	got := getAlertSettings(t, ana, server.URL)
	if str(got.TextDownTitle) != "mine" || str(got.TextDownBody) != "also mine" || got.FailThreshold != 2 {
		t.Fatalf("an older page's save changed the texts: %+v", got)
	}
	// An empty one clears just that text.
	pushCall(t, ana, "POST", server.URL+"/api/monitor/settings", `{"mode":"background","interval_sec":60,"notify_type":"none","fail_threshold":2,"text_down_title":""}`)
	got = getAlertSettings(t, ana, server.URL)
	if str(got.TextDownTitle) != "" || str(got.TextDownBody) != "also mine" {
		t.Errorf("after clearing one: %q / %q", str(got.TextDownTitle), str(got.TextDownBody))
	}
}

func TestACustomTextIsCutToTwoHundredCharacters(t *testing.T) {
	server, db := setupAlertTextServer(t)
	createUser(t, db, "ana", "password1", "admin")
	ana := doLogin(t, server.URL, "ana", "password1")
	long := strings.Repeat("ぜ", 500) // 1500 bytes, 500 characters
	if code, body := pushCall(t, ana, "POST", server.URL+"/api/monitor/settings", `{"mode":"tab","interval_sec":60,"notify_type":"none","fail_threshold":1,"text_down_body":"`+long+`"}`); code != 200 {
		t.Fatalf("%d %s", code, body)
	}
	if n := len([]rune(str(getAlertSettings(t, ana, server.URL).TextDownBody))); n != alerttext.MaxTemplate {
		t.Errorf("%d characters kept, want %d", n, alerttext.MaxTemplate)
	}
}

// The test button is the place to see the wording: it speaks the account's language, says Test, and
// uses the account's own text when it wrote one.
func TestTheTestButtonSpeaksTheAccountsLanguageAndUsesItsOwnWording(t *testing.T) {
	server, db := setupAlertTextServer(t)
	createUser(t, db, "ana", "password1", "admin")
	if _, err := db.Exec(`UPDATE users SET language = 'es' WHERE username = 'ana'`); err != nil {
		t.Fatal(err)
	}
	ana := doLogin(t, server.URL, "ana", "password1")

	var mu sync.Mutex
	var got []map[string]any
	hook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		var m map[string]any
		_ = json.Unmarshal(b, &m)
		mu.Lock()
		got = append(got, m)
		mu.Unlock()
	}))
	defer hook.Close()
	test := func() map[string]any {
		code, body := pushCall(t, ana, "POST", server.URL+"/api/monitor/test", `{"notify_type":"webhook","notify_url":"`+hook.URL+`"}`)
		if code != 200 {
			t.Fatalf("test: %d %s", code, body)
		}
		mu.Lock()
		defer mu.Unlock()
		return got[len(got)-1]
	}
	if m := test(); m["title"] != "Prueba · Lastboard está caído" {
		t.Errorf("default: %v", m)
	}
	pushCall(t, ana, "POST", server.URL+"/api/monitor/settings", `{"mode":"tab","interval_sec":60,"notify_type":"none","fail_threshold":1,"text_down_title":"Socorro: {service}"}`)
	if m := test(); m["title"] != "Prueba · Socorro: Lastboard" {
		t.Errorf("own wording: %v", m)
	}
}
