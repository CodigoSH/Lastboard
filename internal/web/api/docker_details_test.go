package api

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// frame is one piece of Docker's multiplexed log stream.
func frame(stream byte, text string) []byte {
	h := make([]byte, 8)
	h[0] = stream
	binary.BigEndian.PutUint32(h[4:], uint32(len(text)))
	return append(h, text...)
}

const inspectAnswer = `{
  "Id": "36c93d951aa6c7b659921fc91654364b78317ba3c999420e7d72b20fcc475937",
  "Name": "/db",
  "Created": "2026-10-26T17:00:00Z",
  "State": {"Status": "running", "ExitCode": 0, "StartedAt": "2026-10-26T17:00:01Z",
            "FinishedAt": "0001-01-01T00:00:00Z", "Health": {"Status": "healthy"}},
  "RestartCount": 2,
  "Config": {"Image": "postgres:17", "Tty": false,
             "Env": ["POSTGRES_PASSWORD=hunter2", "PGDATA=/var/lib/postgresql/data", "EMPTY="]},
  "HostConfig": {"RestartPolicy": {"Name": "unless-stopped"}},
  "Mounts": [{"Type": "volume", "Name": "pgdata", "Source": "/var/lib/docker/volumes/pgdata/_data",
              "Destination": "/var/lib/postgresql/data", "RW": true},
             {"Type": "bind", "Source": "/etc/localtime", "Destination": "/etc/localtime", "RW": false}],
  "NetworkSettings": {
    "Ports": {"5432/tcp": [{"HostIp": "0.0.0.0", "HostPort": "5432"}, {"HostIp": "::", "HostPort": "5432"}],
              "9187/tcp": null},
    "Networks": {"web": {"IPAddress": "172.18.0.4"}, "bridge": {"IPAddress": ""}}
  }
}`

func TestContainerDetailsKeepWhatThePageShowsAndNoValues(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/containers/db/json" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(inspectAnswer))
	}))
	defer srv.Close()

	d, err := ContainerDetails(srv.URL, "db")
	if err != nil {
		t.Fatal(err)
	}
	if d.ID != "36c93d951aa6" || d.Name != "db" || d.Image != "postgres:17" || d.Status != "running" ||
		d.Health != "healthy" || d.RestartPolicy != "unless-stopped" || d.RestartCount != 2 || d.FinishedAt != "" {
		t.Errorf("details = %+v", d)
	}
	if strings.Join(d.Env, ",") != "POSTGRES_PASSWORD,PGDATA,EMPTY" {
		t.Errorf("env = %v, want the names in order", d.Env)
	}
	if len(d.Ports) != 2 || d.Ports[0].HostIP != "0.0.0.0" || d.Ports[1].HostIP != "::" {
		t.Errorf("ports = %+v, want the two published bindings and not the unpublished one", d.Ports)
	}
	if len(d.Mounts) != 2 || d.Mounts[0].ReadOnly || !d.Mounts[1].ReadOnly || d.Mounts[0].Name != "pgdata" {
		t.Errorf("mounts = %+v", d.Mounts)
	}
	if len(d.Networks) != 2 || d.Networks[0].Name != "bridge" || d.Networks[1].IPv4 != "172.18.0.4" {
		t.Errorf("networks = %+v, want them sorted by name", d.Networks)
	}
	// A socket or a TCP daemon hands over the values; none reaches the answer.
	out, _ := json.Marshal(d)
	if bytes.Contains(out, []byte("hunter2")) || bytes.Contains(out, []byte("=")) {
		t.Errorf("a value reached the answer: %s", out)
	}
}

