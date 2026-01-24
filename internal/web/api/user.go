package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/kiwinho/CSH-Dashboard/internal/core/user"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	// In a real app, inject User Repository here
	DB *sql.DB
}

func NewUserHandler(db *sql.DB) *UserHandler {
	return &UserHandler{DB: db}
}

func (h *UserHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	// Fetch actual user logic
	var u user.User
	err := h.DB.QueryRow("SELECT id, username, role, accent_color, language FROM users WHERE username='kiwinho'").Scan(
		&u.ID, &u.Username, &u.Role, &u.AccentColor, &u.Language,
	)
	if err != nil {
		// Fallback/Mock
		u = user.User{Username: "kiwinho", Role: "Administrator", AccentColor: "blue", Language: "en"}
	}

	resp := map[string]string{
		"username":     u.Username,
		"initials":     "KW",
		"avatar_url":   "",
		"role":         u.Role,
		"accent_color": u.AccentColor,
		"language":     u.Language,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *UserHandler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	var input struct {
		AccentColor string `json:"accent_color"`
		Language    string `json:"language"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	_, err := h.DB.Exec("UPDATE users SET accent_color=?, language=? WHERE username='kiwinho'",
		input.AccentColor, input.Language)

	if err != nil {
		http.Error(w, "Failed to update preferences", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Preferences updated"})
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Username string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Pseudo-update: In real app, update DB where id=1 (or from context)
	// For this demo, we simulate success
	time.Sleep(500 * time.Millisecond) // Fake latency

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Profile updated"})
}

func (h *UserHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var input struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// 1. Fetch user (assuming 'kiwinho' / id=1 for this single-user demo)
	var storedHash string
	err := h.DB.QueryRow("SELECT password FROM users WHERE username='kiwinho'").Scan(&storedHash)
	if err != nil {
		// Fallback for demo if users table empty or 'kiwinho' not found (though we seeded it)
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	// 2. Verify Current Password
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(input.CurrentPassword)); err != nil {
		http.Error(w, "Current password incorrect", http.StatusUnauthorized)
		return
	}

	// 3. Hash New Password
	newHash, _ := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)

	// 4. Update DB
	_, err = h.DB.Exec("UPDATE users SET password=? WHERE username='kiwinho'", string(newHash))
	if err != nil {
		http.Error(w, "Failed to update password", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Password updated"})
}
