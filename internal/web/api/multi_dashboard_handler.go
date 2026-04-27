package api

import (
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/CodigoSH/Lastboard/internal/core/dashboard"
	"github.com/CodigoSH/Lastboard/internal/web/middleware"
)

// MultiDashboardHandler handles CRUD operations for dashboards.
type MultiDashboardHandler struct {
	DB *sql.DB
}

func NewMultiDashboardHandler(db *sql.DB) *MultiDashboardHandler {
	return &MultiDashboardHandler{DB: db}
}

// GetDashboards handles GET /api/dashboards
// Returns the list of dashboards for the authenticated user.
// If the user has no dashboards yet, it auto-creates a default one and migrates
// any existing items (dashboard_id IS NULL) into it.
func (h *MultiDashboardHandler) GetDashboards(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r)

	// Check whether any dashboards exist for this user.
	var count int
	if err := h.DB.QueryRow("SELECT COUNT(*) FROM dashboards WHERE user_id = ?", userID).Scan(&count); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	if count == 0 {
		// Auto-create a default dashboard.
		res, err := h.DB.Exec(
			"INSERT INTO dashboards (user_id, name, position, is_default) VALUES (?, 'Dashboard principal', 0, 1)",
			userID,
		)
		if err != nil {
			slog.Error("Failed to auto-create default dashboard", "error", err, "user_id", userID)
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
		newID, err := res.LastInsertId()
		if err != nil {
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
		// Migrate orphaned items that were created before multi-dashboard existed.
		if _, err := h.DB.Exec(
			"UPDATE items SET dashboard_id = ? WHERE user_id = ? AND dashboard_id IS NULL",
			newID, userID,
		); err != nil {
			slog.Warn("Failed to migrate orphaned items to default dashboard", "error", err, "user_id", userID)
		}
	}

	rows, err := h.DB.Query(
		"SELECT id, name, position, is_default, created_at FROM dashboards WHERE user_id = ? ORDER BY position ASC",
		userID,
	)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	dashboards := []dashboard.Dashboard{}
	for rows.Next() {
		var d dashboard.Dashboard
		var isDefault int // SQLite stores BOOLEAN as INTEGER
		if err := rows.Scan(&d.ID, &d.Name, &d.Position, &isDefault, &d.CreatedAt); err != nil {
			slog.Warn("Scan error reading dashboards", "error", err)
			continue
		}
		d.IsDefault = isDefault == 1
		dashboards = append(dashboards, d)
	}
	if err := rows.Err(); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dashboards)
}

