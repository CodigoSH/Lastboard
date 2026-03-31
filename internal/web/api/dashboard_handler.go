package api

import (
	"context"
	"crypto/tls"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/CodigoSH/Lastboard/internal/core/dashboard"
	"github.com/CodigoSH/Lastboard/internal/web/middleware"
)

type DashboardHandler struct {
	DB *sql.DB
}

func NewDashboardHandler(db *sql.DB) *DashboardHandler {
	return &DashboardHandler{DB: db}
}

// Structs for Content Validation
type BookmarkContent struct {
	Label        string `json:"label"`
	Url          string `json:"url"`
	Icon         string `json:"icon"`
	IconName     string `json:"iconName"`
	StatusCheck  bool   `json:"statusCheck,omitempty"`
	VisibleTouch *bool  `json:"visibleTouch,omitempty"`
}

type GroupContent struct {
	Name string `json:"name"`
}

type SectionContent struct {
	Name string `json:"name"`
}

// GetDashboard returns the list of items owned by the authenticated user.
// Accepts an optional ?dashboard_id=N query param to filter by a specific dashboard.
// Without the param it returns items belonging to the user's default dashboard
// (or items with dashboard_id IS NULL for backwards compatibility).
func (h *DashboardHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r)

	var query string
	var args []interface{}

	if rawID := r.URL.Query().Get("dashboard_id"); rawID != "" {
		dashID, err := strconv.Atoi(rawID)
		if err != nil {
			http.Error(w, "error.invalid_id", http.StatusBadRequest)
			return
		}
		query = "SELECT id, parent_id, type, x, y, w, h, content, url FROM items WHERE user_id = ? AND dashboard_id = ?"
		args = []interface{}{userID, dashID}
	} else {
		// Backwards-compatible fallback: items that are either NULL (legacy) or
		// assigned to the user's default dashboard.
		query = `SELECT id, parent_id, type, x, y, w, h, content, url FROM items
			WHERE user_id = ?
			AND (dashboard_id IS NULL
			     OR dashboard_id = (SELECT id FROM dashboards WHERE user_id = ? AND is_default = 1 LIMIT 1))`
		args = []interface{}{userID, userID}
	}

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []dashboard.Item
	for rows.Next() {
		var i dashboard.Item
		var urlSql sql.NullString
		if err := rows.Scan(&i.ID, &i.ParentID, &i.Type, &i.X, &i.Y, &i.W, &i.H, &i.Content, &urlSql); err != nil {
			slog.Warn("Scan error reading items", "error", err)
			continue
		}
		if urlSql.Valid {
			i.Url = urlSql.String
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if items == nil {
		items = []dashboard.Item{}
	}
	json.NewEncoder(w).Encode(items)
}

func (h *DashboardHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 512*1024)
	var item dashboard.Item

	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	// Validate Content
	if err := validateContent(item.Type, item.Content); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Validate Grid Coordinates
	if item.X < 1 || item.Y < 1 || item.W < 1 || item.H < 1 {
		http.Error(w, "Invalid grid coordinates", http.StatusBadRequest)
		return
	}
	if item.X > 100 || item.Y > 100 || item.W > 100 || item.H > 100 {
		http.Error(w, "Invalid grid coordinates", http.StatusBadRequest)
		return
	}

	userID := middleware.GetUserIDFromContext(r)

	// Enforce per-user item limit
	maxItems := 500
	if envMax := os.Getenv("MAX_ITEMS_PER_USER"); envMax != "" {
		if parsed, err := strconv.Atoi(envMax); err == nil && parsed > 0 {
			maxItems = parsed
		}
	}
	var itemCount int
	if err := h.DB.QueryRow("SELECT COUNT(*) FROM items WHERE user_id = ?", userID).Scan(&itemCount); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if itemCount >= maxItems {
		http.Error(w, "error.item_limit_reached", http.StatusTooManyRequests)
		return
	}

	res, err := h.DB.Exec(
		"INSERT INTO items (user_id, parent_id, dashboard_id, type, x, y, w, h, content, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		userID, item.ParentID, item.DashboardID, item.Type, item.X, item.Y, item.W, item.H, item.Content, item.Url,
	)
	if err != nil {
		slog.Error("DB Insert error in CreateItem", "error", err)
		http.Error(w, "setup.failed_create_user", http.StatusInternalServerError)
		return
	}

	id, err := res.LastInsertId()
	if err != nil {
		http.Error(w, "setup.failed_create_user", http.StatusInternalServerError)
		return
	}
	item.ID = int(id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

func (h *DashboardHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 512*1024)
	userID := middleware.GetUserIDFromContext(r)
	// Extract ID from URL path (e.g. /api/dashboard/item/3)
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 {
		http.Error(w, "error.invalid_url", http.StatusBadRequest)
		return
	}
	idStr := parts[len(parts)-1]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "error.invalid_id", http.StatusBadRequest)
		return
	}

	var input struct {
		X           *int    `json:"x"`
		Y           *int    `json:"y"`
		W           *int    `json:"w"`
		H           *int    `json:"h"`
		ParentID    *int    `json:"parent_id"`
		ClearParent bool    `json:"clear_parent"`
		Content     *string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		slog.Warn("JSON Decode error in UpdateItem", "error", err)
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	// Validate Grid Coordinates (if being updated)
	if (input.X != nil && *input.X < 1) || (input.Y != nil && *input.Y < 1) ||
		(input.W != nil && *input.W < 1) || (input.H != nil && *input.H < 1) {
		http.Error(w, "Invalid grid coordinates", http.StatusBadRequest)
		return
	}
	if (input.X != nil && *input.X > 100) || (input.Y != nil && *input.Y > 100) ||
		(input.W != nil && *input.W > 100) || (input.H != nil && *input.H > 100) {
		http.Error(w, "Invalid grid coordinates", http.StatusBadRequest)
		return
	}

	// Build dynamic update
	// This is a quick implementation. In prod use a query builder.
	var sets []string
	var args []interface{}

	if input.X != nil {
		sets = append(sets, "x=?")
		args = append(args, *input.X)
	}
	if input.Y != nil {
		sets = append(sets, "y=?")
		args = append(args, *input.Y)
	}
	if input.W != nil {
		sets = append(sets, "w=?")
		args = append(args, *input.W)
	}
	if input.H != nil {
		sets = append(sets, "h=?")
		args = append(args, *input.H)
	}
	if input.ParentID != nil {
		sets = append(sets, "parent_id=?")
		args = append(args, *input.ParentID)
	} else if input.ClearParent {
		// Explicit request to clear parent (move to root)
		sets = append(sets, "parent_id=NULL")
		// No arg needed for NULL constant
	}
	if input.Content != nil {
		// If content is being updated, valid it based on existing type or new type (if type were updatable, but it's not here)
		// We need to fetch the item's type to validate content properly.
		var itemType string
		if err := h.DB.QueryRow("SELECT type FROM items WHERE id=? AND user_id=?", id, userID).Scan(&itemType); err != nil {
			http.Error(w, "error.not_found", http.StatusNotFound)
			return
		}
		if err := validateContent(itemType, *input.Content); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		sets = append(sets, "content=?")
		args = append(args, *input.Content)
	}

	if len(sets) == 0 {
		w.WriteHeader(http.StatusOK)
		return
	}

	args = append(args, id, userID)
	query := "UPDATE items SET " + strings.Join(sets, ", ") + " WHERE id=? AND user_id=?"

	result, err := h.DB.Exec(query, args...)
	if err != nil {
		slog.Error("Update error in UpdateItem", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	rows, err := result.RowsAffected()
	if err != nil {
		slog.Error("RowsAffected error in UpdateItem", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if rows == 0 {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

func (h *DashboardHandler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r)
	parts := strings.Split(r.URL.Path, "/")
	idStr := parts[len(parts)-1]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "error.invalid_id", http.StatusBadRequest)
		return
	}

	_, err = h.DB.Exec("DELETE FROM items WHERE id=? AND user_id=?", id, userID)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// CheckHealth proxies a HEAD request to a URL, allowing self-signed certs.
// Falls back to TCP ping if HTTP fails. Pins connections to pre-resolved IPs
// to prevent DNS rebinding attacks.
func (h *DashboardHandler) CheckHealth(w http.ResponseWriter, r *http.Request) {
	rawUrl := r.URL.Query().Get("url")
	if rawUrl == "" {
		http.Error(w, "error.missing_url", http.StatusBadRequest)
		return
	}

	u, err := url.Parse(rawUrl)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		http.Error(w, "error.invalid_url", http.StatusBadRequest)
		return
	}

	hostname := u.Hostname()
	ips, err := net.LookupIP(hostname)
	if err != nil || len(ips) == 0 {
		http.Error(w, "error.could_not_resolve_host", http.StatusBadRequest)
		return
	}

	// SSRF: validate all resolved IPs
	// Lastboard is designed to monitor local services, so we ALLOW private IPs.
	// We logged them before, but blocking them breaks the feature "Monitor Status" for local labs.
	for _, ip := range ips {
		if isPrivateIP(ip) {
			slog.Info("Health check: allowing local access", "hostname", hostname, "ip", ip.String())
		}
	}

	// Pick first valid IP and pin all connections to it
	pinnedIP := ips[0].String()
	port := u.Port()
	if port == "" {
		if u.Scheme == "https" {
			port = "443"
		} else {
			port = "80"
		}
	}

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
			ServerName:         hostname,
		},
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			// Ignore addr (which would re-resolve hostname); connect to pinned IP
			return net.DialTimeout(network, net.JoinHostPort(pinnedIP, port), time.Second*3)
		},
	}
	client := &http.Client{
		Transport: tr,
		Timeout:   time.Second * 3,
	}

	req, _ := http.NewRequest("HEAD", rawUrl, nil)
	resp, err := client.Do(req)
	if err == nil && resp.StatusCode < 500 {
		defer resp.Body.Close()
		slog.Info("Health check UP (HTTP)", "url", rawUrl, "status", resp.StatusCode)
		h.respondJson(w, map[string]string{"status": "up"})
		return
	}

	// TCP fallback using the same pinned IP
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%s", pinnedIP, port), time.Second*2)
	if err == nil {
		defer conn.Close()
		slog.Info("Health check UP (TCP)", "url", rawUrl)
		h.respondJson(w, map[string]string{"status": "up"})
		return
	}

	slog.Info("Health check DOWN", "url", rawUrl)
	w.WriteHeader(http.StatusServiceUnavailable)
	h.respondJson(w, map[string]string{"status": "down"})
}

func isPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsUnspecified() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}

	// IPv6 unique local (fc00::/7)
	if ip.To4() == nil && len(ip) == net.IPv6len && (ip[0]&0xfe) == 0xfc {
		return true
	}

	ip4 := ip.To4()
	if ip4 == nil {
		return false
	}

	// 10.0.0.0/8
	if ip4[0] == 10 {
		return true
	}
	// 172.16.0.0/12
	if ip4[0] == 172 && ip4[1] >= 16 && ip4[1] <= 31 {
		return true
	}
	// 192.168.0.0/16
	if ip4[0] == 192 && ip4[1] == 168 {
		return true
	}
	// 169.254.0.0/16 (link-local, already caught above but explicit)
	if ip4[0] == 169 && ip4[1] == 254 {
		return true
	}

	return false
}

func (h *DashboardHandler) respondJson(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func validateContent(itemType string, contentJson string) error {
	if contentJson == "" {
		return nil // Allow empty content? Maybe strict: return errors.New("empty content")
	}
	switch itemType {
	case "bookmark":
		var c BookmarkContent
		if err := json.Unmarshal([]byte(contentJson), &c); err != nil {
			return err
		}
		if c.Label == "" {
			return logError("error.label_required")
		}
		if c.Url != "" && !strings.HasPrefix(c.Url, "http://") && !strings.HasPrefix(c.Url, "https://") {
			return logError("error.invalid_url")
		}
	case "group", "section":
		var c GroupContent // Same as SectionContent
		if err := json.Unmarshal([]byte(contentJson), &c); err != nil {
			return err
		}
	case "widget":
		return nil // Explicitly allow widgets without further validation per user request (Fixes Notepad PATCH 400)
	}
	return nil
}

func logError(msg string) error {
	return &ValidationError{Msg: msg}
}

type ValidationError struct {
	Msg string
}

func (e *ValidationError) Error() string {
	return e.Msg
}
