package api

import (
	"log/slog"
	"net/http"
	"runtime"
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
		broadcast:  make(chan WSMessage, 10),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
		clients:    make(map[*websocket.Conn]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
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

			// Send without holding the lock so a slow client doesn't block others
			for _, client := range snapshot {
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
func (h *Hub) StartBroadcasting(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		// Optimization: Don't gather stats if no one is listening
		h.mu.Lock()
		clientCount := len(h.clients)
		h.mu.Unlock()

		if clientCount == 0 {
			continue
		}

		stats, err := gatherStats()
		if err == nil {
			h.broadcast <- WSMessage{
				Type:    "stats",
				Payload: stats,
			}
		} else {
			slog.Warn("Error gathering stats for WS", "error", err)
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

func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
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
