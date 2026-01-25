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
	var count int
	if err := h.DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count); err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if count > 0 {
		http.Error(w, "Setup already completed", http.StatusForbidden)
		return
	}

	// 2. Parse Input
	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	if input.Username == "" || input.Password == "" {
		http.Error(w, "Username and password required", http.StatusBadRequest)
		return
	}

	// 3. Hash Password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Encryption failed", http.StatusInternalServerError)
		return
	}

	// 4. Create Admin User
	_, err = h.DB.Exec(`INSERT INTO users (username, password, role, theme, accent_color, language, grid_columns_pc, grid_columns_tablet, grid_columns_mobile) 
		VALUES (?, ?, ?, 'system', '#0078D4', 'en', 12, 4, 2)`,
		input.Username, string(hashedPassword), "admin")

	if err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "setup_complete"})
}
