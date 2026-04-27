package api

import (
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
	"sync"
	"time"

	"github.com/CodigoSH/Lastboard/internal/core/dashboard"
	"github.com/CodigoSH/Lastboard/internal/web/middleware"
)

// dnsCache caches hostname→IP resolutions for 30s to avoid repeated lookups
// across concurrent health checks.
type dnsCacheEntry struct {
	ip        string
	expiresAt time.Time
}

var (
	dnsCache   sync.Map
	dnsCacheTTL = 30 * time.Second
)

func resolveHostCached(hostname string) (string, error) {
	if v, ok := dnsCache.Load(hostname); ok {
		entry := v.(dnsCacheEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.ip, nil
		}
	}
	ips, err := net.LookupIP(hostname)
	if err != nil || len(ips) == 0 {
		return "", fmt.Errorf("could not resolve %s", hostname)
	}
	ip := ips[0].String()
	dnsCache.Store(hostname, dnsCacheEntry{ip: ip, expiresAt: time.Now().Add(dnsCacheTTL)})
	return ip, nil
}

// healthClient is a shared HTTP client with a pooled transport that reuses
// TCP/TLS connections across concurrent health checks.
var healthClient = &http.Client{
	Timeout: time.Second * 5,
	Transport: &http.Transport{
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     60 * time.Second,
		DisableKeepAlives:   false,
		DialContext: (&net.Dialer{
			Timeout:   3 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
	},
}

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
		query = "SELECT id, parent_id, type, x, y, w, h, content, url, mobile_order FROM items WHERE user_id = ? AND dashboard_id = ?"
		args = []interface{}{userID, dashID}
	} else {
		// Backwards-compatible fallback: items that are either NULL (legacy) or
		// assigned to the user's default dashboard.
		query = `SELECT id, parent_id, type, x, y, w, h, content, url, mobile_order FROM items
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
		var mobileOrderSql sql.NullInt64
		if err := rows.Scan(&i.ID, &i.ParentID, &i.Type, &i.X, &i.Y, &i.W, &i.H, &i.Content, &urlSql, &mobileOrderSql); err != nil {
			slog.Warn("Scan error reading items", "error", err)
			continue
		}
		if urlSql.Valid {
			i.Url = urlSql.String
		}
		if mobileOrderSql.Valid {
			v := int(mobileOrderSql.Int64)
			i.MobileOrder = &v
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
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	id, err := res.LastInsertId()
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
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
		MobileOrder *int    `json:"mobile_order"`
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
	if input.MobileOrder != nil {
		sets = append(sets, "mobile_order=?")
		args = append(args, *input.MobileOrder)
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

// CheckHealthBatch checks multiple URLs in parallel and returns all results in
// one response. Each URL is checked concurrently in its own goroutine so the
// total time equals the slowest single check, not the sum of all checks.
func (h *DashboardHandler) CheckHealthBatch(w http.ResponseWriter, r *http.Request) {
	var body struct {
		URLs []string `json:"urls"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || len(body.URLs) == 0 {
		http.Error(w, "error.invalid_input", http.StatusBadRequest)
		return
	}
	if len(body.URLs) > 100 {
		http.Error(w, "error.too_many_urls", http.StatusBadRequest)
		return
	}

	type result struct {
		url    string
		status string
	}

	results := make([]result, len(body.URLs))
	var wg sync.WaitGroup

	for i, rawUrl := range body.URLs {
		wg.Add(1)
		go func(idx int, u string) {
			defer wg.Done()
			results[idx] = result{url: u, status: probeURL(u)}
		}(i, rawUrl)
	}

	wg.Wait()

	out := make(map[string]string, len(results))
	for _, r := range results {
		out[r.url] = r.status
	}
	h.respondJson(w, out)
}

// probeURL performs a HEAD request with TCP fallback and returns "up" or "down".
func probeURL(rawUrl string) string {
	u, err := url.Parse(rawUrl)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		return "down"
	}

	hostname := u.Hostname()
	pinnedIP, err := resolveHostCached(hostname)
	if err != nil {
		return "down"
	}

	req, _ := http.NewRequest("HEAD", rawUrl, nil)
	resp, err := healthClient.Do(req)
	if err == nil && resp.StatusCode < 500 {
		resp.Body.Close()
		return "up"
	}
	if resp != nil {
		resp.Body.Close()
	}

	port := u.Port()
	if port == "" {
		if u.Scheme == "https" {
			port = "443"
		} else {
			port = "80"
		}
	}
	conn, err := net.DialTimeout("tcp", net.JoinHostPort(pinnedIP, port), time.Second*2)
	if err == nil {
		conn.Close()
		return "up"
	}
	return "down"
}

// CheckHealth single-URL endpoint kept for backwards compatibility.
func (h *DashboardHandler) CheckHealth(w http.ResponseWriter, r *http.Request) {
	rawUrl := r.URL.Query().Get("url")
	if rawUrl == "" {
		http.Error(w, "error.missing_url", http.StatusBadRequest)
		return
	}
	status := probeURL(rawUrl)
	if status == "down" {
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	h.respondJson(w, map[string]string{"status": status})
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
