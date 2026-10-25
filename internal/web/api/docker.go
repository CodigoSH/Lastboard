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

// dockerQuery is what the widget asks with: which of the account's hosts, never
// where it is. The address and the agent's token are read from the account.
type dockerQuery struct {
	HostID string   `json:"host_id"`
	IDs    []string `json:"ids"`
}

// hostOf resolves the host a request names, or answers why it cannot be used.
func (h *DockerHandler) hostOf(w http.ResponseWriter, r *http.Request, id string) (dockerHost, bool) {
	e, err := h.forAccount(r).resolve(id)
	if err != nil {
		http.Error(w, err.key, err.status)
		return dockerHost{}, false
	}
	return e, true
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

// POST /api/docker/containers — Body: { "host_id": string }
func (h *DockerHandler) ListContainersFor(w http.ResponseWriter, r *http.Request) {
	q, ok := readDockerQuery(w, r)
	if !ok {
		return
	}
	if e, ok := h.hostOf(w, r, q.HostID); ok {
		h.writeContainers(w, e.address())
	}
}

// POST /api/docker/agent-version — Body: { "host_id": string }
//
// Answers { "version": "v1.1.1" }, or an empty version for an agent too old to
// say. A host that is not an agent, or does not answer, is a 502.
func (h *DockerHandler) AgentVersionFor(w http.ResponseWriter, r *http.Request) {
	q, ok := readDockerQuery(w, r)
	if !ok {
		return
	}
	e, ok := h.hostOf(w, r, q.HostID)
	if !ok {
		return
	}
	v, err := AgentVersion(e.address())
	if err != nil {
		http.Error(w, "docker.connection_error", http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"version": v})
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

// StatsFor answers with a map keyed by container id. It reads several
// containers per call on purpose: the widget used to make one request per
// container, which on a host with twenty of them meant twenty round trips and
// twenty connections to the daemon for one screenful of numbers. A container the
// daemon won't report on is absent from the map rather than failing the call.
//
// POST /api/docker/stats — Body: { "host_id": string, "ids": [string] }
func (h *DockerHandler) StatsFor(w http.ResponseWriter, r *http.Request) {
	q, ok := readDockerQuery(w, r)
	if !ok {
		return
	}
	if e, ok := h.hostOf(w, r, q.HostID); ok {
		h.writeStats(w, e.address(), q.IDs)
	}
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
// Body: { "host_id": string, "id": string, "action": string }
//
// Who may: the route needs permission to control Docker, and the host must be
// one of the account's own that it may use — for a member, one of its agents.
// The administrator may act on any of its hosts, the server's own included.
func (h *DockerHandler) Action(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 512*1024)

	var input struct {
		ID     string `json:"id"`
		Action string `json:"action"`
		HostID string `json:"host_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	if input.ID == "" || input.Action == "" {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
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

	e, ok := h.hostOf(w, r, input.HostID)
	if !ok {
		return
	}
	if err := ContainerAction(e.address(), input.ID, input.Action); err != nil {
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
