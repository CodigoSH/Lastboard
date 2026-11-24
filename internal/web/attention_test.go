package web

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
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

// Plain HTTP is noticed from another machine, not from this one.
func TestPlainHTTPFromAnotherMachineIsNoticed(t *testing.T) {
	seen := func(peer string) bool {
		s := &Server{}
		r := httptest.NewRequest(http.MethodGet, "/", nil)
		r.RemoteAddr = peer
		s.noticeInsecure(r)
		return s.insecureSeen.Load()
	}
	if !seen("192.168.1.30:50000") {
		t.Error("plain HTTP from the LAN was not noticed")
	}
	if seen("127.0.0.1:50000") {
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
