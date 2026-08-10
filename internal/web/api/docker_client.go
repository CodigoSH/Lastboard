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
	"sync"
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

// DockerPort holds a single port mapping exposed by a container.
type DockerPort struct {
	PublicPort  uint16 `json:"PublicPort"`
	PrivatePort uint16 `json:"PrivatePort"`
	Type        string `json:"Type"`
}

// DockerContainer holds the normalised representation of a Docker container.
type DockerContainer struct {
	ID      string // Short 12-char container ID
	Name    string // Name without leading "/"
	Image   string
	Status  string // "running" | "stopped" | "paused" | "exited" | "restarting"
	State   string // Raw state string returned by Docker
	Created int64
	Ports   []DockerPort // Host-exposed port mappings
	// UrlHint is the address the container labels itself with, when it does.
	// Only the two keys we understand are carried: a container can hold dozens
	// of labels (reverse-proxy rules, build metadata) and none of the rest is
	// the browser's business.
	UrlHint string
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
// The schemes Docker itself uses in DOCKER_HOST are understood, so an address
// copied from a Docker guide or from `docker context ls` works as written:
//
//   - "" or "local"          → Unix socket at dockerSocketPath
//   - "unix:///path/to.sock" → that Unix socket
//   - "tcp://host:port"      → plain TCP, the form DOCKER_HOST uses
//   - "http://host:port"     → the same thing, spelt the other way
//   - "https://host:port"    → TCP with TLS (InsecureSkipVerify: true)
//   - "agent://host?token"   → plain HTTP with an Authorization: Bearer header
//   - "host:port"            → plain TCP, for an address typed without a scheme
//
// "npipe://" and "ssh://" are refused by name rather than mangled: both are
// valid DOCKER_HOST values that this cannot reach, and saying so beats a
// four-second timeout and "could not connect".
func newDockerClient(hostURL string) (*http.Client, string, error) {
	const timeout = 10 * time.Second

	// A Unix socket, wherever it lives.
	unixClient := func(socket string) *http.Client {
		transport := &http.Transport{
			MaxIdleConnsPerHost: statsParallelism,
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return (&net.Dialer{Timeout: timeout}).DialContext(ctx, "unix", socket)
			},
		}
		return &http.Client{Transport: transport, Timeout: timeout}
	}

	switch {
	case hostURL == "" || strings.EqualFold(hostURL, "local"):
		// Docker requires a dummy HTTP host; the real routing happens via the socket.
		return unixClient(dockerSocketPath), "http://localhost", nil

	case strings.HasPrefix(hostURL, "unix://"):
		socket := strings.TrimPrefix(hostURL, "unix://")
		if socket == "" {
			return nil, "", fmt.Errorf("docker.invalid_host")
		}
		return unixClient(socket), "http://localhost", nil

	case strings.HasPrefix(hostURL, "npipe://"), strings.HasPrefix(hostURL, "ssh://"):
		// Both are legitimate DOCKER_HOST values, and neither is reachable from
		// here: a Windows named pipe is not on this machine, and an SSH tunnel
		// would have to be set up outside Lastboard.
		return nil, "", fmt.Errorf("docker.unsupported_scheme")

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
			transport: pooledTransport(nil),
		}
		client := &http.Client{Transport: transport, Timeout: timeout}
		return client, "http://" + host, nil

	case strings.HasPrefix(hostURL, "https://"):
		transport := pooledTransport(&tls.Config{InsecureSkipVerify: true}) //nolint:gosec
		client := &http.Client{Transport: transport, Timeout: timeout}
		return client, strings.TrimRight(hostURL, "/"), nil

	default:
		// Plain TCP. `tcp://` is what DOCKER_HOST uses and what every Docker
		// guide writes, so it is translated rather than left to fall through —
		// prepending http:// to it produced `http://tcp://host:2375`, which
		// fails four seconds later with nothing to explain why.
		base := strings.TrimPrefix(hostURL, "tcp://")
		if !strings.HasPrefix(base, "http://") {
			base = "http://" + base
		}
		client := &http.Client{Transport: pooledTransport(nil), Timeout: timeout}
		return client, strings.TrimRight(base, "/"), nil
	}
}

