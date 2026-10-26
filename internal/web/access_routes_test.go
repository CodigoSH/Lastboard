package web

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/access"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

// asMember adds a member with these grants and returns a function that sends a
// request as it, with a session and a matching CSRF token.
func asMember(t *testing.T, srv *Server, name string, g access.Grants) func(method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	res, err := srv.DB.Exec("INSERT INTO users (username, password, role) VALUES (?, 'x', 'user')", name)
	if err != nil {
		t.Fatal(err)
	}
	id, _ := res.LastInsertId()
	if _, err := srv.DB.Exec(`INSERT INTO user_access (user_id, grants) VALUES (?, ?)
		ON CONFLICT (user_id) DO UPDATE SET grants = excluded.grants`, id, access.Encode(g)); err != nil {
		t.Fatal(err)
	}
	return asAccount(srv, int(id))
}

// nextAddr gives every simulated account an address of its own. The rate limiter
// keeps one bucket per address for the whole process, and these tests send many
// requests: from httptest's default address they emptied the bucket that the
// other tests of this package share, which then failed with a 429.
var nextAddr atomic.Int32

func asAccount(srv *Server, id int) func(method, path, body string) *httptest.ResponseRecorder {
	token := util.SignToken(util.AccountSessionPayload(id, 0), srv.sessionSecret, time.Now().Add(time.Hour))
	n := nextAddr.Add(1)
	addr := fmt.Sprintf("10.77.%d.%d:4000", n/250, n%250+1)
	return func(method, path, body string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.RemoteAddr = addr
		req.AddCookie(&http.Cookie{Name: "session_token", Value: token})
		req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "t"})
		req.Header.Set("X-CSRF-Token", "t")
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		srv.ServeHTTP(w, req)
		return w
	}
}

func adminOf(t *testing.T, srv *Server) func(method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	var id int
	if err := srv.DB.QueryRow("SELECT id FROM users WHERE username = 'probe'").Scan(&id); err != nil {
		t.Fatal(err)
	}
	return asAccount(srv, id)
}

func TestAMemberIsRefusedWhatItWasNotGiven(t *testing.T) {
	srv := newTestServer(t, true)
	viewer := asMember(t, srv, "wallscreen", access.Viewer())
	admin := adminOf(t, srv)

	for _, c := range []struct{ method, path, body string }{
		{http.MethodPost, "/api/dashboard/item", `{}`},
		{http.MethodPost, "/api/widget/api-fetch", `{"url":"http://example.com"}`},
		{http.MethodPost, "/api/dashboard/health/batch", `{"urls":["http://example.com"]}`},
		{http.MethodGet, "/api/monitor/overview", ``},
		{http.MethodGet, "/api/proxmox/overview", ``},
		{http.MethodGet, "/api/proxmox/tasks?node=kprox", ``},
		{http.MethodGet, "/api/proxmox/task-log?node=kprox&upid=x", ``},
		{http.MethodGet, "/api/proxmox/journal?node=kprox", ``},
		{http.MethodPost, "/api/docker/containers", `{"host":"local"}`},
		{http.MethodPost, "/api/docker/detail", `{"host_id":"x","id":"a"}`},
		{http.MethodPost, "/api/docker/logs", `{"host_id":"x","id":"a"}`},
		{http.MethodGet, "/api/export/native", ``},
		{http.MethodGet, "/api/users", ``},
		{http.MethodGet, "/api/system/backup", ``},
	} {
		if w := viewer(c.method, c.path, c.body); w.Code != http.StatusForbidden {
			t.Errorf("a Viewer: %s %s = %d, want 403", c.method, c.path, w.Code)
		}
	}

	// What every account may do, it may still do.
	if w := viewer(http.MethodGet, "/api/dashboard", ""); w.Code != http.StatusOK {
		t.Errorf("a Viewer must still read its board: GET /api/dashboard = %d", w.Code)
	}
	w := viewer(http.MethodGet, "/api/me", "")
	if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), `"profile":"viewer"`) {
		t.Errorf("/api/me should tell the account it is a viewer: %d %s", w.Code, w.Body.String())
	}

	// The administrator is never refused for want of a permission.
	if w := admin(http.MethodGet, "/api/users", ""); w.Code == http.StatusForbidden {
		t.Errorf("the administrator was refused GET /api/users")
	}
	if w := admin(http.MethodGet, "/api/me", ""); !strings.Contains(w.Body.String(), `"profile":"admin"`) {
		t.Errorf("/api/me should tell the administrator it is one: %s", w.Body.String())
	}
}

