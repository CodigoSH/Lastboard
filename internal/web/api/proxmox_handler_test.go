package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

/*
A hypervisor that is not there.

The client is tested on its own (proxmox_client_test.go). What is tested here
is everything between the browser and that client: who may read the address,
who may stop a machine, and what the stored secret does when the form is saved
again without it — which is the moment a credential is most easily lost.
*/

type fakeProxmox struct {
	*httptest.Server
	mu sync.Mutex
	// Every path asked for, in order, so a test can say what the handler did
	// rather than infer it from the answer.
	seen []string
	// The Authorization header of the last request: the only way to tell
	// whether the stored secret was really used.
	auth      string
	powerMgmt bool
}

func newFakeProxmox(t *testing.T) *fakeProxmox {
	t.Helper()
	f := &fakeProxmox{powerMgmt: true}
	f.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f.mu.Lock()
		f.seen = append(f.seen, r.Method+" "+r.URL.Path)
		f.auth = r.Header.Get("Authorization")
		power := f.powerMgmt
		f.mu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.URL.Path == "/api2/json/cluster/resources":
			// One node, one running container, one stopped VM, one template
			// that must not appear, and one storage.
			w.Write([]byte(`{"data":[
				{"type":"node","node":"kprox","status":"online","cpu":0.12,"mem":8589934592,"maxmem":34359738368,"disk":50,"maxdisk":100,"maxcpu":16,"uptime":3600},
				{"type":"lxc","vmid":106,"name":"plex","node":"kprox","status":"running","cpu":0.5,"mem":1073741824,"maxmem":4294967296,"uptime":60},
				{"type":"qemu","vmid":200,"name":"win","node":"kprox","status":"stopped","cpu":0,"mem":0,"maxmem":8589934592},
				{"type":"qemu","vmid":900,"name":"debian-template","node":"kprox","status":"stopped","template":1},
				{"type":"storage","storage":"tank","node":"kprox","plugintype":"zfspool","disk":30,"maxdisk":100,"shared":1}
			]}`))
		case r.URL.Path == "/api2/json/access/permissions":
			if power {
				w.Write([]byte(`{"data":{"/":{"VM.Audit":1,"VM.PowerMgmt":1}}}`))
			} else {
				w.Write([]byte(`{"data":{"/":{"VM.Audit":1}}}`))
			}
		case strings.HasSuffix(r.URL.Path, "/status"):
			w.Write([]byte(`{"data":{"uptime":7200,"loadavg":["0.50","0.40","0.30"],"cpuinfo":{"cores":8}}}`))
		default:
			w.Write([]byte(`{"data":null}`))
		}
	}))
	t.Cleanup(f.Close)
	return f
}

func (f *fakeProxmox) asked(path string) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, s := range f.seen {
		if s == path {
			return true
		}
	}
	return false
}

func (f *fakeProxmox) lastAuth() string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.auth
}

func setupProxmoxServer(t *testing.T) (*httptest.Server, *database.DB, func()) {
	t.Helper()

	tmp, err := os.CreateTemp("", "lastboard_px_test_*.db")
	if err != nil {
		t.Fatalf("temp file: %v", err)
	}
	tmp.Close()

	db, err := database.InitDB(tmp.Name())
	if err != nil {
		t.Fatalf("InitDB: %v", err)
	}

	mux := http.NewServeMux()
	protect := middleware.AuthRequired(db.DB, testSecret)
	authHandler := api.NewAuthHandler(db.DB, testSecret)
	px := api.NewProxmoxHandler(db.DB)

	mux.Handle("POST /api/login", http.HandlerFunc(authHandler.Login))
	mux.Handle("GET /api/proxmox/settings", protect(http.HandlerFunc(px.GetSettings)))
	mux.Handle("POST /api/proxmox/settings", protect(http.HandlerFunc(px.UpdateSettings)))
	mux.Handle("GET /api/proxmox/overview", protect(http.HandlerFunc(px.GetOverview)))
	mux.Handle("POST /api/proxmox/power", protect(http.HandlerFunc(px.Power)))
	mux.Handle("POST /api/proxmox/icon", protect(http.HandlerFunc(px.SetIcon)))

	server := httptest.NewServer(mux)
	cleanup := func() {
		server.Close()
		db.Close()
		os.Remove(tmp.Name())
	}
	return server, db, cleanup
}

