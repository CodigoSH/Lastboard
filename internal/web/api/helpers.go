package api

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/CodigoSH/Lastboard/internal/web/middleware"
)

// isAdminUser checks whether the currently authenticated user is the first admin
// (the first user with role='admin' by ID). Single source of truth for all handlers.
func isAdminUser(db *sql.DB, r *http.Request) bool {
	username := middleware.GetUserFromContext(r)
	if username == "" {
		return false
	}
	var userID int
	if err := db.QueryRow("SELECT id FROM users WHERE username = ?", username).Scan(&userID); err != nil {
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
func invalidateSession(w http.ResponseWriter) {
	expired := time.Now().Add(-1 * time.Hour)
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		Expires:  expired,
		HttpOnly: true,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "csrf_token",
		Value:    "",
		Path:     "/",
		Expires:  expired,
		HttpOnly: false,
	})
}

// SeedDefaultItems inserts the default dashboard items for a new user.
func SeedDefaultItems(tx *sql.Tx, userID int) error {
	// 1-3. Core Widgets
	if _, err := tx.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'widget', 1, 1, 2, 1, ?)`, userID, `{"widgetId":"clock","timezone":"local","hour12":false,"showDate":true,"showSeconds":true}`); err != nil {
		return err
	}
	if _, err := tx.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'widget', 1, 2, 2, 1, ?)`, userID, `{"widgetId":"telemetry","interval":2000}`); err != nil {
		return err
	}
	if _, err := tx.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'widget', 3, 1, 3, 2, ?)`, userID, `{"widgetId":"weather","city":"Madrid","latitude":40.4168,"longitude":-3.7038,"unit":"celsius","showForecast":true,"forecastDays":3}`); err != nil {
		return err
	}

	// 4. Project Links Section
	res, err := tx.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'section', 6, 1, 2, 2, ?)`, userID, `{"title":"Project Links"}`)
	if err != nil {
		return err
	}
	projectLinksID, _ := res.LastInsertId()

	if _, err := tx.Exec(`INSERT INTO items (user_id, parent_id, type, x, y, w, h, content, url) VALUES
		(?, ?, 'bookmark', 1, 1, 1, 1, '{"label": "GitHub", "icon": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/git.png"}', 'https://github.com/CodigoSH/Lastboard'),
		(?, ?, 'bookmark', 2, 1, 1, 1, '{"label": "Wiki", "icon": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/bookstack.png"}', 'https://github.com/CodigoSH/Lastboard/wiki')
	`, userID, projectLinksID, userID, projectLinksID); err != nil {
		return err
	}

	// 7. Media Services Section
	res, err = tx.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'section', 8, 1, 3, 2, ?)`, userID, `{"title":"Media Services"}`)
	if err != nil {
		return err
	}
	mediaServicesID, _ := res.LastInsertId()

	if _, err := tx.Exec(`INSERT INTO items (user_id, parent_id, type, x, y, w, h, content, url) VALUES
		(?, ?, 'bookmark', 1, 1, 1, 1, '{"label": "Plex", "icon": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/plex.png"}', 'https://plex.tv'),
		(?, ?, 'bookmark', 2, 1, 1, 1, '{"label": "Sonarr", "icon": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/sonarr.png"}', 'https://sonarr.tv'),
		(?, ?, 'bookmark', 3, 1, 1, 1, '{"label": "Radarr", "icon": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/radarr.png"}', 'https://radarr.video'),
		(?, ?, 'bookmark', 1, 2, 1, 1, '{"label": "Jellyfin", "icon": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/jellyfin.png"}', 'https://jellyfin.org'),
		(?, ?, 'bookmark', 2, 2, 1, 1, '{"label": "Tautulli", "icon": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/tautulli.png"}', 'https://tautulli.com')
	`, userID, mediaServicesID, userID, mediaServicesID, userID, mediaServicesID, userID, mediaServicesID, userID, mediaServicesID); err != nil {
		return err
	}

	// 13. Infrastructure Section
	res, err = tx.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'section', 11, 1, 2, 3, ?)`, userID, `{"title":"Infrastructure"}`)
	if err != nil {
		return err
	}
	infraID, _ := res.LastInsertId()

	if _, err := tx.Exec(`INSERT INTO items (user_id, parent_id, type, x, y, w, h, content, url) VALUES
		(?, ?, 'bookmark', 1, 1, 1, 1, '{"label": "Proxmox", "icon": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/proxmox.png"}', 'https://proxmox.com'),
		(?, ?, 'bookmark', 2, 1, 1, 1, '{"label": "Pi-hole", "icon": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pi-hole.png"}', 'https://pi-hole.net'),
		(?, ?, 'bookmark', 1, 2, 1, 1, '{"label": "Home Assistant", "icon": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/home-assistant.png"}', 'https://home-assistant.io'),
		(?, ?, 'bookmark', 2, 2, 1, 1, '{"label": "Portainer", "icon": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/portainer.png"}', 'https://portainer.io'),
		(?, ?, 'bookmark', 1, 3, 1, 1, '{"label": "NPM", "icon": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/nginx-proxy-manager.png"}', 'https://nginxproxymanager.com')
	`, userID, infraID, userID, infraID, userID, infraID, userID, infraID, userID, infraID); err != nil {
		return err
	}

	return nil
}
