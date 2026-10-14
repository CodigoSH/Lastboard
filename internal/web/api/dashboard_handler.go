package api

import (
	"crypto/tls"
	"database/sql"
	"encoding/json"
	"fmt"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
	"log/slog"
	"net"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/dashboard"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

// dnsCache caches hostname→IP resolutions for 30s to avoid repeated lookups
// across concurrent health checks.
type dnsCacheEntry struct {
	ip        string
	expiresAt time.Time
}

var (
	dnsCache    sync.Map
	dnsCacheTTL = 30 * time.Second
)

func init() {
	// Periodically evict expired entries so hosts that stop being probed do not
	// linger in the map forever. Without this the cache only ever grows, unlike
	// the rate-limiter which already prunes itself.
	go func() {
		ticker := time.NewTicker(dnsCacheTTL * 2)
		defer ticker.Stop()
		for range ticker.C {
			now := time.Now()
			dnsCache.Range(func(key, value any) bool {
				if entry, ok := value.(dnsCacheEntry); ok && now.After(entry.expiresAt) {
					dnsCache.Delete(key)
				}
				return true
			})
		}
	}()
}

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
		DialContext:         util.NewDialer(3*time.Second, 30*time.Second).DialContext,
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

	rows, err := h.DB.QueryContext(r.Context(), query, args...)
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

// userOwnsDashboard reports whether dashboardID belongs to userID. Used to stop
// a user from attaching items to another user's dashboard (the FK only ensures
// the dashboard exists, not that it is theirs).
func (h *DashboardHandler) userOwnsDashboard(userID, dashboardID int) bool {
	var one int
	return h.DB.QueryRow("SELECT 1 FROM dashboards WHERE id=? AND user_id=?", dashboardID, userID).Scan(&one) == nil
}

// userOwnsItem reports whether itemID belongs to userID. Used to stop a user
// from nesting an item under another user's item via parent_id.
func (h *DashboardHandler) userOwnsItem(userID, itemID int) bool {
	var one int
	return h.DB.QueryRow("SELECT 1 FROM items WHERE id=? AND user_id=?", itemID, userID).Scan(&one) == nil
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
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	if item.X > 100 || item.Y > 100 || item.W > 100 || item.H > 100 {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
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
	if err := h.DB.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM items WHERE user_id = ?", userID).Scan(&itemCount); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if itemCount >= maxItems {
		http.Error(w, "error.item_limit_reached", http.StatusTooManyRequests)
		return
	}

	// Ownership checks: a client-supplied dashboard_id / parent_id must belong to
	// the current user, otherwise items could be attached to another user's board.
	if item.DashboardID != nil && !h.userOwnsDashboard(userID, *item.DashboardID) {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}
	if item.ParentID != nil && !h.userOwnsItem(userID, *item.ParentID) {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}

	// A browser that has not reloaded since the update still sends a widget's
	// credentials inside its content. They are moved to the secret store here,
	// in the same transaction as the insert, so the content that is stored (and
	// that every page then receives) never carries them.
	var moved map[string]string
	if item.Type == "widget" {
		if next, secrets, ok := migrateWidgetContent(item.Content); ok {
			item.Content, moved = next, secrets
		}
	}

	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	res, err := tx.Exec(
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
	if err := storeMovedSecrets(tx, item.ID, moved); err != nil {
		slog.Error("Moving widget credentials failed in CreateItem", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if err := tx.Commit(); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

// gridInputValid reports whether every provided grid coordinate (when set) is
// within the allowed 1..100 range.
func gridInputValid(values ...*int) bool {
	for _, v := range values {
		if v != nil && (*v < 1 || *v > 100) {
			return false
		}
	}
	return true
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
		DashboardID *int    `json:"dashboard_id"`
		// Expected makes a content change conditional: it is applied only if the
		// stored content still has these fields as the caller last saw them. A
		// null means "absent". See contentGuard.
		Expected map[string]*string `json:"expected"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		slog.Warn("JSON Decode error in UpdateItem", "error", err)
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	// Validate Grid Coordinates (if being updated)
	if !gridInputValid(input.X, input.Y, input.W, input.H) {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	// Build dynamic update
	var sets []string
	var args []interface{}
	var moved map[string]string // credentials taken out of a widget's content

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
		// A supplied parent must belong to the current user.
		if !h.userOwnsItem(userID, *input.ParentID) {
			http.Error(w, "error.not_found", http.StatusNotFound)
			return
		}
		sets = append(sets, "parent_id=?")
		args = append(args, *input.ParentID)
	} else if input.ClearParent {
		// Explicit request to clear parent (move to root)
		sets = append(sets, "parent_id=NULL")
		// No arg needed for NULL constant
	}
	if input.DashboardID != nil {
		// Moving the item to another dashboard: the target must belong to the
		// current user. The frontend also sends fresh x/y (auto-placed against
		// the target board) and, for an item leaving a section, clear_parent.
		if !h.userOwnsDashboard(userID, *input.DashboardID) {
			http.Error(w, "error.not_found", http.StatusNotFound)
			return
		}
		sets = append(sets, "dashboard_id=?")
		args = append(args, *input.DashboardID)
	}
	if input.MobileOrder != nil {
		sets = append(sets, "mobile_order=?")
		args = append(args, *input.MobileOrder)
	}
	if input.Content != nil {
		// If content is being updated, valid it based on existing type or new type (if type were updatable, but it's not here)
		// We need to fetch the item's type to validate content properly.
		var itemType string
		if err := h.DB.QueryRowContext(r.Context(), "SELECT type FROM items WHERE id=? AND user_id=?", id, userID).Scan(&itemType); err != nil {
			http.Error(w, "error.not_found", http.StatusNotFound)
			return
		}
		if err := validateContent(itemType, *input.Content); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Credentials sent inside a widget's content by a browser that has not
		// reloaded since the update go to the secret store, in the same
		// transaction as the write below.
		content := *input.Content
		if itemType == "widget" {
			if next, secrets, ok := migrateWidgetContent(content); ok {
				content, moved = next, secrets
			}
		}
		sets = append(sets, "content=?")
		args = append(args, content)
	}

	if len(sets) == 0 {
		w.WriteHeader(http.StatusOK)
		return
	}

	args = append(args, id, userID)
	query := "UPDATE items SET " + strings.Join(sets, ", ") + " WHERE id=? AND user_id=?"

	guard, guardArgs, err := contentGuard(input.Expected)
	if err != nil || (len(input.Expected) > 0 && input.Content == nil) {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	query += guard
	args = append(args, guardArgs...)

	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	result, err := tx.Exec(query, args...)
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
	if rows > 0 {
		if err := storeMovedSecrets(tx, id, moved); err != nil {
			slog.Error("Moving widget credentials failed in UpdateItem", "error", err)
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
		if err := tx.Commit(); err != nil {
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
	}
	if rows == 0 {
		// With a guard, "nothing changed" can mean the row is gone or that it
		// changed under the caller. The two are different answers: one is a
		// missing item, the other is the reason to show the person what is there
		// now instead of writing over it.
		if len(input.Expected) > 0 && h.userOwnsItem(userID, id) {
			http.Error(w, "error.conflict", http.StatusConflict)
			return
		}
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

// contentFieldName is what a guarded field may be called: a plain top-level key
// of the content JSON. It goes into the query text (a JSON path cannot be a
// bound parameter), so nothing else is let through.
var contentFieldName = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]{0,31}$`)

// contentGuard turns the caller's expectations into an extra condition of the
// UPDATE itself, so that checking and writing are one atomic statement. Reading
// the row first and writing after leaves a gap in which another device's save
// lands and is then overwritten — the very thing the guard is for.
//
// Each entry says "this field of the content must still equal this value", with
// null meaning the field must be absent. Only the fields named are compared:
// the rest of the content (appearance, size) may change independently and is not
// a reason to refuse a note.
func contentGuard(expected map[string]*string) (string, []interface{}, error) {
	var clause strings.Builder
	var args []interface{}
	// Sorted, so the same request always builds the same statement.
	keys := make([]string, 0, len(expected))
	for k := range expected {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		if !contentFieldName.MatchString(k) {
			return "", nil, fmt.Errorf("invalid field %q", k)
		}
		clause.WriteString(" AND json_extract(content, '$." + k + "') IS ?")
		if v := expected[k]; v == nil {
			args = append(args, nil)
		} else {
			args = append(args, *v)
		}
	}
	return clause.String(), args, nil
}

// MoveItem relocates an item to another dashboard, taking its whole subtree
// with it (so a moved section carries its children). Everything happens in one
// transaction: the item gets the new dashboard_id + auto-placed x/y and is
// detached from any parent, then every descendant is reassigned to the same
// dashboard. This is the section-aware counterpart to UpdateItem's single-item
// dashboard_id move.
func (h *DashboardHandler) MoveItem(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	userID := middleware.GetUserIDFromContext(r)

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "error.invalid_id", http.StatusBadRequest)
		return
	}

	var input struct {
		DashboardID int `json:"dashboard_id"`
		X           int `json:"x"`
		Y           int `json:"y"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	if input.X < 1 || input.Y < 1 {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	// The destination dashboard must belong to the caller.
	if !h.userOwnsDashboard(userID, input.DashboardID) {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Move the item itself and detach it from any parent (a nested item leaving
	// its section; a section has no parent, so this is a no-op for it).
	res, err := tx.Exec(
		`UPDATE items SET dashboard_id=?, x=?, y=?, parent_id=NULL WHERE id=? AND user_id=?`,
		input.DashboardID, input.X, input.Y, id, userID,
	)
	if err != nil {
		slog.Error("MoveItem: update item failed", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	n, err := res.RowsAffected()
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if n == 0 {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}

	// Reassign the whole subtree (any depth) to the target dashboard.
	if _, err := tx.Exec(
		`WITH RECURSIVE sub(id) AS (
			SELECT id FROM items WHERE parent_id=? AND user_id=?
			UNION
			SELECT i.id FROM items i JOIN sub ON i.parent_id = sub.id WHERE i.user_id=?
		)
		UPDATE items SET dashboard_id=? WHERE id IN (SELECT id FROM sub) AND user_id=?`,
		id, userID, userID, input.DashboardID, userID,
	); err != nil {
		slog.Error("MoveItem: reassign subtree failed", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "moved"})
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

	// Idempotent delete: a missing row returns 200, not 404. The frontend does
	// an optimistic delete and rolls back (re-adds the item) on any error, so
	// 404-ing an already-deleted item (e.g. stale multi-device cache) would make
	// it reappear. The user_id clause already guarantees ownership.
	if _, err = h.DB.Exec("DELETE FROM items WHERE id=? AND user_id=?", id, userID); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	// The item may have been the last one naming a stored icon. Sweeping here
	// keeps the database from accumulating images nothing points at any more.
	// Best-effort: a failed sweep must not fail the delete the user asked for.
	if removed, err := PruneOrphanIcons(h.DB); err != nil {
		slog.Warn("Icon sweep after delete failed", "error", err)
	} else if removed > 0 {
		slog.Debug("Removed unreferenced icons", "count", removed)
	}

	w.WriteHeader(http.StatusOK)
}

// CheckHealthBatch checks multiple URLs in parallel and returns all results in
// one response. Each URL is checked concurrently in its own goroutine so the
// total time equals the slowest single check, not the sum of all checks.
// healthBatchConcurrency is how many bookmarks are probed at once. The same
// number the background scheduler uses, for the same reason.
const healthBatchConcurrency = 10

func (h *DashboardHandler) CheckHealthBatch(w http.ResponseWriter, r *http.Request) {
	// At most 100 URLs are accepted below, so 64 KiB is generous for the body.
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	var body struct {
		URLs []string `json:"urls"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || len(body.URLs) == 0 {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
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

	// Bounded, like the background scheduler already is. One dashboard asking
	// about a hundred bookmarks used to open a hundred sockets at once, and the
	// rate limiter allows a burst of those requests — enough to spend the
	// process's file descriptors on a single user's page load, never mind a
	// deliberate one. Waiting a few probes longer costs nobody anything.
	gate := make(chan struct{}, healthBatchConcurrency)

	for i, rawUrl := range body.URLs {
		wg.Add(1)
		gate <- struct{}{}
		go func(idx int, u string) {
			defer wg.Done()
			defer func() { <-gate }()
			results[idx] = result{url: u, status: probeURL(u)}
		}(i, rawUrl)
	}

	wg.Wait()

	out := make(map[string]string, len(results))
	for _, r := range results {
		out[r.url] = r.status
	}
	writeJSON(w, out)
}

// probeURL says "up" or "down" for a URL. It is probeTimed without the timing:
// there is one probe, so the status checks on the board and the background
// monitor can never disagree about what up means.
func probeURL(rawUrl string) string {
	if up, _, _ := probeTimed(rawUrl); up {
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
	code := http.StatusOK
	if status == "down" {
		code = http.StatusServiceUnavailable
	}
	writeJSONStatus(w, code, map[string]string{"status": status})
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