func pxSave(t *testing.T, serverURL string, s *userSession, body string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest("POST", serverURL+"/api/proxmox/settings", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("save settings: %v", err)
	}
	return resp
}

// pxOnlyHost digs the single configured host out of the settings answer. The
// tests are about who may read what and what happens to a stored secret, not
// about the shape of the envelope they arrive in.
func pxOnlyHost(body map[string]any) map[string]any {
	hosts, _ := body["hosts"].([]any)
	if len(hosts) == 0 {
		return map[string]any{}
	}
	h, _ := hosts[0].(map[string]any)
	return h
}

func pxGet(t *testing.T, serverURL, path string, s *userSession) (*http.Response, map[string]any) {
	t.Helper()
	req, _ := http.NewRequest("GET", serverURL+path, nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET %s: %v", path, err)
	}
	var body map[string]any
	json.NewDecoder(resp.Body).Decode(&body)
	resp.Body.Close()
	return resp, body
}

// ── Settings ──────────────────────────────────────────────────────────────────

func TestTheStoredSecretNeverComesBack(t *testing.T) {
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")

	pxSave(t, server.URL, s, `{"hosts":[{"enabled":true,"url":"https://pve.home:8006","token_id":"lastboard@pve!lb","secret":"61b6dfca-9f17","insecure":true}]}`).Body.Close()

	resp, body := pxGet(t, server.URL, "/api/proxmox/settings", s)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("settings: got %d", resp.StatusCode)
	}
	for k, v := range body {
		if str, ok := v.(string); ok && strings.Contains(str, "61b6dfca") {
			t.Fatalf("the secret came back in %q", k)
		}
	}
	if h := pxOnlyHost(body); h["has_secret"] != true {
		t.Errorf("has_secret = %v, want true: the form cannot tell stored from missing", h["has_secret"])
	}
}

func TestANonAdminLearnsOnlyWhetherProxmoxIsOn(t *testing.T) {
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	createUser(t, db.DB, "guest", "password", "user")

	admin := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, admin, `{"hosts":[{"enabled":true,"url":"https://pve.home:8006","token_id":"lastboard@pve!lb","secret":"s3cr3t"}]}`).Body.Close()

	// The top bar of every account has to know whether to offer the page, and
	// that is all it gets: the address and the account name are reconnaissance.
	guest := doLogin(t, server.URL, "guest", "password")
	_, body := pxGet(t, server.URL, "/api/proxmox/settings", guest)
	if body["enabled"] != true {
		t.Errorf("enabled = %v, want true", body["enabled"])
	}
	// Not blanked fields inside a host: no host at all. A member has no
	// business knowing how many hypervisors exist either.
	if hosts, _ := body["hosts"].([]any); len(hosts) != 0 {
		t.Errorf("a non-admin was told about %d host(s): %v", len(hosts), hosts)
	}
}

func TestOnlyAnAdminCanPointAtAHypervisor(t *testing.T) {
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	createUser(t, db.DB, "guest", "password", "user")

	guest := doLogin(t, server.URL, "guest", "password")
	resp := pxSave(t, server.URL, guest, `{"hosts":[{"enabled":true,"url":"https://evil.example","token_id":"x!y","secret":"z"}]}`)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("got %d, want 403: a settings write holds a credential", resp.StatusCode)
	}

	admin := doLogin(t, server.URL, "root", "password")
	_, body := pxGet(t, server.URL, "/api/proxmox/settings", admin)
	if h := pxOnlyHost(body); h["url"] != nil {
		t.Errorf("the refused write landed anyway: url = %v", h["url"])
	}
}

