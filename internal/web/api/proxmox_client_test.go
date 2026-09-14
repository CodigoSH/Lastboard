package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// The header Proxmox expects is one string with two separators in it, and
// getting either wrong answers 401 with no hint. Written down here so a tidy-up
// cannot quietly change the shape.
func TestTheTokenHeaderHasTheShapeProxmoxExpects(t *testing.T) {
	var got string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.Header.Get("Authorization")
		w.Write([]byte(`{"data":{"version":"9.2.20"}}`))
	}))
	defer srv.Close()

	cfg := proxmoxConfig{URL: srv.URL, TokenID: "lastboard@pve!lastboard", Secret: "61b6dfca-9f17"}
	var out struct {
		Version string `json:"version"`
	}
	if err := proxmoxDo(cfg, http.MethodGet, "/version", &out); err != nil {
		t.Fatalf("call failed: %v", err)
	}

	const want = "PVEAPIToken=lastboard@pve!lastboard=61b6dfca-9f17"
	if got != want {
		t.Errorf("Authorization header\n got: %q\nwant: %q", got, want)
	}
	if out.Version != "9.2.20" {
		t.Errorf("the data envelope was not unwrapped: %+v", out)
	}
}

// A 401 and a 403 mean different things to whoever configured this — wrong
// token versus right token without a privilege — and the difference is the
// whole content of the error message they will read.
func TestTheStatusCodeSurvivesAsAnError(t *testing.T) {
	for _, tc := range []struct {
		status int
		want   string
	}{
		{http.StatusUnauthorized, "proxmox.bad_token"},
		{http.StatusForbidden, "proxmox.forbidden"},
		{http.StatusInternalServerError, "proxmox.connection_error"},
	} {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "nope", tc.status)
		}))
		cfg := proxmoxConfig{URL: srv.URL, TokenID: "a@pve!b", Secret: "c"}
		err := proxmoxDo(cfg, http.MethodGet, "/version", nil)
		srv.Close()

		if err == nil || err.Error() != tc.want {
			t.Errorf("HTTP %d gave %v, want %s", tc.status, err, tc.want)
		}
	}
}

// The reason this exists: `timeframe=day` answers with 1440 points, measured.
func TestDownsampleCutsTheDayDownToSomethingDrawable(t *testing.T) {
	day := make([]float64, 1440)
	for i := range day {
		day[i] = 1
	}
	got := downsample(day, proxmoxSeriesPoints)
	if len(got) != proxmoxSeriesPoints {
		t.Fatalf("1440 points became %d, want %d", len(got), proxmoxSeriesPoints)
	}
	for i, v := range got {
		if v != 1 {
			t.Fatalf("a flat series came back bumpy at %d: %v", i, v)
		}
	}
}

// Averaging, not decimating. A spike between two chosen samples vanishes from a
// decimated series — and a spike is the one thing somebody is looking for.
func TestDownsampleKeepsASpikeThatDecimatingWouldLose(t *testing.T) {
	in := make([]float64, 600)
	in[301] = 100 // deliberately not on a 10-sample boundary

	got := downsample(in, 60)
	if len(got) != 60 {
		t.Fatalf("got %d points", len(got))
	}
	total := 0.0
	for _, v := range got {
		total += v
	}
	if total == 0 {
		t.Fatal("the spike disappeared: the series is being decimated, not averaged")
	}
}

func TestDownsampleLeavesAShortSeriesAlone(t *testing.T) {
	in := []float64{1, 2, 3}
	got := downsample(in, 60)
	if len(got) != 3 {
		t.Fatalf("a 3-point series became %d points", len(got))
	}
	if downsample(in, 0) == nil || len(downsample(in, 0)) != 3 {
		t.Error("want <= 0 should hand the series back untouched")
	}
}

// Proxmox reports CPU as a fraction of 1. Reading it as a percentage is the
// mistake this function exists to make impossible past its own boundary.
func TestPercentTurnsTheFractionIntoWhatAPersonReads(t *testing.T) {
	cases := map[float64]float64{
		0.0212840195394278:   2.1,
		0.000105700601938183: 0.0,
		0.5:                  50,
		1:                    100,
		0:                    0,
		-1:                   0,
	}
	for in, want := range cases {
		if got := percent(in); got != want {
			t.Errorf("percent(%v) = %v, want %v", in, got, want)
		}
	}
	// A container idling must not round away to a bare 0 when it is measurable.
	if got := percent(0.0005); got != 0.1 {
		t.Errorf("percent(0.0005) = %v, want 0.1", got)
	}
}

func TestRatioGuardsTheDivision(t *testing.T) {
	if got := ratio(15826968576, 33373859840); got != 47.4 {
		t.Errorf("ratio of the measured node memory = %v, want 47.4", got)
	}
	if got := ratio(1, 0); got != 0 {
		t.Errorf("ratio with a zero total = %v, want 0", got)
	}
}

