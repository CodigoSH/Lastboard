package web

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

// Each account names its own panel, so the app it installs carries that name and
// nobody else's. Two servers installed on one phone were both "Lastboard".
func TestTheManifestNamesThePanelOfTheAccountAsking(t *testing.T) {
	srv := newTestServer(t, true)
	if _, err := srv.DB.Exec(
		"INSERT INTO users (username, password, role, project_name) VALUES ('other', 'not-a-real-hash', 'user', 'Homelab de Ana')",
	); err != nil {
		t.Fatal(err)
	}
	if _, err := srv.DB.Exec("UPDATE users SET project_name = ' Mi \"panel\" ' WHERE username = 'probe'"); err != nil {
		t.Fatal(err)
	}
	cookieOf := func(username string, version int) *http.Cookie {
		var id int
		if err := srv.DB.QueryRow("SELECT id FROM users WHERE username = ?", username).Scan(&id); err != nil {
			t.Fatal(err)
		}
		token := util.SignToken(util.AccountSessionPayload(id, version), srv.sessionSecret, time.Now().Add(time.Hour))
		return &http.Cookie{Name: "session_token", Value: token}
	}
	get := func(c *http.Cookie) (map[string]any, *httptest.ResponseRecorder) {
		t.Helper()
		req := httptest.NewRequest(http.MethodGet, "/manifest.json", nil)
		if c != nil {
			req.AddCookie(c)
		}
		w := httptest.NewRecorder()
		srv.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("GET /manifest.json = %d, want 200", w.Code)
		}
		var m map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &m); err != nil {
			t.Fatalf("the manifest is not JSON: %v", err)
		}
		return m, w
	}

	cases := []struct {
		name   string
		cookie *http.Cookie
		want   string
	}{
		{"no session", nil, "Lastboard"},
		{"the account's own name, trimmed", cookieOf("probe", 0), `Mi "panel"`},
		{"another account gets its own", cookieOf("other", 0), "Homelab de Ana"},
		{"a session the password change ended", cookieOf("probe", 7), "Lastboard"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			m, w := get(tc.cookie)
			if m["name"] != tc.want || m["short_name"] != tc.want {
				t.Errorf("name %q, short_name %q, want %q for both", m["name"], m["short_name"], tc.want)
			}
			// Everything else is web/manifest.json's.
			if m["start_url"] != "/" || m["display"] != "standalone" {
				t.Errorf("start_url %v, display %v: the rest of the manifest was not kept", m["start_url"], m["display"])
			}
			if icons, _ := m["icons"].([]any); len(icons) != 3 {
				t.Errorf("%d icons, want the 3 in web/manifest.json", len(icons))
			}
			if ct := w.Header().Get("Content-Type"); ct != "application/manifest+json" {
				t.Errorf("Content-Type %q", ct)
			}
			// A day-long cache would keep the name of the account that asked first.
			if cc := w.Header().Get("Cache-Control"); cc != "no-cache" {
				t.Errorf("Cache-Control %q, want no-cache", cc)
			}
		})
	}
}

// A browser fetches a manifest without cookies unless the link asks for them,
// and then every install would be named "Lastboard" whatever the account chose.
func TestThePagesFetchTheManifestWithTheSession(t *testing.T) {
	srv := newTestServer(t, true)
	var id int
	if err := srv.DB.QueryRow("SELECT id FROM users WHERE username = 'probe'").Scan(&id); err != nil {
		t.Fatal(err)
	}
	token := util.SignToken(util.AccountSessionPayload(id, 0), srv.sessionSecret, time.Now().Add(time.Hour))
	link := regexp.MustCompile(`<link rel="manifest"[^>]*>`)

	for _, page := range []string{"/login", "/"} {
		req := httptest.NewRequest(http.MethodGet, page, nil)
		if page == "/" {
			req.AddCookie(&http.Cookie{Name: "session_token", Value: token})
		}
		w := httptest.NewRecorder()
		srv.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("GET %s = %d, want 200", page, w.Code)
		}
		tag := link.FindString(w.Body.String())
		if tag == "" {
			t.Fatalf("%s does not link the manifest", page)
		}
		if !strings.Contains(tag, `crossorigin="use-credentials"`) {
			t.Errorf("%s links the manifest without credentials: %s", page, tag)
		}
	}
}
