package api

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

/* ---------------------------------------------------------------------------
 * Where an account's alerts go: a list of channels
 *
 * An account used to have one channel (a type, an address, a token) and a switch
 * for alerts as a whole. Now it keeps a list, as it does for Docker and Proxmox:
 * each channel has its own switch, its own address and its own token, an alert goes
 * to every one that is on, and one that fails does not stop the others. The
 * account may have several of the same kind (two ntfy topics); only push is single,
 * because its destination is the account's browsers, kept in their own list.
 *
 * Alerts are on when any channel is: there is no second switch above them.
 * ------------------------------------------------------------------------ */

const (
	keyMonChannels      = "monitoring_notify_channels"
	keyMonChannelStatus = "monitoring_notify_status"

	// notifyMaxChannels is a ceiling, not an expectation: each is a request per alert.
	notifyMaxChannels = 10

	// legacyChannelID names the channel read from an account's older single-channel settings,
	// for as long as it has not been written to the list.
	legacyChannelID = "legacy"
)

// notifyChannel is one place alerts go.
type notifyChannel struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	// Type is ntfy, gotify, webhook or push.
	Type string `json:"type"`
	URL  string `json:"url"`
	// Never leaves the server: the screen learns that one is saved from has_token.
	Token   string `json:"token,omitempty"`
	Enabled bool   `json:"enabled"`
}

func validChannelType(t string) bool {
	switch t {
	case "ntfy", "gotify", "webhook", "push":
		return true
	}
	return false
}

// takesURL says whether a channel of this type has an address to give: push has none.
func takesURL(t string) bool { return t != "push" }

func newChannelID() string {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("nc%d", time.Now().UnixNano())
	}
	return "nc" + hex.EncodeToString(b)
}

// legacyChannel is the single channel an account configured before there was a list, as a channel,
// or false when it never chose one. It is on if the account's alerts switch was.
func legacyChannel(store *UserSettings, uid int) (notifyChannel, bool) {
	kind, _ := store.Get(uid, keyMonType)
	if kind == "" || kind == "none" || !validChannelType(kind) {
		return notifyChannel{}, false
	}
	addr, _ := store.Get(uid, keyMonURL)
	token, _ := store.Get(uid, keyMonToken)
	on, _ := store.Get(uid, keyMonAlerts)
	ch := notifyChannel{ID: legacyChannelID, Type: kind, URL: addr, Token: token, Enabled: on == "1"}
	if !takesURL(kind) {
		ch.URL, ch.Token = "", ""
	}
	return ch, true
}

// channelsOf is an account's channels: its list when it has saved one, and until then the one channel
// of its older settings, so nothing waits for a migration to be heard.
func channelsOf(store *UserSettings, uid int) []notifyChannel {
	if raw, has := store.Get(uid, keyMonChannels); has {
		var out []notifyChannel
		if err := json.Unmarshal([]byte(raw), &out); err != nil {
			return nil
		}
		return out
	}
	if ch, ok := legacyChannel(store, uid); ok {
		return []notifyChannel{ch}
	}
	return nil
}

func saveChannels(store *UserSettings, uid int, list []notifyChannel) error {
	if list == nil {
		list = []notifyChannel{}
	}
	blob, err := json.Marshal(list)
	if err != nil {
		return err
	}
	return store.Set(uid, keyMonChannels, string(blob))
}

