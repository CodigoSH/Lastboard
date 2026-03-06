package api

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// dockerSocketPath is the default Unix socket used to communicate with the
// local Docker Engine. Mount it read-only in docker-compose.yml to enable
// the Docker widget without granting write access.
const dockerSocketPath = "/var/run/docker.sock"

// agentTransport injects an Authorization: Bearer header on every request
// so that ListContainers / GetContainerStats / ContainerAction work unchanged
// against the Lastboard Agent running on a remote host.
type agentTransport struct {
	token     string
	transport http.RoundTripper
}

func (t *agentTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req = req.Clone(req.Context())
	req.Header.Set("Authorization", "Bearer "+t.token)
	return t.transport.RoundTrip(req)
}

// ─── Public Types ──────────────────────────────────────────────────────────────

// DockerContainer holds the normalised representation of a Docker container.
type DockerContainer struct {
	ID      string // Short 12-char container ID
	Name    string // Name without leading "/"
	Image   string
	Status  string // "running" | "stopped" | "paused" | "exited" | "restarting"
	State   string // Raw state string returned by Docker
	Created int64
}

// DockerStats holds CPU and memory metrics for a running container.
type DockerStats struct {
	CPUPercent float64
	MemPercent float64
	MemUsed    uint64
	MemLimit   uint64
}

// ─── Private Helper ────────────────────────────────────────────────────────────

// newDockerClient returns a configured *http.Client and the base URL to use
// for the given hostURL.
//
//   - "" or "local"       → Unix socket at dockerSocketPath
//   - "agent://host?token" → plain HTTP with Authorization: Bearer header
//   - "https://…"        → TCP with TLS (InsecureSkipVerify: true)
//   - anything else       → plain TCP; "http://" is prepended if missing
func newDockerClient(hostURL string) (*http.Client, string, error) {
	const timeout = 10 * time.Second

	switch {
	case hostURL == "" || strings.EqualFold(hostURL, "local"):
		// Unix-socket transport
		transport := &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return (&net.Dialer{Timeout: timeout}).DialContext(ctx, "unix", dockerSocketPath)
			},
		}
		client := &http.Client{Transport: transport, Timeout: timeout}
		// Docker requires a dummy HTTP host; the real routing happens via the socket.
		return client, "http://localhost", nil

	case strings.HasPrefix(hostURL, "agent://"):
		// Strip scheme to get "host:port?token=secret"
		raw := strings.TrimPrefix(hostURL, "agent://")
		host := raw
		token := ""
		if idx := strings.IndexByte(raw, '?'); idx >= 0 {
			host = raw[:idx]
			// url.ParseQuery handles percent-decoding and multiple params correctly.
			if q, err := url.ParseQuery(raw[idx+1:]); err == nil {
				token = q.Get("token")
			}
		}
		transport := &agentTransport{
			token:     token,
			transport: http.DefaultTransport,
		}
		client := &http.Client{Transport: transport, Timeout: timeout}
		return client, "http://" + host, nil

	case strings.HasPrefix(hostURL, "https://"):
		transport := &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, //nolint:gosec
		}
		client := &http.Client{Transport: transport, Timeout: timeout}
		return client, strings.TrimRight(hostURL, "/"), nil

	default:
		// Plain TCP — ensure the host has the http:// scheme.
		base := hostURL
		if !strings.HasPrefix(base, "http://") {
			base = "http://" + base
		}
		client := &http.Client{Timeout: timeout}
		return client, strings.TrimRight(base, "/"), nil
	}
}

// ─── ListContainers ────────────────────────────────────────────────────────────

// dockerAPIContainer is the raw shape returned by GET /containers/json.
type dockerAPIContainer struct {
	Id      string   `json:"Id"`
	Names   []string `json:"Names"`
	Image   string   `json:"Image"`
	State   string   `json:"State"`
	Status  string   `json:"Status"`
	Created int64    `json:"Created"`
}

// normaliseStatus maps Docker's raw container state to the set of values
// expected by the caller.
func normaliseStatus(state string) string {
	switch strings.ToLower(state) {
	case "running":
		return "running"
	case "paused":
		return "paused"
	case "restarting":
		return "restarting"
	case "exited", "stopped", "dead", "removing", "created":
		return "stopped"
	default:
		return "stopped"
	}
}

