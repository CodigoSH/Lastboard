package api

import (
	"database/sql"
	"encoding/json"
	"log"
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
	// Parse and validate input before touching the database
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
		input.AccentColor = "#2563eb"
	}

	// Validate preferences
	if input.Theme != "dark" && input.Theme != "light" && input.Theme != "system" {
		http.Error(w, "error.invalid_theme", http.StatusBadRequest)
		return
	}
	if len(input.Language) > 10 {
		http.Error(w, "error.invalid_language", http.StatusBadRequest)
		return
	}
	if len(input.AccentColor) > 32 {
		http.Error(w, "error.invalid_accent_color", http.StatusBadRequest)
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

	// Assign any seeded dashboard items (user_id = 0) to the new admin
	var adminID int
	if err := tx.QueryRow("SELECT id FROM users WHERE username = ?", input.Username).Scan(&adminID); err == nil {
		// Legacy: Assign any orphan items
		if res, err := tx.Exec("UPDATE items SET user_id = ? WHERE user_id = 0", adminID); err == nil {
			if n, _ := res.RowsAffected(); n > 0 {
				log.Printf("Setup: assigned %d seeded item(s) to new admin id=%d", n, adminID)
			}
		}

		// Seed Default Bookmark for First Admin
		_, _ = tx.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content, url) VALUES
			(?, 'bookmark', 1, 1, 1, 1, '{"label": "CodigoSH", "url": "https://github.com/CodigoSH/Lastboard", "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/git.png", "iconName": "git", "statusCheck": true, "visibleTouch": true}', 'https://github.com/CodigoSH/Lastboard')`, adminID)
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "setup_complete"})
}