// CreateDashboard handles POST /api/dashboards
func (h *MultiDashboardHandler) CreateDashboard(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
	userID := middleware.GetUserIDFromContext(r)

	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	name := strings.TrimSpace(body.Name)
	if name == "" {
		http.Error(w, "error.name_required", http.StatusBadRequest)
		return
	}
	if len(name) > 50 {
		http.Error(w, "error.name_too_long", http.StatusBadRequest)
		return
	}

	// Position = current count of dashboards for this user.
	var pos int
	if err := h.DB.QueryRow("SELECT COUNT(*) FROM dashboards WHERE user_id = ?", userID).Scan(&pos); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	res, err := h.DB.Exec(
		"INSERT INTO dashboards (user_id, name, position, is_default) VALUES (?, ?, ?, 0)",
		userID, name, pos,
	)
	if err != nil {
		slog.Error("Failed to create dashboard", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	id, err := res.LastInsertId()
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	created := dashboard.Dashboard{
		ID:       int(id),
		Name:     name,
		Position: pos,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(created)
}

// DeleteDashboard handles DELETE /api/dashboards/{id}
func (h *MultiDashboardHandler) DeleteDashboard(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r)

	idStr := lastPathSegment(r.URL.Path)
	dashID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "error.invalid_id", http.StatusBadRequest)
		return
	}

	// Verify ownership.
	var isDefault int
	err = h.DB.QueryRow(
		"SELECT is_default FROM dashboards WHERE id = ? AND user_id = ?",
		dashID, userID,
	).Scan(&isDefault)
	if err == sql.ErrNoRows {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	// Guard: cannot delete the last dashboard.
	var total int
	if err := h.DB.QueryRow("SELECT COUNT(*) FROM dashboards WHERE user_id = ?", userID).Scan(&total); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if total <= 1 {
		http.Error(w, "error.cannot_delete_last_dashboard", http.StatusBadRequest)
		return
	}

	// Find the dashboard that will become the new default (lowest position that remains).
	var newDefaultID int
	err = h.DB.QueryRow(
		"SELECT id FROM dashboards WHERE user_id = ? AND id != ? ORDER BY position ASC LIMIT 1",
		userID, dashID,
	).Scan(&newDefaultID)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	// If the deleted dashboard was the default, promote the new one.
	if isDefault == 1 {
		if _, err := h.DB.Exec(
			"UPDATE dashboards SET is_default = 1 WHERE id = ?",
			newDefaultID,
		); err != nil {
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
	}

	// Delete items belonging to this dashboard instead of reassigning them.
	if _, err := h.DB.Exec(
		"DELETE FROM items WHERE dashboard_id = ? AND user_id = ?",
		dashID, userID,
	); err != nil {
		slog.Warn("Failed to delete dashboard items", "error", err)
	}

	// Delete the dashboard row.
	if _, err := h.DB.Exec("DELETE FROM dashboards WHERE id = ? AND user_id = ?", dashID, userID); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// RenameDashboard handles PATCH /api/dashboards/{id}
func (h *MultiDashboardHandler) RenameDashboard(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
	userID := middleware.GetUserIDFromContext(r)

	idStr := lastPathSegment(r.URL.Path)
	dashID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "error.invalid_id", http.StatusBadRequest)
		return
	}

	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	name := strings.TrimSpace(body.Name)
	if name == "" {
		http.Error(w, "error.name_required", http.StatusBadRequest)
		return
	}
	if len(name) > 50 {
		http.Error(w, "error.name_too_long", http.StatusBadRequest)
		return
	}

	// Verify ownership.
	var exists int
	if err := h.DB.QueryRow(
		"SELECT 1 FROM dashboards WHERE id = ? AND user_id = ?",
		dashID, userID,
	).Scan(&exists); err == sql.ErrNoRows {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	if _, err := h.DB.Exec(
		"UPDATE dashboards SET name = ? WHERE id = ? AND user_id = ?",
		name, dashID, userID,
	); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

// SetDefaultDashboard handles POST /api/dashboards/{id}/default
func (h *MultiDashboardHandler) SetDefaultDashboard(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r)

	path := strings.TrimRight(r.URL.Path, "/")
	parts := strings.Split(path, "/")
	if len(parts) < 4 {
		http.Error(w, "error.invalid_id", http.StatusBadRequest)
		return
	}
	idStr := parts[3] // /api/dashboards/{id}/default

	dashID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "error.invalid_id", http.StatusBadRequest)
		return
	}

	// 1. Verify ownership.
	var exists int
	if err := h.DB.QueryRow(
		"SELECT 1 FROM dashboards WHERE id = ? AND user_id = ?",
		dashID, userID,
	).Scan(&exists); err == sql.ErrNoRows {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	// 2. Clear other defaults and set the new one in a single transaction.
	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec("UPDATE dashboards SET is_default = 0 WHERE user_id = ?", userID); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	if _, err := tx.Exec("UPDATE dashboards SET is_default = 1 WHERE id = ? AND user_id = ?", dashID, userID); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

// ReorderDashboards handles PUT /api/dashboards/reorder
// Accepts {"ids": [3,1,2]} and updates position for each dashboard.
func (h *MultiDashboardHandler) ReorderDashboards(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
	userID := middleware.GetUserIDFromContext(r)

	var body struct {
		IDs []int `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || len(body.IDs) == 0 {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	for i, id := range body.IDs {
		var exists int
		if err := h.DB.QueryRow("SELECT 1 FROM dashboards WHERE id = ? AND user_id = ?", id, userID).Scan(&exists); err != nil {
			http.Error(w, "error.not_found", http.StatusNotFound)
			return
		}
		if _, err := h.DB.Exec("UPDATE dashboards SET position = ? WHERE id = ? AND user_id = ?", i, id, userID); err != nil {
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

// lastPathSegment returns the last non-empty segment of a URL path.
// e.g. "/api/dashboards/42" → "42"
func lastPathSegment(path string) string {
	parts := strings.Split(strings.TrimRight(path, "/"), "/")
	return parts[len(parts)-1]
}
