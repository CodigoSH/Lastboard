package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// ProxmoxHandler serves the Proxmox page and its widget.
//
// The connection is server-wide and lives in system_settings, like the
// monitoring configuration: one hypervisor per instance, configured by an
// administrator. It is not per-user and not per-widget, because the credential
// is the administrator's and must not travel to a browser at all.
type ProxmoxHandler struct {
	DB *sql.DB
}

func NewProxmoxHandler(db *sql.DB) *ProxmoxHandler {
	return &ProxmoxHandler{DB: db}
}

func (h *ProxmoxHandler) getSetting(key string) string {
	var v string
	if err := h.DB.QueryRow(`SELECT value FROM system_settings WHERE key = ?`, key).Scan(&v); err != nil {
		return ""
	}
	return v
}

func (h *ProxmoxHandler) setSetting(key, value string) error {
	_, err := h.DB.Exec(
		`INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)`, key, value)
	return err
}

func (h *ProxmoxHandler) config() proxmoxConfig {
	return proxmoxConfig{
		URL:      h.getSetting("proxmox_url"),
		TokenID:  h.getSetting("proxmox_token_id"),
		Secret:   h.getSetting("proxmox_token_secret"),
		Insecure: h.getSetting("proxmox_insecure") != "0",
	}
}

/* ---------------------------------------------------------------------------
 * Settings
 * ------------------------------------------------------------------------ */

// proxmoxSettings is what the configuration screen exchanges.
//
// There is no field for the secret on the way out. Not a blanked one, not a
// masked one: absent. The alerting token taught this the hard way — it was
// readable by every account until 1.7.1 — and a Proxmox token is worth more,
// because with VM.PowerMgmt it can stop the machines the household runs on.
type proxmoxSettings struct {
	Enabled  bool   `json:"enabled"`
	URL      string `json:"url"`
	TokenID  string `json:"token_id"`
	Insecure bool   `json:"insecure"`
	// HasSecret says a secret is stored without saying what it is, so the form
	// can show "saved" instead of an empty box that looks like a missing value.
	HasSecret bool `json:"has_secret"`
}

// GetSettings answers with the configuration.
//
// Everyone authenticated learns whether the integration is on, because the top
// bar has to know whether to offer the page at all. The address and the token
// id are administrator-only: they name the hypervisor and the account, which is
// reconnaissance nobody else on the instance needs.
func (h *ProxmoxHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	s := proxmoxSettings{Enabled: h.getSetting("proxmox_enabled") == "1"}

	if isAdminUser(h.DB, r) {
		s.URL = h.getSetting("proxmox_url")
		s.TokenID = h.getSetting("proxmox_token_id")
		s.Insecure = h.getSetting("proxmox_insecure") != "0"
		s.HasSecret = h.getSetting("proxmox_token_secret") != ""
	}
	writeJSON(w, s)
}

