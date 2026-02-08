package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/CodigoSH/Lastboard/internal/version"
	"github.com/CodigoSH/Lastboard/internal/web/middleware"
)

// ... existing code ...

// POST /api/system/reset
func (h *SystemHandler) FactoryReset(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(r) {
		http.Error(w, "auth.unauthorized", http.StatusForbidden)
		return
	}

	// 1. Close DB Connection
	if err := h.DB.Close(); err != nil {
		log.Printf("Error closing DB during reset: %v", err)
	}

	// 2. Delete DB File
	dbPath := os.Getenv("DB_FILE")
	if dbPath == "" {
		dbPath = "./dashboard.db"
	}
	if err := os.Remove(dbPath); err != nil {
		if !os.IsNotExist(err) {
			http.Error(w, "Failed to delete database file: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// 3. Respond
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "notifier.system_restarting"})

	// 4. Self-Restart (Re-Exec)
	go func() {
		time.Sleep(500 * time.Millisecond)

		// Get current binary path
		binary, err := os.Executable()
		if err != nil {
			log.Printf("Failed to get executable path, falling back to exit: %v", err)
			os.Exit(1)
		}

		env := os.Environ()
		args := os.Args

		if err := syscall.Exec(binary, args, env); err != nil {
			log.Printf("Failed to re-exec, falling back to exit: %v", err)
			os.Exit(1)
		}
	}()
}

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
	ProjectName       *string `json:"project_name"`
	BetaUpdates       *bool   `json:"beta_updates"`
}

type BackupItem struct {
	Owner   string  `json:"owner"`
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
	return err == nil && strings.ToLower(role) == "admin"
}

// GET /api/system/backup
func (h *SystemHandler) DownloadBackup(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	backup := BackupData{
		Version:   version.Current,
		Timestamp: time.Now(),
		Users:     []BackupUser{},
		Items:     []BackupItem{},
	}

	// 1. Fetch Users
	rows, err := h.DB.Query(`SELECT username, password, role, theme, accent_color, language,
		grid_columns_pc, grid_columns_tablet, grid_columns_mobile, avatar_url, project_name, COALESCE(beta_updates, 0) FROM users`)
	if err != nil {
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var u BackupUser
		if err := rows.Scan(&u.Username, &u.Password, &u.Role, &u.Theme, &u.AccentColor, &u.Language,
			&u.GridColumnsPC, &u.GridColumnsTablet, &u.GridColumnsMobile, &u.AvatarUrl, &u.ProjectName, &u.BetaUpdates); err != nil {
			continue
		}
		backup.Users = append(backup.Users, u)
	}
	if err := rows.Err(); err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// 2. Fetch Items — join users to store owner username; backups must be
	// portable across restores where numeric IDs will differ.
	itemRows, err := h.DB.Query(`SELECT COALESCE(u.username, ''), i.type, i.x, i.y, i.w, i.h, i.content
		FROM items i LEFT JOIN users u ON i.user_id = u.id`)
	if err != nil {
		http.Error(w, "Failed to fetch items", http.StatusInternalServerError)
		return
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var i BackupItem
		if err := itemRows.Scan(&i.Owner, &i.Type, &i.X, &i.Y, &i.W, &i.H, &i.Content); err != nil {
			continue
		}
		backup.Items = append(backup.Items, i)
	}
	if err := itemRows.Err(); err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Send JSON
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"lastboard-backup-%s.json\"", time.Now().Format("2006-01-02-1504")))
	json.NewEncoder(w).Encode(backup)
}

