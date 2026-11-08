package api

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/alerttext"
	"git.codigosh.com/CodigoSH/Lastboard/internal/core/webpush"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

// PushHandler is an account's own list of browsers to notify: which ones, and a way to try one.
// Nothing here reads another account's devices.
type PushHandler struct {
	DB     *sql.DB
	Sender *PushSender

	// Texts are the translations a notification is written from. Nil reads as English.
	Texts *alerttext.Catalog
}

func NewPushHandler(db *sql.DB) *PushHandler {
	return &PushHandler{DB: db, Sender: NewPushSender(db)}
}

// maxPushDevices is how many browsers one account may subscribe. A person has a handful; the cap is
// what stops a loop in a script from filling the table.
const maxPushDevices = 20

// Key hands out the public half of the instance's signing key. A browser subscribes to it, so that
// only this server can send to the subscription it makes.
func (h *PushHandler) Key(w http.ResponseWriter, r *http.Request) {
	_, public, err := h.Sender.VAPIDKeys()
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"public_key": public})
}

// PushRef names a subscription without being it: the first eight bytes of the SHA-256 of its address,
// in hex. A page computes the same for its own subscription, so it can tell which row in its list is
// this device while the address itself never leaves the server.
func PushRef(endpoint string) string {
	sum := sha256.Sum256([]byte(endpoint))
	return hex.EncodeToString(sum[:8])
}

type pushDevice struct {
	ID        int    `json:"id"`
	Ref       string `json:"ref"`
	Label     string `json:"label"`
	CreatedAt int64  `json:"created_at"`
	LastOKAt  *int64 `json:"last_ok_at"`
}

// List returns the caller's devices. The address and keys of a subscription are never sent back:
// they are what lets a message reach that device, and the page has no use for them.
func (h *PushHandler) List(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUserIDFromContext(r)
	rows, err := h.DB.QueryContext(r.Context(), `SELECT id, endpoint, label, created_at, last_ok_at FROM push_subscriptions WHERE user_id = ? ORDER BY id`, uid)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	out := []pushDevice{}
	for rows.Next() {
		var d pushDevice
		var ok sql.NullInt64
		var endpoint string
		if err := rows.Scan(&d.ID, &endpoint, &d.Label, &d.CreatedAt, &ok); err != nil {
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
		d.Ref = PushRef(endpoint)
		if ok.Valid {
			d.LastOKAt = &ok.Int64
		}
		out = append(out, d)
	}
	if err := rows.Err(); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, out)
}

// pushLabel is the name a device is listed under: what the browser called itself, with anything that
// is not text taken out and a limit on how long it can be.
func pushLabel(raw string) string {
	clean := strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, raw)
	clean = strings.Join(strings.Fields(clean), " ")
	if utf8.RuneCountInString(clean) > 60 {
		clean = string([]rune(clean)[:60])
	}
	if clean == "" {
		return "Browser"
	}
	return clean
}

type subscribeRequest struct {
	Endpoint string `json:"endpoint"`
	Keys     struct {
		P256dh string `json:"p256dh"`
		Auth   string `json:"auth"`
	} `json:"keys"`
	Label string `json:"label"`
}

// Subscribe stores the subscription a browser made, for the caller. Subscribing the same browser
// again — it does so after its subscription is renewed — updates it instead of adding a second.
func (h *PushHandler) Subscribe(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUserIDFromContext(r)
	r.Body = http.MaxBytesReader(w, r.Body, 8*1024)
	var req subscribeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	if !h.Sender.allowed(req.Endpoint) {
		http.Error(w, "push.endpoint_refused", http.StatusBadRequest)
		return
	}
	if err := webpush.ValidSubscriptionKeys(req.Keys.P256dh, req.Keys.Auth); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	tx, err := h.DB.BeginTx(r.Context(), nil)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()
	// A device of this account subscribing again is not a new device: only a new one counts toward the cap.
	var existing int
	_ = tx.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM push_subscriptions WHERE endpoint = ? AND user_id = ?`, req.Endpoint, uid).Scan(&existing)
	if existing == 0 {
		var n int
		if err := tx.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM push_subscriptions WHERE user_id = ?`, uid).Scan(&n); err != nil {
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
		if n >= maxPushDevices {
			http.Error(w, "push.too_many_devices", http.StatusConflict)
			return
		}
	}
	// ON CONFLICT and not INSERT OR REPLACE: the endpoint is unique, and a browser that was shared
	// between two accounts goes to the one that subscribes it now.
	if _, err := tx.Exec(`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, label, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT (endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh,
			auth = excluded.auth, label = excluded.label`,
		uid, req.Endpoint, req.Keys.P256dh, req.Keys.Auth, pushLabel(req.Label), time.Now().Unix()); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if err := tx.Commit(); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"ok": true})
}

// Delete removes one of the caller's devices. Another account's id is the same as no id.
func (h *PushHandler) Delete(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUserIDFromContext(r)
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	res, err := h.DB.Exec(`DELETE FROM push_subscriptions WHERE id = ? AND user_id = ?`, id, uid)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}
	writeJSON(w, map[string]any{"ok": true})
}

// Test sends a notification to every device of the caller, so a person can see it arrive before
// relying on it.
func (h *PushHandler) Test(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUserIDFromContext(r)
	cfg := notifyConfig{Lang: userLanguage(h.DB, uid), Texts: alertTemplates(h.DB, uid), Catalog: h.Texts}
	n := cfg.testNotice()
	res, err := h.Sender.SendToUser(r.Context(), uid, PushMessage{Title: n.Title, Body: n.Body, Tag: "lastboard-test", Up: true})
	switch {
	case errors.Is(err, ErrNoPushDevices):
		http.Error(w, "push.no_devices", http.StatusBadRequest)
		return
	case err != nil:
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	case res.Sent == 0:
		http.Error(w, "push.not_delivered", http.StatusBadGateway)
		return
	}
	writeJSON(w, map[string]any{"ok": true, "sent": res.Sent, "removed": res.Removed, "failed": res.Failed})
}
