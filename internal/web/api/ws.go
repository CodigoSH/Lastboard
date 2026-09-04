package api

import (
	"context"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"runtime"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/websocket"
)

// SystemStats represents the system telemetry broadcasted via WebSocket
type SystemStats struct {
	CPUUsage    float64 `json:"cpu_usage"`
	RAMUsage    float64 `json:"ram_usage"`
	RAMTotal    uint64  `json:"ram_total"`
	RAMUsed     uint64  `json:"ram_used"`
	Temperature float64 `json:"temperature"`
}

// WSMessage represents a typed message sent over WebSocket
type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// Hub maintains the set of active clients and broadcasts messages to the clients.
type Hub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan WSMessage
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mu         sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		broadcast: make(chan WSMessage, 10),
		// Buffered so a (dis)connection does not block on Run() while it is busy
		// sending to a slow client. Pairs with the per-send write deadline below.
		register:   make(chan *websocket.Conn, 16),
		unregister: make(chan *websocket.Conn, 16),
		clients:    make(map[*websocket.Conn]bool),
	}
}

// wsWriteTimeout bounds how long a single slow client can stall the broadcast
// loop. Past it the send fails and the client is dropped, so one stuck peer
// cannot block telemetry for everyone.
const wsWriteTimeout = 5 * time.Second

func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			// Shutting down: close what is still connected so the clients see
			// a closed socket rather than a silence they have to time out.
			h.mu.Lock()
			for client := range h.clients {
				client.Close()
				delete(h.clients, client)
			}
			h.mu.Unlock()
			return

		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			slog.Info("WebSocket client registered")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
				slog.Info("WebSocket client unregistered")
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			// Snapshot clients under lock, then release before sending
			h.mu.Lock()
			snapshot := make([]*websocket.Conn, 0, len(h.clients))
			for client := range h.clients {
				snapshot = append(snapshot, client)
			}
			h.mu.Unlock()

			// Send without holding the lock so a slow client doesn't block others.
			// The write deadline caps the stall a single slow client can cause.
			for _, client := range snapshot {
				_ = client.SetWriteDeadline(time.Now().Add(wsWriteTimeout))
				if err := websocket.JSON.Send(client, message); err != nil {
					slog.Warn("WebSocket send error", "error", err)
					client.Close()
					h.mu.Lock()
					delete(h.clients, client)
					h.mu.Unlock()
				}
			}
		}
	}
}

// StatsBroadcaster gathers system stats and sends them to the hub
func (h *Hub) StartBroadcasting(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}

		// Optimization: Don't gather stats if no one is listening
		h.mu.Lock()
		clientCount := len(h.clients)
		h.mu.Unlock()

		if clientCount == 0 {
			continue
		}

		stats, err := gatherStats()
		if err != nil {
			slog.Warn("Error gathering stats for WS", "error", err)
			continue
		}

		// Run may already be gone, and nothing would ever read this. Give up on
		// the send instead of leaving the goroutine parked on it forever.
		select {
		case h.broadcast <- WSMessage{Type: "stats", Payload: stats}:
		case <-ctx.Done():
			return
		}
	}
}

func gatherStats() (SystemStats, error) {
	stats := SystemStats{}

	if runtime.GOOS != "linux" {
		// Non-Linux systems cannot read /proc — return sentinel values
		// so the frontend can display a "not available" state gracefully.
		stats.Temperature = -1
		stats.CPUUsage = -1
		stats.RAMUsage = -1
		return stats, nil
	}

	// RAM
	if mem, err := readMemInfo(); err == nil {
		stats.RAMTotal = mem.Total
		stats.RAMUsed = mem.Used
		if mem.Total > 0 {
			stats.RAMUsage = (float64(mem.Used) / float64(mem.Total)) * 100
		}
	}

	// CPU (Take a shorter sample for periodic broadcasting)
	if cpu, err := calculateCPUUsage(100 * time.Millisecond); err == nil {
		stats.CPUUsage = cpu
	}

	// Temp
	if temp, err := readTemp(); err == nil {
		stats.Temperature = temp
	} else {
		stats.Temperature = -1
	}

	return stats, nil
}

// sameOriginWS reports whether the WebSocket handshake originates from the same
// host it is served on. Browsers always send Origin on WS upgrades; a mismatch
// indicates a cross-site connection attempt (CSWSH). A missing Origin (e.g. a
// non-browser client) is allowed since there is no cross-site risk there.
//
// Self-hosted note: most operators run behind a reverse proxy, where the
// backend's Host may be the internal address while the browser's Origin is the
// public hostname. X-Forwarded-Host is therefore accepted too, so telemetry
// keeps working behind Pangolin/Traefik/NPM/Caddy — but only when the operator
// has said there is a proxy in front. Without that gate the header is just
// something the caller sends: anyone could name their own site in it and have
// their cross-site socket accepted, riding the victim's session cookie.
func sameOriginWS(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	if strings.EqualFold(u.Host, r.Host) {
		return true
	}
	if os.Getenv("TRUST_PROXY") == "true" {
		if fwd := r.Header.Get("X-Forwarded-Host"); fwd != "" && strings.EqualFold(u.Host, fwd) {
			return true
		}
	}
	return false
}

func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	if !sameOriginWS(r) {
		http.Error(w, "error.forbidden", http.StatusForbidden)
		return
	}
	handler := func(ws *websocket.Conn) {
		h.register <- ws
		defer func() { h.unregister <- ws }()

		// Keep connection alive
		buf := make([]byte, 1024)
		for {
			_, err := ws.Read(buf)
			if err != nil {
				break
			}
		}
	}

	websocket.Handler(handler).ServeHTTP(w, r)
}
