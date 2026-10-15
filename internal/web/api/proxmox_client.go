// Talking to a Proxmox VE host.
//
// Verified against Proxmox VE 9.2.20 before any of this was written, because
// the whole design of the page rests on two things being true, and they are:
//
//  1. `/cluster/resources` answers with the nodes, the guests and the storages
//     in ONE request. The page polls once, not once per machine.
//  2. `/nodes/.../rrddata` hands over the history Proxmox already keeps, so
//     Lastboard stores no series of its own — no tables, no retention, no
//     migrations.
//
// The measurements that settled it are in the roadmap; the traps they revealed
// are handled here and pointed at from the code that could get them wrong.
package api

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
	"io"
	"math"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	// A hypervisor on the same network answers in milliseconds. This is here so
	// a host that has gone away cannot hold a request open.
	proxmoxTimeout = 10 * time.Second

	// Ceiling on a single API response. `/cluster/resources` on a busy host is
	// tens of kilobytes and a year of rrddata is a few hundred; eight megabytes
	// is far past anything legitimate and stops a hostile or broken endpoint
	// from being read into memory without limit.
	proxmoxMaxBody = 8 << 20

	// Every series is resampled to this many points before it leaves the
	// server. See downsample: `timeframe=day` answers with 1440.
	proxmoxSeriesPoints = 60
)

// proxmoxConfig is one host's connection, as its owner saved it. The secret
// never leaves the server: it is read from the owner's settings here and stripped
// from every response, the same way the notification token is.
type proxmoxConfig struct {
	URL      string // https://host:8006
	TokenID  string // user@realm!tokenid
	Secret   string // the uuid half
	Insecure bool   // accept the self-signed certificate Proxmox ships with
}

func (c proxmoxConfig) configured() bool {
	return c.URL != "" && c.TokenID != "" && c.Secret != ""
}

// newProxmoxClient returns the HTTP client for a configuration.
//
// InsecureSkipVerify is offered deliberately. Proxmox ships with a self-signed
// certificate and the overwhelming majority of installations never replace it;
// refusing to talk to it would mean refusing to talk to Proxmox. It is the
// administrator's own hypervisor on the administrator's own network, and the
// choice is theirs to make explicitly — not a default we take for them.
func newProxmoxClient(cfg proxmoxConfig) *http.Client {
	if cfg.Insecure {
		return proxmoxClientLax
	}
	return proxmoxClientStrict
}

// Two clients for the whole process, one per answer to "check the certificate?".
// A transport pools its connections per server, so every host shares them without
// ever sharing a connection. Each call used to build a transport of its own and
// drop it: every call paid a full TCP and TLS handshake and left a connection
// waiting for a transport nobody would use again.
var (
	proxmoxClientStrict = &http.Client{Timeout: proxmoxTimeout, Transport: proxmoxTransport(false)}
	proxmoxClientLax    = &http.Client{Timeout: proxmoxTimeout, Transport: proxmoxTransport(true)}
)

func proxmoxTransport(skipVerify bool) *http.Transport {
	tr := &http.Transport{
		MaxIdleConns:        32,
		MaxIdleConnsPerHost: 4,
		IdleConnTimeout:     30 * time.Second,
		DialContext:         util.NewDialer(5*time.Second, 30*time.Second).DialContext,
	}
	if skipVerify {
		tr.TLSClientConfig = &tls.Config{InsecureSkipVerify: true} // #nosec G402 — see above
	}
	return tr
}

// proxmoxDo performs one API call and decodes the `data` envelope every
// Proxmox endpoint wraps its answer in.
//
// The status code is read before the body is parsed. A 401 and a 403 mean very
// different things to whoever configured this — the token is wrong, versus the
// token is right and lacks a privilege — and collapsing both into "could not
// parse JSON" is how a probe stops being able to explain itself.
func proxmoxDo(cfg proxmoxConfig, method, path string, out any) error {
	base := strings.TrimRight(cfg.URL, "/")
	req, err := http.NewRequest(method, base+"/api2/json"+path, nil)
	if err != nil {
		return fmt.Errorf("proxmox.invalid_url")
	}
	req.Header.Set("Authorization", "PVEAPIToken="+cfg.TokenID+"="+cfg.Secret)
	req.Header.Set("Accept", "application/json")

	res, err := newProxmoxClient(cfg).Do(req)
	if err != nil {
		return fmt.Errorf("proxmox.connection_error")
	}
	defer res.Body.Close()

	switch {
	case res.StatusCode == http.StatusUnauthorized:
		return fmt.Errorf("proxmox.bad_token")
	case res.StatusCode == http.StatusForbidden:
		return fmt.Errorf("proxmox.forbidden")
	case res.StatusCode >= 400:
		return fmt.Errorf("proxmox.connection_error")
	}

	body, err := io.ReadAll(io.LimitReader(res.Body, proxmoxMaxBody))
	if err != nil {
		return fmt.Errorf("proxmox.connection_error")
	}
	var envelope struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return fmt.Errorf("proxmox.bad_response")
	}
	if out == nil {
		return nil
	}
	if err := json.Unmarshal(envelope.Data, out); err != nil {
		return fmt.Errorf("proxmox.bad_response")
	}
	return nil
}

