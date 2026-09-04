package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

// isAdminUser checks whether the currently authenticated user is the first admin
// (the first user with role='admin' by ID). Single source of truth for all handlers.
func isAdminUser(db *sql.DB, r *http.Request) bool {
	username := middleware.GetUserFromContext(r)
	if username == "" {
		return false
	}
	var userID int
	if err := db.QueryRowContext(r.Context(), "SELECT id FROM users WHERE username = ?", username).Scan(&userID); err != nil {
		return false
	}
	return isFirstAdmin(db, userID)
}

// isFirstAdmin reports whether userID is the first admin (lowest ID with role='admin').
func isFirstAdmin(db *sql.DB, userID int) bool {
	var firstAdminID int
	err := db.QueryRow("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").Scan(&firstAdminID)
	return err == nil && userID > 0 && userID == firstAdminID
}

// invalidateSession expires the session and CSRF cookies, forcing the client to re-login.
// Flags must mirror those used at login (auth.go) so browsers accept the deletion cookie.
func invalidateSession(w http.ResponseWriter, r *http.Request) {
	expired := time.Now().Add(-1 * time.Hour)
	secure := util.IsSecureRequest(r)
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		Expires:  expired,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "csrf_token",
		Value:    "",
		Path:     "/",
		Expires:  expired,
		HttpOnly: false,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}

// iconURL builds the CDN URL for a dashboard icon name.
func iconURL(name string) string {
	return "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/" + name + ".webp"
}

// bookmarkContent builds the JSON content of a bookmark. The URL must live
// inside the content (the frontend reads it from there); the `url` column is
// kept in sync only for compatibility with older exports.
func bookmarkContent(label, url, icon string) string {
	payload, _ := json.Marshal(map[string]any{
		"label":        label,
		"url":          url,
		"icon":         iconURL(icon),
		"iconName":     icon,
		"openInNewTab": true,
	})
	return string(payload)
}

// seedBookmark is one starter bookmark, either loose on the grid or inside a section.
type seedBookmark struct {
	x, y  int
	icon  string
	label string
	url   string
}

// Blank lines render as <br><br> (see MarkdownParser), which eats a lot of the
// 4x2 tile — keep the copy on single lines so it fits without scrolling.
const seedWelcomeMarkdown = "# Welcome 👋\n" +
	"Open **edit mode** in the top bar to drag tiles and add your own bookmarks " +
	"and widgets.\n" +
	"[Read the docs →](https://codigosh.com/docs/lastboard/)"

const seedNotepadHTML = "<div><b>Quick notes</b> ✍️</div><div><br></div>" +
	"<div>• Open edit mode from the top bar</div>" +
	"<div>• Drag any tile to rearrange it</div>" +
	"<div>• Add your own bookmarks &amp; widgets</div>"