// ListContainers fetches all containers (running and stopped) from the Docker
// Engine at hostURL and returns them as normalised DockerContainer values.
func ListContainers(hostURL string) ([]DockerContainer, error) {
	client, base, err := newDockerClient(hostURL)
	if err != nil {
		return nil, fmt.Errorf("docker: build client: %w", err)
	}

	resp, err := client.Get(base + "/containers/json?all=true")
	if err != nil {
		return nil, fmt.Errorf("docker: GET /containers/json: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("docker: GET /containers/json returned %d", resp.StatusCode)
	}

	var raw []dockerAPIContainer
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("docker: decode containers: %w", err)
	}

	containers := make([]DockerContainer, 0, len(raw))
	for _, c := range raw {
		name := ""
		if len(c.Names) > 0 {
			name = strings.TrimPrefix(c.Names[0], "/")
		}

		// Short ID: first 12 hex chars.
		shortID := c.Id
		if len(shortID) > 12 {
			shortID = shortID[:12]
		}

		containers = append(containers, DockerContainer{
			ID:      shortID,
			Name:    name,
			Image:   c.Image,
			State:   c.State,
			Status:  normaliseStatus(c.State),
			Created: c.Created,
		})
	}
	return containers, nil
}

// ─── GetContainerStats ─────────────────────────────────────────────────────────

// dockerAPIStats mirrors the relevant part of the stats JSON returned by Docker.
type dockerAPIStats struct {
	CPUStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
		OnlineCPUs     int    `json:"online_cpus"`
	} `json:"cpu_stats"`

	PreCPUStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
	} `json:"precpu_stats"`

	MemoryStats struct {
		Usage uint64 `json:"usage"`
		Limit uint64 `json:"limit"`
	} `json:"memory_stats"`
}

// GetContainerStats fetches a single stats snapshot (stream=false) for the
// container identified by containerID and returns computed CPU and memory
// percentages using the standard Docker formula.
func GetContainerStats(hostURL, containerID string) (DockerStats, error) {
	client, base, err := newDockerClient(hostURL)
	if err != nil {
		return DockerStats{}, fmt.Errorf("docker: build client: %w", err)
	}

	url := fmt.Sprintf("%s/containers/%s/stats?stream=false", base, containerID)
	resp, err := client.Get(url)
	if err != nil {
		return DockerStats{}, fmt.Errorf("docker: GET stats: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return DockerStats{}, fmt.Errorf("docker: GET stats returned %d", resp.StatusCode)
	}

	var s dockerAPIStats
	if err := json.NewDecoder(resp.Body).Decode(&s); err != nil {
		return DockerStats{}, fmt.Errorf("docker: decode stats: %w", err)
	}

	// ── CPU % ──────────────────────────────────────────────────────────────
	cpuDelta := float64(s.CPUStats.CPUUsage.TotalUsage) - float64(s.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(s.CPUStats.SystemCPUUsage) - float64(s.PreCPUStats.SystemCPUUsage)

	numCPUs := s.CPUStats.OnlineCPUs
	if numCPUs == 0 {
		numCPUs = 1 // safe fallback when the field is absent
	}

	var cpuPercent float64
	if systemDelta > 0 && cpuDelta > 0 {
		cpuPercent = (cpuDelta / systemDelta) * float64(numCPUs) * 100.0
	}

	// ── Memory % ───────────────────────────────────────────────────────────
	var memPercent float64
	if s.MemoryStats.Limit > 0 {
		memPercent = float64(s.MemoryStats.Usage) / float64(s.MemoryStats.Limit) * 100.0
	}

	return DockerStats{
		CPUPercent: cpuPercent,
		MemPercent: memPercent,
		MemUsed:    s.MemoryStats.Usage,
		MemLimit:   s.MemoryStats.Limit,
	}, nil
}

// ─── ContainerAction ──────────────────────────────────────────────────────────

// ContainerAction sends a lifecycle command to a container.
// Accepted actions: "start", "stop", "restart".
// HTTP 304 (Not Modified) is treated as success for start/stop actions
// (Docker returns it when the container is already in the desired state).
func ContainerAction(hostURL, containerID, action string) error {
	switch action {
	case "start", "stop", "restart":
		// valid
	default:
		return fmt.Errorf("docker: unknown action %q (must be start, stop, or restart)", action)
	}

	client, base, err := newDockerClient(hostURL)
	if err != nil {
		return fmt.Errorf("docker: build client: %w", err)
	}

	url := fmt.Sprintf("%s/containers/%s/%s", base, containerID, action)
	resp, err := client.Post(url, "application/json", nil)
	if err != nil {
		return fmt.Errorf("docker: POST /%s: %w", action, err)
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusNoContent, http.StatusOK:
		return nil
	case http.StatusNotModified:
		// Container already in the desired state — not an error.
		return nil
	default:
		return fmt.Errorf("docker: POST /%s returned %d", action, resp.StatusCode)
	}
}
