package web

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/access"
)

// noticed sends one request past the watcher and says whether it noticed a
// proxy.
func noticed(peer, header string) bool {
	s := &Server{}
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.RemoteAddr = peer
	if header != "" {
		r.Header.Set(header, "203.0.113.9")
	}
	s.noticeForwarded(r)
	return s.forwardedUnread.Load()
}

// A proxy in front that the configuration does not know about is noticed by the
// headers it adds, from wherever such a proxy lives: this machine, a container
// network, the LAN.
func TestAnUndeclaredProxyIsNoticed(t *testing.T) {
	t.Setenv("TRUST_PROXY", "false")
	for _, c := range []struct{ peer, header string }{
		{"127.0.0.1:50000", "X-Forwarded-For"},
		{"[::1]:50000", "X-Forwarded-For"},
		{"172.18.0.4:50000", "X-Real-Ip"},
		{"192.168.1.20:50000", "Forwarded"},
		{"10.0.0.7:50000", "X-Forwarded-For"},
	} {
		if !noticed(c.peer, c.header) {
			t.Errorf("%s from %s was not noticed", c.header, c.peer)
		}
	}
}

// Nothing is said when nothing says there is a proxy, or when the header comes
// from the internet, where anybody can type it.
func TestNoNoticeWithoutGrounds(t *testing.T) {
	t.Setenv("TRUST_PROXY", "false")
	for name, got := range map[string]bool{
		"no proxy header":               noticed("127.0.0.1:50000", ""),
		"a header from the internet":    noticed("198.51.100.4:50000", "X-Forwarded-For"),
		"a peer that is not an address": noticed("nonsense", "X-Forwarded-For"),
	} {
		if got {
			t.Errorf("%s: noticed a proxy", name)
		}
	}
}

// Nor when the proxy is declared.
func TestNoNoticeWhenTheProxyIsDeclared(t *testing.T) {
	t.Setenv("TRUST_PROXY", "true")
	if noticed("127.0.0.1:50000", "X-Forwarded-For") {
		t.Error("noticed a proxy that TRUST_PROXY declares")
	}
}

// What was noticed reaches the administrator, not before, and nobody else.
func TestTheAdministratorIsToldOfAnUndeclaredProxy(t *testing.T) {
	t.Setenv("TRUST_PROXY", "false")
	srv := newTestServer(t, true)
	admin := adminOf(t, srv)
	viewer := asMember(t, srv, "wallscreen", access.Viewer())

	unread := func() bool {
		t.Helper()
		w := admin(http.MethodGet, "/api/system/proxy", "")
		if w.Code != http.StatusOK {
			t.Fatalf("GET /api/system/proxy = %d", w.Code)
		}
		var out struct{ Unread bool }
		if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
			t.Fatal(err)
		}
		return out.Unread
	}

	if unread() {
		t.Fatal("told of a proxy before any proxy header arrived")
	}
	r := httptest.NewRequest(http.MethodGet, "/api/system/status", nil)
	r.RemoteAddr = "127.0.0.1:50000"
	r.Header.Set("X-Forwarded-For", "203.0.113.9")
	srv.ServeHTTP(httptest.NewRecorder(), r)
	if !unread() {
		t.Error("after a proxy header from this machine, the administrator is not told")
	}
	if w := viewer(http.MethodGet, "/api/system/proxy", ""); w.Code != http.StatusForbidden {
		t.Errorf("a member reading the proxy notice: %d, want 403", w.Code)
	}
}