func TestSavingTheFormAgainKeepsTheSecretItNeverReceived(t *testing.T) {
	fake := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")

	pxSave(t, server.URL, s, `{"hosts":[{"enabled":true,"url":"`+fake.URL+`","token_id":"lastboard@pve!lb","secret":"first-secret","insecure":true}]}`).Body.Close()
	// The form never receives the secret, so the second save sends an empty
	// one. If that overwrote the stored value, the integration would break the
	// moment anyone toggled a checkbox.
	pxSave(t, server.URL, s, `{"hosts":[{"enabled":true,"url":"`+fake.URL+`","token_id":"lastboard@pve!lb","secret":"","insecure":true}]}`).Body.Close()

	resp, _ := pxGet(t, server.URL, "/api/proxmox/overview", s)
	resp.Body.Close()
	if got := fake.lastAuth(); got != "PVEAPIToken=lastboard@pve!lb=first-secret" {
		t.Fatalf("Authorization = %q, want the secret from the first save", got)
	}
}

func TestABareAddressIsStoredAsHTTPS(t *testing.T) {
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")

	pxSave(t, server.URL, s, `{"hosts":[{"enabled":true,"url":"192.168.1.10:8006","token_id":"a@pve!b","secret":"c"}]}`).Body.Close()

	_, body := pxGet(t, server.URL, "/api/proxmox/settings", s)
	if h := pxOnlyHost(body); h["url"] != "https://192.168.1.10:8006" {
		t.Errorf("url = %v, want it prefixed with https://", h["url"])
	}
}

// ── Overview ──────────────────────────────────────────────────────────────────

func TestTheOverviewIsRefusedBeforeAnythingIsConfigured(t *testing.T) {
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")

	resp, _ := pxGet(t, server.URL, "/api/proxmox/overview", s)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusPreconditionFailed {
		t.Fatalf("got %d, want 412 with the key the interface translates", resp.StatusCode)
	}
}

func TestTheOverviewMapsWhatTheHostSends(t *testing.T) {
	fake := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, s, `{"hosts":[{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}]}`).Body.Close()

	// The answer is a list now: with several hypervisors connected the page
	// asks for all of them at once, and with one it gets a list of one.
	var envelope struct {
		Hosts []json.RawMessage `json:"hosts"`
	}
	var out struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Cluster bool   `json:"cluster"`
		Caps    struct {
			Read  bool `json:"read"`
			Power bool `json:"power"`
		} `json:"caps"`
		Nodes []struct {
			Name   string   `json:"name"`
			CPU    float64  `json:"cpu"`
			Mem    float64  `json:"mem"`
			Cores  int      `json:"cores"`
			Guests int      `json:"guests"`
			Load   []string `json:"loadavg"`
			Uptime int64    `json:"uptime"`
		} `json:"nodes"`
		Guests []struct {
			VMID    int     `json:"vmid"`
			Name    string  `json:"name"`
			Kind    string  `json:"kind"`
			Running bool    `json:"running"`
			CPU     float64 `json:"cpu"`
		} `json:"guests"`
		Stores []struct {
			Name    string  `json:"name"`
			Percent float64 `json:"percent"`
			Shared  bool    `json:"shared"`
		} `json:"stores"`
	}
	req, _ := http.NewRequest("GET", server.URL+"/api/proxmox/overview", nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("overview: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("overview: got %d", resp.StatusCode)
	}
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		t.Fatalf("overview: %v", err)
	}
	if len(envelope.Hosts) != 1 {
		t.Fatalf("want one host in the answer, got %d", len(envelope.Hosts))
	}
	if err := json.Unmarshal(envelope.Hosts[0], &out); err != nil {
		t.Fatalf("host overview: %v", err)
	}
	if out.ID == "" || out.Name == "" {
		t.Errorf("the host is unnamed in the answer, so the interface cannot tell two apart: %+v", out)
	}

	if len(out.Nodes) != 1 || out.Nodes[0].Name != "kprox" {
		t.Fatalf("nodes = %+v", out.Nodes)
	}
	// One node is not a cluster, whatever the endpoint is called.
	if out.Cluster {
		t.Error("a single node was reported as a cluster")
	}
	if out.Nodes[0].CPU != 12 {
		t.Errorf("node cpu = %v, want 12 (a percentage, not a fraction)", out.Nodes[0].CPU)
	}
	if out.Nodes[0].Mem != 25 {
		t.Errorf("node memory = %v, want 25", out.Nodes[0].Mem)
	}
	if out.Nodes[0].Cores != 8 || len(out.Nodes[0].Load) != 3 {
		t.Errorf("the per-node status call did not land: %+v", out.Nodes[0])
	}
	if out.Nodes[0].Uptime != 7200 {
		t.Errorf("uptime = %d, want the node status figure", out.Nodes[0].Uptime)
	}
	if out.Nodes[0].Guests != 2 {
		t.Errorf("guests on the node = %d, want 2 (the template does not count)", out.Nodes[0].Guests)
	}

	// The template is a stamp to clone from: it cannot be started and has no
	// state, so it must not be drawn as a machine.
	for _, g := range out.Guests {
		if g.VMID == 900 {
			t.Fatal("a template was reported as a machine")
		}
	}
	if len(out.Guests) != 2 {
		t.Fatalf("guests = %+v", out.Guests)
	}
	if out.Guests[0].Kind != "lxc" || !out.Guests[0].Running || out.Guests[0].CPU != 50 {
		t.Errorf("guest = %+v", out.Guests[0])
	}
	if len(out.Stores) != 1 || out.Stores[0].Percent != 30 || !out.Stores[0].Shared {
		t.Errorf("stores = %+v", out.Stores)
	}
	if !out.Caps.Power {
		t.Error("the buttons would be hidden for a token that may power")
	}
	if !fake.asked("GET /api2/json/cluster/resources") {
		t.Error("the one call the design leans on was never made")
	}
}

