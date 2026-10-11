package api

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
	"syscall"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/password"
	"git.codigosh.com/CodigoSH/Lastboard/internal/version"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

// POST /api/system/reset
func (h *SystemHandler) FactoryReset(w http.ResponseWriter, r *http.Request) {
	username := middleware.GetUserFromContext(r)
	if username == "" {
		http.Error(w, "auth.unauthorized", http.StatusUnauthorized)
		return
	}

	var userID int
	if err := h.DB.QueryRowContext(r.Context(), "SELECT id FROM users WHERE username=?", username).Scan(&userID); err != nil {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}

	if !isFirstAdmin(h.DB, userID) {
		http.Error(w, "auth.admin_only", http.StatusForbidden)
		return
	}

	// Verify Password
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
	var input struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	var storedHash string
	if err := h.DB.QueryRowContext(r.Context(), "SELECT password FROM users WHERE id=?", userID).Scan(&storedHash); err != nil {
		slog.Error("Database error", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	if err := password.Verify(input.Password, storedHash); err != nil {
		http.Error(w, "general.invalid_input", http.StatusUnauthorized)
		return
	}

	// 1. Respond first, before any destructive operation
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "notifier.system_restarting"})

	// 2. Perform reset and restart asynchronously after response is sent
	go func() {
		time.Sleep(500 * time.Millisecond)

		// Close DB
		if err := h.DB.Close(); err != nil {
			slog.Warn("Error closing DB during reset", "error", err)
		}

		// Delete DB File
		dbPath := os.Getenv("DB_FILE")
		if dbPath == "" {
			dbPath = "./lastboard.db"
		}
		if err := os.Remove(dbPath); err != nil {
			if !os.IsNotExist(err) {
				slog.Error("Failed to delete database file", "error", err)
				os.Exit(1)
			}
		}

		// Ensure SQLite WAL files are also removed
		os.Remove(dbPath + "-wal")
		os.Remove(dbPath + "-shm")

		// Self-Restart (Re-Exec)
		binary, err := os.Executable()
		if err != nil {
			slog.Warn("Failed to get executable path, falling back to exit", "error", err)
			os.Exit(1)
		}

		if err := syscall.Exec(binary, os.Args, os.Environ()); err != nil {
			slog.Warn("Failed to re-exec, falling back to exit", "error", err)
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
	Version    string            `json:"version"`
	Timestamp  time.Time         `json:"timestamp"`
	Users      []BackupUser      `json:"users"`
	Dashboards []BackupDashboard `json:"dashboards"`
	Items      []BackupItem      `json:"items"`
	// Stored icons, so a backup restores into a machine with no internet and
	// still looks like the board you left. Omitted from older backups, which
	// restore fine without them — the items keep whatever URL they had.
	Icons []BackupIcon `json:"icons,omitempty"`
	// What widgets keep secret (a password, a key header), against the id the
	// item had when the backup was made: restore gives items new ids and maps
	// these across. Omitted from older backups, whose widgets carry whatever
	// they carried in their content.
	WidgetSecrets []BackupWidgetSecret `json:"widget_secrets,omitempty"`
	// Settings that are configuration the operator typed in and would have to
	// type again: the Proxmox hosts with their tokens, the icons chosen for
	// their machines, and how monitoring runs and where it sends alerts. Only the keys in backupSettingKeys travel — the session
	// secret and the like stay behind. Omitted from older backups, which
	// restore fine without them and leave whatever is configured alone.
	Settings map[string]string `json:"settings,omitempty"`
}

// backupSettingKeys is the whole list of system_settings rows a backup carries
// and a restore accepts. A restore writes only these, whatever the file says.
// The value says whether the row holds JSON, which a restore checks before
// writing; the monitoring rows are plain values.
var backupSettingKeys = map[string]bool{
	proxmoxHostsKey: true,
	proxmoxIconsKey: true,

	"monitoring_mode":           false,
	"monitoring_interval_sec":   false,
	"monitoring_fail_threshold": false,
	"monitoring_alerts_enabled": false,
	"monitoring_notify_type":    false,
	"monitoring_notify_url":     false,
	"monitoring_notify_token":   false,
}

// BackupIcon carries an icon's bytes base64-encoded, since a backup is JSON.
type BackupIcon struct {
	Hash string `json:"hash"`
	Mime string `json:"mime"`
	Data string `json:"data"`
}

type BackupUser struct {
	Username            string  `json:"username"`
	Password            string  `json:"password"`
	Role                string  `json:"role"`
	Theme               *string `json:"theme"`
	AccentColor         *string `json:"accent_color"`
	Language            *string `json:"language"`
	GridColumnsPC       *int    `json:"grid_columns_pc"`
	GridColumnsTablet   *int    `json:"grid_columns_tablet"`
	GridColumnsMobile   *int    `json:"grid_columns_mobile"`
	AvatarUrl           *string `json:"avatar_url"`
	ProjectName         *string `json:"project_name"`
	ProjectLogo         *string `json:"project_logo"`
	BetaUpdates         *bool   `json:"beta_updates"`
	UnitSystem          *string `json:"unit_system"`
	DashboardBackground *string `json:"dashboard_background"`
	WidgetMinWidth      *int    `json:"widget_min_width"`
}

type BackupWidgetSecret struct {
	ItemID int    `json:"item_id"`
	Name   string `json:"name"`
	Value  string `json:"value"`
}

type BackupDashboard struct {
	ID        int    `json:"id"`
	Owner     string `json:"owner"`
	Name      string `json:"name"`
	Position  int    `json:"position"`
	IsDefault bool   `json:"is_default"`
}

type BackupItem struct {
	ID          int     `json:"id"`
	Owner       string  `json:"owner"`
	DashboardID *int    `json:"dashboard_id,omitempty"`
	ParentID    *int    `json:"parent_id,omitempty"`
	Type        string  `json:"type"`
	X           int     `json:"x"`
	Y           int     `json:"y"`
	W           int     `json:"w"`
	H           int     `json:"h"`
	Content     *string `json:"content"`
}

// GET /api/system/backup — the plain file.
//
// Kept beside the POST because a browser that has not reloaded since the
// update still asks this way, and answering it with the file it always got is
// the tolerant thing.
func (h *SystemHandler) DownloadBackup(w http.ResponseWriter, r *http.Request) {
	h.serveBackup(w, r, "")
}

// POST /api/system/backup — with an optional password to protect the file. The
// password travels in the body: a URL would put it in the access log.
func (h *SystemHandler) DownloadProtectedBackup(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
	var input struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	h.serveBackup(w, r, input.Password)
}

func (h *SystemHandler) serveBackup(w http.ResponseWriter, r *http.Request, password string) {
	username := middleware.GetUserFromContext(r)
	if username == "" {
		http.Error(w, "error.forbidden", http.StatusForbidden)
		return
	}

	// Only the first admin (by ID) may download the backup,
	// because it contains password hashes for all users.
	var userID int
	if err := h.DB.QueryRowContext(r.Context(), "SELECT id FROM users WHERE username=?", username).Scan(&userID); err != nil {
		http.Error(w, "error.forbidden", http.StatusForbidden)
		return
	}
	if !isFirstAdmin(h.DB, userID) {
		http.Error(w, "auth.admin_only", http.StatusForbidden)
		return
	}

	backup := BackupData{
		Version:   version.Current,
		Timestamp: time.Now(),
		Users:     []BackupUser{},
		Items:     []BackupItem{},
	}

	// 1. Fetch Users
	rows, err := h.DB.QueryContext(r.Context(), `SELECT username, password, role, theme, accent_color, language,
		grid_columns_pc, grid_columns_tablet, grid_columns_mobile, avatar_url, project_name,
		COALESCE(project_logo, ''), COALESCE(beta_updates, 0), COALESCE(unit_system, 'metric'),
		COALESCE(dashboard_background, ''), COALESCE(widget_min_width, 140) FROM users`)
	if err != nil {
		slog.Error("Failed to fetch users", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var u BackupUser
		if err := rows.Scan(&u.Username, &u.Password, &u.Role, &u.Theme, &u.AccentColor, &u.Language,
			&u.GridColumnsPC, &u.GridColumnsTablet, &u.GridColumnsMobile, &u.AvatarUrl, &u.ProjectName,
			&u.ProjectLogo, &u.BetaUpdates, &u.UnitSystem, &u.DashboardBackground, &u.WidgetMinWidth); err != nil {
			continue
		}
		backup.Users = append(backup.Users, u)
	}
	if err := rows.Err(); err != nil {
		slog.Error("Database error", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	// 2. Fetch Dashboards — join users to store owner username for portability.
	dashRows, err := h.DB.QueryContext(r.Context(), `SELECT d.id, COALESCE(u.username, ''), d.name, d.position, d.is_default
		FROM dashboards d LEFT JOIN users u ON d.user_id = u.id ORDER BY d.id ASC`)
	if err != nil {
		slog.Error("Failed to fetch dashboards", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer dashRows.Close()

	for dashRows.Next() {
		var d BackupDashboard
		if err := dashRows.Scan(&d.ID, &d.Owner, &d.Name, &d.Position, &d.IsDefault); err != nil {
			continue
		}
		backup.Dashboards = append(backup.Dashboards, d)
	}
	if err := dashRows.Err(); err != nil {
		slog.Error("Database error", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	// 3. Fetch Items — join users to store owner username; backups must be
	// portable across restores where numeric IDs will differ.
	itemRows, err := h.DB.QueryContext(r.Context(), `SELECT i.id, COALESCE(u.username, ''), i.dashboard_id, i.parent_id, i.type, i.x, i.y, i.w, i.h, i.content
		FROM items i LEFT JOIN users u ON i.user_id = u.id`)
	if err != nil {
		slog.Error("Failed to fetch items", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var i BackupItem
		if err := itemRows.Scan(&i.ID, &i.Owner, &i.DashboardID, &i.ParentID, &i.Type, &i.X, &i.Y, &i.W, &i.H, &i.Content); err != nil {
			continue
		}
		backup.Items = append(backup.Items, i)
	}
	if err := itemRows.Err(); err != nil {
		slog.Error("Database error", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	// 3b. What widgets keep secret. They belong in the backup for the same
	//     reason the Proxmox tokens do — the operator typed them in — and the
	//     backup's own password is what protects them on their way out.
	secretRows, err := h.DB.QueryContext(r.Context(), `SELECT item_id, name, value FROM widget_secrets`)
	if err != nil {
		slog.Error("Failed to fetch widget secrets", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer secretRows.Close()
	for secretRows.Next() {
		var sec BackupWidgetSecret
		if err := secretRows.Scan(&sec.ItemID, &sec.Name, &sec.Value); err != nil {
			continue
		}
		backup.WidgetSecrets = append(backup.WidgetSecrets, sec)
	}
	if err := secretRows.Err(); err != nil {
		slog.Error("Database error", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	// 4. Stored icons. A backup without them restores a board whose icons only
	//    come back if the machine can reach the internet, which defeats keeping
	//    them locally in the first place.
	iconRows, err := h.DB.QueryContext(r.Context(), `SELECT hash, mime, data FROM icons`)
	if err != nil {
		slog.Error("Failed to fetch icons", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer iconRows.Close()

	for iconRows.Next() {
		var (
			hash, mime string
			data       []byte
		)
		if err := iconRows.Scan(&hash, &mime, &data); err != nil {
			continue
		}
		backup.Icons = append(backup.Icons, BackupIcon{
			Hash: hash,
			Mime: mime,
			Data: base64.StdEncoding.EncodeToString(data),
		})
	}
	if err := iconRows.Err(); err != nil {
		slog.Error("Database error", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	// 5. Settings the operator would otherwise have to type again.
	for key := range backupSettingKeys {
		var value string
		if err := h.DB.QueryRowContext(r.Context(), `SELECT value FROM system_settings WHERE key = ?`, key).Scan(&value); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				continue
			}
			slog.Error("Failed to fetch setting", "key", key, "error", err)
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
		if backup.Settings == nil {
			backup.Settings = map[string]string{}
		}
		backup.Settings[key] = value
	}

	name := fmt.Sprintf("lastboard-backup-%s.json", time.Now().Format("2006-01-02-1504"))
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", name))

	if password == "" {
		json.NewEncoder(w).Encode(backup)
		return
	}
	plain, err := json.Marshal(backup)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	sealed, err := sealBackup(plain, password)
	if err != nil {
		slog.Error("Failed to seal backup", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	w.Write(sealed)
}

// POST /api/system/restore
func (h *SystemHandler) RestoreBackup(w http.ResponseWriter, r *http.Request) {
	if !isAdminUser(h.DB, r) {
		http.Error(w, "error.forbidden", http.StatusForbidden)
		return
	}

	// Limit upload size. A protected file is the backup base64-encoded, a third
	// larger, so the ceiling sits above the 10 MB a plain one is held to.
	r.Body = http.MaxBytesReader(w, r.Body, 14*1024*1024)

	// Parse Upload
	file, _, err := r.FormFile("backup_file")
	if err != nil {
		http.Error(w, "error.invalid_file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	raw, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "error.invalid_file", http.StatusBadRequest)
		return
	}
	if isSealedBackup(raw) {
		password := r.FormValue("password")
		if password == "" {
			http.Error(w, "backup.password_required", http.StatusBadRequest)
			return
		}
		plain, err := openBackup(raw, password)
		switch {
		case errors.Is(err, errBackupUnsupported):
			http.Error(w, "error.invalid_backup_format", http.StatusBadRequest)
			return
		case err != nil:
			http.Error(w, "backup.wrong_password", http.StatusUnauthorized)
			return
		}
		raw = plain
	}

	var backup BackupData
	if err := json.Unmarshal(raw, &backup); err != nil {
		http.Error(w, "error.invalid_backup_format", http.StatusBadRequest)
		return
	}

	if err := validateBackupUsers(backup); err != nil {
		writeRestoreError(w, err)
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		slog.Error("Database error", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	if err := clearExistingData(tx); err != nil {
		writeRestoreError(w, err)
		return
	}
	if err := restoreUsers(tx, backup); err != nil {
		writeRestoreError(w, err)
		return
	}
	ownerMap, fallbackOwner, err := buildOwnerMap(tx, backup)
	if err != nil {
		writeRestoreError(w, err)
		return
	}
	dashMap, err := restoreDashboards(tx, backup, ownerMap, fallbackOwner)
	if err != nil {
		writeRestoreError(w, err)
		return
	}
	if err := restoreItems(tx, backup, ownerMap, fallbackOwner, dashMap); err != nil {
		writeRestoreError(w, err)
		return
	}
	if err := restoreIcons(tx, backup); err != nil {
		writeRestoreError(w, err)
		return
	}
	if err := restoreSettings(tx, backup); err != nil {
		writeRestoreError(w, err)
		return
	}

	if err := tx.Commit(); err != nil {
		slog.Error("Commit failed", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	// A backup taken by an earlier version carries widget credentials inside the
	// widgets themselves.
	if _, err := MigrateWidgetSecrets(h.DB); err != nil {
		slog.Error("Moving widget credentials after a restore failed", "error", err)
	}

	// Regenerate session secret to invalidate all active sessions.
	// After a restore, all users must re-authenticate to ensure they
	// are accessing data consistent with the restored state.
	newSecret := make([]byte, 32)
	if _, err := rand.Read(newSecret); err == nil {
		newSecretHex := hex.EncodeToString(newSecret)
		_, _ = h.DB.Exec("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('session_secret', ?)", newSecretHex)
	}

	// Instruct the browser to wipe all cached data (assets, cookies, localStorage).
	// This ensures the client starts fresh after a restore — without this, stale
	// session cookies and cached API responses cause the app to appear broken
	// until the user manually clears browser storage.
	w.Header().Set("Clear-Site-Data", `"cache", "cookies", "storage"`)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "notifier.restore_success"})
}

// restoreError carries an HTTP status and message through the restore steps so
// the handler can translate a failure into the exact same response as before.
type restoreError struct {
	status int
	msg    string
}

func (e *restoreError) Error() string { return e.msg }

func writeRestoreError(w http.ResponseWriter, err error) {
	var re *restoreError
	if errors.As(err, &re) {
		http.Error(w, re.msg, re.status)
		return
	}
	http.Error(w, "general.db_error", http.StatusInternalServerError)
}

// validateBackupUsers rejects backups whose users have a password hash this
// version cannot verify, or an unknown role, before any data is written. A
// backup from before the move to Argon2id carries bcrypt hashes and restores.
func validateBackupUsers(backup BackupData) error {
	for _, u := range backup.Users {
		if !password.Recognised(u.Password) {
			return &restoreError{http.StatusBadRequest, "Invalid backup data"}
		}
		role := strings.ToLower(u.Role)
		if role != "admin" && role != "user" {
			return &restoreError{http.StatusBadRequest, "Invalid backup data"}
		}
	}
	return nil
}

// clearExistingData wipes items, dashboards and users in FK-safe order.
func clearExistingData(tx *sql.Tx) error {
	if _, err := tx.Exec("DELETE FROM items"); err != nil {
		return &restoreError{http.StatusInternalServerError, "Failed to clear items"}
	}
	if _, err := tx.Exec("DELETE FROM dashboards"); err != nil {
		return &restoreError{http.StatusInternalServerError, "Failed to clear dashboards"}
	}
	if _, err := tx.Exec("DELETE FROM users"); err != nil {
		return &restoreError{http.StatusInternalServerError, "Failed to clear users"}
	}
	if _, err := tx.Exec("DELETE FROM icons"); err != nil {
		return &restoreError{http.StatusInternalServerError, "Failed to clear icons"}
	}
	return nil
}

// restoreSettings puts back the configuration a backup carries.
//
// Only the keys in backupSettingKeys are written, whatever else the file names:
// a restore must not be a way to set the session secret or any other row. A
// backup without settings — one taken before they travelled — leaves what is
// configured here alone.
func restoreSettings(tx *sql.Tx, backup BackupData) error {
	for key, isJSON := range backupSettingKeys {
		value, ok := backup.Settings[key]
		if !ok {
			continue
		}
		if isJSON && !json.Valid([]byte(value)) {
			return &restoreError{http.StatusBadRequest, "Invalid backup data"}
		}
		if _, err := tx.Exec(`INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)`, key, value); err != nil {
			return &restoreError{http.StatusInternalServerError, "Failed to restore settings"}
		}
	}
	return nil
}

// restoreIcons puts the stored images back under their own hashes.
//
// A backup taken before icons existed simply has none, and the restore is a
// no-op: its items carry whatever URL they had at the time.
func restoreIcons(tx *sql.Tx, backup BackupData) error {
	if len(backup.Icons) == 0 {
		return nil
	}

	stmt, err := tx.Prepare(`INSERT OR IGNORE INTO icons (hash, mime, data, size) VALUES (?, ?, ?, ?)`)
	if err != nil {
		return &restoreError{http.StatusInternalServerError, "Failed to prepare icons"}
	}
	defer stmt.Close()

	for _, ic := range backup.Icons {
		data, err := base64.StdEncoding.DecodeString(ic.Data)
		if err != nil {
			// One unreadable icon is a missing picture, not a failed restore.
			slog.Warn("Skipping unreadable icon in backup", "hash", ic.Hash)
			continue
		}
		if _, err := stmt.Exec(ic.Hash, ic.Mime, data, len(data)); err != nil {
			return &restoreError{http.StatusInternalServerError, "Failed to restore icons"}
		}
	}
	return nil
}

// restoreUsers inserts all users from the backup with their preference columns.
func restoreUsers(tx *sql.Tx, backup BackupData) error {
	userStmt, err := tx.Prepare(`INSERT INTO users (username, password, role, theme, accent_color, language,
		grid_columns_pc, grid_columns_tablet, grid_columns_mobile, avatar_url, project_name, project_logo,
		beta_updates, unit_system, dashboard_background, widget_min_width) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return &restoreError{http.StatusInternalServerError, "DB Prepare Error"}
	}
	defer userStmt.Close()

	for _, u := range backup.Users {
		betaUpdates := false
		if u.BetaUpdates != nil {
			betaUpdates = *u.BetaUpdates
		}
		unitSystem := "metric"
		if u.UnitSystem != nil {
			unitSystem = *u.UnitSystem
		}
		dashBg := ""
		if u.DashboardBackground != nil {
			dashBg = *u.DashboardBackground
		}
		widgetMinWidth := 140
		if u.WidgetMinWidth != nil {
			widgetMinWidth = *u.WidgetMinWidth
		}
		projectLogo := ""
		if u.ProjectLogo != nil {
			projectLogo = *u.ProjectLogo
		}

		_, err := userStmt.Exec(u.Username, u.Password, u.Role, u.Theme, u.AccentColor, u.Language,
			u.GridColumnsPC, u.GridColumnsTablet, u.GridColumnsMobile, u.AvatarUrl, u.ProjectName, projectLogo,
			betaUpdates, unitSystem, dashBg, widgetMinWidth)
		if err != nil {
			return &restoreError{http.StatusInternalServerError, "Failed to restore backup"}
		}
	}
	return nil
}

// buildOwnerMap maps each restored username to its new id, plus a fallback admin
// id for items/dashboards from old backups that have no owner field.
func buildOwnerMap(tx *sql.Tx, backup BackupData) (map[string]int, int, error) {
	ownerMap := make(map[string]int)
	for _, u := range backup.Users {
		var uid int
		if err := tx.QueryRow("SELECT id FROM users WHERE username = ?", u.Username).Scan(&uid); err == nil {
			ownerMap[u.Username] = uid
		}
	}
	var fallbackOwner int
	if err := tx.QueryRow("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").Scan(&fallbackOwner); err != nil {
		return nil, 0, &restoreError{http.StatusInternalServerError, "No admin found for item assignment"}
	}
	return ownerMap, fallbackOwner, nil
}

// restoreDashboards inserts dashboards and returns an old to new dashboard id map.
func restoreDashboards(tx *sql.Tx, backup BackupData, ownerMap map[string]int, fallbackOwner int) (map[int]int64, error) {
	oldToNewDashID := make(map[int]int64)
	if len(backup.Dashboards) == 0 {
		return oldToNewDashID, nil
	}

	dashStmt, err := tx.Prepare(`INSERT INTO dashboards (user_id, name, position, is_default) VALUES (?, ?, ?, ?)`)
	if err != nil {
		return nil, &restoreError{http.StatusInternalServerError, "DB Prepare Error"}
	}
	defer dashStmt.Close()

	for _, d := range backup.Dashboards {
		uid := ownerMap[d.Owner]
		if uid == 0 {
			uid = fallbackOwner
		}
		res, err := dashStmt.Exec(uid, d.Name, d.Position, d.IsDefault)
		if err != nil {
			return nil, &restoreError{http.StatusInternalServerError, "Failed to restore dashboard"}
		}
		if d.ID > 0 {
			newID, _ := res.LastInsertId()
			oldToNewDashID[d.ID] = newID
		}
	}
	return oldToNewDashID, nil
}

// restoreItems inserts items in two passes: first the items themselves (building
// an old to new id map), then the parent_id relationships using that map.
func restoreItems(tx *sql.Tx, backup BackupData, ownerMap map[string]int, fallbackOwner int, oldToNewDashID map[int]int64) error {
	itemStmt, err := tx.Prepare(`INSERT INTO items (user_id, dashboard_id, type, x, y, w, h, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return &restoreError{http.StatusInternalServerError, "DB Prepare Error"}
	}
	defer itemStmt.Close()

	// Pass 1: Insert all items without parent_id, build old_id to new_id map
	oldToNewID := make(map[int]int64)
	for _, i := range backup.Items {
		uid := ownerMap[i.Owner]
		if uid == 0 {
			uid = fallbackOwner
		}
		var newDashID interface{}
		if i.DashboardID != nil {
			if mapped, ok := oldToNewDashID[*i.DashboardID]; ok {
				newDashID = mapped
			}
		}
		res, err := itemStmt.Exec(uid, newDashID, i.Type, i.X, i.Y, i.W, i.H, i.Content)
		if err != nil {
			return &restoreError{http.StatusInternalServerError, "Failed to restore item"}
		}
		if i.ID > 0 {
			newID, _ := res.LastInsertId()
			oldToNewID[i.ID] = newID
		}
	}

	// Pass 2: Restore parent_id relationships using the old to new ID map
	for _, i := range backup.Items {
		if i.ParentID == nil || i.ID == 0 {
			continue
		}
		newParent, ok := oldToNewID[*i.ParentID]
		if !ok {
			continue
		}
		newID, ok := oldToNewID[i.ID]
		if !ok {
			continue
		}
		if _, err := tx.Exec("UPDATE items SET parent_id = ? WHERE id = ?", newParent, newID); err != nil {
			slog.Warn("Restore: failed to set parent_id", "item_id", newID, "error", err)
		}
	}

	// Pass 3: what widgets keep secret, onto the new ids. One whose widget is
	// not in the file has nowhere to go and is left out.
	for _, sec := range backup.WidgetSecrets {
		newID, ok := oldToNewID[sec.ItemID]
		if !ok || !secretName.MatchString(sec.Name) || sec.Value == "" || len(sec.Value) > maxSecretLen {
			continue
		}
		if _, err := tx.Exec(`INSERT OR REPLACE INTO widget_secrets (item_id, name, value) VALUES (?, ?, ?)`,
			newID, sec.Name, sec.Value); err != nil {
			return &restoreError{http.StatusInternalServerError, "Failed to restore widget secrets"}
		}
	}
	return nil
}

// Helpers

type MemInfo struct {
	Total uint64
	Free  uint64
	Avail uint64
	Used  uint64
}

// readMemInfo reports HOST memory, by design: the telemetry widget is a
// host/server monitor for a self-hosted box, so it reads /proc directly rather
// than the container's cgroup limits. Inside Docker with a MemoryMax set, the
// numbers therefore reflect the host, not the container's cap — this is
// intentional, not a bug.
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
