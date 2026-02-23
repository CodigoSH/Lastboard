package api

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/CodigoSH/Lastboard/internal/web/middleware"
)

// isAdminUser checks whether the currently authenticated user has admin or administrator role.
// It is the single source of truth for admin checks across all API handlers.
func isAdminUser(db *sql.DB, r *http.Request) bool {
	username := middleware.GetUserFromContext(r)
	if username == "" {
		return false
	}
	var role string
	err := db.QueryRow("SELECT role FROM users WHERE username = ?", username).Scan(&role)
	if err != nil {
		return false
	}
	return strings.ToLower(role) == "admin" || strings.ToLower(role) == "administrator"
}
