package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
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
               COALESCE(grid_columns_pc, 12),
               COALESCE(unit_system, 'metric'),
               COALESCE(dashboard_background, ''),
               COALESCE(project_logo, '')
		FROM users WHERE username=?`, username).Scan(
		&u.ID, &u.Username, &u.Role, &u.AccentColor, &u.Language, &u.AvatarUrl,
		&u.WidgetMinWidth, &u.Theme, &u.ProjectName,
		&u.BetaUpdates, &u.GridColumnsPC, &u.UnitSystem, &u.DashboardBackground, &u.ProjectLogo,
	)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	resp := map[string]interface{}{
		"id":                   u.ID,
		"username":             u.Username,
		"initials":             safeInitials(u.Username),
		"avatar_url":           u.AvatarUrl,
		"role":                 u.Role,
		"is_admin":             isFirstAdmin(h.DB, u.ID),
		"accent_color":         u.AccentColor,
		"language":             u.Language,
		"theme":                u.Theme,
		"unit_system":          u.UnitSystem,
		"widget_min_width":     u.WidgetMinWidth,
		"project_name":         u.ProjectName,
		"project_logo":         u.ProjectLogo,
		"beta_updates":         u.BetaUpdates,
		"grid_columns":         u.GridColumnsPC,
		"dashboard_background": u.DashboardBackground,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *UserHandler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	// Carries base64 background + logo images (each capped at 2MB below); allow
	// generous headroom for both plus the other fields, but keep it bounded.
	r.Body = http.MaxBytesReader(w, r.Body, 10*1024*1024)
	username := middleware.GetUserFromContext(r)

	var input struct {
		AccentColor         string  `json:"accent_color"`
		Language            string  `json:"language"`
		Theme               string  `json:"theme"`
		UnitSystem          string  `json:"unit_system"`
		WidgetMinWidth      int     `json:"widget_min_width"`
		ProjectName         string  `json:"project_name"`
		ProjectLogo         *string `json:"project_logo"`
		BetaUpdates         *bool   `json:"beta_updates"`
		GridColumns         *int    `json:"grid_columns"`
		DashboardBackground string  `json:"dashboard_background"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	var current user.User
	err := h.DB.QueryRow(`SELECT accent_color, language, COALESCE(widget_min_width, 140), COALESCE(theme, 'system'), COALESCE(project_name, 'Lastboard'), COALESCE(beta_updates, 0), COALESCE(grid_columns_pc, 12), COALESCE(unit_system, 'metric'), COALESCE(dashboard_background, ''), COALESCE(project_logo, '')
		FROM users WHERE username=?`, username).Scan(
		&current.AccentColor, &current.Language, &current.WidgetMinWidth, &current.Theme, &current.ProjectName, &current.BetaUpdates, &current.GridColumnsPC, &current.UnitSystem, &current.DashboardBackground, &current.ProjectLogo)

	if err != nil {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	if input.AccentColor != "" {
		if !isValidAccentColor(input.AccentColor) {
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
	if input.UnitSystem != "" {
		if input.UnitSystem != "metric" && input.UnitSystem != "imperial" {
			http.Error(w, "Invalid unit system value", http.StatusBadRequest)
			return
		}
		current.UnitSystem = input.UnitSystem
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

	// Dashboard Background: accept any string (Base64 or URL). Empty string clears it.
	if len(input.DashboardBackground) > 2*1024*1024 {
		http.Error(w, "Background too large (max 2MB)", http.StatusBadRequest)
		return
	}
	current.DashboardBackground = input.DashboardBackground

	// Project Logo: only update when explicitly provided (nil = not sent = keep current)
	if input.ProjectLogo != nil {
		logo := *input.ProjectLogo
		if logo != "" && len(logo) > 2*1024*1024 {
			http.Error(w, "Logo too large (max 2MB)", http.StatusBadRequest)
			return
		}
		current.ProjectLogo = logo
	}

	_, err = h.DB.Exec(`UPDATE users SET accent_color=?, language=?, theme=?,
		unit_system=?, widget_min_width=?, project_name=?, beta_updates=?, grid_columns_pc=?, dashboard_background=?, project_logo=?
		WHERE username=?`,
		current.AccentColor, current.Language, current.Theme, current.UnitSystem,
		current.WidgetMinWidth, current.ProjectName, current.BetaUpdates, current.GridColumnsPC, current.DashboardBackground, current.ProjectLogo, username)

	if err != nil {
		http.Error(w, "Failed to update preferences", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Preferences updated"})
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	// Carries a base64 avatar (capped at 2MB below); bound the raw body too.
	r.Body = http.MaxBytesReader(w, r.Body, 5*1024*1024)
	username := middleware.GetUserFromContext(r)

	var input struct {
		Username  string `json:"username"`
		AvatarUrl string `json:"avatar_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Track if username changed (requires session invalidation)
	usernameChanged := false

	// Validate new username only if it changed
	if input.Username != "" && input.Username != username {
		if err := validateUsername(input.Username); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		usernameChanged = true
	}
	if input.Username == "" {
		input.Username = username
	}

	// Allow HTTP, HTTPS, or Base64 Image Data
	if input.AvatarUrl != "" {
		if len(input.AvatarUrl) > 2*1024*1024 {
			http.Error(w, "Avatar too large (max 2MB)", http.StatusBadRequest)
			return
		}
		if !strings.HasPrefix(input.AvatarUrl, "http://") &&
			!strings.HasPrefix(input.AvatarUrl, "https://") &&
			!strings.HasPrefix(input.AvatarUrl, "data:image/") {
			http.Error(w, "Invalid avatar URL", http.StatusBadRequest)
			return
		}
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

	// If username changed, invalidate session for security
	if usernameChanged {
		invalidateSession(w, r)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message":             "Profile updated",
			"session_invalidated": true,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Profile updated"})
}

func (h *UserHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
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

	// Invalidate session for security (force re-login with new password)
	invalidateSession(w, r)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":             "Password updated",
		"session_invalidated": true,
	})
}

// Admin Endpoints

func (h *UserHandler) verifyPassword(username, password string) bool {
	var storedHash string
	err := h.DB.QueryRow("SELECT password FROM users WHERE username=?", username).Scan(&storedHash)
	if err != nil {
		return false
	}
	err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password))
	return err == nil
}

func (h *UserHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	if !isAdminUser(h.DB, r) {
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

	var users []map[string]interface{}
	for rows.Next() {
		var u user.User
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.CreatedAt, &u.AvatarUrl); err != nil {
			continue
		}
		users = append(users, map[string]interface{}{
			"id":         u.ID,
			"username":   u.Username,
			"role":       u.Role,
			"avatar_url": u.AvatarUrl,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	if !isAdminUser(h.DB, r) {
		http.Error(w, "Forbidden: Admins only", http.StatusForbidden)
		return
	}

	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
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

	stmt, err := h.DB.Prepare("INSERT INTO users (username, password, role, created_at, theme, unit_system, accent_color, language, project_name, widget_min_width, avatar_url) VALUES (?, ?, 'user', ?, 'system', 'metric', '#2563eb', 'en', 'Lastboard', 140, ?)")
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	result, err := stmt.Exec(input.Username, string(hashedPassword), time.Now(), defaultAvatar)
	if err != nil {
		http.Error(w, "Failed to create user", http.StatusConflict)
		return
	}

	// Seed Default Items for New User
	newUserID, err := result.LastInsertId()
	if err == nil && newUserID > 0 {
		tx, err := h.DB.Begin()
		if err == nil {
			if err := SeedDefaultItems(tx, int(newUserID)); err != nil {
				slog.Warn("CreateUser: failed to seed default items", "user_id", newUserID, "error", err)
				tx.Rollback()
			} else {
				tx.Commit()
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User created"})
}

func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	if !isAdminUser(h.DB, r) {
		http.Error(w, "Forbidden: Admins only", http.StatusForbidden)
		return
	}

	var input struct {
		ID       int    `json:"id"`
		Username string `json:"username"`
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
		_, err = h.DB.Exec("UPDATE users SET username=?, password=?, password_version=password_version+1 WHERE id=?", input.Username, string(hashedPassword), input.ID)
	} else {
		_, err = h.DB.Exec("UPDATE users SET username=? WHERE id=?", input.Username, input.ID)
	}

	if err != nil {
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "User updated"})
}

func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	if !isAdminUser(h.DB, r) {
		http.Error(w, "Forbidden: Admins only", http.StatusForbidden)
		return
	}

	var targetID int
	var adminPassword string
	var err error

	if r.Method == http.MethodPost {
		var input struct {
			ID            int    `json:"id"`
			AdminPassword string `json:"admin_password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}
		targetID = input.ID
		adminPassword = input.AdminPassword
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Admin password is always required to confirm destructive action
	if adminPassword == "" {
		http.Error(w, "Admin password required", http.StatusBadRequest)
		return
	}
	adminUsername := middleware.GetUserFromContext(r)
	if !h.verifyPassword(adminUsername, adminPassword) {
		http.Error(w, "Invalid admin password", http.StatusUnauthorized)
		return
	}

	// Prevent self-deletion
	if targetID == middleware.GetUserIDFromContext(r) {
		http.Error(w, "Cannot delete your own account", http.StatusBadRequest)
		return
	}

	// Prevent deleting the last admin
	var exists int
	if err := h.DB.QueryRow("SELECT 1 FROM users WHERE id = ?", targetID).Scan(&exists); err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	// Protect the admin (cannot be deleted)
	if isFirstAdmin(h.DB, targetID) {
		http.Error(w, "error.cannot_delete_superadmin", http.StatusForbidden)
		return
	}

	_, err = h.DB.Exec("DELETE FROM users WHERE id = ?", targetID)
	if err != nil {
		http.Error(w, "notifier.user_delete_error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
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
	if len(password) < 8 {
		return fmt.Errorf("error.password_min_length")
	}
	if len(password) > 72 {
		return fmt.Errorf("error.password_max_length")
	}
	return nil
}

func isValidAccentColor(color string) bool {
	// Allow named colors used by the frontend
	named := map[string]bool{
		"blue": true, "indigo": true, "cyan": true, "teal": true,
		"orange": true, "red": true, "grape": true,
	}
	if named[color] {
		return true
	}
	// Allow hex colors: #RGB or #RRGGBB
	if len(color) != 4 && len(color) != 7 {
		return false
	}
	if color[0] != '#' {
		return false
	}
	for _, c := range color[1:] {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
}