// MigrateNotifyChannels writes each account's single channel into its list, once. An account that has a
// list is never touched, and the older keys stay where they are, unread from then on. It is safe to run
// at every start and after a restore, which can bring older settings back.
func MigrateNotifyChannels(db *sql.DB) error {
	rows, err := db.Query(`SELECT DISTINCT user_id FROM user_settings WHERE key = ?`, keyMonType)
	if err != nil {
		return err
	}
	var users []int
	for rows.Next() {
		var uid int
		if err := rows.Scan(&uid); err != nil {
			rows.Close()
			return err
		}
		users = append(users, uid)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	store := NewUserSettings(db)
	for _, uid := range users {
		if _, has := store.Get(uid, keyMonChannels); has {
			continue
		}
		ch, ok := legacyChannel(store, uid)
		if !ok {
			continue
		}
		ch.ID = newChannelID()
		if err := saveChannels(store, uid, []notifyChannel{ch}); err != nil {
			return err
		}
	}
	return nil
}

/* ---------------------------------------------------------------------------
 * What the last alert to each channel came to
 * ------------------------------------------------------------------------ */

// channelResult is the last delivery to a channel: when, whether it was taken, and if not, why in one
// word the screen translates. It carries no address or message: either could hold a credential.
type channelResult struct {
	At    int64  `json:"at"`
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
}

// channelStatusMu serialises the read and the write of the status of every account: alerts to several
// channels finish at the same time and each records its own.
var channelStatusMu sync.Mutex

func channelResults(store *UserSettings, uid int) map[string]channelResult {
	out := map[string]channelResult{}
	if raw, has := store.Get(uid, keyMonChannelStatus); has {
		_ = json.Unmarshal([]byte(raw), &out)
	}
	return out
}

// recordChannelResult notes how an alert to a channel went. An empty id is a channel that was never saved
// (a test of one being typed): nothing to note.
func recordChannelResult(store *UserSettings, uid int, id string, sendErr error) {
	if id == "" || id == legacyChannelID {
		return
	}
	channelStatusMu.Lock()
	defer channelStatusMu.Unlock()
	all := channelResults(store, uid)
	res := channelResult{At: time.Now().Unix(), OK: sendErr == nil}
	if sendErr != nil {
		res.Error = failureReason(sendErr)
	}
	all[id] = res
	if blob, err := json.Marshal(all); err == nil {
		_ = store.Set(uid, keyMonChannelStatus, string(blob))
	}
}

// failureReason names why a delivery failed in a word the screen has a text for.
func failureReason(err error) string {
	var netErr net.Error
	switch {
	case err == nil:
		return ""
	case errors.Is(err, ErrNoPushDevices) || strings.Contains(err.Error(), "no device could be told"):
		return "no_devices"
	case errors.Is(err, context.DeadlineExceeded) || (errors.As(err, &netErr) && netErr.Timeout()):
		return "timeout"
	}
	var code int
	if _, scanErr := fmt.Sscanf(err.Error(), "notify failed: HTTP %d", &code); scanErr == nil && code > 0 {
		return fmt.Sprintf("http_%d", code)
	}
	return "unreachable"
}

/* ---------------------------------------------------------------------------
 * The list, as the screen exchanges it
 * ------------------------------------------------------------------------ */

type channelView struct {
	ID       string         `json:"id"`
	Name     string         `json:"name"`
	Type     string         `json:"type"`
	URL      string         `json:"url"`
	Enabled  bool           `json:"enabled"`
	HasToken bool           `json:"has_token"`
	Last     *channelResult `json:"last"`
}

type channelsView struct {
	Channels []channelView `json:"channels"`
	Max      int           `json:"max"`
}

func channelsViewOf(store *UserSettings, uid int) channelsView {
	out := channelsView{Channels: []channelView{}, Max: notifyMaxChannels}
	results := channelResults(store, uid)
	for _, ch := range channelsOf(store, uid) {
		v := channelView{ID: ch.ID, Name: ch.Name, Type: ch.Type, URL: ch.URL, Enabled: ch.Enabled, HasToken: ch.Token != ""}
		if r, ok := results[ch.ID]; ok {
			r := r
			v.Last = &r
		}
		out.Channels = append(out.Channels, v)
	}
	return out
}

// GetChannels answers with this account's channels.
func (h *MonitorHandler) GetChannels(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUserIDFromContext(r)
	writeJSON(w, channelsViewOf(NewUserSettings(h.DB), uid))
}

// UpdateChannels stores this account's whole list.
//
// It arrives complete, so adding, editing, switching and removing are one request, and the ids are the
// server's: one the browser invented or sent twice is replaced. A token that is not sent is kept as it
// was; clear_token removes it.
func (h *MonitorHandler) UpdateChannels(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUserIDFromContext(r)
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	var in struct {
		Channels []struct {
			ID         string `json:"id"`
			Name       string `json:"name"`
			Type       string `json:"type"`
			URL        string `json:"url"`
			Token      string `json:"token"`
			ClearToken bool   `json:"clear_token"`
			Enabled    bool   `json:"enabled"`
		} `json:"channels"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || len(in.Channels) > notifyMaxChannels {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	store := NewUserSettings(h.DB)
	previous := map[string]notifyChannel{}
	for _, ch := range channelsOf(store, uid) {
		previous[ch.ID] = ch
	}

	list := make([]notifyChannel, 0, len(in.Channels))
	seen := map[string]bool{}
	pushes := 0
	for _, raw := range in.Channels {
		kind := strings.TrimSpace(raw.Type)
		if !validChannelType(kind) {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		address := strings.TrimSpace(raw.URL)
		if !takesURL(kind) {
			address = ""
			if pushes++; pushes > 1 {
				http.Error(w, "general.invalid_input", http.StatusBadRequest)
				return
			}
		} else if address == "" || badNotifyURL(address) {
			http.Error(w, "error.invalid_url", http.StatusBadRequest)
			return
		}

		id := strings.TrimSpace(raw.ID)
		old, known := previous[id]
		if id == "" || seen[id] {
			known = false
		}
		// The ids are the server's. The channel read from the older settings goes by a stand-in name until
		// it is written here, and is given a real one then; its token is carried over, since it is the one
		// stored. An id the browser made up is not known and takes nothing.
		seen[id] = true
		if !known || id == legacyChannelID {
			id = newChannelID()
		}
		seen[id] = true

		ch := notifyChannel{ID: id, Name: clipRunes(strings.TrimSpace(raw.Name), 40), Type: kind, URL: address, Enabled: raw.Enabled}
		switch {
		case !takesURL(kind):
		case strings.TrimSpace(raw.Token) != "":
			ch.Token = strings.TrimSpace(raw.Token)
		case raw.ClearToken:
		case known && old.Type == kind:
			ch.Token = old.Token
		}
		list = append(list, ch)
	}
	if err := saveChannels(store, uid, list); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	forgetChannelResults(store, uid, list)
	writeJSON(w, channelsViewOf(store, uid))
}

// forgetChannelResults drops what was noted for channels that are no longer in the list.
func forgetChannelResults(store *UserSettings, uid int, list []notifyChannel) {
	channelStatusMu.Lock()
	defer channelStatusMu.Unlock()
	all := channelResults(store, uid)
	if len(all) == 0 {
		return
	}
	kept := map[string]bool{}
	for _, ch := range list {
		kept[ch.ID] = true
	}
	for id := range all {
		if !kept[id] {
			delete(all, id)
		}
	}
	if blob, err := json.Marshal(all); err == nil {
		_ = store.Set(uid, keyMonChannelStatus, string(blob))
	}
}

// TestChannel sends one test alert to a channel, as it is typed in the window (so it can be tried before it
// is saved). A test sent without a token uses the one saved for that channel, which the page never has.
func (h *MonitorHandler) TestChannel(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUserIDFromContext(r)
	r.Body = http.MaxBytesReader(w, r.Body, 8*1024)
	var in struct {
		ID    string `json:"id"`
		Type  string `json:"type"`
		URL   string `json:"url"`
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || !validChannelType(in.Type) {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	store := NewUserSettings(h.DB)
	token := strings.TrimSpace(in.Token)
	saved := ""
	for _, ch := range channelsOf(store, uid) {
		if ch.ID == in.ID && in.ID != "" && ch.Type == in.Type {
			saved = ch.ID
			if token == "" {
				token = ch.Token
			}
		}
	}
	cfg := notifyConfig{Enabled: true, Type: in.Type, URL: strings.TrimSpace(in.URL), Token: token,
		Lang: userLanguage(h.DB, uid), Texts: alertTemplates(h.DB, uid), Catalog: h.Texts}
	if !takesURL(in.Type) {
		// Its destination is the account's own browsers, so there is nothing typed to test.
		cfg.UserID, cfg.Push, cfg.URL, cfg.Token = uid, NewPushSender(h.DB), "", ""
	} else if badNotifyURL(cfg.URL) {
		http.Error(w, "error.invalid_url", http.StatusBadRequest)
		return
	}
	if !cfg.active() {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	err := sendNotice(r.Context(), cfg, cfg.testNotice())
	recordChannelResult(store, uid, saved, err)
	if err != nil {
		// What failed, in a word and no more: the message of a failed request can carry the address.
		http.Error(w, failureReason(err), http.StatusBadGateway)
		return
	}
	writeJSON(w, map[string]any{"ok": true})
}

// clipRunes cuts s to at most n characters.
func clipRunes(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n])
}
