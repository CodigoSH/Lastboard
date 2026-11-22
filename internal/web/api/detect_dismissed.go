package api

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"sync"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

/*
What an account chose not to add.

The window that adds a host's services to the board proposes everything that has
no bookmark yet. What a person unticked on purpose — the runner, the tunnel, the
database nobody opens — is remembered, so it comes back unticked instead of
being proposed afresh every time.

Per account, like the hosts the services belong to. A service is keyed by its
kind, its host and its own name: "d:<host>/<container>" for a container and
"p:<host>/<node>|<vmid>" for a machine, so a host that is removed takes its
entries with it.
*/

const detectDismissedKey = "detect_dismissed"

const (
	maxDismissed        = 1000
	maxDismissedKeyLen  = 200
	maxDismissedRequest = 64 * 1024
)

type DetectHandler struct{ store *UserSettings }

func NewDetectHandler(store *UserSettings) *DetectHandler { return &DetectHandler{store: store} }

// validDismissedKey says whether a key has the shape of one the window writes.
func validDismissedKey(k string) bool {
	if len(k) < 4 || len(k) > maxDismissedKeyLen || strings.ContainsAny(k, "\x00\n\r") {
		return false
	}
	return (k[:2] == "d:" || k[:2] == "p:") && strings.Contains(k[2:], "/")
}

func dismissedOf(store *UserSettings, uid int) map[string]bool {
	out := map[string]bool{}
	raw, _ := store.Get(uid, detectDismissedKey)
	var list []string
	if raw == "" || json.Unmarshal([]byte(raw), &list) != nil {
		return out
	}
	for _, k := range list {
		if validDismissedKey(k) {
			out[k] = true
		}
	}
	return out
}

// dismissedMu serialises every read-change-write of the list. It is stored whole
// and each "Ignore" in the window is its own request, so two quick clicks read
// the same list and the second save would drop the first one's key.
var dismissedMu sync.Mutex

func saveDismissed(store *UserSettings, uid int, set map[string]bool) error {
	list := make([]string, 0, len(set))
	for k := range set {
		list = append(list, k)
	}
	sort.Strings(list)
	blob, err := json.Marshal(list)
	if err != nil {
		return err
	}
	return store.Set(uid, detectDismissedKey, string(blob))
}

// pruneDismissed drops the entries of one kind ("d:" or "p:") whose host is no
// longer among the ones kept: nothing can read them, and a full list would
// refuse the next one.
func pruneDismissed(store *UserSettings, uid int, kind string, keep map[string]bool) {
	dismissedMu.Lock()
	defer dismissedMu.Unlock()
	set := dismissedOf(store, uid)
	changed := false
	for k := range set {
		if !strings.HasPrefix(k, kind) {
			continue
		}
		host, _, _ := strings.Cut(k[len(kind):], "/")
		if !keep[host] {
			delete(set, k)
			changed = true
		}
	}
	if changed {
		_ = saveDismissed(store, uid, set)
	}
}

// GET /api/detect/dismissed — { "keys": [...] }
func (h *DetectHandler) Get(w http.ResponseWriter, r *http.Request) {
	set := dismissedOf(h.store, middleware.GetUserIDFromContext(r))
	keys := make([]string, 0, len(set))
	for k := range set {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"keys": keys})
}

// POST /api/detect/dismissed — { "add": [...], "remove": [...] }
func (h *DetectHandler) Change(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUserIDFromContext(r)
	r.Body = http.MaxBytesReader(w, r.Body, maxDismissedRequest)
	var in struct {
		Add    []string `json:"add"`
		Remove []string `json:"remove"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	dismissedMu.Lock()
	defer dismissedMu.Unlock()
	set := dismissedOf(h.store, uid)
	for _, k := range in.Remove {
		delete(set, k)
	}
	for _, k := range in.Add {
		if !validDismissedKey(k) {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		// A full list does not lose what it holds: only a new key is refused.
		if !set[k] && len(set) >= maxDismissed {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		set[k] = true
	}
	if err := saveDismissed(h.store, uid, set); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