// Measured on the real host: a token with PVEAuditor reads everything this page
// shows and CANNOT start a machine. If this ever returns PowerMgmt true for
// that set, the interface starts offering a button that answers 403.
func TestAnAuditorTokenCanReadAndCannotPower(t *testing.T) {
	auditor := map[string]map[string]int{
		"/": {"Datastore.Audit": 1, "Sys.Audit": 1, "VM.Audit": 1, "VM.GuestAgent.Audit": 1},
	}
	caps := capsFrom(auditor)
	if !caps.Read {
		t.Error("an auditor token must be able to read")
	}
	if caps.PowerMgmt {
		t.Error("an auditor token must NOT be offered the power buttons")
	}

	// The role the documentation asks for adds exactly one privilege.
	withPower := map[string]map[string]int{
		"/": {"Datastore.Audit": 1, "Sys.Audit": 1, "VM.Audit": 1, "VM.PowerMgmt": 1},
	}
	if got := capsFrom(withPower); !got.Read || !got.PowerMgmt {
		t.Errorf("the documented role should read and power: %+v", got)
	}

	if got := capsFrom(nil); got.Read || got.PowerMgmt {
		t.Errorf("no permissions at all should grant nothing: %+v", got)
	}
}

// The kind and the action arrive from a request and end up in a URL path on the
// hypervisor. They are closed sets so that nothing else can be reached.
func TestPowerPathRefusesAnythingItDoesNotOffer(t *testing.T) {
	if got, err := proxmoxPowerPath("kprox", "lxc", 106, "start"); err != nil || got != "/nodes/kprox/lxc/106/status/start" {
		t.Fatalf("a valid call gave %q, %v", got, err)
	}
	if got, err := proxmoxPowerPath("kprox", "qemu", 2000, "shutdown"); err != nil || got != "/nodes/kprox/qemu/2000/status/shutdown" {
		t.Fatalf("a valid qemu call gave %q, %v", got, err)
	}

	for _, tc := range []struct {
		name, node, kind string
		vmid             int
		action           string
	}{
		{"an action we do not offer", "kprox", "lxc", 106, "destroy"},
		{"a kind that is not a guest", "kprox", "storage", 106, "start"},
		{"a node that climbs out of the path", "kprox/../../access", "lxc", 106, "start"},
		{"no vmid", "kprox", "lxc", 0, "start"},
		{"no node", "", "lxc", 106, "start"},
	} {
		if _, err := proxmoxPowerPath(tc.node, tc.kind, tc.vmid, tc.action); err == nil {
			t.Errorf("%s was accepted", tc.name)
		}
	}
}

func TestTheRangesTheInterfaceOffersMapOntoTheAPI(t *testing.T) {
	for in, want := range map[string]string{"1h": "hour", "24h": "day", "7d": "week"} {
		got, ok := proxmoxTimeframe(in)
		if !ok || got != want {
			t.Errorf("%q mapped to %q (%v), want %q", in, got, ok, want)
		}
	}
	if _, ok := proxmoxTimeframe("year"); ok {
		t.Error("a range the interface does not offer must be refused, not passed through")
	}
}

// The shape of /cluster/resources is what makes one request enough. This locks
// the field names against the real payload measured on 9.2.20.
func TestTheResourceShapeMatchesWhatTheHostSends(t *testing.T) {
	const measured = `{"data":[
      {"type":"node","id":"node/kprox","node":"kprox","status":"online","cpu":0.0167679364337462,
       "maxcpu":16,"mem":16030162944,"maxmem":33373859840,"disk":17019961344,"maxdisk":2584175706112,"uptime":1415110},
      {"type":"lxc","id":"lxc/100","node":"kprox","name":"adguard-1","status":"running","vmid":100,
       "cpu":0.000105700601938183,"maxcpu":1,"mem":165392384,"maxmem":536870912,"template":0},
      {"type":"storage","id":"storage/kprox/local-zfs","node":"kprox","storage":"local-zfs",
       "status":"available","plugintype":"zfspool","shared":0,"disk":1273460500752,"maxdisk":3840616284032}]}`

	var envelope struct {
		Data []pxResource `json:"data"`
	}
	if err := json.Unmarshal([]byte(measured), &envelope); err != nil {
		t.Fatalf("the measured payload no longer decodes: %v", err)
	}
	got := envelope.Data
	if len(got) != 3 {
		t.Fatalf("decoded %d rows, want 3", len(got))
	}
	if got[0].MaxCPU != 16 || got[0].Node != "kprox" {
		t.Errorf("node row lost fields: %+v", got[0])
	}
	if got[1].Name != "adguard-1" || got[1].VMID != 100 {
		t.Errorf("guest row lost fields: %+v", got[1])
	}
	if got[2].Storage != "local-zfs" || got[2].PluginType != "zfspool" {
		t.Errorf("storage row lost fields: %+v", got[2])
	}
	// And the trap, end to end: the fraction has to come out as a percentage.
	if p := percent(got[0].CPU); p != 1.7 {
		t.Errorf("node CPU came out as %v%%, want 1.7", p)
	}
}

// A body far past anything legitimate must not be read into memory whole.
func TestAHugeResponseIsCapped(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"data":"`))
		chunk := strings.Repeat("x", 1<<20)
		for i := 0; i < 12; i++ {
			w.Write([]byte(chunk))
		}
		w.Write([]byte(`"}`))
	}))
	defer srv.Close()

	cfg := proxmoxConfig{URL: srv.URL, TokenID: "a@pve!b", Secret: "c"}
	var out string
	err := proxmoxDo(cfg, http.MethodGet, "/version", &out)
	if err == nil {
		t.Fatal("a 12MB body was accepted; the cap is not being applied")
	}
}