// UpdateSettings persists the connection. Admin-only: it is a server-wide
// setting holding a credential.
func (h *ProxmoxHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	if !isAdminUser(h.DB, r) {
		http.Error(w, "error.forbidden", http.StatusForbidden)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 8*1024)

	var in struct {
		Enabled  bool   `json:"enabled"`
		URL      string `json:"url"`
		TokenID  string `json:"token_id"`
		Secret   string `json:"secret"`
		Insecure bool   `json:"insecure"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	url := strings.TrimSpace(in.URL)
	if url != "" && !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		url = "https://" + url
	}

	_ = h.setSetting("proxmox_enabled", boolSetting(in.Enabled))
	_ = h.setSetting("proxmox_url", url)
	_ = h.setSetting("proxmox_token_id", strings.TrimSpace(in.TokenID))
	_ = h.setSetting("proxmox_insecure", boolSetting(in.Insecure))

	// An empty secret in the payload means "leave the stored one alone", so the
	// form can be saved again without retyping a credential it never received.
	if s := strings.TrimSpace(in.Secret); s != "" {
		_ = h.setSetting("proxmox_token_secret", s)
	}

	w.WriteHeader(http.StatusNoContent)
}

func boolSetting(b bool) string {
	if b {
		return "1"
	}
	return "0"
}

/* ---------------------------------------------------------------------------
 * What the page and the widget read
 * ------------------------------------------------------------------------ */

type proxmoxNode struct {
	Name     string   `json:"name"`
	Status   string   `json:"status"`
	CPU      float64  `json:"cpu"`  // percent
	Mem      float64  `json:"mem"`  // percent
	Disk     float64  `json:"disk"` // percent
	Threads  int      `json:"threads"`
	Cores    int      `json:"cores"`
	MemTotal int64    `json:"mem_total"`
	Uptime   int64    `json:"uptime"`
	LoadAvg  []string `json:"loadavg"`
	Guests   int      `json:"guests"`
}

type proxmoxGuest struct {
	VMID     int     `json:"vmid"`
	Name     string  `json:"name"`
	Kind     string  `json:"kind"` // lxc | qemu
	Node     string  `json:"node"`
	Running  bool    `json:"running"`
	CPU      float64 `json:"cpu"` // percent
	Mem      int64   `json:"mem"`
	MemTotal int64   `json:"mem_total"`
	Uptime   int64   `json:"uptime"`
}

type proxmoxStore struct {
	Name    string  `json:"name"`
	Node    string  `json:"node"`
	Kind    string  `json:"kind"`
	Used    int64   `json:"used"`
	Total   int64   `json:"total"`
	Percent float64 `json:"percent"`
	Shared  bool    `json:"shared"`
}

type proxmoxOverview struct {
	Cluster bool           `json:"cluster"`
	Caps    proxmoxCaps    `json:"caps"`
	Nodes   []proxmoxNode  `json:"nodes"`
	Guests  []proxmoxGuest `json:"guests"`
	Stores  []proxmoxStore `json:"stores"`
}

// GetOverview is the one call the page and the widget poll.
//
// It is one request to Proxmox (`/cluster/resources`) plus one per node for the
// four figures the resource list does not carry. A homelab has one or two
// nodes; this does not grow with the number of machines, which is the whole
// reason the design leans on that endpoint.
func (h *ProxmoxHandler) GetOverview(w http.ResponseWriter, r *http.Request) {
	cfg := h.config()
	if !cfg.configured() {
		http.Error(w, "proxmox.not_configured", http.StatusPreconditionFailed)
		return
	}

	var rows []pxResource
	if err := proxmoxDo(cfg, http.MethodGet, "/cluster/resources", &rows); err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	out := proxmoxOverview{
		Nodes:  []proxmoxNode{},
		Guests: []proxmoxGuest{},
		Stores: []proxmoxStore{},
	}
	// Capabilities decide whether the interface offers the power buttons at
	// all. A failure here is not fatal: the page still reads.
	if caps, err := fetchCaps(cfg); err == nil {
		out.Caps = caps
	}

	for _, row := range rows {
		switch row.Type {
		case "node":
			out.Nodes = append(out.Nodes, proxmoxNode{
				Name:     row.Node,
				Status:   row.Status,
				CPU:      percent(row.CPU),
				Mem:      ratio(row.Mem, row.MaxMem),
				Disk:     ratio(row.Disk, row.MaxDisk),
				Threads:  row.MaxCPU,
				MemTotal: row.MaxMem,
				Uptime:   row.Uptime,
			})
		case "lxc", "qemu":
			// A template is a stamp to clone from, not a machine. It has no
			// state worth showing and cannot be started.
			if row.Template == 1 {
				continue
			}
			out.Guests = append(out.Guests, proxmoxGuest{
				VMID:     row.VMID,
				Name:     row.Name,
				Kind:     row.Type,
				Node:     row.Node,
				Running:  row.Status == "running",
				CPU:      percent(row.CPU),
				Mem:      row.Mem,
				MemTotal: row.MaxMem,
				Uptime:   row.Uptime,
			})
		case "storage":
			out.Stores = append(out.Stores, proxmoxStore{
				Name:    row.Storage,
				Node:    row.Node,
				Kind:    row.PluginType,
				Used:    row.Disk,
				Total:   row.MaxDisk,
				Percent: ratio(row.Disk, row.MaxDisk),
				Shared:  row.Shared == 1,
			})
		}
	}

	// "Cluster" is answered by the host, not assumed: a standalone node is the
	// common homelab case and the header must not call it a cluster.
	out.Cluster = len(out.Nodes) > 1

	for i := range out.Nodes {
		name := out.Nodes[i].Name
		for _, g := range out.Guests {
			if g.Node == name {
				out.Nodes[i].Guests++
			}
		}
		var st pxNodeStatus
		if err := proxmoxDo(cfg, http.MethodGet, "/nodes/"+name+"/status", &st); err == nil {
			out.Nodes[i].Cores = st.CPUInfo.Cores
			out.Nodes[i].LoadAvg = st.LoadAvg
			if st.Uptime > 0 {
				out.Nodes[i].Uptime = st.Uptime
			}
		}
	}

	writeJSON(w, out)
}

/* ---------------------------------------------------------------------------
 * Series
 * ------------------------------------------------------------------------ */

type proxmoxSeries struct {
	Range  string    `json:"range"`
	CPU    []float64 `json:"cpu"`
	Mem    []float64 `json:"mem"`
	Points int       `json:"points"`
	Raw    int       `json:"raw"` // how many the host sent, before resampling
}

// GetSeries answers with the history Proxmox already keeps, resampled to
// something a sparkline can use.
//
// GET /api/proxmox/series?range=24h[&node=kprox][&kind=lxc&vmid=106]
func (h *ProxmoxHandler) GetSeries(w http.ResponseWriter, r *http.Request) {
	cfg := h.config()
	if !cfg.configured() {
		http.Error(w, "proxmox.not_configured", http.StatusPreconditionFailed)
		return
	}

	q := r.URL.Query()
	frame, ok := proxmoxTimeframe(q.Get("range"))
	if !ok {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	node := q.Get("node")
	if node == "" || strings.ContainsAny(node, "/?#") {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	path := "/nodes/" + node + "/rrddata"
	guest := false
	if kind := q.Get("kind"); kind != "" {
		vmid, err := strconv.Atoi(q.Get("vmid"))
		if err != nil || vmid <= 0 || (kind != "lxc" && kind != "qemu") {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		path = fmt.Sprintf("/nodes/%s/%s/%d/rrddata", node, kind, vmid)
		guest = true
	}

	var points []pxPoint
	if err := proxmoxDo(cfg, http.MethodGet, path+"?timeframe="+frame+"&cf=AVERAGE", &points); err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	cpu := make([]float64, 0, len(points))
	mem := make([]float64, 0, len(points))
	for _, p := range points {
		cpu = append(cpu, percent(p.CPU))
		// A node reports memused/memtotal; a guest reports mem/maxmem. Both are
		// turned into the same percentage so one chart draws either.
		used, total := p.MemUsed, p.MemTotal
		if guest {
			used, total = p.Mem, p.MaxMem
		}
		if total > 0 {
			mem = append(mem, ratio(int64(used), int64(total)))
		} else {
			mem = append(mem, 0)
		}
	}

	writeJSON(w, proxmoxSeries{
		Range:  q.Get("range"),
		CPU:    downsample(cpu, proxmoxSeriesPoints),
		Mem:    downsample(mem, proxmoxSeriesPoints),
		Points: min(len(cpu), proxmoxSeriesPoints),
		Raw:    len(points),
	})
}

/* ---------------------------------------------------------------------------
 * Power
 * ------------------------------------------------------------------------ */

// Power starts or stops one machine.
//
// Admin-only, and deliberately stricter than the Docker widget's equivalent: a
// container is one service, a virtual machine can be the thing the rest of the
// household runs on. The interface confirms before it gets here; this refuses
// regardless of what the interface did.
func (h *ProxmoxHandler) Power(w http.ResponseWriter, r *http.Request) {
	if !isAdminUser(h.DB, r) {
		http.Error(w, "error.forbidden", http.StatusForbidden)
		return
	}
	cfg := h.config()
	if !cfg.configured() {
		http.Error(w, "proxmox.not_configured", http.StatusPreconditionFailed)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)

	var in struct {
		Node   string `json:"node"`
		Kind   string `json:"kind"`
		VMID   int    `json:"vmid"`
		Action string `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	path, err := proxmoxPowerPath(in.Node, in.Kind, in.VMID, in.Action)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Asked of the host rather than assumed: a token without VM.PowerMgmt
	// answers 403 to the action itself, and saying so plainly beats relaying a
	// bare gateway error.
	if caps, err := fetchCaps(cfg); err == nil && !caps.PowerMgmt {
		http.Error(w, "proxmox.no_power_permission", http.StatusForbidden)
		return
	}

	if err := proxmoxDo(cfg, http.MethodPost, path, nil); err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
