package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"git.codigosh.com/CodigoSH/Lastboard/internal/core/access"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/user"
	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/password"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
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
		http.Error(w, "auth.unauthorized", http.StatusUnauthorized)
		return
	}

	var u user.User
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT id, username, role, accent_color, language,
		       COALESCE(avatar_url, ''),
		       COALESCE(widget_min_width, 140),
               COALESCE(theme, 'dark'),
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
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "error.not_found", http.StatusNotFound)
			return
		}
		// A real query error (e.g. a missing column on an un-migrated DB) must not
		// masquerade as "user not found" — log it so it is diagnosable.
		slog.Error("GetMe: failed to load user", "username", username, "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
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
	// What this account may do, so the interface can leave out what it cannot
	// use. Only a convenience: every route checks for itself.
	if acct, ok := accountFrom(r); ok {
		resp["label"] = acct.Label
		resp["access"] = accessView(acct)
	}
	if tf, err := twoFactorStatusOf(r.Context(), h.DB, u.ID); err == nil {
		resp["two_factor"] = tf
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
		DashboardBackground *string `json:"dashboard_background"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	var current user.User
	err := h.DB.QueryRowContext(r.Context(), `SELECT accent_color, language, COALESCE(widget_min_width, 140), COALESCE(theme, 'dark'), COALESCE(project_name, 'Lastboard'), COALESCE(beta_updates, 0), COALESCE(grid_columns_pc, 12), COALESCE(unit_system, 'metric'), COALESCE(dashboard_background, ''), COALESCE(project_logo, '')
		FROM users WHERE username=?`, username).Scan(
		&current.AccentColor, &current.Language, &current.WidgetMinWidth, &current.Theme, &current.ProjectName, &current.BetaUpdates, &current.GridColumnsPC, &current.UnitSystem, &current.DashboardBackground, &current.ProjectLogo)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "error.not_found", http.StatusNotFound)
			return
		}
		slog.Error("UpdatePreferences: failed to load current preferences", "username", username, "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	if input.AccentColor != "" {
		if !isValidAccentColor(input.AccentColor) {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		current.AccentColor = input.AccentColor
	}
	if input.Language != "" {
		if len(input.Language) > 10 {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		current.Language = input.Language
	}
	if input.Theme != "" {
		if input.Theme != "dark" && input.Theme != "light" && input.Theme != "system" {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		current.Theme = input.Theme
	}
	if input.UnitSystem != "" {
		if input.UnitSystem != "metric" && input.UnitSystem != "imperial" {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		current.UnitSystem = input.UnitSystem
	}
	if input.WidgetMinWidth > 0 {
		if input.WidgetMinWidth < 50 || input.WidgetMinWidth > 500 {
			http.Error(w, "error.invalid_widget_min_width", http.StatusBadRequest)
			return
		}
		current.WidgetMinWidth = input.WidgetMinWidth
	}
	if input.ProjectName != "" {
		if utf8.RuneCountInString(input.ProjectName) > 64 { // characters, not bytes
			http.Error(w, "error.project_name_too_long", http.StatusBadRequest)
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

	// Dashboard background: only when provided (nil = not sent = keep), like the
	// logo, so a request about something else does not wipe it. Sent empty it is
	// cleared. A value is checked only when it changes, so one stored in an older
	// shape never stops the other preferences from saving.
	if input.DashboardBackground != nil {
		bg := *input.DashboardBackground
		if len(bg) > 2*1024*1024 {
			http.Error(w, "error.background_too_large", http.StatusBadRequest)
			return
		}
		if bg != current.DashboardBackground && !validBackground(bg) {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		current.DashboardBackground = bg
	}

	// Project Logo: only update when explicitly provided (nil = not sent = keep current)
	if input.ProjectLogo != nil {
		logo := *input.ProjectLogo
		if logo != "" && len(logo) > 2*1024*1024 {
			http.Error(w, "error.logo_too_large", http.StatusBadRequest)
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
		slog.Error("Failed to update preferences", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
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
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
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
	if key := avatarProblem(input.AvatarUrl); key != "" {
		http.Error(w, key, http.StatusBadRequest)
		return
	}

	_, err := h.DB.Exec("UPDATE users SET username=?, avatar_url=? WHERE username=?", input.Username, input.AvatarUrl, username)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			http.Error(w, "error.username_taken", http.StatusConflict)
			return
		}
		slog.Error("Failed to update profile", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
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
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	var storedHash string
	err := h.DB.QueryRowContext(r.Context(), "SELECT password FROM users WHERE username=?", username).Scan(&storedHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "error.not_found", http.StatusNotFound)
			return
		}
		slog.Error("ChangePassword: failed to load user", "username", username, "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	switch err := confirmAccountPassword(r.Context(), h.DB, middleware.GetUserIDFromContext(r), storedHash, input.CurrentPassword); {
	case errors.Is(err, errLockedOut):
		http.Error(w, "auth.too_many_attempts", http.StatusTooManyRequests)
		return
	case errors.Is(err, errWrongPassword):
		http.Error(w, "error.current_password_incorrect", http.StatusUnauthorized)
		return
	case err != nil:
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	if err := validatePassword(input.NewPassword); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	newHash, err := password.Hash(input.NewPassword)
	if err != nil {
		slog.Error("Encryption failed", "error", err)
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	// The generation goes up with the password, so every session opened under the
	// old one stops working — including this browser's, which is the point: a
	// person changing their password is usually trying to end someone else's.
	_, err = h.DB.Exec("UPDATE users SET password=?, password_version=password_version+1 WHERE username=?",
		string(newHash), username)
	if err != nil {
		slog.Error("Failed to update password", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	// Every session is now a generation behind, this browser's included, and the
	// interface tells the person to sign in again. So the response ends the
	// session; it does not first mint a cookie for the new generation only to
	// expire it on the next line.

	invalidateSession(w, r)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":             "Password updated",
		"session_invalidated": true,
	})
}

// Admin Endpoints

// confirmAdminPassword asks the signed-in account for its password again before
// something it cannot take back, counting failures against the account.
func (h *UserHandler) confirmAdminPassword(r *http.Request, plain string) error {
	userID := middleware.GetUserIDFromContext(r)
	var storedHash string
	if err := h.DB.QueryRowContext(r.Context(), "SELECT password FROM users WHERE id = ?", userID).Scan(&storedHash); err != nil {
		return err
	}
	return confirmAccountPassword(r.Context(), h.DB, userID, storedHash, plain)
}

func (h *UserHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	if !isAdminUser(h.DB, r) {
		http.Error(w, "auth.admin_only", http.StatusForbidden)
		return
	}

	currentUserID := middleware.GetUserIDFromContext(r)
	rows, err := h.DB.QueryContext(r.Context(), "SELECT id, username, role, created_at, COALESCE(avatar_url, '') FROM users WHERE id != ?", currentUserID)
	if err != nil {
		slog.Error("Failed to fetch users", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var u user.User
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.CreatedAt, &u.AvatarUrl); err != nil {
			slog.Warn("Scan error reading users", "error", err)
			continue
		}
		entry := map[string]interface{}{
			"id":         u.ID,
			"username":   u.Username,
			"role":       u.Role,
			"avatar_url": u.AvatarUrl,
		}
		// What the administrator chose for the account: the list shows its
		// label and profile, and the edit form starts from its grants.
		if acct, err := LoadAccount(r.Context(), h.DB, u.ID); err == nil {
			entry["label"] = acct.Label
			entry["profile"] = access.ProfileOf(acct.Grants)
			entry["grants"] = acct.Grants
		}
		// Whether it signs in with a second step, so the administrator can take it
		// off for somebody who lost both the phone and the recovery codes.
		if on, err := twoFactorEnabled(r.Context(), h.DB, u.ID); err == nil {
			entry["two_factor"] = on
		}
		users = append(users, entry)
	}
	if err := rows.Err(); err != nil {
		slog.Error("Failed to fetch users", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	if !isAdminUser(h.DB, r) {
		http.Error(w, "auth.admin_only", http.StatusForbidden)
		return
	}

	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
		accessInput
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	// What the account may do is chosen when it is created. A request that says
	// nothing — a browser from before permissions — gets Standard: the profile the
	// form starts on, and one that reaches nothing on the local network.
	grants, ok := input.grantsOr(access.Standard())
	if !ok {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	label := ""
	if input.Label != nil {
		label = cleanLabel(*input.Label)
	}

	if err := validateUsername(input.Username); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := validatePassword(input.Password); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	hashedPassword, err := password.Hash(input.Password)
	if err != nil {
		slog.Error("Encryption failed", "error", err)
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	// Default Avatar Logic
	defaultAvatar := "/images/default-avatar.svg"

	stmt, err := h.DB.Prepare("INSERT INTO users (username, password, role, created_at, theme, unit_system, accent_color, language, project_name, widget_min_width, avatar_url) VALUES (?, ?, 'user', ?, 'dark', 'metric', '#e8520e', 'en', 'Lastboard', 140, ?)")
	if err != nil {
		slog.Error("Database error", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	result, err := stmt.Exec(input.Username, string(hashedPassword), time.Now(), defaultAvatar)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			http.Error(w, "error.username_taken", http.StatusConflict)
			return
		}
		slog.Error("Failed to create user", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	// Seed Default Items for New User
	newUserID, err := result.LastInsertId()
	// An account is born with its permissions. One without a row would be read as
	// having none (see LoadAccount), so a failure here undoes the account rather
	// than leaving one that cannot do anything and does not say why.
	if err == nil && newUserID > 0 {
		if aerr := storeAccess(r.Context(), h.DB, int(newUserID), grants, label); aerr != nil {
			slog.Error("CreateUser: failed to store permissions", "user_id", newUserID, "error", aerr)
			undoAccount(r.Context(), h.DB, int(newUserID))
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
	}
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
		http.Error(w, "auth.admin_only", http.StatusForbidden)
		return
	}

	var input struct {
		ID       int    `json:"id"`
		Username string `json:"username"`
		Password string `json:"password"` // Optional: if empty, don't change
		// Optional too: permissions and label change only when they are sent.
		accessInput
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	if input.ID == 0 {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	// The administrator's own account is edited from their profile, which asks
	// for the current password. This panel never asks, so it must not be a way
	// round that question.
	if input.ID == middleware.GetUserIDFromContext(r) {
		http.Error(w, "error.forbidden", http.StatusForbidden)
		return
	}

	if err := validateUsername(input.Username); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var res sql.Result
	var err error
	if input.Password != "" {
		if err := validatePassword(input.Password); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		hashedPassword, hashErr := password.Hash(input.Password)
		if hashErr != nil {
			http.Error(w, "general.internal_error", http.StatusInternalServerError)
			return
		}
		res, err = h.DB.ExecContext(r.Context(), "UPDATE users SET username=?, password=?, password_version=password_version+1 WHERE id=?", input.Username, string(hashedPassword), input.ID)
	} else {
		res, err = h.DB.ExecContext(r.Context(), "UPDATE users SET username=? WHERE id=?", input.Username, input.ID)
	}

	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			http.Error(w, "error.username_taken", http.StatusConflict)
			return
		}
		slog.Error("Failed to update user", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}

	if input.Profile != "" || input.Grants != nil || input.Label != nil {
		current, err := LoadAccount(r.Context(), h.DB, input.ID)
		if err != nil {
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
		grants, ok := input.grantsOr(current.Grants)
		if !ok {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		label := current.Label
		if input.Label != nil {
			label = cleanLabel(*input.Label)
		}
		// Takes effect on the account's next request: every route reads the
		// permissions afresh, so nobody has to sign in again.
		if err := storeAccess(r.Context(), h.DB, input.ID, grants, label); err != nil {
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "User updated"})
}

func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	if !isAdminUser(h.DB, r) {
		http.Error(w, "auth.admin_only", http.StatusForbidden)
		return
	}

	var targetID int
	var adminPassword string
	var err error

	if r.Method == http.MethodPost {
		r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
		var input struct {
			ID            int    `json:"id"`
			AdminPassword string `json:"admin_password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		targetID = input.ID
		adminPassword = input.AdminPassword
	} else {
		http.Error(w, "error.method_not_allowed", http.StatusMethodNotAllowed)
		return
	}

	// Admin password is always required to confirm destructive action
	if adminPassword == "" {
		http.Error(w, "error.admin_password_required", http.StatusBadRequest)
		return
	}
	switch err := h.confirmAdminPassword(r, adminPassword); {
	case errors.Is(err, errLockedOut):
		http.Error(w, "auth.too_many_attempts", http.StatusTooManyRequests)
		return
	case err != nil:
		http.Error(w, "error.admin_password_invalid", http.StatusUnauthorized)
		return
	}

	// Prevent self-deletion
	if targetID == middleware.GetUserIDFromContext(r) {
		http.Error(w, "error.cannot_delete_self", http.StatusBadRequest)
		return
	}

	// Prevent deleting the last admin
	var exists int
	if err := h.DB.QueryRowContext(r.Context(), "SELECT 1 FROM users WHERE id = ?", targetID).Scan(&exists); err != nil {
		http.Error(w, "error.not_found", http.StatusNotFound)
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

func validatePassword(plain string) error {
	if len(plain) < 8 {
		return fmt.Errorf("error.password_min_length")
	}
	if password.TooLong(plain) {
		return fmt.Errorf("error.password_max_length")
	}
	return nil
}

// avatarProblem returns the translation key of what is wrong with an avatar, or
// "" when it is fine: nothing (no avatar), an http(s) address, image data, or a
// path on this server — the one every account starts with, which the page sends
// back along with a new name.
func avatarProblem(v string) string {
	if v == "" {
		return ""
	}
	if len(v) > 2*1024*1024 {
		return "error.avatar_too_large"
	}
	if !strings.HasPrefix(v, "http://") && !strings.HasPrefix(v, "https://") &&
		!strings.HasPrefix(v, "data:image/") && !isServerPath(v) {
		return "error.invalid_url"
	}
	return ""
}

// isServerPath: a path on this server, not an address on another one ("//host").
func isServerPath(v string) bool {
	return strings.HasPrefix(v, "/") && !strings.HasPrefix(v, "//")
}

// validBackground says whether a dashboard background is something that can sit
// inside the page's url(…) without being able to leave it: an image data URL, an
// http(s) address or a path on this server, with no space, quote, parenthesis or
// backslash in it. Empty means no background.
func validBackground(v string) bool {
	if v == "" {
		return true
	}
	if strings.ContainsAny(v, " \t\r\n\"'()\\") {
		return false
	}
	switch {
	case strings.HasPrefix(v, "data:image/"):
		return true
	case strings.HasPrefix(v, "https://"), strings.HasPrefix(v, "http://"):
		u, err := url.Parse(v)
		return err == nil && u.Host != ""
	case isServerPath(v):
		return true
	}
	return false
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
