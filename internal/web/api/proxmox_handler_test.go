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

	pxSave(t, server.URL, s, `{"enabled":true,"url":"https://pve.home:8006","token_id":"lastboard@pve!lb","secret":"61b6dfca-9f17","insecure":true}`).Body.Close()

	resp, body := pxGet(t, server.URL, "/api/proxmox/settings", s)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("settings: got %d", resp.StatusCode)
	}
	for k, v := range body {
		if str, ok := v.(string); ok && strings.Contains(str, "61b6dfca") {
			t.Fatalf("the secret came back in %q", k)
		}
	}
	if body["has_secret"] != true {
		t.Errorf("has_secret = %v, want true: the form cannot tell stored from missing", body["has_secret"])
	}
}

func TestANonAdminLearnsOnlyWhetherProxmoxIsOn(t *testing.T) {
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	createUser(t, db.DB, "guest", "password", "user")

	admin := doLogin(t, server.URL, "root", "password")
	pxSave(t, server.URL, admin, `{"enabled":true,"url":"https://pve.home:8006","token_id":"lastboard@pve!lb","secret":"s3cr3t"}`).Body.Close()

	// The top bar of every account has to know whether to offer the page, and
	// that is all it gets: the address and the account name are reconnaissance.
	guest := doLogin(t, server.URL, "guest", "password")
	_, body := pxGet(t, server.URL, "/api/proxmox/settings", guest)
	if body["enabled"] != true {
		t.Errorf("enabled = %v, want true", body["enabled"])
	}
	if body["url"] != "" || body["token_id"] != "" {
		t.Errorf("a non-admin was told the address (%v) and the token (%v)", body["url"], body["token_id"])
	}
	if body["has_secret"] != false {
		t.Errorf("has_secret = %v, want false for a non-admin", body["has_secret"])
	}
}

func TestOnlyAnAdminCanPointAtAHypervisor(t *testing.T) {
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	createUser(t, db.DB, "guest", "password", "user")

	guest := doLogin(t, server.URL, "guest", "password")
	resp := pxSave(t, server.URL, guest, `{"enabled":true,"url":"https://evil.example","token_id":"x!y","secret":"z"}`)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("got %d, want 403: a settings write holds a credential", resp.StatusCode)
	}

	admin := doLogin(t, server.URL, "root", "password")
	_, body := pxGet(t, server.URL, "/api/proxmox/settings", admin)
	if body["url"] != "" {
		t.Errorf("the refused write landed anyway: url = %v", body["url"])
	}
}

func TestSavingTheFormAgainKeepsTheSecretItNeverReceived(t *testing.T) {
	fake := newFakeProxmox(t)
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")

	pxSave(t, server.URL, s, `{"enabled":true,"url":"`+fake.URL+`","token_id":"lastboard@pve!lb","secret":"first-secret","insecure":true}`).Body.Close()
	// The form never receives the secret, so the second save sends an empty
	// one. If that overwrote the stored value, the integration would break the
	// moment anyone toggled a checkbox.
	pxSave(t, server.URL, s, `{"enabled":true,"url":"`+fake.URL+`","token_id":"lastboard@pve!lb","secret":"","insecure":true}`).Body.Close()

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

	pxSave(t, server.URL, s, `{"enabled":true,"url":"192.168.1.10:8006","token_id":"a@pve!b","secret":"c"}`).Body.Close()

	_, body := pxGet(t, server.URL, "/api/proxmox/settings", s)
	if body["url"] != "https://192.168.1.10:8006" {
		t.Errorf("url = %v, want it prefixed with https://", body["url"])
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
	pxSave(t, server.URL, s, `{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}`).Body.Close()

	var out struct {
		Cluster bool `json:"cluster"`
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
	json.NewDecoder(resp.Body).Decode(&out)

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
	pxSave(t, server.URL, admin, `{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}`).Body.Close()

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
	pxSave(t, server.URL, s, `{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}`).Body.Close()

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
	pxSave(t, server.URL, s, `{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}`).Body.Close()

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
	pxSave(t, server.URL, s, `{"enabled":true,"url":"`+fake.URL+`","token_id":"a@pve!b","secret":"c","insecure":true}`).Body.Close()

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