// ── Power ─────────────────────────────────────────────────────────────────────

func pxPower(t *testing.T, serverURL string, s *userSession, body string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest("POST", serverURL+"/api/proxmox/power", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("power: %v", err)
	}
	return resp
}

func TestANonAdminCannotStopAMachine(t *testing.T) {
	fake := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	createUser(t, db.DB, "guest", "password", "user")
	admin := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, admin, `{"hosts":[{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}]}`).Body.Close()

	guest := doLogin(t, server.URL, "guest", "password")
	resp := pxPower(t, server.URL, guest, `{"node":"kprox","kind":"lxc","vmid":106,"action":"shutdown"}`)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("got %d, want 403", resp.StatusCode)
	}
	if fake.asked("POST /api2/json/nodes/kprox/lxc/106/status/shutdown") {
		t.Fatal("the machine was stopped anyway")
	}
}

func TestAReadOnlyTokenIsToldSoInsteadOfFailingAtTheHost(t *testing.T) {
	fake := newFakeProxmox(t)
	fake.powerMgmt = false
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, s, `{"hosts":[{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}]}`).Body.Close()

	resp := pxPower(t, server.URL, s, `{"node":"kprox","kind":"lxc","vmid":106,"action":"start"}`)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("got %d, want 403", resp.StatusCode)
	}
	body := make([]byte, 64)
	n, _ := resp.Body.Read(body)
	if got := strings.TrimSpace(string(body[:n])); got != "proxmox.no_power_permission" {
		t.Errorf("message = %q, want the key that says what to add to the token", got)
	}
}

func TestStartingAMachineReachesTheRightPath(t *testing.T) {
	fake := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, s, `{"hosts":[{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}]}`).Body.Close()

	resp := pxPower(t, server.URL, s, `{"node":"kprox","kind":"qemu","vmid":200,"action":"start"}`)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("got %d, want 204", resp.StatusCode)
	}
	if !fake.asked("POST /api2/json/nodes/kprox/qemu/200/status/start") {
		t.Fatal("the start never reached the host")
	}
}

func TestAnActionThatIsNotOfferedIsRefusedBeforeTheHostSeesIt(t *testing.T) {
	fake := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, s, `{"hosts":[{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}]}`).Body.Close()

	// Nothing in the interface offers to delete a machine, and the handler is
	// not willing to relay one either.
	resp := pxPower(t, server.URL, s, `{"node":"kprox","kind":"qemu","vmid":200,"action":"destroy"}`)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("got %d, want 400", resp.StatusCode)
	}
	if len(fake.seen) > 0 {
		t.Fatalf("the host was contacted anyway: %v", fake.seen)
	}
}

