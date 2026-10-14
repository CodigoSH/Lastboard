package api

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

// ProxmoxHandler serves the Proxmox page and its widget.
//
// The connections belong to the account that configured them and live in its
// user_settings: a list of hypervisors, each with a token. Nobody sees or uses
// another account's, and they are not per-widget, because the credentials must
// not travel to a browser at all.
type ProxmoxHandler struct {
	DB *sql.DB
}

func NewProxmoxHandler(db *sql.DB) *ProxmoxHandler {
	return &ProxmoxHandler{DB: db}
}

// proxmoxScope is the handler looking at one account's connections.
type proxmoxScope struct {
	*ProxmoxHandler
	uid int
}

func (h *ProxmoxHandler) forUser(r *http.Request) proxmoxScope {
	return proxmoxScope{h, middleware.GetUserIDFromContext(r)}
}

func (u proxmoxScope) getSetting(key string) string {
	v, _ := NewUserSettings(u.DB).Get(u.uid, key)
	return v
}

func (u proxmoxScope) setSetting(key, value string) error {
	return NewUserSettings(u.DB).Set(u.uid, key, value)
}

/* ---------------------------------------------------------------------------
 * Hosts
 *
 * One entry is one Proxmox endpoint: a cluster, or a standalone node, which
 * speak the same API. The id is generated once and never derived from the name,
 * because the name is the operator's to change and everything else — the icon
 * chosen for a machine, the bookmark tied to one — is stored against the id.
 * ------------------------------------------------------------------------ */

const proxmoxHostsKey = "proxmox_hosts"

// proxmoxMaxHosts is a ceiling, not an expectation. Each one is a poll and a
// token; somebody pasting a hundred would be a mistake, not a homelab.
const proxmoxMaxHosts = 10

type proxmoxHost struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	URL     string `json:"url"`
	TokenID string `json:"token_id"`
	// Never leaves the server. See proxmoxSettings for why.
	Secret   string `json:"secret,omitempty"`
	Insecure bool   `json:"insecure"`
	Enabled  bool   `json:"enabled"`
}

func (u proxmoxScope) hosts() []proxmoxHost {
	var out []proxmoxHost
	raw := u.getSetting(proxmoxHostsKey)
	if raw == "" {
		return nil
	}
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil
	}
	return out
}

func (u proxmoxScope) saveHosts(list []proxmoxHost) error {
	blob, err := json.Marshal(list)
	if err != nil {
		return err
	}
	return u.setSetting(proxmoxHostsKey, string(blob))
}

// enabledHosts are the ones worth asking anything of.
func (u proxmoxScope) enabledHosts() []proxmoxHost {
	var out []proxmoxHost
	for _, e := range u.hosts() {
		if e.Enabled && configOf(e).configured() {
			out = append(out, e)
		}
	}
	return out
}

func configOf(e proxmoxHost) proxmoxConfig {
	return proxmoxConfig{URL: e.URL, TokenID: e.TokenID, Secret: e.Secret, Insecure: e.Insecure}
}

// hostFor resolves the host a request names. An empty id means "the only one",
// which is what every instance had until now and what most will keep having.
func (u proxmoxScope) hostFor(id string) (proxmoxHost, bool) {
	list := u.enabledHosts()
	if id == "" {
		if len(list) == 1 {
			return list[0], true
		}
		return proxmoxHost{}, false
	}
	for _, e := range list {
		if e.ID == id {
			return e, true
		}
	}
	return proxmoxHost{}, false
}

// newHostID is short, url-safe and unmistakable in a settings key.
func newHostID() string {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("px%d", time.Now().UnixNano())
	}
	return "px" + hex.EncodeToString(b)
}

/* ---------------------------------------------------------------------------
 * Settings
 * ------------------------------------------------------------------------ */

// proxmoxSettings is what the configuration screen exchanges.
//
// There is no field for a secret on the way out. Not a blanked one, not a
// masked one: absent. The alerting token taught this the hard way — it was
// readable by every account until 1.7.1 — and a Proxmox token is worth more,
// because with VM.PowerMgmt it can stop the machines the household runs on.
type proxmoxSettings struct {
	// Enabled says at least one host is connected and on. It is the only part
	// every account may read, because the top bar has to decide whether to
	// offer the page at all.
	Enabled bool `json:"enabled"`
	// Hosts are the caller's own: the form that configures them.
	Hosts []proxmoxSettingsHost `json:"hosts"`
}

