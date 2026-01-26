package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/kiwinho/CSH-Dashboard/internal/core/user"
	"github.com/kiwinho/CSH-Dashboard/internal/web/middleware"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	DB *sql.DB
}

func NewUserHandler(db *sql.DB) *UserHandler {
	return &UserHandler{DB: db}
}

func (h *UserHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	username := middleware.GetUserFromContext(r)
	if username == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var u user.User
	err := h.DB.QueryRow(`
		SELECT id, username, role, accent_color, language,
		       COALESCE(avatar_url, ''),
		       COALESCE(grid_columns_pc, 12), COALESCE(grid_columns_tablet, 4), COALESCE(grid_columns_mobile, 2),
               COALESCE(theme, 'system')
		FROM users WHERE username=?`, username).Scan(
		&u.ID, &u.Username, &u.Role, &u.AccentColor, &u.Language, &u.AvatarUrl,
		&u.GridColumnsPC, &u.GridColumnsTablet, &u.GridColumnsMobile, &u.Theme,
	)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	resp := map[string]interface{}{
		"id":                  u.ID, // Important for updates
		"username":            u.Username,
		"initials":            u.Username[0:2],
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
	username := middleware.GetUserFromContext(r)

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
		FROM users WHERE username=?`, username).Scan(
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
		WHERE username=?`,
		current.AccentColor, current.Language, current.Theme,
		current.GridColumnsPC, current.GridColumnsTablet, current.GridColumnsMobile, username)

	if err != nil {
		http.Error(w, "Failed to update preferences", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Preferences updated"})
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	username := middleware.GetUserFromContext(r)

	var input struct {
		Username  string `json:"username"`
		AvatarUrl string `json:"avatar_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// In real app, updating username requires checking uniqueness and updating session cookie
	// For now, simpler to just allow avatar update or require relogin if username changes.

	_, err := h.DB.Exec("UPDATE users SET username=?, avatar_url=? WHERE username=?", input.Username, input.AvatarUrl, username)
	if err != nil {
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Profile updated"})
}

func (h *UserHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	username := middleware.GetUserFromContext(r)

	var input struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	var storedHash string
	err := h.DB.QueryRow("SELECT password FROM users WHERE username=?", username).Scan(&storedHash)
	if err != nil {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(input.CurrentPassword)); err != nil {
		http.Error(w, "Current password incorrect", http.StatusUnauthorized)
		return
	}

	newHash, _ := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)

	_, err = h.DB.Exec("UPDATE users SET password=? WHERE username=?", string(newHash), username)
	if err != nil {
		http.Error(w, "Failed to update password", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Password updated"})
}

// Admin Endpoints

func (h *UserHandler) isAdmin(r *http.Request) bool {
	username := middleware.GetUserFromContext(r)
	var role string
	err := h.DB.QueryRow("SELECT role FROM users WHERE username=?", username).Scan(&role)
	return err == nil && (role == "admin" || role == "Administrator")
}

func (h *UserHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(r) {
		http.Error(w, "Forbidden: Admins only", http.StatusForbidden)
		return
	}

	rows, err := h.DB.Query("SELECT id, username, role, created_at FROM users")
	if err != nil {
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []user.User
	for rows.Next() {
		var u user.User
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.CreatedAt); err != nil {
			continue
		}
		users = append(users, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(r) {
		http.Error(w, "Forbidden: Admins only", http.StatusForbidden)
		return
	}

	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	if input.Role == "" {
		input.Role = "user"
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)

	stmt, err := h.DB.Prepare("INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)")
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	_, err = stmt.Exec(input.Username, string(hashedPassword), input.Role, time.Now())
	if err != nil {
		http.Error(w, "Failed to create user (username might be taken)", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User created"})
}

func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(r) {
		http.Error(w, "Forbidden: Admins only", http.StatusForbidden)
		return
	}

	var input struct {
		ID       int    `json:"id"`
		Username string `json:"username"`
		Role     string `json:"role"`
		Password string `json:"password"` // Optional: if empty, don't change
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	if input.ID == 0 {
		http.Error(w, "Missing user ID", http.StatusBadRequest)
		return
	}

	// Update fields
	var err error
	if input.Password != "" {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		_, err = h.DB.Exec("UPDATE users SET username=?, role=?, password=? WHERE id=?", input.Username, input.Role, string(hashedPassword), input.ID)
	} else {
		_, err = h.DB.Exec("UPDATE users SET username=?, role=? WHERE id=?", input.Username, input.Role, input.ID)
	}

	if err != nil {
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "User updated"})
}

func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(r) {
		http.Error(w, "Forbidden: Admins only", http.StatusForbidden)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Missing user ID", http.StatusBadRequest)
		return
	}

	_, err := h.DB.Exec("DELETE FROM users WHERE id = ?", id)
	if err != nil {
		http.Error(w, "Failed to delete user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "User deleted"})
}