/* ---------------------------------------------------------------------------
 * What /cluster/resources answers with
 * ------------------------------------------------------------------------ */

// pxResource is one row of /cluster/resources. The same shape covers a node, a
// guest and a storage, which is why the endpoint can answer in one request.
//
// `CPU` is a FRACTION between 0 and 1, not a percentage — 0.0212 is 2.1%. It
// caught me reading it as a percentage and it will catch the next reader too,
// so nothing outside this file ever sees the raw value: normalise() converts it
// once and the rest of the code works in percent.
type pxResource struct {
	Type    string  `json:"type"` // node | qemu | lxc | storage | sdn | network
	ID      string  `json:"id"`
	Node    string  `json:"node"`
	Name    string  `json:"name"`
	Status  string  `json:"status"`
	VMID    int     `json:"vmid"`
	CPU     float64 `json:"cpu"`
	MaxCPU  int     `json:"maxcpu"`
	Mem     int64   `json:"mem"`
	MaxMem  int64   `json:"maxmem"`
	Disk    int64   `json:"disk"`
	MaxDisk int64   `json:"maxdisk"`
	Uptime  int64   `json:"uptime"`
	// Guests only.
	Template int `json:"template"`
	// Storages only.
	Storage    string `json:"storage"`
	PluginType string `json:"plugintype"`
	Shared     int    `json:"shared"`
}

// pxNodeStatus is /nodes/{node}/status, for the four figures a node card shows
// that /cluster/resources does not carry.
//
// Note `CPUInfo.Cores` and the resource list's `MaxCPU` are NOT the same
// number: on the machine this was verified against, cores was 12 and maxcpu 16
// — physical cores versus threads. Both are exposed, and whoever draws them has
// to say which one the label means.
type pxNodeStatus struct {
	Uptime  int64     `json:"uptime"`
	LoadAvg []string  `json:"loadavg"`
	CPUInfo pxCPUInfo `json:"cpuinfo"`
	Memory  pxUsage   `json:"memory"`
	RootFS  pxUsage   `json:"rootfs"`
}

type pxCPUInfo struct {
	Cores   int    `json:"cores"`
	Sockets int    `json:"sockets"`
	CPUs    int    `json:"cpus"`
	Model   string `json:"model"`
}

type pxUsage struct {
	Used  int64 `json:"used"`
	Total int64 `json:"total"`
}

/* ---------------------------------------------------------------------------
 * The series
 * ------------------------------------------------------------------------ */

// pxPoint is one sample of rrddata. Fields a node reports and fields a guest
// reports differ, so everything is optional and the caller picks what it drew.
type pxPoint struct {
	Time     int64   `json:"time"`
	CPU      float64 `json:"cpu"`
	MemUsed  float64 `json:"memused"` // node
	MemTotal float64 `json:"memtotal"`
	Mem      float64 `json:"mem"` // guest
	MaxMem   float64 `json:"maxmem"`
	NetIn    float64 `json:"netin"`
	NetOut   float64 `json:"netout"`
}

// proxmoxTimeframe maps the ranges the interface offers onto the ones the API
// understands. Measured point counts: hour 60, day 1440, week 336.
func proxmoxTimeframe(rng string) (string, bool) {
	switch rng {
	case "1h":
		return "hour", true
	case "24h":
		return "day", true
	case "7d":
		return "week", true
	}
	return "", false
}

