package api

import (
	"log"
	"net/http"
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

var upgrader = websocket.Server{
	Handshake: func(config *websocket.Config, r *http.Request) error {
		return nil // In production, refine this
	},
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
		broadcast:  make(chan WSMessage),
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
			log.Println("WebSocket client registered")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
				log.Println("WebSocket client unregistered")
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.Lock()
			for client := range h.clients {
				err := websocket.JSON.Send(client, message)
				if err != nil {
					log.Printf("WebSocket error: %v", err)
					client.Close()
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

// StatsBroadcaster gathers system stats and sends them to the hub
func (h *Hub) StartBroadcasting(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		stats, err := gatherStats()
		if err == nil {
			h.broadcast <- WSMessage{
				Type:    "stats",
				Payload: stats,
			}
		} else {
			log.Printf("Error gathering stats for WS: %v", err)
		}
	}
}

func gatherStats() (SystemStats, error) {
	stats := SystemStats{}

	// RAM
	if mem, err := readMemInfo(); err == nil {
		stats.RAMTotal = mem.Total
		stats.RAMUsed = mem.Used
		if mem.Total > 0 {
			stats.RAMUsage = (float64(mem.Used) / float64(mem.Total)) * 100
		}
	}

	// CPU (Take a shorter sample for periodic broadcasing)
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
