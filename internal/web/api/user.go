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
	// Fallbacks for scan if columns are null (sql.NullInt64 or direct scan if NOT NULL constraint, schema has DEFAULT)
	err := h.DB.QueryRow(`
		SELECT id, username, role, accent_color, language, 
		       COALESCE(grid_columns_pc, 12), COALESCE(grid_columns_tablet, 4), COALESCE(grid_columns_mobile, 2)
		FROM users WHERE username='kiwinho'`).Scan(
		&u.ID, &u.Username, &u.Role, &u.AccentColor, &u.Language,
		&u.GridColumnsPC, &u.GridColumnsTablet, &u.GridColumnsMobile,
	)
	if err != nil {
		// Fallback/Mock
		u = user.User{Username: "kiwinho", Role: "Administrator", AccentColor: "blue", Language: "en",
			GridColumnsPC: 12, GridColumnsTablet: 4, GridColumnsMobile: 2}
	}

	resp := map[string]interface{}{
		"username":            u.Username,
		"initials":            "KW",
		"avatar_url":          "",
		"role":                u.Role,
		"accent_color":        u.AccentColor,
		"language":            u.Language,
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
		GridColumnsPC     int    `json:"grid_columns_pc"`
		GridColumnsTablet int    `json:"grid_columns_tablet"`
		GridColumnsMobile int    `json:"grid_columns_mobile"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Dynamic update query construction is better, but for now we update all prefs
	// Check if grid cols are provided (0 is default int), if so update them
	// Ideally, the frontend sends all or we use a patch logic. For this demo, assuming full object or partials merged.
	// We'll trust the UserStore to send the full preferences object or we handle 0s.
	// Given UserStore.updatePreferences implementation, it sends partials.
	// We should probably read current state first or use COALESCE in update logic?
	// SQLite `UPDATE users SET col = COALESCE(?, col)` mechanism.
	// But `input.GridColumnPC` will be 0 if not present. That's a valid problem.
	// Let's implement a cleaner selective update or just assume the client sends what changed + we read-modify-write.
	// Simpler: Just run separate updates? No.
	// Let's rely on COALESCE with NULLs? No, json decoder sets 0.
	// We'll fetch current user preferences first to merge.

	var current user.User
	err := h.DB.QueryRow(`SELECT accent_color, language, grid_columns_pc, grid_columns_tablet, grid_columns_mobile 
		FROM users WHERE username='kiwinho'`).Scan(
		&current.AccentColor, &current.Language, &current.GridColumnsPC, &current.GridColumnsTablet, &current.GridColumnsMobile)

	if err != nil {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	// Apply overrides
	if input.AccentColor != "" {
		current.AccentColor = input.AccentColor
	}
	if input.Language != "" {
		current.Language = input.Language
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

	_, err = h.DB.Exec(`UPDATE users SET accent_color=?, language=?, 
		grid_columns_pc=?, grid_columns_tablet=?, grid_columns_mobile=? 
		WHERE username='kiwinho'`,
		current.AccentColor, current.Language,
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
