package api

import (
	"database/sql"
	"encoding/json"
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
	// 1. Security Check: Only allow setup if NO users exist
	var exists bool
	if err := h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users)").Scan(&exists); err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if exists {
		http.Error(w, "System already initialized", http.StatusForbidden)
		return
	}

	// 2. Parse Input
	var input struct {
		Username    string `json:"username"`
		Password    string `json:"password"`
		Language    string `json:"language"`
		AvatarUrl   string `json:"avatar_url"`
		Theme       string `json:"theme"`
		AccentColor string `json:"accent_color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	if input.Username == "" || input.Password == "" {
		http.Error(w, "Username and password required", http.StatusBadRequest)
		return
	}

	if len(input.Password) > 72 {
		http.Error(w, "Password too long", http.StatusBadRequest)
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
		input.AccentColor = "#f97316"
	}

	// 3. Hash Password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Encryption failed", http.StatusInternalServerError)
		return
	}

	// 4. Create Admin User
	_, err = h.DB.Exec(`INSERT INTO users (username, password, role, theme, accent_color, language, avatar_url, grid_columns_pc, grid_columns_tablet, grid_columns_mobile) 
		VALUES (?, ?, ?, ?, ?, ?, ?, 12, 6, 3)`,
		input.Username, string(hashedPassword), "admin", input.Theme, input.AccentColor, input.Language, input.AvatarUrl)

	if err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "setup_complete"})
}
