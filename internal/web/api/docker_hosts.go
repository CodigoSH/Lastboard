package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

/* ---------------------------------------------------------------------------
 * Docker hosts belong to the account, as Proxmox hypervisors do
 *
 * They used to live inside each Docker widget: two widgets meant configuring
 * the same host twice, each with its own copy of the agent's token, and a page
 * of all your containers had nowhere to read the list from. Now each account
 * keeps one list, in its own settings, and a widget only chooses which of them
 * to show. The tokens never leave the server.
 *
 * Who may use which kind of host follows one rule: a member reaches a Docker
 * only by presenting a credential for it. An agent is reached with its token; a
 * local socket, or a daemon listening on TCP with nothing in front of it, is
 * reached by being the server — and the server's position is the
 * administrator's, not a member's to borrow.
 * ------------------------------------------------------------------------ */

const dockerHostsKey = "docker_hosts"

// dockerMaxHosts is a ceiling, not an expectation: each one is a poll.
const dockerMaxHosts = 50

// The kinds of host. They are what the configuration screen offers, and they
// match what the widget stored before the hosts moved to the account.
const (
	dockerLocal = "local" // the socket on the machine Lastboard runs on
	dockerTCP   = "tcp"   // a daemon listening on TCP
	dockerTLS   = "tls"   // the same, over TLS
	dockerAgent = "agent" // the Lastboard Agent, reached with its token
)

type dockerHost struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
	URL  string `json:"url"`
	// Never leaves the server. See dockerSettings.
	Token   string `json:"token,omitempty"`
	Enabled bool   `json:"enabled"`
}

// needsAdmin reports whether only the administrator may use a host of this kind:
// every kind but the agent, which a member reaches with its own credential.
func needsAdmin(kind string) bool { return kind != dockerAgent }

var schemePrefix = regexp.MustCompile(`(?i)^(tcp|http|https|unix|npipe|ssh)://`)

// bareHost drops a scheme the address was typed with: the kind already says how
// to reach the host, and an address pasted from DOCKER_HOST carries tcp://.
func bareHost(raw string) string {
	return strings.TrimRight(schemePrefix.ReplaceAllString(strings.TrimSpace(raw), ""), "/")
}

// address is how the Docker client is told to reach the host. An agent behind a
// reverse proxy is reached over HTTPS, which the address typed for it says.
func (e dockerHost) address() string {
	switch e.Type {
	case dockerLocal:
		return "local"
	case dockerAgent:
		q := url.Values{}
		if e.Token != "" {
			q.Set("token", e.Token)
		}
		if strings.HasPrefix(strings.ToLower(strings.TrimSpace(e.URL)), "https://") {
			q.Set("tls", "1")
		}
		if len(q) == 0 {
			return "agent://" + bareHost(e.URL)
		}
		return "agent://" + bareHost(e.URL) + "?" + q.Encode()
	case dockerTLS:
		return "https://" + bareHost(e.URL)
	}
	return bareHost(e.URL)
}

func validDockerKind(kind string) bool {
	switch kind {
	case dockerLocal, dockerTCP, dockerTLS, dockerAgent:
		return true
	}
	return false
}

func newDockerHostID() string {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("dk%d", time.Now().UnixNano())
	}
	return "dk" + hex.EncodeToString(b)
}

// dockerScope is the handler looking at one account's hosts.
type dockerScope struct {
	*DockerHandler
	uid   int
	admin bool
}

func (h *DockerHandler) forAccount(r *http.Request) dockerScope {
	uid := middleware.GetUserIDFromContext(r)
	return dockerScope{h, uid, isFirstAdmin(h.DB, uid)}
}

func dockerHostsOf(store *UserSettings, uid int) []dockerHost {
	raw, _ := store.Get(uid, dockerHostsKey)
	if raw == "" {
		return nil
	}
	var out []dockerHost
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil
	}
	return out
}

func (s dockerScope) hosts() []dockerHost {
	return dockerHostsOf(NewUserSettings(s.DB), s.uid)
}

func (s dockerScope) saveHosts(list []dockerHost) error {
	blob, err := json.Marshal(list)
	if err != nil {
		return err
	}
	return NewUserSettings(s.DB).Set(s.uid, dockerHostsKey, string(blob))
}

// usable reports whether this account may reach this host.
func (s dockerScope) usable(e dockerHost) bool {
	return s.admin || !needsAdmin(e.Type)
}

// resolveError is why a host named by a request cannot be used.
type resolveError struct {
	status int
	key    string
}

