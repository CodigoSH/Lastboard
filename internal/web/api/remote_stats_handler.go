package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

// RemoteStatsHandler serves the numbers of a Server Health widget that points
// at another server. The browser only names the widget; the address and the
// credential are read here, so the credential never travels to the page.
type RemoteStatsHandler struct {
	DB      *sql.DB
	secrets *WidgetSecrets
}

func NewRemoteStatsHandler(db *sql.DB) *RemoteStatsHandler {
	return &RemoteStatsHandler{DB: db, secrets: NewWidgetSecrets(db)}
}

// secretNameFor is the stored secret each source uses.
func secretNameFor(source string) string {
	if source == remoteCustom {
		return "header_value"
	}
	return "password"
}

type remoteReplyJSON struct {
	OK    bool         `json:"ok"`
	Error string       `json:"error,omitempty"`
	Stats *RemoteStats `json:"stats,omitempty"`
}

func (h *RemoteStatsHandler) reply(w http.ResponseWriter, c remoteConfig, secret string, r *http.Request) {
	stats, err := readRemote(r.Context(), c, secret)
	out := remoteReplyJSON{OK: err == nil}
	if err != nil {
		out.Error = err.Error()
	} else {
		out.Stats = &stats
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	json.NewEncoder(w).Encode(out)
}

// ownedConfig loads a widget the caller owns and reads its remote settings.
func (h *RemoteStatsHandler) ownedConfig(r *http.Request, id int) (remoteConfig, bool) {
	var content sql.NullString
	if h.DB.QueryRowContext(r.Context(),
		`SELECT content FROM items WHERE id = ? AND user_id = ? AND type = 'widget'`,
		id, middleware.GetUserIDFromContext(r)).Scan(&content) != nil {
		return remoteConfig{}, false
	}
	var c remoteConfig
	if json.Unmarshal([]byte(content.String), &c) != nil {
		return remoteConfig{}, false
	}
	return c, true
}

// GET /api/widget/{id}/remote-stats
func (h *RemoteStatsHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		http.Error(w, "error.invalid_id", http.StatusBadRequest)
		return
	}
	c, ok := h.ownedConfig(r, id)
	if !ok {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}
	if c.Source != remoteGlances && c.Source != remoteNetdata && c.Source != remoteCustom {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	secret, _ := h.secrets.Get(id, secretNameFor(c.Source))
	h.reply(w, c, secret, r)
}

// POST /api/widget/remote-stats/test — try a configuration that may not be
// saved yet. A password typed in the form wins; otherwise the stored one of a
// widget the caller owns is used, so editing a field does not mean retyping it.
func (h *RemoteStatsHandler) Test(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	var in struct {
		ID       int          `json:"id"`
		Config   remoteConfig `json:"config"`
		Password string       `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	secret := in.Password
	if secret == "" && in.ID > 0 {
		if _, owned := h.ownedConfig(r, in.ID); owned {
			secret, _ = h.secrets.Get(in.ID, secretNameFor(in.Config.Source))
		}
	}
	if in.Config.Source != remoteGlances && in.Config.Source != remoteNetdata && in.Config.Source != remoteCustom {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	h.reply(w, in.Config, secret, r)
}
