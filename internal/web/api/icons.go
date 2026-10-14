package api

import (
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

// Icon storage.
//
// Bookmarks and Docker rows used to keep whichever URL the picker produced,
// which for provider icons meant a public CDN. Every board paint then asked a
// third party for them: no icons when your connection is down — exactly when
// you open the dashboard to reach services that are still up — and a running
// account, at that third party, of your IP and the services you run.
//
// So the image is fetched once, when the bookmark is saved, and kept here.
// Storage is content-addressed: the same icon on twenty bookmarks is stored
// once, and the URL never needs invalidating because the bytes ARE the name.
// Icons deliberately live in their own table rather than inside the item's
// content: /api/dashboard returns every item on each load, and 100 bookmarks
// with a ~30 KB data: URI each would mean 3 MB of JSON per paint.

const (
	// Icons are small by nature. This is roomy for a detailed SVG or a 512px
	// PNG while keeping a hostile URL from filling the database.
	maxIconBytes = 512 * 1024
	// A slow host must not hold the save dialog open.
	iconFetchTimeout = 10 * time.Second
)

// What we are willing to store and serve back.
var allowedIconTypes = map[string]bool{
	"image/webp":               true,
	"image/png":                true,
	"image/jpeg":               true,
	"image/gif":                true,
	"image/svg+xml":            true,
	"image/x-icon":             true,
	"image/vnd.microsoft.icon": true,
}

type IconHandler struct {
	DB     *sql.DB
	Client *http.Client
}

func NewIconHandler(db *sql.DB) *IconHandler {
	return &IconHandler{
		DB: db,
		// No redirect ceiling beyond Go's default of 10; providers redirect
		// (jsDelivr → its CDN edge) and refusing that would fetch nothing.
		Client: &http.Client{Timeout: iconFetchTimeout, Transport: &http.Transport{
			Proxy:               http.ProxyFromEnvironment,
			DialContext:         util.NewDialer(5*time.Second, 30*time.Second).DialContext,
			ForceAttemptHTTP2:   true,
			TLSHandshakeTimeout: 10 * time.Second,
			IdleConnTimeout:     90 * time.Second,
		}},
	}
}

// errIconType is returned for anything that isn't an image we serve.
var errIconType = errors.New("unsupported icon type")

// normalizeIconType maps what a server claims, or what the bytes look like,
// onto the set we store. Returns errIconType for anything else.
//
// The declared Content-Type is a hint, not proof — the bytes decide. An SVG is
// the exception: it is text, so sniffing calls it XML or plain text and only
// the root element identifies it.
func normalizeIconType(declared string, data []byte) (string, error) {
	if i := strings.IndexByte(declared, ';'); i >= 0 {
		declared = declared[:i]
	}
	declared = strings.ToLower(strings.TrimSpace(declared))

	if looksLikeSVG(data) {
		return "image/svg+xml", nil
	}

	sniffed := http.DetectContentType(data)
	if i := strings.IndexByte(sniffed, ';'); i >= 0 {
		sniffed = sniffed[:i]
	}
	if allowedIconTypes[sniffed] {
		return sniffed, nil
	}
	// DetectContentType doesn't know WebP in older Go, and reports .ico as
	// application/octet-stream; fall back to the declared type when the bytes
	// are inconclusive but the server named something we accept.
	if sniffed == "application/octet-stream" && allowedIconTypes[declared] {
		return declared, nil
	}
	return "", errIconType
}

// looksLikeSVG reports whether the bytes open an SVG document, skipping any
// XML declaration, byte-order mark, comments or leading whitespace.
func looksLikeSVG(data []byte) bool {
	head := data
	if len(head) > 1024 {
		head = head[:1024]
	}
	s := strings.ToLower(strings.TrimPrefix(string(head), "\ufeff"))
	return strings.Contains(s, "<svg")
}

// decodeDataURI reads a `data:<mime>;base64,<payload>` icon.
func decodeDataURI(src string) (mime string, data []byte, err error) {
	rest, ok := strings.CutPrefix(src, "data:")
	if !ok {
		return "", nil, errors.New("not a data URI")
	}
	meta, payload, ok := strings.Cut(rest, ",")
	if !ok {
		return "", nil, errors.New("malformed data URI")
	}
	if !strings.Contains(meta, "base64") {
		return "", nil, errors.New("only base64 data URIs are supported")
	}
	declared, _, _ := strings.Cut(meta, ";")
	raw, err := base64.StdEncoding.DecodeString(strings.TrimSpace(payload))
	if err != nil {
		return "", nil, fmt.Errorf("bad base64: %w", err)
	}
	if len(raw) > maxIconBytes {
		return "", nil, errIconTooLarge
	}
	mime, err = normalizeIconType(declared, raw)
	if err != nil {
		return "", nil, err
	}
	return mime, raw, nil
}

var errIconTooLarge = fmt.Errorf("icon exceeds %d bytes", maxIconBytes)

// fetchIcon downloads an icon over HTTP(S).
//
// Private and link-local addresses are reachable on purpose: a self-hosted
// dashboard's icons routinely live on the same LAN, and this download is
// triggered by the person editing the bookmark, from a URL they typed — the
// same trust model the API widget and the monitor already run under.
func (h *IconHandler) fetchIcon(src string) (mime string, data []byte, err error) {
	req, err := http.NewRequest(http.MethodGet, src, nil)
	if err != nil {
		return "", nil, err
	}
	// An icon never lives on the instance metadata service, and that service
	// answers with the instance's credentials — see util.IsCloudMetadataHost.
	if util.IsCloudMetadataHost(req.URL.Hostname()) {
		return "", nil, errors.New("refusing to fetch from the metadata service")
	}
	req.Header.Set("Accept", "image/*")

	res, err := h.Client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return "", nil, fmt.Errorf("icon source answered %d", res.StatusCode)
	}

	// Read one byte past the cap so an oversized body is detected rather than
	// silently truncated into a corrupt image.
	raw, err := io.ReadAll(io.LimitReader(res.Body, maxIconBytes+1))
	if err != nil {
		return "", nil, err
	}
	if len(raw) > maxIconBytes {
		return "", nil, errIconTooLarge
	}
	if len(raw) == 0 {
		return "", nil, errors.New("empty icon")
	}

	mime, err = normalizeIconType(res.Header.Get("Content-Type"), raw)
	if err != nil {
		return "", nil, err
	}
	return mime, raw, nil
}

