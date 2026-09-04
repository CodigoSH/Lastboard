package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"golang.org/x/net/websocket"
)

func TestSameOriginWS(t *testing.T) {
	cases := []struct {
		name          string
		trustProxy    string
		host          string
		origin        string
		forwardedHost string
		want          bool
	}{
		{"missing origin allowed", "", "example.com", "", "", true},
		{"same origin", "", "example.com", "http://example.com", "", true},
		{"same origin https", "", "example.com", "https://example.com", "", true},
		{"cross origin rejected", "", "example.com", "http://evil.com", "", false},
		{"malformed origin rejected", "", "example.com", "://bad", "", false},

		// Behind a declared proxy the backend's Host is the internal address
		// while the browser's Origin is the public name, so the forwarded host
		// is what they have in common.
		{"proxied via x-forwarded-host", "true", "192.168.1.5:8080", "https://board.example.com", "board.example.com", true},
		{"proxied but forwarded mismatch", "true", "192.168.1.5:8080", "https://board.example.com", "other.com", false},

		// And without that declaration the header is just something the caller
		// sent. Accepting it let anyone name their own site and have their
		// cross-site socket approved, riding the victim's session cookie.
		{"forwarded host ignored when no proxy is declared", "", "192.168.1.5:8080", "https://evil.com", "evil.com", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			t.Setenv("TRUST_PROXY", c.trustProxy)
			r := httptest.NewRequest(http.MethodGet, "/ws", nil)
			r.Host = c.host
			if c.origin != "" {
				r.Header.Set("Origin", c.origin)
			}
			if c.forwardedHost != "" {
				r.Header.Set("X-Forwarded-Host", c.forwardedHost)
			}
			if got := sameOriginWS(r); got != c.want {
				t.Errorf("sameOriginWS = %v, want %v", got, c.want)
			}
		})
	}
}

func waitForClients(t *testing.T, h *Hub, want int) {
	t.Helper()
	for i := 0; i < 200; i++ {
		h.mu.Lock()
		n := len(h.clients)
		h.mu.Unlock()
		if n == want {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("timeout waiting for %d clients", want)
}

// dialWS opens a WebSocket to the test server with a same-origin Origin header.
func dialWS(t *testing.T, srv *httptest.Server) *websocket.Conn {
	t.Helper()
	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http")
	cfg, err := websocket.NewConfig(wsURL+"/", srv.URL)
	if err != nil {
		t.Fatalf("ws config: %v", err)
	}
	conn, err := websocket.DialConfig(cfg)
	if err != nil {
		t.Fatalf("ws dial: %v", err)
	}
	return conn
}

func TestHub_RegisterBroadcastUnregister(t *testing.T) {
	h := NewHub()
	go h.Run(t.Context())

	srv := httptest.NewServer(http.HandlerFunc(h.HandleWebSocket))
	defer srv.Close()

	conn := dialWS(t, srv)
	waitForClients(t, h, 1)

	// Broadcast reaches the connected client.
	h.broadcast <- WSMessage{Type: "stats", Payload: SystemStats{CPUUsage: 42}}
	var msg WSMessage
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	if err := websocket.JSON.Receive(conn, &msg); err != nil {
		t.Fatalf("receive broadcast: %v", err)
	}
	if msg.Type != "stats" {
		t.Fatalf("want type 'stats', got %q", msg.Type)
	}

	// Closing the client removes it from the hub.
	conn.Close()
	waitForClients(t, h, 0)
}

func TestHub_MultipleClients(t *testing.T) {
	h := NewHub()
	go h.Run(t.Context())

	srv := httptest.NewServer(http.HandlerFunc(h.HandleWebSocket))
	defer srv.Close()

	c1 := dialWS(t, srv)
	defer c1.Close()
	c2 := dialWS(t, srv)
	defer c2.Close()
	waitForClients(t, h, 2)

	h.broadcast <- WSMessage{Type: "stats", Payload: SystemStats{}}
	for i, c := range []*websocket.Conn{c1, c2} {
		var msg WSMessage
		c.SetReadDeadline(time.Now().Add(2 * time.Second))
		if err := websocket.JSON.Receive(c, &msg); err != nil {
			t.Fatalf("client %d receive: %v", i, err)
		}
		if msg.Type != "stats" {
			t.Fatalf("client %d: want 'stats', got %q", i, msg.Type)
		}
	}
}

func TestHandleWebSocket_RejectsCrossOrigin(t *testing.T) {
	h := NewHub()
	go h.Run(t.Context())
	srv := httptest.NewServer(http.HandlerFunc(h.HandleWebSocket))
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http")
	cfg, err := websocket.NewConfig(wsURL+"/", "http://evil.example.com")
	if err != nil {
		t.Fatalf("ws config: %v", err)
	}
	if _, err := websocket.DialConfig(cfg); err == nil {
		t.Fatal("expected cross-origin WebSocket dial to be rejected")
	}
}