// ── The icon an operator chose ───────────────────────────────────────────────

func pxIcon(t *testing.T, serverURL string, s *userSession, body string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest("POST", serverURL+"/api/proxmox/icon", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("icon: %v", err)
	}
	return resp
}

// iconsFrom reads the icon map out of an overview.
func iconsFrom(t *testing.T, serverURL string, s *userSession) map[string]string {
	t.Helper()
	req, _ := http.NewRequest("GET", serverURL+"/api/proxmox/overview", nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("overview: %v", err)
	}
	defer resp.Body.Close()
	var out struct {
		Hosts []struct {
			Icons map[string]string `json:"icons"`
		} `json:"hosts"`
	}
	json.NewDecoder(resp.Body).Decode(&out)
	if len(out.Hosts) == 0 {
		return map[string]string{}
	}
	return out.Hosts[0].Icons
}

// pxHostID is the id the server minted for the only configured host. Tests
// cannot hardcode it — that is the point of it being generated — but the key an
// icon is stored under is built from it, so they have to ask.
func pxHostID(t *testing.T, serverURL string, s *userSession) string {
	t.Helper()
	_, body := pxGet(t, serverURL, "/api/proxmox/settings", s)
	h := pxOnlyHost(body)
	id, _ := h["id"].(string)
	if id == "" {
		t.Fatal("no host id came back, so nothing can be keyed against it")
	}
	return id
}

func TestAMachineKeepsTheIconItsOwnerChose(t *testing.T) {
	fake := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, s, `{"hosts":[{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}]}`).Body.Close()

	// Nine of twenty-nine machines on a real host have no bookmark and never
	// will — the runners, the tunnel, the dashboard itself.
	resp := pxIcon(t, server.URL, s, `{"node":"kprox","vmid":1018,"icon":"/api/icons/abc123"}`)
	resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("got %d, want 204", resp.StatusCode)
	}

	if got := iconsFrom(t, server.URL, s)[pxHostID(t, server.URL, s)+"|kprox|1018"]; got != "/api/icons/abc123" {
		t.Errorf("icon = %q, want the one that was chosen", got)
	}
}

func TestChoosingASecondIconLeavesTheFirstAlone(t *testing.T) {
	fake := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, s, `{"hosts":[{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}]}`).Body.Close()

	// The whole map is one setting row, so each write rewrites it: the second
	// choice must not be the only one left standing.
	pxIcon(t, server.URL, s, `{"node":"kprox","vmid":100,"icon":"/api/icons/one"}`).Body.Close()
	pxIcon(t, server.URL, s, `{"node":"kprox","vmid":200,"icon":"/api/icons/two"}`).Body.Close()

	icons := iconsFrom(t, server.URL, s)
	host := pxHostID(t, server.URL, s)
	if icons[host+"|kprox|100"] != "/api/icons/one" || icons[host+"|kprox|200"] != "/api/icons/two" {
		t.Fatalf("icons = %v", icons)
	}
}

func TestAnEmptyIconClearsTheChoice(t *testing.T) {
	fake := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, s, `{"hosts":[{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}]}`).Body.Close()

	pxIcon(t, server.URL, s, `{"node":"kprox","vmid":100,"icon":"/api/icons/one"}`).Body.Close()
	pxIcon(t, server.URL, s, `{"node":"kprox","vmid":100,"icon":""}`).Body.Close()

	if _, still := iconsFrom(t, server.URL, s)["kprox|100"]; still {
		t.Error("the machine kept an icon after it was removed")
	}
}