type proxmoxSettingsHost struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	URL      string `json:"url"`
	TokenID  string `json:"token_id"`
	Insecure bool   `json:"insecure"`
	Enabled  bool   `json:"enabled"`
	// HasSecret says a secret is stored without saying what it is, so the form
	// can show "saved" instead of an empty box that looks like a missing value.
	HasSecret bool `json:"has_secret"`
}

// GetSettings answers with the configuration.
//
// It is the caller's own configuration: whether the integration is on for them,
// and the addresses and token ids they entered. Another account's hypervisors are
// never listed — they name machines and accounts nobody else on the instance
// needs to know about.
func (h *ProxmoxHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	u := h.forUser(r)
	list := u.hosts()

	out := proxmoxSettings{Hosts: []proxmoxSettingsHost{}}
	for _, e := range list {
		if e.Enabled && configOf(e).configured() {
			out.Enabled = true
			break
		}
	}
	for _, e := range list {
		out.Hosts = append(out.Hosts, proxmoxSettingsHost{
			ID: e.ID, Name: e.Name, URL: e.URL, TokenID: e.TokenID,
			Insecure: e.Insecure, Enabled: e.Enabled, HasSecret: e.Secret != "",
		})
	}
	writeJSON(w, out)
}

// UpdateSettings persists the caller's whole list.
//
// The list arrives complete rather than as a patch, so adding, renaming,
// reordering and removing are all the same request — and a host that vanishes
// from it is one the operator removed, which is the only way to remove one.
func (h *ProxmoxHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	u := h.forUser(r)
	r.Body = http.MaxBytesReader(w, r.Body, 32*1024)

	var in struct {
		Hosts []struct {
			ID      string `json:"id"`
			Name    string `json:"name"`
			URL     string `json:"url"`
			TokenID string `json:"token_id"`
			Secret  string `json:"secret"`
			// ClearSecret is the operator emptying the box that held the dots:
			// the stored secret goes. Without it an empty secret means "not
			// touched", which is also what a page that has not reloaded sends.
			ClearSecret bool `json:"clear_secret"`
			Insecure    bool `json:"insecure"`
			Enabled     bool `json:"enabled"`
		} `json:"hosts"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	if len(in.Hosts) > proxmoxMaxHosts {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	// What is stored now, so a host that arrives without a secret keeps the one
	// it already had. The form never receives a secret, so every save of an
	// untouched host would otherwise wipe its credential.
	previous := map[string]proxmoxHost{}
	for _, e := range u.hosts() {
		previous[e.ID] = e
	}

	list := make([]proxmoxHost, 0, len(in.Hosts))
	seen := map[string]bool{}
	for _, raw := range in.Hosts {
		url := strings.TrimSpace(raw.URL)
		if url != "" && !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
			url = "https://" + url
		}

		// An id the caller invented, or one it sent twice, would let a browser
		// point two hosts at the same stored icons. Ids are the server's.
		id := strings.TrimSpace(raw.ID)
		if _, known := previous[id]; !known || id == "" || seen[id] {
			id = ""
		}
		// A save that forgets the id would otherwise mint a new host and leave
		// the secret behind on the old one — the credential lost by a form
		// field, silently. Same address and same token means the same host.
		if id == "" {
			for _, old := range previous {
				if !seen[old.ID] && old.URL == url && old.TokenID == strings.TrimSpace(raw.TokenID) {
					id = old.ID
					break
				}
			}
		}
		if id == "" {
			id = newHostID()
		}
		seen[id] = true

		e := proxmoxHost{
			ID: id, Name: strings.TrimSpace(raw.Name), URL: url,
			TokenID: strings.TrimSpace(raw.TokenID), Insecure: raw.Insecure, Enabled: raw.Enabled,
		}
		if secret := strings.TrimSpace(raw.Secret); secret != "" {
			e.Secret = secret
		} else if raw.ClearSecret {
			e.Secret = ""
		} else if old, ok := previous[id]; ok {
			e.Secret = old.Secret
		}
		if e.Name == "" {
			e.Name = "Proxmox"
		}
		list = append(list, e)
	}

	if err := u.saveHosts(list); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

/* ---------------------------------------------------------------------------
 * The icon an operator chose for a machine
 * ------------------------------------------------------------------------ */

/*
Some machines will never have a bookmark, and that is not a gap to be filled by
guessing.

Measured on a real host: of twenty-nine machines, ten are infrastructure — the
runners, the tunnel, the test containers, Lastboard itself — and nobody
bookmarks the dashboard they are looking at. Matching them by name against an
icon catalogue would mean asking a CDN what this household runs, which is the
one thing the board promises it does not do. So the operator picks, once, and
the icon is downloaded and stored by this instance like any bookmark's.

Per account, like the connection: each account has hypervisors of its own, so
the faces it gives their machines are its own too.
*/

const proxmoxIconsKey = "proxmox_icons"

// Bounds on what one setting row may hold: enough for a big cluster, small
// enough that it cannot be grown into a place to keep arbitrary data.
const (
	proxmoxMaxIcons   = 500
	proxmoxMaxIconLen = 512
)

// proxmoxIconKey addresses one machine. VMIDs are unique per cluster, but the
// node is in the key anyway so a machine that moves keeps its own face.
// proxmoxIconKey names a machine across every hypervisor connected. The host
// is part of it because neither of the other two parts is unique: VMIDs restart
// at 100 in each cluster, and "pve" is what a default install calls its node.
func proxmoxIconKey(host, node string, vmid int) string {
	return fmt.Sprintf("%s|%s|%d", host, node, vmid)
}

func (u proxmoxScope) icons() map[string]string {
	raw := u.getSetting(proxmoxIconsKey)
	if raw == "" {
		return map[string]string{}
	}
	out := map[string]string{}
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		// A setting that cannot be read is a setting nobody set.
		return map[string]string{}
	}
	return out
}

// SetIcon stores, or clears, the icon of one machine, in the caller's own
// settings like the connection itself.
func (h *ProxmoxHandler) SetIcon(w http.ResponseWriter, r *http.Request) {
	u := h.forUser(r)
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)

	var in struct {
		Host string `json:"host"`
		Node string `json:"node"`
		VMID int    `json:"vmid"`
		Icon string `json:"icon"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	if in.VMID <= 0 || strings.ContainsAny(in.Node, "|") {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	// The host is resolved rather than believed: an id the caller invented
	// would write an icon nothing will ever read, and one belonging to a host
	// that is gone would leave a key nothing can prune.
	host, ok := u.hostFor(strings.TrimSpace(in.Host))
	if !ok {
		http.Error(w, "proxmox.not_configured", http.StatusPreconditionFailed)
		return
	}
	icon := strings.TrimSpace(in.Icon)
	if len(icon) > proxmoxMaxIconLen {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	icons := u.icons()
	key := proxmoxIconKey(host.ID, in.Node, in.VMID)
	if icon == "" {
		delete(icons, key)
	} else {
		// A full map is not a reason to lose what is already there, so only a
		// machine that is not in it yet is refused.
		if _, known := icons[key]; !known && len(icons) >= proxmoxMaxIcons {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		icons[key] = icon
	}

	blob, err := json.Marshal(icons)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	if err := u.setSetting(proxmoxIconsKey, string(blob)); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

/* ---------------------------------------------------------------------------
 * What the page and the widget read
 * ------------------------------------------------------------------------ */

type proxmoxNode struct {
	Name    string  `json:"name"`
	Status  string  `json:"status"`
	CPU     float64 `json:"cpu"`  // percent
	Mem     float64 `json:"mem"`  // percent
	Disk    float64 `json:"disk"` // percent
	Threads int     `json:"threads"`
	Cores   int     `json:"cores"`
	// Bytes, beside the percentage: "66%" of a node says nothing about whether
	// there is room for another machine, and that is the question being asked.
	MemUsed  int64 `json:"mem_used"`
	MemTotal int64 `json:"mem_total"`
	// Same reasoning as the memory pair: a ratio does not say whether the next
	// backup fits. Taken from the same row the percentage is computed from, so
	// the two can never disagree.
	DiskUsed  int64    `json:"disk_used"`
	DiskTotal int64    `json:"disk_total"`
	Uptime    int64    `json:"uptime"`
	LoadAvg   []string `json:"loadavg"`
	Guests    int      `json:"guests"`
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
	// Icons chosen by the operator, keyed "node|vmid". Sent with the overview
	// rather than fetched on its own: the page asks for this once either way.
	Icons map[string]string `json:"icons"`
}

// proxmoxHostOverview is one hypervisor's worth of the answer, named so the
// interface can tell them apart and say which one failed.
type proxmoxHostOverview struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	// Error is set when this host could not be read. The others still are.
	Error string `json:"error,omitempty"`
	proxmoxOverview
}

type proxmoxAll struct {
	Hosts []proxmoxHostOverview `json:"hosts"`
}

// GetOverview is the call the page and the widget poll.
//
// `?host=` picks one, which is what a cluster's own page asks for every few
// seconds. Without it every connected host is read, which is what the summary
// needs — and what an instance with a single host gets without asking, because
// that is every instance until somebody adds a second.
//
// Per host it is one request to Proxmox (`/cluster/resources`) plus one per
// node for the four figures the resource list does not carry. It does not grow
// with the number of machines, which is the whole reason the design leans on
// that endpoint.
func (h *ProxmoxHandler) GetOverview(w http.ResponseWriter, r *http.Request) {
	u := h.forUser(r)
	wanted := strings.TrimSpace(r.URL.Query().Get("host"))

	var targets []proxmoxHost
	if wanted != "" {
		e, ok := u.hostFor(wanted)
		if !ok {
			http.Error(w, "proxmox.not_configured", http.StatusPreconditionFailed)
			return
		}
		targets = []proxmoxHost{e}
	} else {
		targets = u.enabledHosts()
	}
	if len(targets) == 0 {
		http.Error(w, "proxmox.not_configured", http.StatusPreconditionFailed)
		return
	}

	icons := u.icons()
	out := proxmoxAll{Hosts: make([]proxmoxHostOverview, 0, len(targets))}
	for _, e := range targets {
		one := h.overviewOf(e, icons)
		out.Hosts = append(out.Hosts, one)
	}
	writeJSON(w, out)
}

// overviewOf reads one host. An error is carried inside the answer rather than
// returned: with several connected, one that is down or mistyped must not take
// the others with it — the summary exists precisely to show which is which.
func (h *ProxmoxHandler) overviewOf(e proxmoxHost, icons map[string]string) proxmoxHostOverview {
	cfg := configOf(e)
	res := proxmoxHostOverview{ID: e.ID, Name: e.Name}

	var rows []pxResource
	if err := proxmoxDo(cfg, http.MethodGet, "/cluster/resources", &rows); err != nil {
		res.Error = err.Error()
		res.Nodes = []proxmoxNode{}
		res.Guests = []proxmoxGuest{}
		res.Stores = []proxmoxStore{}
		return res
	}

	out := proxmoxOverview{
		Nodes:  []proxmoxNode{},
		Guests: []proxmoxGuest{},
		Stores: []proxmoxStore{},
		Icons:  icons,
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
				Name:      row.Node,
				Status:    row.Status,
				CPU:       percent(row.CPU),
				Mem:       ratio(row.Mem, row.MaxMem),
				Disk:      ratio(row.Disk, row.MaxDisk),
				Threads:   row.MaxCPU,
				MemUsed:   row.Mem,
				MemTotal:  row.MaxMem,
				DiskUsed:  row.Disk,
				DiskTotal: row.MaxDisk,
				Uptime:    row.Uptime,
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

	res.proxmoxOverview = out
	return res
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
	u := h.forUser(r)
	// Which hypervisor, resolved the same way everywhere: named, or the only
	// one there is.
	host, ok := u.hostFor(strings.TrimSpace(r.URL.Query().Get("host")))
	if !ok {
		http.Error(w, "proxmox.not_configured", http.StatusPreconditionFailed)
		return
	}
	cfg := configOf(host)

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
// Only against the caller's own hypervisors: the host is resolved from their
// connections, so a machine of somebody else's cannot be named. A virtual
// machine can be the thing the rest of the household runs on, so the interface
// confirms before it gets here.
func (h *ProxmoxHandler) Power(w http.ResponseWriter, r *http.Request) {
	u := h.forUser(r)
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)

	var in struct {
		Host   string `json:"host"`
		Node   string `json:"node"`
		Kind   string `json:"kind"`
		VMID   int    `json:"vmid"`
		Action string `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	// From the body, like everything else this request says: a POST taking half
	// its meaning from the query string would be the odd one out.
	host, ok := u.hostFor(strings.TrimSpace(in.Host))
	if !ok {
		http.Error(w, "proxmox.not_configured", http.StatusPreconditionFailed)
		return
	}
	cfg := configOf(host)

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
