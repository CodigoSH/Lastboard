package api

import (
	"bufio"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode"
)

// ─── A container's details and its log ─────────────────────────────────────────
//
// What the Docker page shows of one container. Both are read-only and both go
// through the same hosts as the widget, so a member only ever reads containers
// on the hosts the account lets it use.
//
// The environment travels as names only. An agent from v1.3.0 already strips
// the values before they leave the host; a socket or a TCP daemon does not, so
// they are stripped here too, and nothing below ever holds a value past that.

// errAgentTooOld is an agent that does not know the call: one from before
// v1.3.0. The fix is to update the agent, so it is named apart from "could not
// connect".
var errAgentTooOld = errors.New("docker.agent_too_old")

// errNoSuchContainer is a daemon that answered and has no such container.
var errNoSuchContainer = errors.New("docker.not_found")

// containerRef is what a container ID or name has to look like, the same rule
// the agent applies: letters and digits first, then also _ . -, up to 128.
var containerRef = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$`)

// DockerDetailPort is one published port: the container's side and where the
// host publishes it.
type DockerDetailPort struct {
	Container string `json:"container"` // "80/tcp"
	HostIP    string `json:"host_ip"`
	HostPort  string `json:"host_port"`
}

// DockerMount is one volume or bind mount.
type DockerMount struct {
	Type        string `json:"type"`
	Name        string `json:"name,omitempty"`
	Source      string `json:"source"`
	Destination string `json:"destination"`
	ReadOnly    bool   `json:"read_only"`
}

// DockerNetwork is one network the container is attached to.
type DockerNetwork struct {
	Name string `json:"name"`
	IPv4 string `json:"ipv4,omitempty"`
}

// DockerDetails is the part of `docker inspect` the page shows. It is a list of
// what is wanted, not a filter of what is not: whatever Docker adds next does
// not reach the browser by accident.
type DockerDetails struct {
	ID            string             `json:"id"`
	Name          string             `json:"name"`
	Image         string             `json:"image"`
	Created       string             `json:"created"`
	Status        string             `json:"status"`
	State         string             `json:"state"`
	StartedAt     string             `json:"started_at,omitempty"`
	FinishedAt    string             `json:"finished_at,omitempty"`
	ExitCode      int                `json:"exit_code"`
	Health        string             `json:"health,omitempty"`
	RestartPolicy string             `json:"restart_policy"`
	RestartCount  int                `json:"restart_count"`
	Ports         []DockerDetailPort `json:"ports"`
	Mounts        []DockerMount      `json:"mounts"`
	Networks      []DockerNetwork    `json:"networks"`
	Env           []string           `json:"env"`
	Tty           bool               `json:"tty"`
}

// dockerAPIInspect mirrors the part of GET /containers/{id}/json that is read.
type dockerAPIInspect struct {
	ID      string `json:"Id"`
	Name    string `json:"Name"`
	Created string `json:"Created"`
	State   struct {
		Status     string `json:"Status"`
		ExitCode   int    `json:"ExitCode"`
		StartedAt  string `json:"StartedAt"`
		FinishedAt string `json:"FinishedAt"`
		Health     *struct {
			Status string `json:"Status"`
		} `json:"Health"`
	} `json:"State"`
	RestartCount int `json:"RestartCount"`
	Config       struct {
		Image string   `json:"Image"`
		Env   []string `json:"Env"`
		Tty   bool     `json:"Tty"`
	} `json:"Config"`
	HostConfig struct {
		RestartPolicy struct {
			Name string `json:"Name"`
		} `json:"RestartPolicy"`
	} `json:"HostConfig"`
	Mounts []struct {
		Type        string `json:"Type"`
		Name        string `json:"Name"`
		Source      string `json:"Source"`
		Destination string `json:"Destination"`
		RW          bool   `json:"RW"`
	} `json:"Mounts"`
	NetworkSettings struct {
		Ports map[string][]struct {
			HostIP   string `json:"HostIp"`
			HostPort string `json:"HostPort"`
		} `json:"Ports"`
		Networks map[string]struct {
			IPAddress string `json:"IPAddress"`
		} `json:"Networks"`
	} `json:"NetworkSettings"`
}

// envNames keeps the name of each NAME=value, and nothing of the value.
func envNames(env []string) []string {
	names := make([]string, 0, len(env))
	for _, e := range env {
		name, _, _ := strings.Cut(e, "=")
		if name != "" {
			names = append(names, name)
		}
	}
	return names
}

// dockerTime is a time Docker reports, or "" for its "never": a container
// that never stopped has FinishedAt in the year one.
func dockerTime(s string) string {
	if strings.HasPrefix(s, "0001-01-01") {
		return ""
	}
	return s
}

// answerFromAgentRouter says whether a 404 came from the agent's own router —
// a call it does not have — rather than from Docker, whose 404 is JSON.
func answerFromAgentRouter(hostURL string, resp *http.Response) bool {
	if !strings.HasPrefix(hostURL, "agent://") || resp.StatusCode != http.StatusNotFound {
		return false
	}
	media, _, _ := mime.ParseMediaType(resp.Header.Get("Content-Type"))
	return media != "application/json"
}

// readError maps a status other than 200 to the error the page shows.
func readError(hostURL, what string, resp *http.Response) error {
	switch {
	case resp.StatusCode == http.StatusUnauthorized:
		return errDockerUnauthorized
	case answerFromAgentRouter(hostURL, resp):
		return errAgentTooOld
	case resp.StatusCode == http.StatusNotFound:
		return errNoSuchContainer
	default:
		return fmt.Errorf("docker: GET %s returned %d", what, resp.StatusCode)
	}
}

// ContainerDetails reads one container's details from the host at hostURL.
func ContainerDetails(hostURL, ref string) (DockerDetails, error) {
	client, base, err := newDockerClient(hostURL)
	if err != nil {
		return DockerDetails{}, fmt.Errorf("docker: build client: %w", err)
	}
	resp, err := client.Get(fmt.Sprintf("%s/containers/%s/json", base, url.PathEscape(ref)))
	if err != nil {
		return DockerDetails{}, fmt.Errorf("docker: GET details: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return DockerDetails{}, readError(hostURL, "details", resp)
	}

	var raw dockerAPIInspect
	if err := decodeLimited(resp.Body, dockerMaxAnswer, &raw); err != nil {
		return DockerDetails{}, fmt.Errorf("docker: decode details: %w", err)
	}

	d := DockerDetails{
		ID:            raw.ID,
		Name:          strings.TrimPrefix(raw.Name, "/"),
		Image:         raw.Config.Image,
		Created:       raw.Created,
		State:         raw.State.Status,
		Status:        normaliseStatus(raw.State.Status),
		StartedAt:     dockerTime(raw.State.StartedAt),
		FinishedAt:    dockerTime(raw.State.FinishedAt),
		ExitCode:      raw.State.ExitCode,
		RestartPolicy: raw.HostConfig.RestartPolicy.Name,
		RestartCount:  raw.RestartCount,
		Env:           envNames(raw.Config.Env),
		Tty:           raw.Config.Tty,
		Ports:         []DockerDetailPort{},
		Mounts:        []DockerMount{},
		Networks:      []DockerNetwork{},
	}
	if len(d.ID) > 12 {
		d.ID = d.ID[:12]
	}
	if raw.State.Health != nil {
		d.Health = raw.State.Health.Status
	}
	for container, bindings := range raw.NetworkSettings.Ports {
		// An exposed port nobody published still appears, with no binding.
		for _, b := range bindings {
			d.Ports = append(d.Ports, DockerDetailPort{Container: container, HostIP: b.HostIP, HostPort: b.HostPort})
		}
	}
	sort.Slice(d.Ports, func(i, j int) bool {
		if d.Ports[i].Container != d.Ports[j].Container {
			return d.Ports[i].Container < d.Ports[j].Container
		}
		return d.Ports[i].HostIP < d.Ports[j].HostIP
	})
	for _, m := range raw.Mounts {
		d.Mounts = append(d.Mounts, DockerMount{Type: m.Type, Name: m.Name, Source: m.Source, Destination: m.Destination, ReadOnly: !m.RW})
	}
	for name, n := range raw.NetworkSettings.Networks {
		d.Networks = append(d.Networks, DockerNetwork{Name: name, IPv4: n.IPAddress})
	}
	sort.Slice(d.Networks, func(i, j int) bool { return d.Networks[i].Name < d.Networks[j].Name })
	return d, nil
}

// ─── Logs ──────────────────────────────────────────────────────────────────────

const (
	// defaultLogTail and maxLogTail are the agent's own numbers, so a socket or
	// a TCP daemon is asked the same as an agent would let through.
	defaultLogTail = 100
	maxLogTail     = 1000
	// maxLogAnswer is how much of a log answer is read: the agent's own cut.
	maxLogAnswer = 4 << 20
	// maxLogLine is how much of one line reaches the browser, in bytes.
	maxLogLine = 8 << 10
)

// DockerLogLine is one line of a container's log.
type DockerLogLine struct {
	Time   string `json:"t"`      // RFC 3339, in UTC
	Stream string `json:"stream"` // "out", "err", or "" when the container has a terminal
	Text   string `json:"text"`
}

// DockerLogs is a batch of lines, oldest first.
type DockerLogs struct {
	Lines []DockerLogLine `json:"lines"`
	// Truncated says the batch was cut: the answer was larger than is read, or
	// a line was longer than is shown.
	Truncated bool `json:"truncated"`
}

// ContainerLogs reads the last lines of one container's log. After, when set,
// is the time of the last line the page already has: only later lines come back.
func ContainerLogs(hostURL, ref string, tail int, after time.Time) (DockerLogs, error) {
	if tail <= 0 {
		tail = defaultLogTail
	}
	tail = min(tail, maxLogTail)

	client, base, err := newDockerClient(hostURL)
	if err != nil {
		return DockerLogs{}, fmt.Errorf("docker: build client: %w", err)
	}
	q := url.Values{}
	q.Set("stdout", "1")
	q.Set("stderr", "1")
	q.Set("timestamps", "1")
	q.Set("tail", strconv.Itoa(tail))
	if !after.IsZero() {
		// Asked in whole seconds: the lines of that same second come again and
		// are dropped below by their exact time.
		q.Set("since", strconv.FormatInt(after.Unix(), 10))
	}
	resp, err := client.Get(fmt.Sprintf("%s/containers/%s/logs?%s", base, url.PathEscape(ref), q.Encode()))
	if err != nil {
		return DockerLogs{}, fmt.Errorf("docker: GET logs: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return DockerLogs{}, readError(hostURL, "logs", resp)
	}
	return parseDockerLogs(io.LimitReader(resp.Body, maxLogAnswer), after)
}

// parseDockerLogs reads Docker's log answer, which comes in one of two forms:
//
//   - multiplexed, for a container without a terminal: frames of an 8-byte
//     header (stream 1 or 2, three zeros, a big-endian length) and the text;
//   - raw, for a container with one: the text alone.
//
// The form is told by the first byte rather than asked of the container: every
// line is asked with its timestamp, so raw text starts with a digit of the year
// and a frame starts with 0, 1 or 2. A stream that ends inside a frame was cut
// off, and its unfinished line is dropped and reported.
func parseDockerLogs(r io.Reader, after time.Time) (DockerLogs, error) {
	out := DockerLogs{Lines: []DockerLogLine{}}
	br := bufio.NewReader(r)
	first, err := br.Peek(1)
	if errors.Is(err, io.EOF) {
		return out, nil
	}
	if err != nil {
		return out, fmt.Errorf("docker: read logs: %w", err)
	}

	add := func(stream, line string) {
		l, at, ok := logLine(stream, line, &out.Truncated)
		if ok && (after.IsZero() || at.After(after)) {
			out.Lines = append(out.Lines, l)
		}
	}

	if first[0] > 2 {
		raw, err := io.ReadAll(br)
		if err != nil {
			return out, fmt.Errorf("docker: read logs: %w", err)
		}
		text := string(raw)
		complete := strings.HasSuffix(text, "\n")
		lines := strings.Split(strings.TrimSuffix(text, "\n"), "\n")
		if !complete {
			// The answer stopped inside a line; there is no telling where it ended.
			lines = lines[:len(lines)-1]
			out.Truncated = true
		}
		for _, line := range lines {
			add("", line)
		}
		return out, nil
	}

	// A frame may carry part of a line or several: what is left of each
	// stream waits for its next frame.
	pending := map[string]*strings.Builder{"out": {}, "err": {}}
	header := make([]byte, 8)
	for {
		if _, err := io.ReadFull(br, header); err != nil {
			if errors.Is(err, io.ErrUnexpectedEOF) {
				out.Truncated = true
			} else if !errors.Is(err, io.EOF) {
				return out, fmt.Errorf("docker: read logs: %w", err)
			}
			break
		}
		stream := "out"
		if header[0] == 2 {
			stream = "err"
		}
		size := binary.BigEndian.Uint32(header[4:])
		payload := make([]byte, min(int64(size), maxLogAnswer))
		n, err := io.ReadFull(br, payload)
		buf := pending[stream]
		if err != nil {
			// Cut inside the frame: what it held is not trusted to be whole.
			out.Truncated = true
			buf.Reset()
			break
		}
		buf.Write(payload[:n])
		text := buf.String()
		buf.Reset()
		for {
			i := strings.IndexByte(text, '\n')
			if i < 0 {
				buf.WriteString(text)
				break
			}
			add(stream, text[:i])
			text = text[i+1:]
		}
	}
	// A last line Docker wrote without its newline is still a line.
	for _, stream := range []string{"out", "err"} {
		if rest := pending[stream].String(); rest != "" {
			add(stream, rest)
		}
	}
	// stdout and stderr arrive in their own frames; the page reads one story.
	sort.SliceStable(out.Lines, func(i, j int) bool { return out.Lines[i].Time < out.Lines[j].Time })
	return out, nil
}

// logLine splits "TIMESTAMP text" and cleans the text for a page. A line
// without a readable timestamp is not a line Docker wrote with one.
func logLine(stream, line string, truncated *bool) (DockerLogLine, time.Time, bool) {
	stamp, text, _ := strings.Cut(line, " ")
	at, err := time.Parse(time.RFC3339Nano, stamp)
	if err != nil {
		return DockerLogLine{}, time.Time{}, false
	}
	text = cleanLogText(text)
	if len(text) > maxLogLine {
		text = strings.ToValidUTF8(text[:maxLogLine], "") + "…"
		*truncated = true
	}
	// A fixed nine digits, so the times sort as text and read back exactly.
	return DockerLogLine{Time: at.UTC().Format("2006-01-02T15:04:05.000000000Z07:00"), Stream: stream, Text: text}, at, true
}

// ansiSequence is a terminal escape: colours and cursor movement (CSI), titles
// and links (OSC), and the two-character ones. A page shows them as noise.
var ansiSequence = regexp.MustCompile(`\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]`)

// cleanLogText drops terminal escapes and control characters, keeps tabs, and
// keeps what a carriage return redraws last, as a terminal would show it.
func cleanLogText(s string) string {
	s = strings.ToValidUTF8(s, "�")
	s = ansiSequence.ReplaceAllString(s, "")
	s = strings.TrimRight(s, "\r")
	if i := strings.LastIndexByte(s, '\r'); i >= 0 {
		s = s[i+1:]
	}
	return strings.Map(func(r rune) rune {
		if r != '\t' && unicode.IsControl(r) {
			return -1
		}
		return r
	}, s)
}

// parseLogAfter reads the time the page sends back: the "t" of its last line.
func parseLogAfter(s string) (time.Time, bool) {
	if s == "" {
		return time.Time{}, true
	}
	if len(s) > 40 {
		return time.Time{}, false
	}
	t, err := time.Parse(time.RFC3339Nano, s)
	return t, err == nil
}