func TestOnlyAnAdminChoosesTheFaceOfAMachine(t *testing.T) {
	fake := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	createUser(t, db.DB, "guest", "password", "user")
	admin := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, admin, `{"hosts":[{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}]}`).Body.Close()

	// Server-wide setting, so it follows the rule the connection follows.
	resp := pxIcon(t, server.URL, doLogin(t, server.URL, "guest", "password"),
		`{"node":"kprox","vmid":100,"icon":"/api/icons/one"}`)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("got %d, want 403", resp.StatusCode)
	}
	if len(iconsFrom(t, server.URL, admin)) != 0 {
		t.Error("the refused choice was stored anyway")
	}
}

func TestTheIconMapRefusesToGrowWithoutEnd(t *testing.T) {
	fake := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, s, `{"hosts":[{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}]}`).Body.Close()

	// An icon longer than a path could ever be is not an icon.
	resp := pxIcon(t, server.URL, s, `{"node":"kprox","vmid":100,"icon":"`+strings.Repeat("x", 600)+`"}`)
	resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("a 600-character icon: got %d, want 400", resp.StatusCode)
	}

	// Nor is a machine with no id, nor a node name that would forge a key.
	for _, body := range []string{
		`{"node":"kprox","vmid":0,"icon":"/api/icons/x"}`,
		`{"node":"kprox|999","vmid":1,"icon":"/api/icons/x"}`,
	} {
		resp := pxIcon(t, server.URL, s, body)
		resp.Body.Close()
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("%s: got %d, want 400", body, resp.StatusCode)
		}
	}
}

/*
Several hypervisors.

The case that forced the host id into every stored key: two clusters, each with
a node called "pve" — the name a default install gives itself — and each with a
machine 106. Before this, "pve|106" named both, so an icon chosen for one
appeared on the other and a bookmark tied to one flagged the other as the
service that went down.
*/