// resolve finds the host a request names among this account's own, enabled
// hosts. The browser names a host; it never says where the host is. Whatever
// address a request might carry, the one used is the one stored here.
func (s dockerScope) resolve(id string) (dockerHost, *resolveError) {
	for _, e := range s.hosts() {
		if e.ID != id || id == "" {
			continue
		}
		if !e.Enabled {
			return dockerHost{}, &resolveError{http.StatusNotFound, "docker.unknown_host"}
		}
		if !s.usable(e) {
			return dockerHost{}, &resolveError{http.StatusForbidden, "docker.admin_only"}
		}
		return e, nil
	}
	return dockerHost{}, &resolveError{http.StatusNotFound, "docker.unknown_host"}
}

/* ---------------------------------------------------------------------------
 * Settings
 * ------------------------------------------------------------------------ */

// dockerSettings is what the configuration screen exchanges. Like Proxmox's,
// there is no field for a token on the way out — not a masked one: absent.
type dockerSettings struct {
	// Enabled says this account has at least one host it can use, switched on:
	// the top bar decides from it whether to offer the Docker page.
	Enabled bool `json:"enabled"`
	// Admin says which kinds the form may offer: a member only the agent.
	Admin bool                 `json:"admin"`
	Hosts []dockerSettingsHost `json:"hosts"`
}

type dockerSettingsHost struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Type    string `json:"type"`
	URL     string `json:"url"`
	Enabled bool   `json:"enabled"`
	// HasToken says a token is stored without saying what it is.
	HasToken bool `json:"has_token"`
	// Usable is false for a host this account may not reach: one a member
	// brought over from before hosts belonged to the account, of a kind that is
	// the administrator's. It is kept, not deleted, and says so.
	Usable bool `json:"usable"`
}

// GetSettings answers with this account's hosts.
func (h *DockerHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	s := h.forAccount(r)
	out := dockerSettings{Admin: s.admin, Hosts: []dockerSettingsHost{}}
	for _, e := range s.hosts() {
		usable := s.usable(e)
		if e.Enabled && usable {
			out.Enabled = true
		}
		out.Hosts = append(out.Hosts, dockerSettingsHost{
			ID: e.ID, Name: e.Name, Type: e.Type, URL: e.URL, Enabled: e.Enabled,
			HasToken: e.Token != "", Usable: usable,
		})
	}
	writeJSON(w, out)
}

// UpdateSettings stores this account's whole list.
//
// As with Proxmox the list arrives complete, so adding, renaming, reordering and
// removing are one request, and ids are the server's: one the browser invented
// or sent twice is replaced. A member may keep a host of an administrator's kind
// that it already had, untouched — it is its own data — but may not add one or
// point one somewhere else.
func (h *DockerHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	s := h.forAccount(r)
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)

	var in struct {
		Hosts []struct {
			ID    string `json:"id"`
			Name  string `json:"name"`
			Type  string `json:"type"`
			URL   string `json:"url"`
			Token string `json:"token"`
			// ClearToken is the emptied box that held the dots. Without it an
			// empty token means "not touched", which is also what a page that has
			// not reloaded sends.
			ClearToken bool `json:"clear_token"`
			Enabled    bool `json:"enabled"`
		} `json:"hosts"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	if len(in.Hosts) > dockerMaxHosts {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	previous := map[string]dockerHost{}
	for _, e := range s.hosts() {
		previous[e.ID] = e
	}

	list := make([]dockerHost, 0, len(in.Hosts))
	seen := map[string]bool{}
	for _, raw := range in.Hosts {
		kind := strings.TrimSpace(raw.Type)
		if !validDockerKind(kind) {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		address := strings.TrimSpace(raw.URL)
		if kind == dockerLocal {
			address = ""
		} else if bareHost(address) == "" {
			http.Error(w, "docker.missing_url", http.StatusBadRequest)
			return
		}

		id := strings.TrimSpace(raw.ID)
		old, known := previous[id]
		if !known || id == "" || seen[id] {
			id, known = "", false
		}
		if id == "" {
			id = newDockerHostID()
		}
		seen[id] = true

		if !s.admin && needsAdmin(kind) && !(known && old.Type == kind && old.URL == address) {
			http.Error(w, "docker.admin_only", http.StatusForbidden)
			return
		}

		e := dockerHost{ID: id, Name: strings.TrimSpace(raw.Name), Type: kind, URL: address, Enabled: raw.Enabled}
		switch {
		case kind != dockerAgent:
			// Only an agent has a token; a host that stopped being one drops it.
		case strings.TrimSpace(raw.Token) != "":
			e.Token = strings.TrimSpace(raw.Token)
		case raw.ClearToken:
		case known:
			e.Token = old.Token
		}
		if e.Name == "" {
			e.Name = "Docker"
		}
		list = append(list, e)
	}

	if err := s.saveHosts(list); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