// downsample reduces a series to at most `want` points by averaging buckets.
//
// This is not a nicety. `timeframe=day` answers with 1440 points — one a minute
// for a day — and a sparkline is a few hundred pixels wide. Sending all of them
// is bandwidth spent to draw 1400 segments narrower than a pixel, on every
// poll, for every machine on the page.
//
// Averaging rather than picking every nth sample: a spike that lands between
// two chosen samples disappears entirely from a decimated series, and a spike
// is the one thing somebody is looking for.
func downsample(in []float64, want int) []float64 {
	if want < 1 || len(in) <= want {
		return in
	}
	out := make([]float64, 0, want)
	for i := 0; i < want; i++ {
		lo := i * len(in) / want
		hi := (i + 1) * len(in) / want
		if hi <= lo {
			hi = lo + 1
		}
		sum, n := 0.0, 0
		for _, v := range in[lo:hi] {
			if !math.IsNaN(v) {
				sum += v
				n++
			}
		}
		if n == 0 {
			out = append(out, 0)
			continue
		}
		out = append(out, sum/float64(n))
	}
	return out
}

// percent turns the fraction Proxmox reports into the number a person reads,
// rounded to one decimal so a container idling at 0.05% does not read as 0.
func percent(fraction float64) float64 {
	if fraction <= 0 || math.IsNaN(fraction) {
		return 0
	}
	return math.Round(fraction*1000) / 10
}

// ratio is the same idea for a used/total pair, guarding the division.
func ratio(used, total int64) float64 {
	if total <= 0 {
		return 0
	}
	return math.Round(float64(used)/float64(total)*1000) / 10
}

/* ---------------------------------------------------------------------------
 * Privileges
 * ------------------------------------------------------------------------ */

// proxmoxCaps is what this token is allowed to do, asked of the host rather
// than assumed.
//
// It exists because of a measurement: a token with the `PVEAuditor` role reads
// everything this page shows and CANNOT start or stop a machine. Documenting
// "use PVEAuditor" and then drawing the buttons anyway would hand somebody a
// control that answers 403 with no explanation. So the buttons are drawn only
// when the host says the token carries VM.PowerMgmt.
type proxmoxCaps struct {
	Read      bool `json:"read"`
	PowerMgmt bool `json:"power"`
}

// fetchCaps reads /access/permissions and looks at what the token holds on the
// root path, which is where a sane setup grants it.
func fetchCaps(cfg proxmoxConfig) (proxmoxCaps, error) {
	var perms map[string]map[string]int
	if err := proxmoxDo(cfg, http.MethodGet, "/access/permissions", &perms); err != nil {
		return proxmoxCaps{}, err
	}
	return capsFrom(perms), nil
}

// capsFrom is the decision, separated so it can be tested without a host.
//
// Permissions granted at "/" propagate down, so a grant found on any path is
// enough to answer "can this token do it somewhere"; for a dashboard that reads
// the whole cluster, the root is what matters and is what the documented recipe
// grants.
func capsFrom(perms map[string]map[string]int) proxmoxCaps {
	root := perms["/"]
	has := func(p string) bool { return root[p] == 1 }
	return proxmoxCaps{
		Read:      has("VM.Audit") && has("Sys.Audit"),
		PowerMgmt: has("VM.PowerMgmt"),
	}
}

/* ---------------------------------------------------------------------------
 * Actions
 * ------------------------------------------------------------------------ */

// proxmoxPowerPath builds the endpoint for a power action, and refuses
// anything that is not one of the two this product offers: start, and the
// graceful shutdown. The hard power-off is not among them.
//
// The kind and the action are closed sets on purpose: they arrive from a
// request and end up in a URL path, so an open string would let a caller reach
// any endpoint on the hypervisor that shares the prefix.
func proxmoxPowerPath(node, kind string, vmid int, action string) (string, error) {
	if node == "" || vmid <= 0 {
		return "", fmt.Errorf("general.invalid_input")
	}
	if kind != "lxc" && kind != "qemu" {
		return "", fmt.Errorf("general.invalid_input")
	}
	switch action {
	case "start", "shutdown":
	default:
		return "", fmt.Errorf("general.invalid_input")
	}
	if strings.ContainsAny(node, "/?#") {
		return "", fmt.Errorf("general.invalid_input")
	}
	return fmt.Sprintf("/nodes/%s/%s/%d/status/%s", url.PathEscape(node), kind, vmid, action), nil
}
