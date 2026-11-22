package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
)

// DockerEngineInfo is which engine answers at a host and its release. Empty
// says the host did not tell: an agent from before it could.
type DockerEngineInfo struct {
	Engine  string `json:"engine"`
	Version string `json:"version"`
}

// maxEngineVersion bounds a release another machine reports, as the agent's is.
const maxEngineVersion = 40

// EngineOf asks the host at hostURL which engine it runs. Podman names itself in
// the components its version answer lists; an agent says it for the engine
// behind it, in the two words it lets out.
func EngineOf(hostURL string) (DockerEngineInfo, error) {
	client, base, err := newDockerClient(hostURL)
	if err != nil {
		return DockerEngineInfo{}, fmt.Errorf("docker: build client: %w", err)
	}
	resp, err := client.Get(base + "/version")
	if err != nil {
		return DockerEngineInfo{}, fmt.Errorf("docker: GET version: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		err := readError(hostURL, "version", resp)
		if errors.Is(err, errAgentTooOld) || errors.Is(err, errNoSuchContainer) {
			return DockerEngineInfo{}, nil // an agent without the call: not known, not an error
		}
		return DockerEngineInfo{}, err
	}
	var raw struct {
		// What an agent answers.
		Engine string `json:"engine"`
		// What the daemon answers.
		Version    string `json:"Version"`
		Components []struct {
			Name string `json:"Name"`
		} `json:"Components"`
		AgentVersion string `json:"version"`
	}
	if err := decodeLimited(resp.Body, dockerMaxAnswer, &raw); err != nil {
		return DockerEngineInfo{}, fmt.Errorf("docker: decode version: %w", err)
	}
	info := DockerEngineInfo{Version: strings.TrimSpace(raw.Version)}
	if info.Version == "" {
		info.Version = strings.TrimSpace(raw.AgentVersion)
	}
	if len(info.Version) > maxEngineVersion {
		info.Version = ""
	}
	switch strings.ToLower(raw.Engine) {
	case enginePodman, engineDocker:
		info.Engine = strings.ToLower(raw.Engine)
	default:
		info.Engine = engineDocker
		for _, c := range raw.Components {
			if strings.Contains(strings.ToLower(c.Name), enginePodman) {
				info.Engine = enginePodman
			}
		}
		if raw.Version == "" && len(raw.Components) == 0 {
			info.Engine = "" // nothing in it that says
		}
	}
	return info, nil
}

// POST /api/docker/engine — Body: { "host_id": string }
//
// Answers { "engine": "podman", "version": "6.2.0" }. The screen asks the person
// which engine a host runs so that it can explain the right things; the host's
// own answer is what is true, and a host saved with the other one is corrected
// here, so the list says what runs where.
func (h *DockerHandler) EngineFor(w http.ResponseWriter, r *http.Request) {
	q, ok := readDockerQuery(w, r)
	if !ok {
		return
	}
	e, ok := h.hostOf(w, r, q.HostID)
	if !ok {
		return
	}
	info, err := EngineOf(e.address())
	if err != nil {
		writeReadError(w, err)
		return
	}
	if info.Engine != "" && info.Engine != engineOf(e.Engine) {
		h.forAccount(r).setEngine(e.ID, info.Engine)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(info)
}

// setEngine records what a host runs, for the host with this id and no other.
func (s dockerScope) setEngine(id, engine string) {
	list := s.hosts()
	for i := range list {
		if list[i].ID != id {
			continue
		}
		list[i].Engine = ""
		if engine == enginePodman {
			list[i].Engine = enginePodman
		}
		_ = s.saveHosts(list)
		return
	}
}