// An agent from before v1.3.0 answers its own 404 in plain text; Docker answers
// a missing container in JSON. The first is "update the agent", the second is
// "no such container", and neither is "could not connect".
func TestAnOldAgentIsToldApartFromAMissingContainer(t *testing.T) {
	jsonNotFound := func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"message":"No such container: x"}`))
	}
	old := httptest.NewServer(http.HandlerFunc(http.NotFound))
	defer old.Close()
	missing := httptest.NewServer(http.HandlerFunc(jsonNotFound))
	defer missing.Close()

	agent := func(srv *httptest.Server) string {
		return "agent://" + strings.TrimPrefix(srv.URL, "http://") + "?token=t"
	}
	if _, err := ContainerDetails(agent(old), "x"); !errors.Is(err, errAgentTooOld) {
		t.Errorf("an old agent's details = %v, want errAgentTooOld", err)
	}
	if _, err := ContainerLogs(agent(old), "x", 0, time.Time{}); !errors.Is(err, errAgentTooOld) {
		t.Errorf("an old agent's logs = %v, want errAgentTooOld", err)
	}
	if _, err := ContainerDetails(agent(missing), "x"); !errors.Is(err, errNoSuchContainer) {
		t.Errorf("a missing container through an agent = %v, want errNoSuchContainer", err)
	}
	// A daemon's own 404 is never "the agent is old", whatever it is written in.
	if _, err := ContainerDetails(old.URL, "x"); !errors.Is(err, errNoSuchContainer) {
		t.Errorf("a missing container on a TCP daemon = %v, want errNoSuchContainer", err)
	}
}

func TestLogsAreAskedAsABoundedBatch(t *testing.T) {
	var asked []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		asked = append(asked, r.URL.RawQuery)
	}))
	defer srv.Close()

	after := time.Date(2026, 10, 26, 17, 0, 5, 500, time.UTC)
	ContainerLogs(srv.URL, "db", 0, time.Time{})
	ContainerLogs(srv.URL, "db", 50000, time.Time{})
	ContainerLogs(srv.URL, "db", 20, after)
	want := []string{
		"stderr=1&stdout=1&tail=100&timestamps=1",
		"stderr=1&stdout=1&tail=1000&timestamps=1",
		fmt.Sprintf("since=%d&stderr=1&stdout=1&tail=20&timestamps=1", after.Unix()),
	}
	if strings.Join(asked, "\n") != strings.Join(want, "\n") {
		t.Errorf("asked\n%s\nwant\n%s", strings.Join(asked, "\n"), strings.Join(want, "\n"))
	}
}

func TestMultiplexedLogsAreReadLineByLine(t *testing.T) {
	var b bytes.Buffer
	b.Write(frame(1, "2026-10-26T17:00:01.000000001Z ready\n2026-10-26T17:00:02.5Z \x1b[32mlistening\x1b[0m on :5432\n"))
	// A line can arrive in two frames.
	b.Write(frame(2, "2026-10-26T17:00:02.000000003Z warn"))
	b.Write(frame(2, "ing: slow\n"))
	b.Write(frame(1, "2026-10-26T17:00:03Z progress 10%\rprogress 100%\r\n"))
	b.Write(frame(1, "not a docker line\n"))

	logs, err := parseDockerLogs(&b, time.Time{})
	if err != nil {
		t.Fatal(err)
	}
	var got []string
	for _, l := range logs.Lines {
		got = append(got, l.Stream+"|"+l.Time+"|"+l.Text)
	}
	want := []string{
		"out|2026-10-26T17:00:01.000000001Z|ready",
		"err|2026-10-26T17:00:02.000000003Z|warning: slow",
		"out|2026-10-26T17:00:02.500000000Z|listening on :5432",
		"out|2026-10-26T17:00:03.000000000Z|progress 100%",
	}
	if strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Errorf("lines\n%s\nwant\n%s", strings.Join(got, "\n"), strings.Join(want, "\n"))
	}
	if logs.Truncated {
		t.Error("a whole answer was reported as cut")
	}
}

// Asked again from a second, the lines of that second come back too: the ones
// the page already has are dropped by their exact time.
func TestLogsAfterALineLeaveItOut(t *testing.T) {
	var b bytes.Buffer
	b.Write(frame(1, "2026-10-26T17:00:05.100Z seen\n2026-10-26T17:00:05.200Z also seen\n2026-10-26T17:00:05.300Z new\n"))
	after, ok := parseLogAfter("2026-10-26T17:00:05.200000000Z")
	if !ok {
		t.Fatal("the page's own time format did not read back")
	}
	logs, _ := parseDockerLogs(&b, after)
	if len(logs.Lines) != 1 || logs.Lines[0].Text != "new" {
		t.Errorf("lines after the last seen = %+v, want only the new one", logs.Lines)
	}
}

func TestACutAnswerSaysSoAndDropsTheHalfLine(t *testing.T) {
	whole := frame(1, "2026-10-26T17:00:01Z one\n")
	cut := frame(1, "2026-10-26T17:00:02Z two\n")
	logs, _ := parseDockerLogs(bytes.NewReader(append(append([]byte{}, whole...), cut[:len(cut)-6]...)), time.Time{})
	if len(logs.Lines) != 1 || logs.Lines[0].Text != "one" || !logs.Truncated {
		t.Errorf("a cut frame = %+v truncated=%v, want one line and truncated", logs.Lines, logs.Truncated)
	}
	logs, _ = parseDockerLogs(bytes.NewReader(append(append([]byte{}, whole...), cut[:5]...)), time.Time{})
	if len(logs.Lines) != 1 || !logs.Truncated {
		t.Errorf("a cut header = %+v truncated=%v, want one line and truncated", logs.Lines, logs.Truncated)
	}
}

// A container with a terminal writes its log raw, without frames.
func TestRawLogsFromATerminal(t *testing.T) {
	raw := "2026-10-26T17:00:01Z \x1b]0;title\x07hello\n2026-10-26T17:00:02Z bye\n2026-10-26T17:00:03Z cut sh"
	logs, err := parseDockerLogs(strings.NewReader(raw), time.Time{})
	if err != nil {
		t.Fatal(err)
	}
	if len(logs.Lines) != 2 || logs.Lines[0].Text != "hello" || logs.Lines[0].Stream != "" || !logs.Truncated {
		t.Errorf("raw = %+v truncated=%v", logs.Lines, logs.Truncated)
	}
}

func TestALongLineIsCutAndSaid(t *testing.T) {
	long := strings.Repeat("ぜ", maxLogLine) // three bytes each
	logs, _ := parseDockerLogs(bytes.NewReader(frame(1, "2026-10-26T17:00:01Z "+long+"\n")), time.Time{})
	if len(logs.Lines) != 1 {
		t.Fatalf("lines = %d, want 1", len(logs.Lines))
	}
	text := logs.Lines[0].Text
	if len(text) > maxLogLine+len("…") || !strings.HasSuffix(text, "…") || !logs.Truncated {
		t.Errorf("a long line came back with %d bytes, truncated=%v", len(text), logs.Truncated)
	}
	if strings.ContainsRune(text, '�') {
		t.Error("the cut split a character")
	}
}

func TestAnEmptyLogIsAnEmptyList(t *testing.T) {
	logs, err := parseDockerLogs(strings.NewReader(""), time.Time{})
	if err != nil || logs.Lines == nil || len(logs.Lines) != 0 {
		t.Errorf("empty = %+v %v, want [] and no error", logs.Lines, err)
	}
}