// pooledTransport builds a transport that will keep as many idle connections
// to the daemon as we ask questions in parallel.
//
// The stock default keeps two. A batch of stats reads is the only place we
// talk to one host many times at once, and with the default the other six
// would dial and hang up on every pass — the pool exists precisely so they
// don't.
func pooledTransport(tlsCfg *tls.Config) *http.Transport {
	return &http.Transport{
		Proxy:               http.ProxyFromEnvironment,
		TLSClientConfig:     tlsCfg,
		MaxIdleConns:        statsParallelism * 2,
		MaxIdleConnsPerHost: statsParallelism,
		IdleConnTimeout:     90 * time.Second,
	}
}

// ─── ListContainers ────────────────────────────────────────────────────────────

// dockerAPIPort mirrors one entry in the "Ports" array returned by the Docker API.
type dockerAPIPort struct {
	IP          string `json:"IP"`
	PublicPort  uint16 `json:"PublicPort"`
	PrivatePort uint16 `json:"PrivatePort"`
	Type        string `json:"Type"`
}

// dockerAPIContainer is the raw shape returned by GET /containers/json.
type dockerAPIContainer struct {
	Id      string            `json:"Id"`
	Names   []string          `json:"Names"`
	Image   string            `json:"Image"`
	State   string            `json:"State"`
	Status  string            `json:"Status"`
	Created int64             `json:"Created"`
	Ports   []dockerAPIPort   `json:"Ports"`
	Labels  map[string]string `json:"Labels"`
}

// urlLabelKeys are read in order: the first one present wins. `lastboard.url`
// comes first so an instance can override a label a container already carries
// for someone else's dashboard.
var urlLabelKeys = []string{"lastboard.url", "homepage.href"}

// urlFromLabels returns the address a container advertises, if any.
//
// Only http(s) is accepted: this value ends up in an href, and a container is
// free to label itself with anything.
func urlFromLabels(labels map[string]string) string {
	for _, key := range urlLabelKeys {
		v := strings.TrimSpace(labels[key])
		if v == "" {
			continue
		}
		if strings.HasPrefix(v, "http://") || strings.HasPrefix(v, "https://") {
			return v
		}
	}
	return ""
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

		// Build port list — only include host-exposed ports (PublicPort > 0).
		var ports []DockerPort
		for _, p := range c.Ports {
			if p.PublicPort > 0 {
				ports = append(ports, DockerPort{
					PublicPort:  p.PublicPort,
					PrivatePort: p.PrivatePort,
					Type:        p.Type,
				})
			}
		}
		if ports == nil {
			ports = []DockerPort{}
		}

		containers = append(containers, DockerContainer{
			ID:      shortID,
			Name:    name,
			Image:   c.Image,
			State:   c.State,
			Status:  normaliseStatus(c.State),
			Created: c.Created,
			Ports:   ports,
			UrlHint: urlFromLabels(c.Labels),
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

// statsParallelism caps how many containers we ask the daemon about at once.
//
// Each answer costs it a real sampling window — it has to read the CPU
// counters twice to produce a delta — so the wait is the daemon's, not the
// network's, and asking serially multiplies it by the number of containers.
// Eight at a time keeps a busy dashboard quick without turning a host with
// forty containers into forty simultaneous readings.
const statsParallelism = 8

// GetContainersStats reads several containers from one host in one go.
//
// It builds the client once and reuses it, which is the point: the widget used
// to ask for one container per HTTP request, so every reading paid for its own
// connection to the daemon and its own round trip from the browser. Containers
// that fail are left out of the map rather than failing the batch — one
// container the daemon won't report on shouldn't cost you the other thirty.
func GetContainersStats(hostURL string, ids []string) (map[string]DockerStats, error) {
	client, base, err := newDockerClient(hostURL)
	if err != nil {
		return nil, fmt.Errorf("docker: build client: %w", err)
	}

	var (
		mu   sync.Mutex
		wg   sync.WaitGroup
		out  = make(map[string]DockerStats, len(ids))
		gate = make(chan struct{}, statsParallelism)
	)

	for _, id := range ids {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			gate <- struct{}{}
			defer func() { <-gate }()

			s, err := containerStats(client, base, id)
			if err != nil {
				return
			}
			mu.Lock()
			out[id] = s
			mu.Unlock()
		}(id)
	}
	wg.Wait()

	return out, nil
}

// containerStats performs one stats read (stream=false) with an already-built
// client and returns computed CPU and memory percentages using the standard
// Docker formula.
func containerStats(client *http.Client, base, containerID string) (DockerStats, error) {
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
