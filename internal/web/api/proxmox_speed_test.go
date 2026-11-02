package api_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
)

// slowPve is a hypervisor that takes its time over each call, as a real one a network
// hop away does, with as many nodes as it is given, some of them offline.
type slowPve struct {
	*httptest.Server
	mu      sync.Mutex
	calls   map[string]int
	delay   map[string]time.Duration // by the kind of call: resources, permissions, status, rrddata
	nodes   []string
	offline map[string]bool
	failRRD map[string]bool
}

func newSlowPve(t *testing.T, nodes ...string) *slowPve {
	p := &slowPve{calls: map[string]int{}, delay: map[string]time.Duration{}, nodes: nodes, offline: map[string]bool{}, failRRD: map[string]bool{}}
	p.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api2/json")
		kind := "other"
		switch {
		case path == "/cluster/resources":
			kind = "resources"
		case path == "/access/permissions":
			kind = "permissions"
		case strings.HasSuffix(path, "/status"):
			kind = "status"
		case strings.HasSuffix(path, "/rrddata"):
			kind = "rrddata"
		}
		p.mu.Lock()
		p.calls[kind]++
		p.calls[path]++
		d := p.delay[kind]
		fail := kind == "rrddata" && p.failRRD[strings.Split(path, "/")[2]]
		p.mu.Unlock()
		time.Sleep(d)
		w.Header().Set("Content-Type", "application/json")
		switch kind {
		case "resources":
			var rows []string
			for _, n := range p.nodes {
				status := "online"
				if p.offline[n] {
					status = "offline"
				}
				rows = append(rows, fmt.Sprintf(`{"type":"node","node":%q,"status":%q,"cpu":0.1,"mem":100,"maxmem":1000,"disk":1,"maxdisk":10,"maxcpu":8,"uptime":10}`, n, status))
			}
			fmt.Fprintf(w, `{"data":[%s]}`, strings.Join(rows, ","))
		case "permissions":
			w.Write([]byte(`{"data":{"/":{"VM.Audit":1,"Sys.Audit":1}}}`))
		case "status":
			w.Write([]byte(`{"data":{"uptime":999,"cpuinfo":{"cores":4},"loadavg":["0.1","0.2","0.3"]}}`))
		case "rrddata":
			if fail {
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
			w.Write([]byte(`{"data":[{"time":1,"cpu":0.5,"memused":500,"memtotal":1000},{"time":2,"cpu":0.25,"memused":250,"memtotal":1000}]}`))
		default:
			w.Write([]byte(`{"data":[]}`))
		}
	}))
	t.Cleanup(p.Server.Close)
	return p
}

func (p *slowPve) count(kind string) int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.calls[kind]
}

type overviewBody struct {
	Hosts []struct {
		Name  string `json:"name"`
		Error string `json:"error"`
		Nodes []struct {
			Name  string `json:"name"`
			Cores int    `json:"cores"`
		} `json:"nodes"`
		Caps struct {
			Read bool `json:"read"`
		} `json:"caps"`
	} `json:"hosts"`
}

func readOverview(t *testing.T, serverURL string, s *userSession, query string) (overviewBody, time.Duration) {
	t.Helper()
	req, _ := http.NewRequest("GET", serverURL+"/api/proxmox/overview"+query, nil)
	s.attach(req)
	start := time.Now()
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("overview: %v", err)
	}
	defer resp.Body.Close()
	took := time.Since(start)
	var out overviewBody
	json.NewDecoder(resp.Body).Decode(&out)
	return out, took
}

func saveHosts(t *testing.T, serverURL string, s *userSession, hosts ...string) {
	t.Helper()
	var parts []string
	for i, h := range hosts {
		parts = append(parts, fmt.Sprintf(`{"enabled":true,"name":"H%d","url":%q,"token_id":"a@pve!b","secret":"c","insecure":true}`, i, h))
	}
	pxSave(t, serverURL, s, `{"hosts":[`+strings.Join(parts, ",")+`]}`).Body.Close()
}

// A host that does not answer is given the time it is given and then reported as not
// answering; the hosts that do are not kept waiting for it.
func TestAHostThatNeverAnswersIsGivenItsTimeAndNoMore(t *testing.T) {
	defer api.ProxmoxBudgetsForTest(300*time.Millisecond, 300*time.Millisecond)()
	api.ForgetProxmoxCapsForTest()
	up := newSlowPve(t, "n1")
	release := make(chan struct{})
	hung := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { <-release }))
	defer hung.Close()
	defer close(release)

	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	saveHosts(t, server.URL, s, up.URL, hung.URL)

	out, took := readOverview(t, server.URL, s, "")
	if took > 1500*time.Millisecond {
		t.Fatalf("the overview took %v: it waited for the host that does not answer", took)
	}
	if took < 250*time.Millisecond {
		t.Fatalf("the overview took only %v: the hung host was not even waited for its budget", took)
	}
	if len(out.Hosts) != 2 || len(out.Hosts[0].Nodes) != 1 || out.Hosts[0].Error != "" {
		t.Fatalf("the live host did not come back whole: %+v", out.Hosts)
	}
	if out.Hosts[1].Error == "" {
		t.Errorf("the host that never answered reported no error")
	}
}

