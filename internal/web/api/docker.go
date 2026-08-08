package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
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

// maxStatsBatch caps how many containers one call may ask about. A host with
// more running containers than this simply needs a second call; the number is
// here so a hand-written URL can't ask for ten thousand readings.
const maxStatsBatch = 200

// GET /api/docker/stats?host=<hostURL>&ids=<id,id,id>
//
// Answers with a map keyed by container id. It reads several containers per
// call on purpose: the widget used to make one request per container, which
// on a host with twenty of them meant twenty round trips and twenty
// connections to the daemon for one screenful of numbers.
//
// A container the daemon won't report on is absent from the map rather than
// failing the call.
func (h *DockerHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	hostURL := r.URL.Query().Get("host")

	var ids []string
	for _, raw := range strings.Split(r.URL.Query().Get("ids"), ",") {
		if id := strings.TrimSpace(raw); id != "" {
			ids = append(ids, id)
		}
	}

	if len(ids) == 0 {
		http.Error(w, "docker.missing_id", http.StatusBadRequest)
		return
	}
	if len(ids) > maxStatsBatch {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	stats, err := GetContainersStats(hostURL, ids)
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

	// Role check: only admin may perform container actions. Use the shared
	// isAdminUser helper so admin authorization is defined in exactly one place.
	if !isAdminUser(h.DB, r) {
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
