package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/CodigoSH/Lastboard/internal/core/user"
	"github.com/CodigoSH/Lastboard/internal/web/middleware"
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
		       COALESCE(widget_min_width, 140),
               COALESCE(theme, 'system'),
               COALESCE(project_name, 'Lastboard'),
               COALESCE(beta_updates, 0),
               COALESCE(grid_columns_pc, 12)
		FROM users WHERE username=?`, username).Scan(
		&u.ID, &u.Username, &u.Role, &u.AccentColor, &u.Language, &u.AvatarUrl,
		&u.WidgetMinWidth, &u.Theme, &u.ProjectName,
		&u.BetaUpdates, &u.GridColumnsPC,
	)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Determine if this is the Super Admin (First admin created)
	var firstAdminID int
	_ = h.DB.QueryRow("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").Scan(&firstAdminID)

	resp := map[string]interface{}{
		"id":               u.ID,
		"username":         u.Username,
		"initials":         safeInitials(u.Username),
		"avatar_url":       u.AvatarUrl,
		"role":             u.Role,
		"is_superadmin":    (u.ID > 0 && u.ID == firstAdminID),
		"accent_color":     u.AccentColor,
		"language":         u.Language,
		"theme":            u.Theme,
		"widget_min_width": u.WidgetMinWidth,
		"project_name":     u.ProjectName,
		"beta_updates":     u.BetaUpdates,
		"grid_columns":     u.GridColumnsPC,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *UserHandler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	username := middleware.GetUserFromContext(r)

	var input struct {
		AccentColor    string `json:"accent_color"`
		Language       string `json:"language"`
		Theme          string `json:"theme"`
		WidgetMinWidth int    `json:"widget_min_width"`
		ProjectName    string `json:"project_name"`
		BetaUpdates    *bool  `json:"beta_updates"`
		GridColumns    *int   `json:"grid_columns"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	var current user.User
	err := h.DB.QueryRow(`SELECT accent_color, language, COALESCE(widget_min_width, 140), COALESCE(theme, 'system'), COALESCE(project_name, 'Lastboard'), COALESCE(beta_updates, 0), COALESCE(grid_columns_pc, 12)
		FROM users WHERE username=?`, username).Scan(
		&current.AccentColor, &current.Language, &current.WidgetMinWidth, &current.Theme, &current.ProjectName, &current.BetaUpdates, &current.GridColumnsPC)

	if err != nil {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	if input.AccentColor != "" {
		if len(input.AccentColor) > 32 {
			http.Error(w, "Invalid accent color", http.StatusBadRequest)
			return
		}
		current.AccentColor = input.AccentColor
	}
	if input.Language != "" {
		if len(input.Language) > 10 {
			http.Error(w, "Invalid language", http.StatusBadRequest)
			return
		}
		current.Language = input.Language
	}
	if input.Theme != "" {
		if input.Theme != "dark" && input.Theme != "light" && input.Theme != "system" {
			http.Error(w, "Invalid theme value", http.StatusBadRequest)
			return
		}
		current.Theme = input.Theme
	}
	if input.WidgetMinWidth > 0 {
		if input.WidgetMinWidth < 50 || input.WidgetMinWidth > 500 {
			http.Error(w, "Invalid widget min width (50-500)", http.StatusBadRequest)
			return
		}
		current.WidgetMinWidth = input.WidgetMinWidth
	}
	if input.ProjectName != "" {
		if len(input.ProjectName) > 64 {
			http.Error(w, "Project name too long", http.StatusBadRequest)
			return
		}
		current.ProjectName = input.ProjectName
	}
	if input.BetaUpdates != nil {
		current.BetaUpdates = *input.BetaUpdates
	}
	if input.GridColumns != nil {
		val := *input.GridColumns
		if val < 3 {
			val = 3
		}
		if val > 16 {
			val = 16
		} // Limit 3-16 cols
		current.GridColumnsPC = val
	}

	_, err = h.DB.Exec(`UPDATE users SET accent_color=?, language=?, theme=?,
		widget_min_width=?, project_name=?, beta_updates=?, grid_columns_pc=?
		WHERE username=?`,
		current.AccentColor, current.Language, current.Theme,
		current.WidgetMinWidth, current.ProjectName, current.BetaUpdates, current.GridColumnsPC, username)

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

	// Validate new username only if it changed
	if input.Username != "" && input.Username != username {
		if err := validateUsername(input.Username); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}
	if input.Username == "" {
		input.Username = username
	}

	// Allow HTTP, HTTPS, or Base64 Image Data
	if input.AvatarUrl != "" &&
		!strings.HasPrefix(input.AvatarUrl, "http://") &&
		!strings.HasPrefix(input.AvatarUrl, "https://") &&
		!strings.HasPrefix(input.AvatarUrl, "data:image/") {
		http.Error(w, "Invalid avatar URL", http.StatusBadRequest)
		return
	}

	_, err := h.DB.Exec("UPDATE users SET username=?, avatar_url=? WHERE username=?", input.Username, input.AvatarUrl, username)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			http.Error(w, "error.username_taken", http.StatusConflict)
			return
		}
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

	if err := validatePassword(input.NewPassword); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Encryption failed", http.StatusInternalServerError)
		return
	}

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
	return err == nil && strings.ToLower(role) == "admin"
}

