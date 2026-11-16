package web

import (
	"encoding/json"
	"io/fs"
	"log/slog"
	"net/http"
	"strings"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

// serveManifest answers the web app manifest with the name the account asking
// for it gave its panel in Preferences, so an installed app is called what the
// top bar says and two servers installed on one phone are not both "Lastboard".
//
// The name is per account, so the manifest is too: the pages link it with
// crossorigin="use-credentials", because a browser fetches a manifest without
// cookies otherwise and every install would be named "Lastboard". With no
// session — installing from the login page — it is the product's own name.
//
// web/manifest.json stays the one source of everything else in it.
func (s *Server) serveManifest(w http.ResponseWriter, r *http.Request) {
	raw, err := fs.ReadFile(s.assets, "manifest.json")
	if err != nil {
		http.NotFound(w, r)
		return
	}
	var manifest map[string]any
	if err := json.Unmarshal(raw, &manifest); err != nil {
		slog.Error("The web app manifest is not valid JSON", "error", err)
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	if name := s.manifestName(r); name != "" {
		manifest["name"] = name
		manifest["short_name"] = name
	}

	w.Header().Set("Content-Type", "application/manifest+json")
	// It changes with the session and with the name, so it is never kept.
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Vary", "Cookie")
	if err := json.NewEncoder(w).Encode(manifest); err != nil {
		slog.Warn("Writing the web app manifest failed", "error", err)
	}
}

// manifestName is the panel name of the account the request's session belongs
// to, or "" when there is no session that is still good.
func (s *Server) manifestName(r *http.Request) string {
	session, err := middleware.ResolveSession(s.DB, s.sessionSecret, r)
	if err != nil {
		return ""
	}
	var name string
	if err := s.DB.QueryRowContext(r.Context(),
		"SELECT COALESCE(project_name, '') FROM users WHERE id = ?", session.ID).Scan(&name); err != nil {
		slog.Warn("Reading the panel name for the manifest failed", "error", err)
		return ""
	}
	return strings.TrimSpace(name)
}
