package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func tfx(t *testing.T, name string) []byte {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("testdata", "telemetry", name))
	if err != nil {
		t.Fatal(err)
	}
	return b
}

// fakeGlances answers like a real Glances: version 3 or 4, optionally behind
// Basic auth. Bodies are the captures of real servers.
func fakeGlances(t *testing.T, major, password string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if password != "" {
			if _, pw, ok := r.BasicAuth(); !ok || pw != password {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
		}
		prefix := "/api/" + major + "/"
		if !strings.HasPrefix(r.URL.Path, prefix) {
			http.NotFound(w, r)
			return
		}
		switch strings.TrimPrefix(r.URL.Path, prefix) {
		case "quicklook":
			w.Write(tfx(t, "glances"+major+"_quicklook.json"))
		case "sensors":
			w.Write(tfx(t, "glances"+major+"_sensors.json"))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

type remoteAnswer struct {
	OK    bool   `json:"ok"`
	Error string `json:"error"`
	Stats *struct {
		CPU     *float64 `json:"cpu"`
		RAM     *float64 `json:"ram"`
		Temp    *float64 `json:"temp"`
		Version string   `json:"version"`
	} `json:"stats"`
}

func askRemote(t *testing.T, method, url string, cookie *http.Cookie, body string) (int, remoteAnswer, string) {
	t.Helper()
	code, raw := secretReq(t, method, url, cookie, body)
	var a remoteAnswer
	json.Unmarshal([]byte(raw), &a)
	return code, a, raw
}

func TestRemoteGlancesBothVersionsAndTheirPassword(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "alice", "correcthorse", "user")
	cookie := loginAndGetCookie(t, server, "alice", "correcthorse")

	for _, major := range []string{"4", "3"} {
		g := fakeGlances(t, major, "")
		_, a, raw := askRemote(t, "POST", server.URL+"/api/widget/remote-stats/test", cookie,
			`{"config":{"source":"glances","url":"`+g.URL+`/"}}`)
		if !a.OK || a.Stats == nil || a.Stats.Version != major {
			t.Fatalf("glances %s: %s", major, raw)
		}
		if a.Stats.RAM == nil || *a.Stats.RAM != 23 || a.Stats.Temp == nil || *a.Stats.Temp != 51 {
			t.Errorf("glances %s numbers: %s", major, raw)
		}
	}

	// With a password: asked without one, wrong, and right — and the right one
	// stored on the widget is used by the widget's own endpoint without the page
	// ever holding it.
	g := fakeGlances(t, "4", "s3cret-pass")
	cfg := `{"source":"glances","url":"` + g.URL + `","username":"glances"}`
	_, a, _ := askRemote(t, "POST", server.URL+"/api/widget/remote-stats/test", cookie, `{"config":`+cfg+`}`)
	if a.OK || a.Error != "auth_required" {
		t.Errorf("no password: %+v", a)
	}
	_, a, _ = askRemote(t, "POST", server.URL+"/api/widget/remote-stats/test", cookie, `{"config":`+cfg+`,"password":"wrong"}`)
	if a.OK || a.Error != "auth_rejected" {
		t.Errorf("wrong password: %+v", a)
	}
	_, a, _ = askRemote(t, "POST", server.URL+"/api/widget/remote-stats/test", cookie, `{"config":`+cfg+`,"password":"s3cret-pass"}`)
	if !a.OK {
		t.Errorf("right password: %+v", a)
	}

	res, _ := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 0, 0, 1, 1, ?)`, cfg)
	wid, _ := res.LastInsertId()
	db.Exec(`INSERT INTO widget_secrets (item_id, name, value) VALUES (?, 'password', 's3cret-pass')`, wid)
	code, a, raw := askRemote(t, "GET", server.URL+"/api/widget/"+itoa(wid)+"/remote-stats", cookie, "")
	if code != 200 || !a.OK || strings.Contains(raw, "s3cret-pass") {
		t.Fatalf("by id: %d %s", code, raw)
	}
	// Editing the address of a saved widget does not mean retyping the password.
	_, a, _ = askRemote(t, "POST", server.URL+"/api/widget/remote-stats/test", cookie, `{"id":`+itoa(wid)+`,"config":`+cfg+`}`)
	if !a.OK {
		t.Errorf("stored password not used by the test: %+v", a)
	}
}

func TestRemoteNetdataAndAHostThatIsNotAMonitor(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "alice", "correcthorse", "user")
	cookie := loginAndGetCookie(t, server, "alice", "correcthorse")

	nd := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/allmetrics" && r.URL.Query().Get("format") == "json" {
			w.Write(tfx(t, "netdata2_allmetrics.json"))
			return
		}
		http.NotFound(w, r)
	}))
	defer nd.Close()
	_, a, raw := askRemote(t, "POST", server.URL+"/api/widget/remote-stats/test", cookie,
		`{"config":{"source":"netdata","url":"`+nd.URL+`"}}`)
	if !a.OK || a.Stats.Temp == nil || *a.Stats.Temp != 51 {
		t.Errorf("netdata: %s", raw)
	}

	// A web server that is not a monitor is "unsupported", not "online".
	other := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("<html>hi</html>")) }))
	defer other.Close()
	_, a, _ = askRemote(t, "POST", server.URL+"/api/widget/remote-stats/test", cookie,
		`{"config":{"source":"glances","url":"`+other.URL+`"}}`)
	if a.OK || a.Error != "unsupported" {
		t.Errorf("not a monitor: %+v", a)
	}

	// Nothing listening.
	dead := httptest.NewServer(http.NotFoundHandler())
	deadURL := dead.URL
	dead.Close()
	_, a, _ = askRemote(t, "POST", server.URL+"/api/widget/remote-stats/test", cookie,
		`{"config":{"source":"netdata","url":"`+deadURL+`"}}`)
	if a.OK || a.Error != "unreachable" {
		t.Errorf("dead: %+v", a)
	}

	for _, bad := range []string{"ftp://x", "not a url", "http://169.254.169.254/", ""} {
		_, a, _ = askRemote(t, "POST", server.URL+"/api/widget/remote-stats/test", cookie,
			`{"config":{"source":"netdata","url":"`+bad+`"}}`)
		if a.OK || a.Error != "invalid_url" {
			t.Errorf("%q: %+v", bad, a)
		}
	}
}

func TestRemoteCustomJSONWithASecretHeader(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "alice", "correcthorse", "user")
	cookie := loginAndGetCookie(t, server, "alice", "correcthorse")

	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Token") != "tok-1" {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		w.Write([]byte(`{"load":{"cpu":"12.5%"},"mem":{"used":2048,"total":8192},"thermal":[{"c":61.2}]}`))
	}))
	defer api.Close()
	cfg := `{"source":"custom","url":"` + api.URL + `","header_name":"X-Token","cpu_path":"load.cpu","ram_used_path":"mem.used","ram_total_path":"mem.total","temp_path":"thermal[0].c"}`

	_, a, _ := askRemote(t, "POST", server.URL+"/api/widget/remote-stats/test", cookie, `{"config":`+cfg+`}`)
	if a.OK || a.Error != "auth_rejected" {
		t.Errorf("no header value: %+v", a)
	}
	_, a, raw := askRemote(t, "POST", server.URL+"/api/widget/remote-stats/test", cookie, `{"config":`+cfg+`,"password":"tok-1"}`)
	if !a.OK || *a.Stats.CPU != 12.5 || *a.Stats.RAM != 25 || *a.Stats.Temp != 61.2 {
		t.Errorf("custom: %s", raw)
	}
}

// Another person's widget id answers "not found", and its stored password is not
// something a test request can borrow.
func TestRemoteStatsStayWithTheirOwner(t *testing.T) {
	server, db, cleanup := setupTestServer(t)
	defer cleanup()
	createUser(t, db, "alice", "correcthorse", "user")
	createUser(t, db, "mallory", "correcthorse", "user")
	g := fakeGlances(t, "4", "alice-only")
	cfg := `{"source":"glances","url":"` + g.URL + `"}`
	res, _ := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 0, 0, 1, 1, ?)`, cfg)
	wid, _ := res.LastInsertId()
	db.Exec(`INSERT INTO widget_secrets (item_id, name, value) VALUES (?, 'password', 'alice-only')`, wid)
	mallory := loginAndGetCookie(t, server, "mallory", "correcthorse")

	if code, _, _ := askRemote(t, "GET", server.URL+"/api/widget/"+itoa(wid)+"/remote-stats", mallory, ""); code != http.StatusNotFound {
		t.Errorf("read: %d", code)
	}
	_, a, _ := askRemote(t, "POST", server.URL+"/api/widget/remote-stats/test", mallory, `{"id":`+itoa(wid)+`,"config":`+cfg+`}`)
	if a.OK || a.Error != "auth_required" {
		t.Errorf("mallory borrowed alice's password: %+v", a)
	}
}