func (h *UserHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(r) {
		http.Error(w, "Forbidden: Admins only", http.StatusForbidden)
		return
	}

	currentUserID := middleware.GetUserIDFromContext(r)
	rows, err := h.DB.Query("SELECT id, username, role, created_at, COALESCE(avatar_url, '') FROM users WHERE id != ?", currentUserID)
	if err != nil {
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var firstAdminID int
	_ = h.DB.QueryRow("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").Scan(&firstAdminID)

	var users []map[string]interface{}
	for rows.Next() {
		var u user.User
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.CreatedAt, &u.AvatarUrl); err != nil {
			continue
		}
		users = append(users, map[string]interface{}{
			"id":            u.ID,
			"username":      u.Username,
			"role":          u.Role,
			"avatar_url":    u.AvatarUrl,
			"is_superadmin": (u.ID == firstAdminID),
		})
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
	role := strings.ToLower(input.Role)
	if role != "admin" && role != "user" {
		http.Error(w, "Invalid role", http.StatusBadRequest)
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

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Encryption failed", http.StatusInternalServerError)
		return
	}

	// Default Avatar Logic
	defaultAvatar := "/images/default-avatar.svg"

	stmt, err := h.DB.Prepare("INSERT INTO users (username, password, role, created_at, theme, accent_color, language, project_name, widget_min_width, avatar_url) VALUES (?, ?, ?, ?, 'system', '#2563eb', 'en', 'Lastboard', 140, ?)")
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	result, err := stmt.Exec(input.Username, string(hashedPassword), role, time.Now(), defaultAvatar)
	if err != nil {
		http.Error(w, "Failed to create user", http.StatusConflict)
		return
	}

	// Seed Default Bookmark for New User
	newUserID, err := result.LastInsertId()
	if err != nil {
		newUserID = 0
	}
	if newUserID > 0 {
		_, _ = h.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content, url) VALUES
		(?, 'bookmark', 1, 1, 1, 1, '{"label": "CodigoSH", "url": "https://github.com/CodigoSH/Lastboard", "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/git.png", "iconName": "git", "statusCheck": true, "visibleTouch": true}', "https://github.com/CodigoSH/Lastboard")`, newUserID)
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

	role := strings.ToLower(input.Role)
	if role != "admin" && role != "user" {
		http.Error(w, "Invalid role", http.StatusBadRequest)
		return
	}

	if err := validateUsername(input.Username); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var err error
	if input.Password != "" {
		if err := validatePassword(input.Password); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		if hashErr != nil {
			http.Error(w, "Encryption failed", http.StatusInternalServerError)
			return
		}
		_, err = h.DB.Exec("UPDATE users SET username=?, role=?, password=? WHERE id=?", input.Username, role, string(hashedPassword), input.ID)
	} else {
		_, err = h.DB.Exec("UPDATE users SET username=?, role=? WHERE id=?", input.Username, role, input.ID)
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

	targetID, err := strconv.Atoi(id)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Prevent self-deletion
	if targetID == middleware.GetUserIDFromContext(r) {
		http.Error(w, "Cannot delete your own account", http.StatusBadRequest)
		return
	}

	// Prevent deleting the last admin
	var targetRole string
	if err := h.DB.QueryRow("SELECT role FROM users WHERE id = ?", targetID).Scan(&targetRole); err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	if strings.ToLower(targetRole) == "admin" {
		var adminCount int
		if err := h.DB.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'admin'").Scan(&adminCount); err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		if adminCount <= 1 {
			http.Error(w, "Cannot delete the last admin", http.StatusBadRequest)
			return
		}

		// Protect the First Admin (Superadmin)
		var firstAdminID int
		if err := h.DB.QueryRow("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").Scan(&firstAdminID); err == nil {
			if targetID == firstAdminID {
				http.Error(w, "error.cannot_delete_superadmin", http.StatusForbidden)
				return
			}
		}
	}

	_, err = h.DB.Exec("DELETE FROM users WHERE id = ?", targetID)
	if err != nil {
		http.Error(w, "notifier.user_delete_error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "notifier.user_deleted"})
}

func safeInitials(name string) string {
	runes := []rune(name)
	if len(runes) > 2 {
		return string(runes[:2])
	}
	return string(runes)
}

func validateUsername(username string) error {
	if len(username) < 2 {
		return fmt.Errorf("error.username_min_length")
	}
	if len(username) > 32 {
		return fmt.Errorf("error.username_max_length")
	}
	for _, r := range username {
		if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-') {
			return fmt.Errorf("error.username_invalid_chars")
		}
	}
	return nil
}

func validatePassword(password string) error {
	if len(password) < 4 {
		return fmt.Errorf("error.password_min_length")
	}
	if len(password) > 72 {
		return fmt.Errorf("error.password_max_length")
	}
	return nil
}