// POST /api/system/restore
func (h *SystemHandler) RestoreBackup(w http.ResponseWriter, r *http.Request) {
	if !h.isAdmin(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Limit upload size to 10 MB
	r.Body = http.MaxBytesReader(w, r.Body, 10*1024*1024)

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

	// Validate users before writing to DB
	for _, u := range backup.Users {
		if !strings.HasPrefix(u.Password, "$2a$") && !strings.HasPrefix(u.Password, "$2b$") {
			http.Error(w, "Invalid backup data", http.StatusBadRequest)
			return
		}
		role := strings.ToLower(u.Role)
		if role != "admin" && role != "user" {
			http.Error(w, "Invalid backup data", http.StatusBadRequest)
			return
		}
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
		grid_columns_pc, grid_columns_tablet, grid_columns_mobile, avatar_url, project_name, beta_updates) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		http.Error(w, "DB Prepare Error", http.StatusInternalServerError)
		return
	}
	defer userStmt.Close()

	for _, u := range backup.Users {
		// Handle nil for new fields if restoring from old backup
		betaUpdates := false
		if u.BetaUpdates != nil {
			betaUpdates = *u.BetaUpdates
		}

		_, err := userStmt.Exec(u.Username, u.Password, u.Role, u.Theme, u.AccentColor, u.Language,
			u.GridColumnsPC, u.GridColumnsTablet, u.GridColumnsMobile, u.AvatarUrl, u.ProjectName, betaUpdates)
		if err != nil {
			http.Error(w, "Failed to restore backup", http.StatusInternalServerError)
			return
		}
	}

	// 3. Build username → restored-id map so item ownership survives the restore.
	ownerMap := make(map[string]int)
	for _, u := range backup.Users {
		var uid int
		if err := tx.QueryRow("SELECT id FROM users WHERE username = ?", u.Username).Scan(&uid); err == nil {
			ownerMap[u.Username] = uid
		}
	}
	// Fallback for items from old backups that have no owner field.
	var fallbackOwner int
	if err := tx.QueryRow("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").Scan(&fallbackOwner); err != nil {
		http.Error(w, "No admin found for item assignment", http.StatusInternalServerError)
		return
	}

	// 4. Insert Items with resolved user_id
	itemStmt, err := tx.Prepare(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		http.Error(w, "DB Prepare Error", http.StatusInternalServerError)
		return
	}
	defer itemStmt.Close()

	for _, i := range backup.Items {
		uid := ownerMap[i.Owner]
		if uid == 0 {
			uid = fallbackOwner
		}
		_, err := itemStmt.Exec(uid, i.Type, i.X, i.Y, i.W, i.H, i.Content)
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
	json.NewEncoder(w).Encode(map[string]string{"message": "notifier.restore_success"})
}

// Helpers

type MemInfo struct {
	Total uint64
	Free  uint64
	Avail uint64
	Used  uint64
}

func readMemInfo() (MemInfo, error) {
	// Parse /proc/meminfo
	// MemTotal:       32768400 kB
	// MemAvailable:   22341200 kB
	// ...
	content, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return MemInfo{}, err
	}

	var m MemInfo
	lines := strings.Split(string(content), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		val := parseKB(fields[1])
		switch fields[0] {
		case "MemTotal:":
			m.Total = val
		case "MemFree:":
			m.Free = val
		case "MemAvailable:":
			m.Avail = val
		}
	}

	// Used = Total - Available (if available exists, else Free)
	if m.Avail > 0 {
		m.Used = m.Total - m.Avail
	} else {
		m.Used = m.Total - m.Free
	}
	return m, nil
}

func calculateCPUUsage(interval time.Duration) (float64, error) {
	readStat := func() (idle, total uint64, err error) {
		content, err := os.ReadFile("/proc/stat")
		if err != nil {
			return 0, 0, err
		}
		lines := strings.Split(string(content), "\n")
		if len(lines) == 0 {
			return 0, 0, fmt.Errorf("empty stat")
		}
		fields := strings.Fields(lines[0])
		if len(fields) < 5 || fields[0] != "cpu" {
			return 0, 0, fmt.Errorf("bad stat format")
		}

		// user + nice + system + idle + iowait + irq + softirq + steal
		var sum uint64
		for _, v := range fields[1:] {
			n, _ := strconv.ParseUint(v, 10, 64)
			sum += n
		}
		idleVal, _ := strconv.ParseUint(fields[4], 10, 64)
		return idleVal, sum, nil
	}

	idle1, total1, err := readStat()
	if err != nil {
		return 0, err
	}

	time.Sleep(interval)

	idle2, total2, err := readStat()
	if err != nil {
		return 0, err
	}

	idleDelta := float64(idle2 - idle1)
	totalDelta := float64(total2 - total1)

	if totalDelta == 0 {
		return 0, nil
	}

	return 100.0 * (1.0 - idleDelta/totalDelta), nil
}

func readTemp() (float64, error) {
	// Scan /sys/class/thermal/ for all zones
	entries, err := os.ReadDir("/sys/class/thermal")
	if err != nil {
		return 0, err
	}

	var bestTemp float64 = 0

	for _, entry := range entries {
		if !strings.HasPrefix(entry.Name(), "thermal_zone") {
			continue
		}

		path := "/sys/class/thermal/" + entry.Name()

		// 1. Read Type
		typeBytes, err := os.ReadFile(path + "/type")
		if err != nil {
			continue
		}
		sensorType := strings.TrimSpace(string(typeBytes))

		// 2. Read Temp
		tempBytes, err := os.ReadFile(path + "/temp")
		if err != nil {
			continue
		}
		tempRaw, err := strconv.ParseFloat(strings.TrimSpace(string(tempBytes)), 64)
		if err != nil {
			continue
		}

		tempC := tempRaw / 1000.0

		// Priority 1: Explicit CPU match (Return immediately)
		if sensorType == "x86_pkg_temp" || sensorType == "cpu-thermal" || sensorType == "k10temp" {
			return tempC, nil
		}

		// Priority 2: Highest non-excluded temp
		// Exclude: wifi, battery, wireless
		s := strings.ToLower(sensorType)
		if !strings.Contains(s, "wifi") &&
			!strings.Contains(s, "battery") &&
			!strings.Contains(s, "wireless") {
			if tempC > bestTemp {
				bestTemp = tempC
			}
		}
	}

	return bestTemp, nil
}

func parseKB(s string) uint64 {
	s = strings.TrimSuffix(s, " kB")
	v, _ := strconv.ParseUint(s, 10, 64)
	return v * 1024
}
