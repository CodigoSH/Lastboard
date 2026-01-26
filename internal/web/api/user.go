package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

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
	var u user.User
	err := h.DB.QueryRow(`
		SELECT id, username, role, accent_color, language,
		       COALESCE(avatar_url, ''),
		       COALESCE(grid_columns_pc, 12), COALESCE(grid_columns_tablet, 4), COALESCE(grid_columns_mobile, 2),
               COALESCE(theme, 'system')
		FROM users WHERE username='kiwinho' OR id=1`).Scan(
		&u.ID, &u.Username, &u.Role, &u.AccentColor, &u.Language, &u.AvatarUrl,
		&u.GridColumnsPC, &u.GridColumnsTablet, &u.GridColumnsMobile, &u.Theme,
	)
	if err != nil {
		u = user.User{Username: "kiwinho", Role: "Administrator", AccentColor: "blue", Language: "en", AvatarUrl: "",
			GridColumnsPC: 12, GridColumnsTablet: 4, GridColumnsMobile: 2, Theme: "system"}
	}

	resp := map[string]interface{}{
		"username":            u.Username,
		"initials":            "KW",
		"avatar_url":          u.AvatarUrl,
		"role":                u.Role,
		"accent_color":        u.AccentColor,
		"language":            u.Language,
		"theme":               u.Theme,
		"grid_columns_pc":     u.GridColumnsPC,
		"grid_columns_tablet": u.GridColumnsTablet,
		"grid_columns_mobile": u.GridColumnsMobile,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *UserHandler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	var input struct {
		AccentColor       string `json:"accent_color"`
		Language          string `json:"language"`
		Theme             string `json:"theme"`
		GridColumnsPC     int    `json:"grid_columns_pc"`
		GridColumnsTablet int    `json:"grid_columns_tablet"`
		GridColumnsMobile int    `json:"grid_columns_mobile"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	var current user.User
	err := h.DB.QueryRow(`SELECT accent_color, language, grid_columns_pc, grid_columns_tablet, grid_columns_mobile, COALESCE(theme, 'system')
		FROM users WHERE username='kiwinho' OR id=1`).Scan(
		&current.AccentColor, &current.Language, &current.GridColumnsPC, &current.GridColumnsTablet, &current.GridColumnsMobile, &current.Theme)

	if err != nil {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	if input.AccentColor != "" {
		current.AccentColor = input.AccentColor
	}
	if input.Language != "" {
		current.Language = input.Language
	}
	if input.Theme != "" {
		current.Theme = input.Theme
	}
	if input.GridColumnsPC > 0 {
		current.GridColumnsPC = input.GridColumnsPC
	}
	if input.GridColumnsTablet > 0 {
		current.GridColumnsTablet = input.GridColumnsTablet
	}
	if input.GridColumnsMobile > 0 {
		current.GridColumnsMobile = input.GridColumnsMobile
	}

	_, err = h.DB.Exec(`UPDATE users SET accent_color=?, language=?, theme=?,
		grid_columns_pc=?, grid_columns_tablet=?, grid_columns_mobile=? 
		WHERE username='kiwinho' OR id=1`,
		current.AccentColor, current.Language, current.Theme,
		current.GridColumnsPC, current.GridColumnsTablet, current.GridColumnsMobile)

	if err != nil {
		http.Error(w, "Failed to update preferences", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Preferences updated"})
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Username  string `json:"username"`
		AvatarUrl string `json:"avatar_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// For simple demo, update currently hardcoded user 'kiwinho'
	// In real app, we would use session user id.
	_, err := h.DB.Exec("UPDATE users SET username=?, avatar_url=? WHERE username='kiwinho' OR id=1", input.Username, input.AvatarUrl)
	if err != nil {
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

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

	var storedHash string
	err := h.DB.QueryRow("SELECT password FROM users WHERE username='kiwinho' OR id=1").Scan(&storedHash)
	if err != nil {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(input.CurrentPassword)); err != nil {
		http.Error(w, "Current password incorrect", http.StatusUnauthorized)
		return
	}

	newHash, _ := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)

	_, err = h.DB.Exec("UPDATE users SET password=? WHERE username='kiwinho' OR id=1", string(newHash))
	if err != nil {
		http.Error(w, "Failed to update password", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Password updated"})
}
