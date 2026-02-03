package api

import (
	"context"
	"crypto/tls"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/codigosh/Kashboard/internal/core/dashboard"
)

type DashboardHandler struct {
	DB *sql.DB
}

func NewDashboardHandler(db *sql.DB) *DashboardHandler {
	return &DashboardHandler{DB: db}
}

// Structs for Content Validation
type BookmarkContent struct {
	Label    string `json:"label"`
	Url      string `json:"url"`
	Icon     string `json:"icon"`
	IconName string `json:"iconName"`
}

type GroupContent struct {
	Name string `json:"name"`
}

type SectionContent struct {
	Name string `json:"name"`
}

// GetDashboard returns the list of items
func (h *DashboardHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	// Include url in selection
	rows, err := h.DB.Query("SELECT id, parent_id, type, x, y, w, h, content, url FROM items")
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []dashboard.Item
	for rows.Next() {
		var i dashboard.Item
		// Scan url as well (it may be null in DB, so we scan into sql.NullString if we wanted to be safe,
		// but Scan handles NULL to *string or string differently.
		// Let's assume standard behavior: if NULL, string becomes "".
		// Actually, `Scan` into `string` fails on NULL. We need a workaround or sql.NullString.
		// For simplicity/speed in this legacy fix, let's use a temporary pointer or sql.NullString.
		var urlSql sql.NullString

		if err := rows.Scan(&i.ID, &i.ParentID, &i.Type, &i.X, &i.Y, &i.W, &i.H, &i.Content, &urlSql); err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}
		if urlSql.Valid {
			i.Url = urlSql.String
		}
		items = append(items, i)
	}

	w.Header().Set("Content-Type", "application/json")
	if items == nil {
		items = []dashboard.Item{}
	}
	json.NewEncoder(w).Encode(items)
}

func (h *DashboardHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	var item dashboard.Item

	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// Validate Content
	if err := validateContent(item.Type, item.Content); err != nil {
		http.Error(w, "Invalid content: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Insert including URL
	res, err := h.DB.Exec("INSERT INTO items (parent_id, type, x, y, w, h, content, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		item.ParentID, item.Type, item.X, item.Y, item.W, item.H, item.Content, item.Url)
	if err != nil {
		log.Printf("[CreateItem] DB Insert Error: %v", err)
		http.Error(w, "Failed to create", http.StatusInternalServerError)
		return
	}

	id, _ := res.LastInsertId()
	item.ID = int(id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

func (h *DashboardHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	// Extract ID from URL path (e.g. /api/dashboard/item/3)
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	idStr := parts[len(parts)-1]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
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
		log.Printf("[UpdateItem] JSON Decode Error: %v", err)
		http.Error(w, "Invalid body", http.StatusBadRequest)
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
		if err := h.DB.QueryRow("SELECT type FROM items WHERE id=?", id).Scan(&itemType); err != nil {
			http.Error(w, "Item not found", http.StatusNotFound)
			return
		}
		if err := validateContent(itemType, *input.Content); err != nil {
			http.Error(w, "Invalid content: "+err.Error(), http.StatusBadRequest)
			return
		}

		sets = append(sets, "content=?")
		args = append(args, *input.Content)
	}

	if len(sets) == 0 {
		w.WriteHeader(http.StatusOK)
		return
	}

	args = append(args, id)
	query := "UPDATE items SET " + strings.Join(sets, ", ") + " WHERE id=?"

	result, err := h.DB.Exec(query, args...)
	if err != nil {
		log.Printf("Update error: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

func (h *DashboardHandler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	idStr := parts[len(parts)-1]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	_, err = h.DB.Exec("DELETE FROM items WHERE id=?", id)
	if err != nil {
		http.Error(w, "Delete failed", http.StatusInternalServerError)
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
		http.Error(w, "Missing url parameter", http.StatusBadRequest)
		return
	}

	u, err := url.Parse(rawUrl)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}

	hostname := u.Hostname()
	ips, err := net.LookupIP(hostname)
	if err != nil || len(ips) == 0 {
		http.Error(w, "Could not resolve host", http.StatusBadRequest)
		return
	}

	// SSRF: validate all resolved IPs
	for _, ip := range ips {
		if isPrivateIP(ip) {
			log.Printf("[Health] Blocked SSRF attempt to %s (%s)", hostname, ip.String())
			http.Error(w, "Access to private resources is denied", http.StatusForbidden)
			return
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
		log.Printf("[Health] %s is UP (HTTP %d)", rawUrl, resp.StatusCode)
		h.respondJson(w, map[string]string{"status": "up"})
		return
	}

	// TCP fallback using the same pinned IP
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%s", pinnedIP, port), time.Second*2)
	if err == nil {
		defer conn.Close()
		log.Printf("[Health] %s is UP (TCP Open)", rawUrl)
		h.respondJson(w, map[string]string{"status": "up"})
		return
	}

	log.Printf("[Health] %s is DOWN", rawUrl)
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
			return logError("label required")
		}
		// Url optional? Usually yes.
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