// What the token may do is asked while the resources are, not after them; and it is
// kept, so the next refresh does not ask again.
func TestPermissionsAreAskedWithTheResourcesAndKept(t *testing.T) {
	api.ForgetProxmoxCapsForTest()
	pve := newSlowPve(t, "n1")
	pve.delay["resources"] = 250 * time.Millisecond
	pve.delay["permissions"] = 250 * time.Millisecond
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	saveHosts(t, server.URL, s, pve.URL)

	out, took := readOverview(t, server.URL, s, "")
	if took >= 480*time.Millisecond {
		t.Errorf("%v: one after the other, the two calls alone take 500 ms", took)
	}
	if !out.Hosts[0].Caps.Read {
		t.Errorf("the permissions did not reach the answer")
	}
	if _, again := readOverview(t, server.URL, s, ""); again >= 200*time.Millisecond+150*time.Millisecond {
		t.Errorf("the second overview took %v: it asked for the permissions again", again)
	}
	if n := pve.count("permissions"); n != 1 {
		t.Errorf("the permissions were asked %d times, want 1", n)
	}
}

// The nodes of a cluster are asked for their own status together, and one that the
// hypervisor says is offline is not asked at all.
func TestTheNodesOfAClusterAreAskedTogetherAndAnOfflineOneNotAtAll(t *testing.T) {
	api.ForgetProxmoxCapsForTest()
	pve := newSlowPve(t, "a", "b", "c", "d", "gone")
	pve.offline["gone"] = true
	pve.delay["status"] = 250 * time.Millisecond
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	saveHosts(t, server.URL, s, pve.URL)

	out, took := readOverview(t, server.URL, s, "")
	if took >= 700*time.Millisecond {
		t.Errorf("%v: four nodes one after the other take a second", took)
	}
	if n := pve.count("status"); n != 4 {
		t.Errorf("%d status calls, want 4: the offline node must not be asked", n)
	}
	if pve.count("/nodes/gone/status") != 0 {
		t.Errorf("the offline node was asked for its status")
	}
	for _, n := range out.Hosts[0].Nodes {
		if n.Name != "gone" && n.Cores != 4 {
			t.Errorf("node %s has %d cores, want 4: its status did not arrive", n.Name, n.Cores)
		}
	}
	if len(out.Hosts[0].Nodes) != 5 {
		t.Errorf("%d nodes, want all five listed, the offline one too", len(out.Hosts[0].Nodes))
	}
}

type curveBody struct {
	Nodes []struct {
		Host string    `json:"host"`
		Node string    `json:"node"`
		CPU  []float64 `json:"cpu"`
		Mem  []float64 `json:"mem"`
	} `json:"nodes"`
}

func hostIDs(t *testing.T, serverURL string, s *userSession) []string {
	t.Helper()
	_, body := pxGet(t, serverURL, "/api/proxmox/settings", s)
	var ids []string
	for _, h := range body["hosts"].([]any) {
		ids = append(ids, h.(map[string]any)["id"].(string))
	}
	return ids
}

// The curve of the fleet comes in one request, its nodes read together; one that fails
// is left out and the others come.
func TestTheFleetsCurveComesInOneRequestWithAllItsNodes(t *testing.T) {
	api.ForgetProxmoxCapsForTest()
	a, b := newSlowPve(t, "n1", "n2"), newSlowPve(t, "n3")
	for _, p := range []*slowPve{a, b} {
		p.delay["rrddata"] = 250 * time.Millisecond
	}
	b.failRRD["n3"] = true
	server, db, cleanup := setupProxmoxServer(t)
	defer cleanup()
	createUser(t, db.DB, "root", "password", "admin")
	s := doLogin(t, server.URL, "root", "password")
	saveHosts(t, server.URL, s, a.URL, b.URL)
	ids := hostIDs(t, server.URL, s)

	get := func(q string) (*http.Response, curveBody, time.Duration) {
		req, _ := http.NewRequest("GET", server.URL+"/api/proxmox/curve?"+q, nil)
		s.attach(req)
		start := time.Now()
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		var out curveBody
		json.NewDecoder(resp.Body).Decode(&out)
		return resp, out, time.Since(start)
	}

	resp, out, took := get("range=24h&nodes=" + ids[0] + "/n1," + ids[0] + "/n2," + ids[1] + "/n3")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d", resp.StatusCode)
	}
	if took >= 600*time.Millisecond {
		t.Errorf("%v: three nodes of 250 ms one after the other take 750", took)
	}
	if len(out.Nodes) != 2 {
		t.Fatalf("%d nodes came back, want the two that answered", len(out.Nodes))
	}
	for _, n := range out.Nodes {
		if len(n.CPU) == 0 || len(n.Mem) == 0 || n.CPU[0] != 50 || n.Mem[0] != 50 {
			t.Errorf("node %s: cpu %v mem %v, want 50 %% each as percentages", n.Node, n.CPU, n.Mem)
		}
		if n.Host != ids[0] {
			t.Errorf("node %s came back under host %q, want %q", n.Node, n.Host, ids[0])
		}
	}

	for _, bad := range []string{"range=24h", "range=24h&nodes=", "range=24h&nodes=nohost", "range=nonsense&nodes=" + ids[0] + "/n1", "range=24h&nodes=" + ids[0] + "/a%3Fb"} {
		if resp, _, _ := get(bad); resp.StatusCode != http.StatusBadRequest {
			t.Errorf("%q = %d, want 400", bad, resp.StatusCode)
		}
	}
	if resp, _, _ := get("range=24h&nodes=pxdoesnotexist/n1"); resp.StatusCode != http.StatusPreconditionFailed {
		t.Errorf("a host that is not the caller's = %d, want 412", resp.StatusCode)
	}
}
