package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

type DockerHandler struct {
	DB *sql.DB
}

func NewDockerHandler(db *sql.DB) *DockerHandler {
	return &DockerHandler{DB: db}
}

// dockerQuery is what the widget asks with. The host travels in the body
// because for an agent it carries the agent's token, and a query string ends up
// in the access log of whatever proxy sits in front of Lastboard.
type dockerQuery struct {
	Host string   `json:"host"`
	IDs  []string `json:"ids"`
}

func readDockerQuery(w http.ResponseWriter, r *http.Request) (dockerQuery, bool) {
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	var q dockerQuery
	if err := json.NewDecoder(r.Body).Decode(&q); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return q, false
	}
	return q, true
}

// POST /api/docker/containers — Body: { "host": string }
func (h *DockerHandler) ListContainersFor(w http.ResponseWriter, r *http.Request) {
	q, ok := readDockerQuery(w, r)
	if !ok {
		return
	}
	h.writeContainers(w, q.Host)
}

// GET /api/docker/containers?host=<hostURL>
//
// Kept for a browser that has not reloaded since the update and still asks
// this way. Everything current posts the host instead.
func (h *DockerHandler) GetContainers(w http.ResponseWriter, r *http.Request) {
	h.writeContainers(w, r.URL.Query().Get("host"))
}

func (h *DockerHandler) writeContainers(w http.ResponseWriter, hostURL string) {
	containers, err := ListContainers(hostURL)
	if errors.Is(err, errDockerUnauthorized) {
		http.Error(w, "docker.unauthorized", http.StatusBadGateway)
		return
	}
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
//
// Kept, like the GET for containers, for a browser still on the previous
// bundle; StatsFor is the one in use.
func (h *DockerHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	h.writeStats(w, r.URL.Query().Get("host"), strings.Split(r.URL.Query().Get("ids"), ","))
}

// POST /api/docker/stats — Body: { "host": string, "ids": [string] }
func (h *DockerHandler) StatsFor(w http.ResponseWriter, r *http.Request) {
	q, ok := readDockerQuery(w, r)
	if !ok {
		return
	}
	h.writeStats(w, q.Host, q.IDs)
}

func (h *DockerHandler) writeStats(w http.ResponseWriter, hostURL string, raw []string) {
	var ids []string
	for _, id := range raw {
		if id = strings.TrimSpace(id); id != "" {
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
		if errors.Is(err, errDockerUnauthorized) {
			http.Error(w, "docker.unauthorized", http.StatusBadGateway)
			return
		}
		http.Error(w, "docker.action_error", http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "docker.action_success"})
}