func TestTwoHostsAreBothRead(t *testing.T) {
	a := newFakeProxmox(t)
	b := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, s, `{"hosts":[
		{"enabled":true,"name":"Main","url":"`+a.URL+`","token_id":"a@pve!b","secret":"c","insecure":true},
		{"enabled":true,"name":"Offsite","url":"`+b.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}
	]}`).Body.Close()

	var out struct {
		Hosts []struct {
			ID     string `json:"id"`
			Name   string `json:"name"`
			Error  string `json:"error"`
			Guests []struct {
				VMID int `json:"vmid"`
			} `json:"guests"`
		} `json:"hosts"`
	}
	req, _ := http.NewRequest("GET", server.URL+"/api/proxmox/overview", nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("overview: %v", err)
	}
	defer resp.Body.Close()
	json.NewDecoder(resp.Body).Decode(&out)

	if len(out.Hosts) != 2 {
		t.Fatalf("want both hosts in one answer, got %d", len(out.Hosts))
	}
	if out.Hosts[0].Name != "Main" || out.Hosts[1].Name != "Offsite" {
		t.Errorf("the hosts lost their names or their order: %+v", out.Hosts)
	}
	if out.Hosts[0].ID == out.Hosts[1].ID {
		t.Error("both hosts were given the same id, so every key collides again")
	}
	for _, h := range out.Hosts {
		if len(h.Guests) == 0 {
			t.Errorf("%s came back empty: %q", h.Name, h.Error)
		}
	}
}

func TestOneHostBeingDownDoesNotHideTheOthers(t *testing.T) {
	up := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	// The second address answers nothing at all: a host that is off, or moved.
	pxSave(t, server.URL, s, `{"hosts":[
		{"enabled":true,"name":"Up","url":"`+up.URL+`","token_id":"a@pve!b","secret":"c","insecure":true},
		{"enabled":true,"name":"Down","url":"http://127.0.0.1:9","token_id":"a@pve!b","secret":"c","insecure":true}
	]}`).Body.Close()

	var out struct {
		Hosts []struct {
			Name   string     `json:"name"`
			Error  string     `json:"error"`
			Guests []struct{} `json:"guests"`
		} `json:"hosts"`
	}
	req, _ := http.NewRequest("GET", server.URL+"/api/proxmox/overview", nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("overview: %v", err)
	}
	defer resp.Body.Close()
	// The request itself must succeed: one broken connection is information,
	// not a failure of the page.
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("got %d, want 200 with the failure named inside", resp.StatusCode)
	}
	json.NewDecoder(resp.Body).Decode(&out)
	if len(out.Hosts) != 2 {
		t.Fatalf("want both hosts listed, got %d", len(out.Hosts))
	}
	if len(out.Hosts[0].Guests) == 0 {
		t.Error("the working host came back empty because the other one is down")
	}
	if out.Hosts[1].Error == "" {
		t.Error("the unreachable host reported no error, so nothing can say which one is unhappy")
	}
}

func TestAskingForOneHostReadsOnlyThatOne(t *testing.T) {
	a := newFakeProxmox(t)
	b := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, s, `{"hosts":[
		{"enabled":true,"name":"Main","url":"`+a.URL+`","token_id":"a@pve!b","secret":"c","insecure":true},
		{"enabled":true,"name":"Offsite","url":"`+b.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}
	]}`).Body.Close()

	_, body := pxGet(t, server.URL, "/api/proxmox/settings", s)
	hosts, _ := body["hosts"].([]any)
	second, _ := hosts[1].(map[string]any)
	id, _ := second["id"].(string)

	var out struct {
		Hosts []struct {
			Name string `json:"name"`
		} `json:"hosts"`
	}
	req, _ := http.NewRequest("GET", server.URL+"/api/proxmox/overview?host="+id, nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("overview: %v", err)
	}
	defer resp.Body.Close()
	json.NewDecoder(resp.Body).Decode(&out)

	// A cluster's own page polls every few seconds. Reading every other
	// hypervisor on each of those polls is the cost this parameter avoids.
	if len(out.Hosts) != 1 || out.Hosts[0].Name != "Offsite" {
		t.Fatalf("want only the host that was asked for, got %+v", out.Hosts)
	}
}

func TestTheSameMachineOnTwoHostsKeepsItsOwnIcon(t *testing.T) {
	a := newFakeProxmox(t)
	b := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, s, `{"hosts":[
		{"enabled":true,"name":"Main","url":"`+a.URL+`","token_id":"a@pve!b","secret":"c","insecure":true},
		{"enabled":true,"name":"Offsite","url":"`+b.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}
	]}`).Body.Close()

	_, body := pxGet(t, server.URL, "/api/proxmox/settings", s)
	hosts, _ := body["hosts"].([]any)
	first, _ := hosts[0].(map[string]any)
	second, _ := hosts[1].(map[string]any)
	idA, _ := first["id"].(string)
	idB, _ := second["id"].(string)

	// Same node name, same vmid, different hypervisor — which is exactly what
	// two default installs look like.
	pxIcon(t, server.URL, s, `{"host":"`+idA+`","node":"pve","vmid":106,"icon":"/api/icons/plex"}`).Body.Close()
	pxIcon(t, server.URL, s, `{"host":"`+idB+`","node":"pve","vmid":106,"icon":"/api/icons/other"}`).Body.Close()

	icons := iconsFrom(t, server.URL, s)
	if icons[idA+"|pve|106"] != "/api/icons/plex" {
		t.Errorf("the first host's icon was overwritten: %v", icons)
	}
	if icons[idB+"|pve|106"] != "/api/icons/other" {
		t.Errorf("the second host's icon did not land: %v", icons)
	}
	if len(icons) != 2 {
		t.Errorf("want two separate icons, got %d: %v", len(icons), icons)
	}
}

func TestAnIconForAHostThatIsNotThereIsRefused(t *testing.T) {
	fake := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, s, `{"hosts":[{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}]}`).Body.Close()

	// An invented id would write a key nothing will ever read and nothing can
	// prune, because no host claims it.
	resp := pxIcon(t, server.URL, s, `{"host":"pxdeadbeef","node":"pve","vmid":106,"icon":"/api/icons/x"}`)
	resp.Body.Close()
	if resp.StatusCode == http.StatusNoContent {
		t.Fatal("an icon was stored against a host that does not exist")
	}
	if got := iconsFrom(t, server.URL, s); len(got) != 0 {
		t.Errorf("icons = %v, want none", got)
	}
}
