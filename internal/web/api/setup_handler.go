package api

import (
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"

	"golang.org/x/crypto/bcrypt"
)

type SetupHandler struct {
	DB *sql.DB
}

func NewSetupHandler(db *sql.DB) *SetupHandler {
	return &SetupHandler{DB: db}
}

func (h *SetupHandler) SetupSystem(w http.ResponseWriter, r *http.Request) {
	// Reject an already-initialised instance before spending any work on the
	// request. This endpoint is public, so without the early exit every call
	// would decode an unbounded body and run bcrypt (tens of ms of CPU) only to
	// return 403 at the end. The authoritative check still happens inside the
	// transaction below, which is what makes concurrent setup attempts safe.
	var alreadySetUp bool
	if err := h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users)").Scan(&alreadySetUp); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if alreadySetUp {
		http.Error(w, "setup.already_initialized", http.StatusForbidden)
		return
	}

	// Parse and validate input before touching the database
	r.Body = http.MaxBytesReader(w, r.Body, 5*1024*1024)
	var input struct {
		Username    string `json:"username"`
		Password    string `json:"password"`
		Language    string `json:"language"`
		AvatarUrl   string `json:"avatar_url"`
		Theme       string `json:"theme"`
		AccentColor string `json:"accent_color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	if err := validateUsername(input.Username); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := validatePassword(input.Password); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Defaults
	if input.Language == "" {
		input.Language = "en"
	}
	if input.Theme == "" {
		input.Theme = "dark"
	}
	if input.AccentColor == "" {
		input.AccentColor = "#e8520e"
	}

	// Validate preferences
	if input.Theme != "dark" && input.Theme != "light" && input.Theme != "system" {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	if len(input.Language) > 10 {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	if len(input.AccentColor) > 32 {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "setup.encryption_failed", http.StatusInternalServerError)
		return
	}

	// Transaction: existence check + user creation are atomic
	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var exists bool
	if err := tx.QueryRow("SELECT EXISTS(SELECT 1 FROM users)").Scan(&exists); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if exists {
		http.Error(w, "setup.already_initialized", http.StatusForbidden)
		return
	}

	// Create admin user
	_, err = tx.Exec(`INSERT INTO users (username, password, role, theme, accent_color, language, avatar_url, widget_min_width)
		VALUES (?, ?, ?, ?, ?, ?, ?, 140)`,
		input.Username, string(hashedPassword), "admin", input.Theme, input.AccentColor, input.Language, input.AvatarUrl)
	if err != nil {
		http.Error(w, "setup.failed_create_user", http.StatusInternalServerError)
		return
	}

	// Assign seeded dashboard items to the new admin
	var adminID int
	if err := tx.QueryRow("SELECT id FROM users WHERE username = ?", input.Username).Scan(&adminID); err == nil {
		if err := SeedDefaultItems(tx, adminID); err != nil {
			slog.Warn("Setup: failed to seed default items", "admin_id", adminID, "error", err)
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "setup_complete"})
}