// The server's telemetry travels over the WebSocket; an account without it is
// refused before the connection is upgraded.
func TestTheServersTelemetryNeedsItsPermission(t *testing.T) {
	srv := newTestServer(t, true)
	g := access.Viewer()
	g.ServerTelemetry = false
	blind := asMember(t, srv, "blind", g)
	if w := blind(http.MethodGet, "/ws", ""); w.Code != http.StatusForbidden {
		t.Errorf("GET /ws without the permission = %d, want 403", w.Code)
	}
}

// What a member points the server at may only be on the internet unless it was
// given the local network. Measured against a real server on 127.0.0.1: the
// request must not arrive at all, not merely fail afterwards.
func TestAnInternetOnlyMemberCannotMakeTheServerReachTheLocalNetwork(t *testing.T) {
	var hits atomic.Int32
	local := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"v":1}`))
	}))
	defer local.Close()

	srv := newTestServer(t, true)
	household := asMember(t, srv, "household", access.Standard())
	homelab := asMember(t, srv, "homelab", access.Homelab())
	fetch := fmt.Sprintf(`{"url":%q,"paths":["v"]}`, local.URL)
	batch := fmt.Sprintf(`{"urls":[%q]}`, local.URL)

	w := household(http.MethodPost, "/api/widget/api-fetch", fetch)
	if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), `"ok":false`) {
		t.Errorf("API widget, internet-only member: %d %s, want a refused fetch", w.Code, w.Body.String())
	}
	var status map[string]string
	w = household(http.MethodPost, "/api/dashboard/health/batch", batch)
	_ = json.Unmarshal(w.Body.Bytes(), &status)
	if status[local.URL] != "down" {
		t.Errorf("status check, internet-only member: %v, want down", status)
	}
	if n := hits.Load(); n != 0 {
		t.Fatalf("the local server received %d requests made for an internet-only member", n)
	}

	// The same requests for a member given the local network do arrive.
	if w := homelab(http.MethodPost, "/api/widget/api-fetch", fetch); !strings.Contains(w.Body.String(), `"ok":true`) {
		t.Errorf("API widget, member with the local network: %s, want the values", w.Body.String())
	}
	status = nil
	w = homelab(http.MethodPost, "/api/dashboard/health/batch", batch)
	_ = json.Unmarshal(w.Body.Bytes(), &status)
	if status[local.URL] != "up" {
		t.Errorf("status check, member with the local network: %v, want up", status)
	}
	if hits.Load() == 0 {
		t.Error("a member given the local network never reached it: the test above would pass for a server that reaches nothing")
	}
}

// The dialer only runs when a connection is opened, and clients keep connections
// open for the next request to the same host. A member given the local network
// goes first and leaves one open; an internet-only member asking the same host
// must not ride on it. Both the API widget and the status checks are covered,
// in that order, because the order is the whole point.
func TestAnInternetOnlyMemberDoesNotReuseAnotherAccountsConnection(t *testing.T) {
	var hits atomic.Int32
	local := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"v":1}`))
	}))
	defer local.Close()

	srv := newTestServer(t, true)
	homelab := asMember(t, srv, "homelab", access.Homelab())
	household := asMember(t, srv, "household", access.Standard())
	fetch := fmt.Sprintf(`{"url":%q,"paths":["v"]}`, local.URL)
	batch := fmt.Sprintf(`{"urls":[%q]}`, local.URL)

	homelab(http.MethodPost, "/api/widget/api-fetch", fetch)
	homelab(http.MethodPost, "/api/dashboard/health/batch", batch)
	before := hits.Load()
	if before == 0 {
		t.Fatal("the member with the local network never reached it; nothing was left open to reuse")
	}

	household(http.MethodPost, "/api/widget/api-fetch", fetch)
	household(http.MethodPost, "/api/dashboard/health/batch", batch)
	if n := hits.Load() - before; n != 0 {
		t.Errorf("an internet-only member reached the local server %d times on a connection another account opened", n)
	}
}

func idOf(t *testing.T, srv *Server, username string) int {
	t.Helper()
	var id int
	if err := srv.DB.QueryRow("SELECT id FROM users WHERE username = ?", username).Scan(&id); err != nil {
		t.Fatalf("no account %s: %v", username, err)
	}
	return id
}

func meOf(t *testing.T, as func(method, path, body string) *httptest.ResponseRecorder) (profile, label string) {
	t.Helper()
	var me struct {
		Label  string `json:"label"`
		Access struct {
			Profile string `json:"profile"`
		} `json:"access"`
	}
	if err := json.Unmarshal(as(http.MethodGet, "/api/me", "").Body.Bytes(), &me); err != nil {
		t.Fatal(err)
	}
	return me.Access.Profile, me.Label
}

