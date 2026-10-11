package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"sort"
	"strconv"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

// What a widget keeps secret is stored apart from its content.
//
// A widget's content is sent to the browser whole, and a widget that kept its
// password there would hand it to every page that loads the board, and send it
// back with every refresh. These rows are written by the person who owns the
// widget, read only by the server when it makes the request the widget needs,
// and never returned: the page learns that one is set (by name), not what it is.

const (
	// A ceiling, not an expectation: a password, a token, a couple of headers.
	maxSecretsPerWidget = 16
	maxSecretLen        = 4096
)

// secretName keeps names to something that can be a map key and a log field:
// lower case, a letter first, dots and dashes allowed ("password",
// "header.x-api-key").
var secretName = regexp.MustCompile(`^[a-z][a-z0-9_.-]{0,63}$`)

var (
	errSecretName  = errors.New("widget secret: invalid name")
	errSecretValue = errors.New("widget secret: empty or too long")
	errSecretCount = errors.New("widget secret: too many")
)

// WidgetSecrets reads and writes the secrets of widgets.
type WidgetSecrets struct {
	DB *sql.DB
}

func NewWidgetSecrets(db *sql.DB) *WidgetSecrets { return &WidgetSecrets{DB: db} }

// Names lists which secrets a widget has, sorted, without their values.
func (s *WidgetSecrets) Names(itemID int) ([]string, error) {
	rows, err := s.DB.Query(`SELECT name FROM widget_secrets WHERE item_id = ? ORDER BY name`, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	names := []string{}
	for rows.Next() {
		var n string
		if err := rows.Scan(&n); err != nil {
			return nil, err
		}
		names = append(names, n)
	}
	return names, rows.Err()
}

// Get returns one secret's value, for the server's own use.
func (s *WidgetSecrets) Get(itemID int, name string) (string, bool) {
	var v string
	if err := s.DB.QueryRow(`SELECT value FROM widget_secrets WHERE item_id = ? AND name = ?`, itemID, name).Scan(&v); err != nil {
		return "", false
	}
	return v, true
}

// All returns every secret of a widget, for the server's own use.
func (s *WidgetSecrets) All(itemID int) (map[string]string, error) {
	rows, err := s.DB.Query(`SELECT name, value FROM widget_secrets WHERE item_id = ?`, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var n, v string
		if err := rows.Scan(&n, &v); err != nil {
			return nil, err
		}
		out[n] = v
	}
	return out, rows.Err()
}

// Apply sets and clears secrets in one transaction, so a refused name or an
// over-long value changes nothing. Setting an empty value is refused rather
// than treated as "clear": removing a secret is its own, explicit gesture.
func (s *WidgetSecrets) Apply(itemID int, set map[string]string, clear []string) error {
	for name, value := range set {
		if !secretName.MatchString(name) {
			return errSecretName
		}
		if value == "" || len(value) > maxSecretLen {
			return errSecretValue
		}
	}
	for _, name := range clear {
		if !secretName.MatchString(name) {
			return errSecretName
		}
	}

	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, name := range clear {
		if _, err := tx.Exec(`DELETE FROM widget_secrets WHERE item_id = ? AND name = ?`, itemID, name); err != nil {
			return err
		}
	}
	for name, value := range set {
		if _, err := tx.Exec(
			`INSERT INTO widget_secrets (item_id, name, value) VALUES (?, ?, ?)
			 ON CONFLICT (item_id, name) DO UPDATE SET value = excluded.value`,
			itemID, name, value); err != nil {
			return err
		}
	}

	var n int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM widget_secrets WHERE item_id = ?`, itemID).Scan(&n); err != nil {
		return err
	}
	if n > maxSecretsPerWidget {
		return errSecretCount
	}
	return tx.Commit()
}

// WidgetSecretsHandler is how the owner of a widget sets, replaces and removes
// its secrets, and learns which are set.
type WidgetSecretsHandler struct {
	DB      *sql.DB
	secrets *WidgetSecrets
}

func NewWidgetSecretsHandler(db *sql.DB) *WidgetSecretsHandler {
	return &WidgetSecretsHandler{DB: db, secrets: NewWidgetSecrets(db)}
}

// ownedWidget answers with the widget's id when it is a widget and belongs to
// the caller. Anything else is "not found": another person's widget must not be
// distinguishable from one that does not exist.
func (h *WidgetSecretsHandler) ownedWidget(w http.ResponseWriter, r *http.Request) (int, bool) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		http.Error(w, "error.invalid_id", http.StatusBadRequest)
		return 0, false
	}
	userID := middleware.GetUserIDFromContext(r)
	var one int
	if h.DB.QueryRowContext(r.Context(),
		`SELECT 1 FROM items WHERE id = ? AND user_id = ? AND type = 'widget'`, id, userID).Scan(&one) != nil {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return 0, false
	}
	return id, true
}

type widgetSecretNames struct {
	Names []string `json:"names"`
}

// GET /api/widget/{id}/secrets — which are set, never their values.
func (h *WidgetSecretsHandler) List(w http.ResponseWriter, r *http.Request) {
	id, ok := h.ownedWidget(w, r)
	if !ok {
		return
	}
	names, err := h.secrets.Names(id)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	h.write(w, names)
}

// PUT /api/widget/{id}/secrets — {"set": {"password": "…"}, "clear": ["…"]}.
func (h *WidgetSecretsHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := h.ownedWidget(w, r)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	var in struct {
		Set   map[string]string `json:"set"`
		Clear []string          `json:"clear"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	if err := h.secrets.Apply(id, in.Set, in.Clear); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	names, err := h.secrets.Names(id)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	h.write(w, names)
}

func (h *WidgetSecretsHandler) write(w http.ResponseWriter, names []string) {
	sort.Strings(names)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(widgetSecretNames{Names: names})
}
