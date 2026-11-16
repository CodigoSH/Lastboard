package web

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/access"
)

func TestWhatAnAccountDismissedIsItsOwnAndComesBack(t *testing.T) {
	srv := newTestServer(t, true)
	ana := asMember(t, srv, "ana", access.Homelab())
	luis := asMember(t, srv, "luis", access.Homelab())
	keysOf := func(as func(method, path, body string) *httptest.ResponseRecorder) []string {
		w := as(http.MethodGet, "/api/detect/dismissed", "")
		if w.Code != http.StatusOK {
			t.Fatalf("GET = %d %s", w.Code, w.Body.String())
		}
		var out struct {
			Keys []string `json:"keys"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
			t.Fatal(err)
		}
		return out.Keys
	}

	if k := keysOf(ana); len(k) != 0 {
		t.Fatalf("a new account dismissed %v", k)
	}
	if w := ana(http.MethodPost, "/api/detect/dismissed", `{"add":["d:h1/runner","d:h1/tunnel","p:h2/pve|106"]}`); w.Code != http.StatusNoContent {
		t.Fatalf("adding = %d %s", w.Code, w.Body.String())
	}
	if k := keysOf(ana); strings.Join(k, ",") != "d:h1/runner,d:h1/tunnel,p:h2/pve|106" {
		t.Errorf("ana dismissed %v", k)
	}
	if k := keysOf(luis); len(k) != 0 {
		t.Errorf("one account's dismissals reached another: %v", k)
	}
	if w := ana(http.MethodPost, "/api/detect/dismissed", `{"remove":["d:h1/runner"],"add":["d:h1/tunnel"]}`); w.Code != http.StatusNoContent {
		t.Fatalf("removing = %d", w.Code)
	}
	if k := keysOf(ana); strings.Join(k, ",") != "d:h1/tunnel,p:h2/pve|106" {
		t.Errorf("after removing, ana dismissed %v", k)
	}
}

func TestWhatCanBeDismissedIsBoundedAndNeedsToEditTheBoard(t *testing.T) {
	srv := newTestServer(t, true)
	ana := asMember(t, srv, "ana", access.Homelab())
	viewer := asMember(t, srv, "vera", access.Viewer())

	for _, bad := range []string{`{"add":["nope"]}`, `{"add":["x:h/a"]}`, `{"add":["d:nohost"]}`, `{"add":["d:h/` + strings.Repeat("a", 300) + `"]}`, `not json`} {
		if w := ana(http.MethodPost, "/api/detect/dismissed", bad); w.Code != http.StatusBadRequest {
			t.Errorf("%.40s = %d, want 400", bad, w.Code)
		}
	}
	for _, m := range []string{http.MethodGet, http.MethodPost} {
		if w := viewer(m, "/api/detect/dismissed", `{"add":["d:h/a"]}`); w.Code != http.StatusForbidden {
			t.Errorf("%s without editing the board = %d, want 403", m, w.Code)
		}
	}

	// A full list refuses a new one and keeps what it holds.
	var add []string
	for i := 0; i < 1000; i++ {
		add = append(add, "d:h/c"+strings.Repeat("x", i%5)+string(rune('a'+i%26))+strings.Repeat("0", i/26))
	}
	b, _ := json.Marshal(map[string]any{"add": add})
	if w := ana(http.MethodPost, "/api/detect/dismissed", string(b)); w.Code != http.StatusNoContent {
		t.Fatalf("filling the list = %d %s", w.Code, w.Body.String())
	}
	if w := ana(http.MethodPost, "/api/detect/dismissed", `{"add":["d:h/one-more"]}`); w.Code != http.StatusBadRequest {
		t.Errorf("a new key on a full list = %d, want 400", w.Code)
	}
	if w := ana(http.MethodPost, "/api/detect/dismissed", `{"add":["`+add[0]+`"]}`); w.Code != http.StatusNoContent {
		t.Errorf("a key it already holds on a full list = %d, want 204", w.Code)
	}
}

func TestADismissalGoesWithItsHost(t *testing.T) {
	srv := newTestServer(t, true)
	ana := asMember(t, srv, "ana", access.Homelab())
	body := `{"hosts":[{"id":"keep","name":"A","type":"agent","url":"10.0.0.2:9999","token":"t","enabled":true},{"id":"drop","name":"B","type":"agent","url":"10.0.0.3:9999","token":"t","enabled":true}]}`
	if w := ana(http.MethodPost, "/api/docker/settings", body); w.Code != http.StatusNoContent {
		t.Fatalf("settings = %d %s", w.Code, w.Body.String())
	}
	var ids []string
	w := ana(http.MethodGet, "/api/docker/settings", "")
	var got struct {
		Hosts []struct{ ID, Name string } `json:"hosts"`
	}
	json.Unmarshal(w.Body.Bytes(), &got)
	for _, h := range got.Hosts {
		ids = append(ids, h.ID)
	}
	if len(ids) != 2 {
		t.Fatalf("hosts = %v", got.Hosts)
	}
	add, _ := json.Marshal(map[string]any{"add": []string{"d:" + ids[0] + "/x", "d:" + ids[1] + "/y", "p:" + ids[1] + "/n|1"}})
	ana(http.MethodPost, "/api/detect/dismissed", string(add))
	// Docker keeps only the first: that host's container goes; a machine's key is the hypervisors' to prune.
	keep, _ := json.Marshal(map[string]any{"hosts": []map[string]any{{"id": ids[0], "name": "A", "type": "agent", "url": "10.0.0.2:9999", "enabled": true}}})
	if w := ana(http.MethodPost, "/api/docker/settings", string(keep)); w.Code != http.StatusNoContent {
		t.Fatalf("shrinking = %d %s", w.Code, w.Body.String())
	}
	w = ana(http.MethodGet, "/api/detect/dismissed", "")
	if s := w.Body.String(); !strings.Contains(s, "d:"+ids[0]+"/x") || strings.Contains(s, "d:"+ids[1]+"/y") || !strings.Contains(s, "p:"+ids[1]+"/n|1") {
		t.Errorf("after removing a Docker host: %s", s)
	}
}

func TestAMachinesDismissalGoesWithItsHypervisor(t *testing.T) {
	srv := newTestServer(t, true)
	ana := asMember(t, srv, "ana", access.Homelab())
	save := `{"hosts":[{"name":"A","url":"http://10.255.255.1:8006","token_id":"a@pve!b","secret":"c","enabled":true},{"name":"B","url":"http://10.255.255.2:8006","token_id":"a@pve!b","secret":"c","enabled":true}]}`
	if w := ana(http.MethodPost, "/api/proxmox/settings", save); w.Code != http.StatusNoContent {
		t.Fatalf("settings = %d %s", w.Code, w.Body.String())
	}
	var got struct {
		Hosts []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"hosts"`
	}
	json.Unmarshal(ana(http.MethodGet, "/api/proxmox/settings", "").Body.Bytes(), &got)
	if len(got.Hosts) != 2 {
		t.Fatalf("hosts = %+v", got.Hosts)
	}
	a, b := got.Hosts[0].ID, got.Hosts[1].ID
	add, _ := json.Marshal(map[string]any{"add": []string{"p:" + a + "/n|1", "p:" + b + "/n|2", "d:" + b + "/c"}})
	ana(http.MethodPost, "/api/detect/dismissed", string(add))
	keep := `{"hosts":[{"id":"` + a + `","name":"A","url":"http://10.255.255.1:8006","enabled":true}]}`
	if w := ana(http.MethodPost, "/api/proxmox/settings", keep); w.Code != http.StatusNoContent {
		t.Fatalf("shrinking = %d %s", w.Code, w.Body.String())
	}
	s := ana(http.MethodGet, "/api/detect/dismissed", "").Body.String()
	if !strings.Contains(s, "p:"+a+"/n|1") || strings.Contains(s, "p:"+b+"/n|2") || !strings.Contains(s, "d:"+b+"/c") {
		t.Errorf("after removing a hypervisor: %s", s)
	}
}
