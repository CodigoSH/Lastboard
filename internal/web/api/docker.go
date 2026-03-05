package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/CodigoSH/Lastboard/internal/web/middleware"
)

type DockerHandler struct {
	DB *sql.DB
}

func NewDockerHandler(db *sql.DB) *DockerHandler {
	return &DockerHandler{DB: db}
}

// GET /api/docker/containers?host=<hostURL>
func (h *DockerHandler) GetContainers(w http.ResponseWriter, r *http.Request) {
	hostURL := r.URL.Query().Get("host")

	containers, err := ListContainers(hostURL)
	if err != nil {
		http.Error(w, "docker.connection_error", http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(containers)
}

// GET /api/docker/stats?host=<hostURL>&id=<containerID>
func (h *DockerHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	hostURL := r.URL.Query().Get("host")
	containerID := r.URL.Query().Get("id")

	if containerID == "" {
		http.Error(w, "docker.missing_id", http.StatusBadRequest)
		return
	}

	stats, err := GetContainerStats(hostURL, containerID)
	if err != nil {
		http.Error(w, "docker.stats_error", http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// POST /api/docker/action
// Body: { "host": string, "id": string, "action": string }
func (h *DockerHandler) Action(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 512*1024)

	var input struct {
		Host   string `json:"host"`
		ID     string `json:"id"`
		Action string `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	if input.ID == "" || input.Action == "" {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	// Role check: only admin may perform container actions.
	role := middleware.GetUserRoleFromContext(r)
	if strings.ToLower(role) != "admin" && strings.ToLower(role) != "administrator" {
		http.Error(w, "docker.forbidden", http.StatusForbidden)
		return
	}

	// Validate action before calling the client so we can return a precise 400.
	switch input.Action {
	case "start", "stop", "restart":
		// valid
	default:
		http.Error(w, "docker.invalid_action", http.StatusBadRequest)
		return
	}

	if err := ContainerAction(input.Host, input.ID, input.Action); err != nil {
		http.Error(w, "docker.action_error", http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "docker.action_success"})
}