// What an account may do is chosen when the administrator creates it, and can
// be changed later; the change holds from the account's next request.
func TestTheAdministratorChoosesWhatAnAccountMayDo(t *testing.T) {
	srv := newTestServer(t, true)
	admin := adminOf(t, srv)

	create := func(body string) int {
		t.Helper()
		w := admin(http.MethodPost, "/api/users", body)
		if w.Code != http.StatusCreated && w.Code != http.StatusOK {
			t.Fatalf("POST /api/users %s = %d %s", body, w.Code, w.Body.String())
		}
		return w.Code
	}
	create(`{"username":"screen","password":"Wall-Screen-1234","profile":"viewer","label":"Living room"}`)
	create(`{"username":"kid","password":"Kid-Account-1234"}`)
	create(`{"username":"odd","password":"Odd-Account-1234","grants":{"board_edit":true,"docker":7}}`)

	screen := asAccount(srv, idOf(t, srv, "screen"))
	if p, l := meOf(t, screen); p != "viewer" || l != "Living room" {
		t.Errorf("screen: profile %q label %q, want viewer / Living room", p, l)
	}
	// Saying nothing about permissions is Standard: the form's starting point.
	if p, _ := meOf(t, asAccount(srv, idOf(t, srv, "kid"))); p != "standard" {
		t.Errorf("an account created without permissions is %q, want standard", p)
	}
	// Permissions one by one are custom, and a level out of the scale is clamped.
	var users []map[string]any
	_ = json.Unmarshal(admin(http.MethodGet, "/api/users", "").Body.Bytes(), &users)
	for _, u := range users {
		if u["username"] == "odd" {
			g, _ := u["grants"].(map[string]any)
			if u["profile"] != "custom" || g["docker"] != float64(2) {
				t.Errorf("odd: profile %v docker %v, want custom and 2", u["profile"], g["docker"])
			}
		}
		if u["username"] == "screen" && (u["label"] != "Living room" || u["profile"] != "viewer") {
			t.Errorf("the list shows screen as %v / %v", u["label"], u["profile"])
		}
	}

	// A change holds from the next request, with no new sign-in.
	if w := screen(http.MethodGet, "/api/proxmox/settings", ""); w.Code != http.StatusForbidden {
		t.Fatalf("a viewer reading Proxmox = %d, want 403", w.Code)
	}
	upd := fmt.Sprintf(`{"id":%d,"username":"screen","profile":"homelab"}`, idOf(t, srv, "screen"))
	if w := admin(http.MethodPut, "/api/users", upd); w.Code != http.StatusOK {
		t.Fatalf("changing the profile = %d %s", w.Code, w.Body.String())
	}
	if w := screen(http.MethodGet, "/api/proxmox/settings", ""); w.Code != http.StatusOK {
		t.Errorf("after the change, reading Proxmox = %d, want 200", w.Code)
	}
	if _, l := meOf(t, screen); l != "Living room" {
		t.Errorf("changing the profile lost the label: %q", l)
	}

	// A profile that is not one is refused, not taken as a default.
	if w := admin(http.MethodPost, "/api/users", `{"username":"bad","password":"Bad-Account-1234","profile":"root"}`); w.Code != http.StatusBadRequest {
		t.Errorf("an unknown profile = %d, want 400", w.Code)
	}
}

// A label is the administrator's to give. A member cannot change its own; the
// administrator names its own account through a route of its own.
func TestLabels(t *testing.T) {
	srv := newTestServer(t, true)
	admin := adminOf(t, srv)
	member := asMember(t, srv, "ana", access.Homelab())

	if w := member(http.MethodPut, "/api/user/label", `{"label":"Boss"}`); w.Code != http.StatusForbidden {
		t.Errorf("a member setting its own label = %d, want 403", w.Code)
	}
	if w := admin(http.MethodPut, "/api/user/label", `{"label":"  Owner\u0007  "}`); w.Code != http.StatusNoContent {
		t.Fatalf("the administrator setting its own label = %d", w.Code)
	}
	if _, l := meOf(t, admin); l != "Owner" {
		t.Errorf("label = %q, want it trimmed and without control characters", l)
	}
	// Counted in characters, not bytes: a Japanese label is cut at 24 of them.
	long := strings.Repeat("ぜ", 30)
	upd := fmt.Sprintf(`{"id":%d,"username":"ana","label":%q}`, idOf(t, srv, "ana"), long)
	if w := admin(http.MethodPut, "/api/users", upd); w.Code != http.StatusOK {
		t.Fatalf("labelling a member = %d", w.Code)
	}
	if _, l := meOf(t, member); len([]rune(l)) != 24 {
		t.Errorf("a 30-character label kept %d characters, want 24", len([]rune(l)))
	}
}
