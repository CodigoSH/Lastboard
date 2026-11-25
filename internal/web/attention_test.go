package web

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

// The disk is said at the lines its bar changes colour at, and not before.
func TestTheDiskIsSaidWhenItIsFilling(t *testing.T) {
	for _, c := range []struct {
		free, total uint64
		tone        string
	}{
		{30, 100, ""}, {26, 100, ""}, {25, 100, "warn"}, {11, 100, "warn"}, {10, 100, "bad"}, {0, 100, "bad"}, {0, 0, ""}, {5, 4, ""},
	} {
		item, said := diskAttention(c.free, c.total)
		switch {
		case c.tone == "" && said:
			t.Errorf("%d free of %d: said %q, want nothing", c.free, c.total, item.Tone)
		case c.tone != "" && (!said || item.Tone != c.tone):
			t.Errorf("%d free of %d: said=%v %q, want %q", c.free, c.total, said, item.Tone, c.tone)
		}
	}
}

// An alert channel of the administrator's whose last alert failed is listed by
// name; one that worked, or is switched off, is not.
func TestAFailingAlertChannelIsListed(t *testing.T) {
	srv := newTestServer(t, true)
	admin := adminOf(t, srv)
	var id int
	if err := srv.DB.QueryRow("SELECT id FROM users WHERE username = 'probe'").Scan(&id); err != nil {
		t.Fatal(err)
	}
	set := func(key, value string) {
		t.Helper()
		if _, err := srv.DB.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (?, ?, ?)
			ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value`, id, key, value); err != nil {
			t.Fatal(err)
		}
	}
	set("monitoring_notify_channels", `[{"id":"a","name":"Phone","type":"ntfy","url":"https://ntfy.example","enabled":true},
		{"id":"b","name":"Chat","type":"webhook","url":"https://hook.example","enabled":true},
		{"id":"c","name":"Old","type":"webhook","url":"https://old.example","enabled":false}]`)
	set("monitoring_notify_status", `{"a":{"at":1,"ok":false,"error":"http_401"},"b":{"at":1,"ok":true},"c":{"at":1,"ok":false,"error":"timeout"}}`)

	item, said := attentionOf(t, admin, "channels")
	if !said {
		t.Fatal("a failing channel is not listed")
	}
	if item.Params["count"] != float64(1) || item.Params["names"] != "Phone" || item.Params["reason"] != "http_401" {
		t.Errorf("channels item says %+v, want Phone alone with http_401", item.Params)
	}
}

// A telemetry socket refused for its origin is said, so the "—" in the widget
// has a reason the administrator can read.
func TestARefusedTelemetrySocketIsSaid(t *testing.T) {
	t.Setenv("TRUST_PROXY", "false")
	srv := newTestServer(t, true)
	admin := adminOf(t, srv)
	if _, said := attentionOf(t, admin, "socket"); said {
		t.Skip("another test in this process already had a socket refused")
	}
	r := httptest.NewRequest(http.MethodGet, "/ws", nil)
	r.Header.Set("Origin", "https://panel.example.com")
	r.Header.Set("Connection", "Upgrade")
	r.Header.Set("Upgrade", "websocket")
	srv.WSHub.HandleWebSocket(httptest.NewRecorder(), r)
	if _, said := attentionOf(t, admin, "socket"); !said {
		t.Error("a socket refused for its origin is not said")
	}
}

// What the administrator is told to do about a proxy depends on how Lastboard is installed, so the
// server says which it is.
func TestTheProxyNoticeSaysHowLastboardIsInstalled(t *testing.T) {
	t.Setenv("TRUST_PROXY", "false")
	srv := newTestServer(t, true)
	admin := adminOf(t, srv)
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.RemoteAddr = "172.18.0.4:50000"
	r.Header.Set("X-Forwarded-For", "203.0.113.9")
	srv.noticeForwarded(r)

	item, said := attentionOf(t, admin, "proxy")
	if !said {
		t.Fatal("an undeclared proxy is not listed")
	}
	if got := item.Params["install"]; got != "container" && got != "native" {
		t.Errorf("the proxy item says install=%v, want container or native", got)
	}
	if want := installKind(); item.Params["install"] != want {
		t.Errorf("the proxy item says install=%v, this process is %q", item.Params["install"], want)
	}
}

// Plain HTTP is noticed when somebody signed in uses Lastboard so from another machine; not from
// this one, and not a request nobody is behind (a proxy's health probe, a status check by the
// server's own address), which an administrator on HTTPS was being told about.
func TestPlainHTTPFromAnotherMachineIsNoticed(t *testing.T) {
	srv := newTestServer(t, true)
	var id int
	if err := srv.DB.QueryRow("SELECT id FROM users WHERE username = 'probe'").Scan(&id); err != nil {
		t.Fatal(err)
	}
	token := util.SignToken(util.AccountSessionPayload(id, 0), srv.sessionSecret, time.Now().Add(time.Hour))
	request := func(signedIn bool, forwardedProto string) {
		r := httptest.NewRequest(http.MethodGet, "/health", nil)
		r.RemoteAddr = "192.168.1.30:50000"
		if signedIn {
			r.AddCookie(&http.Cookie{Name: "session_token", Value: token})
		}
		if forwardedProto != "" {
			r.Header.Set("X-Forwarded-Proto", forwardedProto)
		}
		srv.ServeHTTP(httptest.NewRecorder(), r)
	}

	request(false, "")
	if srv.insecureSeen.Load() {
		t.Fatal("a request with nobody signed in behind it was noticed as somebody using plain HTTP")
	}
	request(true, "https")
	if srv.insecureSeen.Load() {
		t.Fatal("somebody signed in over HTTPS through a proxy was noticed as using plain HTTP")
	}
	request(true, "")
	if !srv.insecureSeen.Load() {
		t.Error("somebody signed in on plain HTTP from the LAN was not noticed")
	}
}

// And this machine's own requests never count, signed in or not.
func TestPlainHTTPFromThisMachineIsNotNoticed(t *testing.T) {
	s := &Server{}
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.RemoteAddr = "127.0.0.1:50000"
	s.noticeInsecure(r)
	if s.insecureSeen.Load() {
		t.Error("plain HTTP from this machine was noticed")
	}
}

// About's dialog gets the installation and how it is set up, and never a secret.
func TestServerDetailsSayHowItIsSetUp(t *testing.T) {
	srv := newTestServer(t, true)
	admin := adminOf(t, srv)
	w := admin(http.MethodGet, "/api/system/details", "")
	if w.Code != http.StatusOK {
		t.Fatalf("GET /api/system/details = %d", w.Code)
	}
	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	for _, k := range []string{"version", "go", "os", "uptime_seconds", "memory_bytes", "config"} {
		if _, ok := body[k]; !ok {
			t.Errorf("details have no %q", k)
		}
	}
	cfg, _ := body["config"].(map[string]any)
	for _, k := range []string{"trust_proxy", "proxy_hops", "auth_proxy", "https"} {
		if _, ok := cfg[k]; !ok {
			t.Errorf("config has no %q", k)
		}
	}
}
