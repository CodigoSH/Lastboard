package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/kiwinho/CSH-Dashboard/internal/web/middleware"
	"golang.org/x/crypto/bcrypt"
)

type SystemHandler struct {
	DB *sql.DB
}

func NewSystemHandler(db *sql.DB) *SystemHandler {
	return &SystemHandler{DB: db}
}

// Data Structures for Backup
type BackupData struct {
	Version   string       `json:"version"`
	Timestamp time.Time    `json:"timestamp"`
	Users     []BackupUser `json:"users"`
	Items     []BackupItem `json:"items"`
}

type BackupUser struct {
	Username          string  `json:"username"`
	Password          string  `json:"password"`
	Role              string  `json:"role"`
	Theme             *string `json:"theme"`
	AccentColor       *string `json:"accent_color"`
	Language          *string `json:"language"`
	GridColumnsPC     *int    `json:"grid_columns_pc"`
	GridColumnsTablet *int    `json:"grid_columns_tablet"`
	GridColumnsMobile *int    `json:"grid_columns_mobile"`
	AvatarUrl         *string `json:"avatar_url"`
}

type BackupItem struct {
	Type    string  `json:"type"`
	X       int     `json:"x"`
	Y       int     `json:"y"`
	W       int     `json:"w"`
	H       int     `json:"h"`
	Content *string `json:"content"`
}

func (h *SystemHandler) isAdmin(r *http.Request) bool {
	username := middleware.GetUserFromContext(r)
	var role string
	err := h.DB.QueryRow("SELECT role FROM users WHERE username=?", username).Scan(&role)
	return err == nil && (role == "admin" || role == "Administrator")
}

// GET /api/system/backup
func (h *SystemHandler) DownloadBackup(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	backup := BackupData{
		Version:   "1.0",
		Timestamp: time.Now(),
		Users:     []BackupUser{},
		Items:     []BackupItem{},
	}

	// 1. Fetch Users
	rows, err := h.DB.Query(`SELECT username, password, role, theme, accent_color, language, 
		grid_columns_pc, grid_columns_tablet, grid_columns_mobile, avatar_url FROM users`)
	if err != nil {
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var u BackupUser
		if err := rows.Scan(&u.Username, &u.Password, &u.Role, &u.Theme, &u.AccentColor, &u.Language,
			&u.GridColumnsPC, &u.GridColumnsTablet, &u.GridColumnsMobile, &u.AvatarUrl); err != nil {
			continue
		}
		backup.Users = append(backup.Users, u)
	}

	// 2. Fetch Items
	itemRows, err := h.DB.Query("SELECT type, x, y, w, h, content FROM items")
	if err != nil {
		http.Error(w, "Failed to fetch items", http.StatusInternalServerError)
		return
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var i BackupItem
		if err := itemRows.Scan(&i.Type, &i.X, &i.Y, &i.W, &i.H, &i.Content); err != nil {
			continue
		}
		backup.Items = append(backup.Items, i)
	}

	// Send JSON
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"csh-backup-%s.json\"", time.Now().Format("2006-01-02-1504")))
	json.NewEncoder(w).Encode(backup)
}

// POST /api/system/restore
func (h *SystemHandler) RestoreBackup(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Parse Upload
	file, _, err := r.FormFile("backup_file")
	if err != nil {
		http.Error(w, "Invalid file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	var backup BackupData
	if err := json.NewDecoder(file).Decode(&backup); err != nil {
		http.Error(w, "Invalid backup format", http.StatusBadRequest)
		return
	}

	// Transaction
	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// 1. Clear Data
	if _, err := tx.Exec("DELETE FROM items"); err != nil {
		http.Error(w, "Failed to clear items", http.StatusInternalServerError)
		return
	}
	if _, err := tx.Exec("DELETE FROM users"); err != nil {
		http.Error(w, "Failed to clear users", http.StatusInternalServerError)
		return
	}

	// 2. Insert Users
	userStmt, err := tx.Prepare(`INSERT INTO users (username, password, role, theme, accent_color, language, 
		grid_columns_pc, grid_columns_tablet, grid_columns_mobile, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		http.Error(w, "DB Prepare Error", http.StatusInternalServerError)
		return
	}
	defer userStmt.Close()

	for _, u := range backup.Users {
		_, err := userStmt.Exec(u.Username, u.Password, u.Role, u.Theme, u.AccentColor, u.Language,
			u.GridColumnsPC, u.GridColumnsTablet, u.GridColumnsMobile, u.AvatarUrl)
		if err != nil {
			http.Error(w, "Failed to restore user: "+u.Username, http.StatusInternalServerError)
			return
		}
	}

	// 3. Insert Items
	itemStmt, err := tx.Prepare(`INSERT INTO items (type, x, y, w, h, content) VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		http.Error(w, "DB Prepare Error", http.StatusInternalServerError)
		return
	}
	defer itemStmt.Close()

	for _, i := range backup.Items {
		_, err := itemStmt.Exec(i.Type, i.X, i.Y, i.W, i.H, i.Content)
		if err != nil {
			http.Error(w, "Failed to restore item", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Commit failed", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Backup restored successfully. Please log in again."})
}

// POST /api/system/reset
func (h *SystemHandler) FactoryReset(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// 1. Clear Data
	if _, err := tx.Exec("DELETE FROM items"); err != nil {
		http.Error(w, "Failed to clear items", http.StatusInternalServerError)
		return
	}
	if _, err := tx.Exec("DELETE FROM users"); err != nil {
		http.Error(w, "Failed to clear users", http.StatusInternalServerError)
		return
	}

	// 2. Re-create Default Admin
	hashed, _ := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
	_, err = tx.Exec(`INSERT INTO users (username, password, role, theme, accent_color, language) 
		VALUES (?, ?, ?, ?, ?, ?)`, "admin", string(hashed), "admin", "system", "blue", "en")

	if err != nil {
		http.Error(w, "Failed to create default admin", http.StatusInternalServerError)
		return
	}

	// 3. Seed Default Items
	// (Reusing the same seed logic as db.go, but inline for simplicity or we should define it in core)
	// For now, let's keep it empty or minimal. DB Init will seed if empty? No, DB init runs on startup.
	// Reset should probably leave it empty or restore default bookmarks.
	// Let's restore defaults to be "Factory Reset" truly.

	defaultItemsVals := `
		('bookmark', 1, 1, 1, 1, '{"label": "Proxmox", "url": "#", "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/proxmox.png", "iconName": "proxmox"}'),
		('bookmark', 2, 1, 1, 1, '{"label": "TrueNAS", "url": "#", "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/truenas.png", "iconName": "truenas"}'),
		('bookmark', 3, 1, 1, 1, '{"label": "Cloudflare", "url": "#", "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/cloudflare.png", "iconName": "cloudflare"}')`

	_, err = tx.Exec("INSERT INTO items (type, x, y, w, h, content) VALUES " + defaultItemsVals)
	if err != nil {
		http.Error(w, "Failed to seed items", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Commit failed", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Factory reset complete."})
}