// storeIcon writes the bytes under their own hash and returns it. Storing the
// same icon twice is a no-op, which is what makes dedup free.
func storeIcon(db *sql.DB, mime string, data []byte) (string, error) {
	sum := sha256.Sum256(data)
	hash := hex.EncodeToString(sum[:])

	_, err := db.Exec(
		`INSERT OR IGNORE INTO icons (hash, mime, data, size, created_at) VALUES (?, ?, ?, ?, ?)`,
		hash, mime, data, len(data), time.Now().UTC(),
	)
	if err != nil {
		return "", err
	}
	return hash, nil
}

// Store materializes an icon and answers with the local URL to use instead.
//
// A failure here is reported, never fatal: the caller keeps the original URL,
// so a picker that can't be reached costs you the local copy, not the bookmark.
func (h *IconHandler) Store(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxIconBytes*2)

	var input struct {
		Source string `json:"source"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	src := strings.TrimSpace(input.Source)
	if src == "" {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	// Already ours: nothing to fetch, and re-storing it would be a no-op.
	if strings.HasPrefix(src, "/api/icons/") {
		writeJSON(w, map[string]string{"url": src})
		return
	}

	var (
		mime string
		data []byte
		err  error
	)
	switch {
	case strings.HasPrefix(src, "data:"):
		mime, data, err = decodeDataURI(src)
	case strings.HasPrefix(src, "http://"), strings.HasPrefix(src, "https://"):
		mime, data, err = h.fetchIcon(src)
	default:
		http.Error(w, "error.unsupported_icon_source", http.StatusBadRequest)
		return
	}
	if err != nil {
		slog.Warn("Icon could not be stored", "error", err)
		http.Error(w, "general.internal_error", http.StatusBadGateway)
		return
	}

	hash, err := storeIcon(h.DB, mime, data)
	if err != nil {
		slog.Error("Failed to write icon", "error", err)
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]string{"url": "/api/icons/" + hash, "hash": hash})
}

// PendingStatus answers how many bookmarks still fetch their icon from
// somewhere else, so settings can say whether the board is done rather than
// leaving you to guess.
//
// GET /api/icons/pending
func (h *IconHandler) PendingStatus(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.currentUser(w, r)
	if !ok {
		return
	}
	counts, err := CountPendingIcons(h.DB, &userID)
	if err != nil {
		slog.Error("Could not read bookmarks", "error", err)
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, counts)
}

// currentUser resolves the caller's id, which is what scopes both the count
// and the action to their own board.
func (h *IconHandler) currentUser(w http.ResponseWriter, r *http.Request) (int, bool) {
	id := middleware.GetUserIDFromContext(r)
	if id == 0 {
		http.Error(w, "auth.unauthorized", http.StatusUnauthorized)
		return 0, false
	}
	return id, true
}

// Localize brings the remaining remote icons in on demand.
//
// The startup pass already does this, so this is for the board that was
// upgraded while the machine had no connection, or the icon whose host was
// briefly down. It calls the very same routine — the migration has one
// implementation, exposed at two moments — and answers with what is left, so
// the button can report the result instead of claiming success.
//
// POST /api/icons/localize
func (h *IconHandler) Localize(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.currentUser(w, r)
	if !ok {
		return
	}
	done, failed := LocalizeIcons(r.Context(), h.DB, h, &userID)
	counts, err := CountPendingIcons(h.DB, &userID)
	if err != nil {
		counts.Pending = failed
	}
	writeJSON(w, map[string]int{
		"stored": done, "failed": failed,
		"pending": counts.Pending, "local": counts.Local,
	})
}

// Serve returns a stored icon.
func (h *IconHandler) Serve(w http.ResponseWriter, r *http.Request) {
	hash := strings.TrimPrefix(r.URL.Path, "/api/icons/")
	if len(hash) != 64 || strings.ContainsAny(hash, "/.") {
		http.NotFound(w, r)
		return
	}

	var (
		mime string
		data []byte
	)
	err := h.DB.QueryRowContext(r.Context(), `SELECT mime, data FROM icons WHERE hash = ?`, hash).Scan(&mime, &data)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		slog.Error("Icon unavailable", "error", err)
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", mime)
	// The URL is the hash of the bytes, so it can never mean anything else.
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	// An SVG is a document: fetched through <img> its scripts never run, but
	// opening this URL directly would render it on our own origin. This policy
	// makes that inert, and costs nothing for the other formats.
	w.Header().Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(data); err != nil {
		slog.Debug("Icon write interrupted", "error", err)
	}
}

// PruneOrphanIcons deletes icons no longer named by any item, avatar, logo,
// server setting or account setting, and says how many it removed.
//
// The two settings tables are in that list for a reason: the icon someone picks
// for a Proxmox machine is named there and nowhere else (in the account's own
// settings since 1.9), so a sweep that only looked at items — and one runs after
// every single item deletion — would throw those away and leave the tile with a
// broken image. Anything else that ever stores an icon outside `items` has to be
// added to the statement below too.
func PruneOrphanIcons(db *sql.DB) (int, error) {
	// One statement, so the sweep and the references it checks cannot disagree
	// in between. Every place an icon can be named is listed here: add the next
	// one to this list, or the sweep will delete what lives there.
	res, err := db.Exec(`
		DELETE FROM icons
		WHERE NOT EXISTS (SELECT 1 FROM items           WHERE content    LIKE '%' || icons.hash || '%')
		  AND NOT EXISTS (SELECT 1 FROM users           WHERE avatar_url LIKE '%' || icons.hash || '%'
		                                                   OR project_logo LIKE '%' || icons.hash || '%')
		  AND NOT EXISTS (SELECT 1 FROM system_settings WHERE value      LIKE '%' || icons.hash || '%')
		  AND NOT EXISTS (SELECT 1 FROM user_settings   WHERE value      LIKE '%' || icons.hash || '%')`)
	if err != nil {
		return 0, err
	}
	removed, err := res.RowsAffected()
	return int(removed), err
}