// SeedDefaultItems inserts the default dashboard items for a new user.
//
// This is the starter board for real installs. Its layout mirrors the "Home"
// dashboard of web/src/config/defaults.ts (the demo/offline template): same
// widgets at the same sizes as web/src/widgets/registry.ts, three sections and
// a column of loose bookmarks. Keep the widget sizes in sync with both files —
// a stale seed is how new installs ended up with a 2x1 telemetry widget.
//
// Items are inserted with a NULL dashboard_id on purpose: they are adopted by
// the user's default dashboard the first time the dashboard list is requested.
func SeedDefaultItems(tx *sql.Tx, userID int) error {
	// ── Widgets (row 1-2) ────────────────────────────────────────────────
	widgets := []struct {
		x, y, w, h int
		content    string
	}{
		{1, 1, 4, 2, `{"widgetId":"markdown","text":` + jsonString(seedWelcomeMarkdown) + `}`},
		{5, 1, 3, 2, `{"widgetId":"weather","city":"Madrid","latitude":40.4168,"longitude":-3.7038,"unit":"celsius","showForecast":true,"forecastDays":6}`},
		{8, 1, 2, 2, `{"widgetId":"notepad","text":` + jsonString(seedNotepadHTML) + `}`},
		{10, 1, 2, 1, `{"widgetId":"clock","city":"Madrid","timezone":"Europe/Madrid","hour12":false,"showDate":true,"showSeconds":true,"showCity":true}`},
		{10, 2, 3, 1, `{"widgetId":"telemetry","interval":2000}`},
	}
	for _, wgt := range widgets {
		if _, err := tx.Exec(
			`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'widget', ?, ?, ?, ?, ?)`,
			userID, wgt.x, wgt.y, wgt.w, wgt.h, wgt.content); err != nil {
			return err
		}
	}

	// ── Sections with their bookmarks (row 3-4) ──────────────────────────
	sections := []struct {
		x, y, w, h int
		title      string
		bookmarks  []seedBookmark
	}{
		{1, 3, 3, 2, "Media", []seedBookmark{
			{1, 1, "plex", "Plex", "https://plex.tv"},
			{2, 1, "jellyfin", "Jellyfin", "https://jellyfin.org"},
			{3, 1, "sonarr", "Sonarr", "https://sonarr.tv"},
			{1, 2, "radarr", "Radarr", "https://radarr.video"},
			{2, 2, "prowlarr", "Prowlarr", "https://prowlarr.com"},
			{3, 2, "overseerr", "Overseerr", "https://overseerr.dev"},
		}},
		{4, 3, 4, 2, "Self-Hosted Apps", []seedBookmark{
			{1, 1, "nextcloud", "Nextcloud", "https://nextcloud.com"},
			{2, 1, "immich", "Immich", "https://immich.app"},
			{3, 1, "vaultwarden", "Vaultwarden", "https://github.com/dani-garcia/vaultwarden"},
			{4, 1, "open-webui", "Open WebUI", "https://openwebui.com"},
			{1, 2, "paperless-ngx", "Paperless", "https://docs.paperless-ngx.com"},
			{2, 2, "audiobookshelf", "Audiobookshelf", "https://www.audiobookshelf.org"},
			{3, 2, "linkwarden", "Linkwarden", "https://linkwarden.app"},
			{4, 2, "freshrss", "FreshRSS", "https://freshrss.org"},
		}},
		{8, 3, 3, 2, "Infrastructure", []seedBookmark{
			{1, 1, "proxmox", "Proxmox", "https://www.proxmox.com"},
			{2, 1, "portainer", "Portainer", "https://www.portainer.io"},
			{3, 1, "pi-hole", "Pi-hole", "https://pi-hole.net"},
			{1, 2, "home-assistant", "Home Assistant", "https://www.home-assistant.io"},
			{2, 2, "grafana", "Grafana", "https://grafana.com"},
			{3, 2, "uptime-kuma", "Uptime Kuma", "https://github.com/louislam/uptime-kuma"},
		}},
	}
	for _, sec := range sections {
		res, err := tx.Exec(
			`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'section', ?, ?, ?, ?, ?)`,
			userID, sec.x, sec.y, sec.w, sec.h, `{"title":`+jsonString(sec.title)+`}`)
		if err != nil {
			return err
		}
		sectionID, err := res.LastInsertId()
		if err != nil {
			return err
		}
		for _, b := range sec.bookmarks {
			if _, err := tx.Exec(
				`INSERT INTO items (user_id, parent_id, type, x, y, w, h, content, url) VALUES (?, ?, 'bookmark', ?, ?, 1, 1, ?, ?)`,
				userID, sectionID, b.x, b.y, bookmarkContent(b.label, b.url, b.icon), b.url); err != nil {
				return err
			}
		}
	}

	// ── Loose bookmarks (no section) ─────────────────────────────────────
	loose := []seedBookmark{
		{12, 1, "github", "GitHub", "https://github.com"},
		{11, 3, "google", "Google", "https://google.com"},
		{12, 3, "youtube", "YouTube", "https://youtube.com"},
		{11, 4, "gmail", "Gmail", "https://mail.google.com"},
		{12, 4, "cloudflare", "Cloudflare", "https://dash.cloudflare.com"},
	}
	for _, b := range loose {
		if _, err := tx.Exec(
			`INSERT INTO items (user_id, type, x, y, w, h, content, url) VALUES (?, 'bookmark', ?, ?, 1, 1, ?, ?)`,
			userID, b.x, b.y, bookmarkContent(b.label, b.url, b.icon), b.url); err != nil {
			return err
		}
	}

	return nil
}

// jsonString quotes and escapes s so it can be embedded in a JSON literal.
func jsonString(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}
