package web

import (
	"context"
	"crypto/rand"
	"database/sql"
	"embed"
	"encoding/base64"
	"encoding/hex"
	htmltemplate "html/template"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

// nonceCtxKey carries the per-request CSP nonce through the request context.
type nonceCtxKey struct{}

// cspNonce returns the per-request CSP nonce set by ServeHTTP, or "" if absent.
func cspNonce(r *http.Request) string {
	if v, ok := r.Context().Value(nonceCtxKey{}).(string); ok {
		return v
	}
	return ""
}

//go:embed dist/*
var content embed.FS

type Server struct {
	DB            *sql.DB
	Router        *http.ServeMux
	WSHub         *api.Hub
	assets        fs.FS
	sessionSecret []byte
	// locales are the language codes actually shipped, read once from the
	// embedded locale files so the list cannot drift from what exists.
	locales []string
}

func NewServer(db *sql.DB) *Server {
	// Initialize Session Secret
	secret := initSessionSecret(db)

	// Root the assets to the 'dist' folder
	assets, err := fs.Sub(content, "dist")
	if err != nil {
		// Fallback for local dev or build failure (won't happen if strict embed but good safety)
		slog.Warn("Embed 'dist' failed, using local filesystem", "error", err)
		assets = osDir("./web/dist")
	}

	s := &Server{
		DB:            db,
		Router:        http.NewServeMux(),
		WSHub:         api.NewHub(),
		assets:        assets,
		sessionSecret: secret,
		locales:       shippedLocales(assets),
	}

	s.routes()
	return s
}

// StartBackground launches the loops that run for the life of the process. They
// stop when ctx is cancelled, and wg is done only once every one of them has
// returned — so a restart cannot catch one mid-write.
func (s *Server) StartBackground(ctx context.Context, wg *sync.WaitGroup) {
	tasks := map[string]func(){
		"websocket hub":   func() { s.WSHub.Run(ctx) },
		"stats broadcast": func() { s.WSHub.StartBroadcasting(ctx, 1*time.Second) },
		"update check":    func() { api.NewUpdateHandler(s.DB).CheckForUpdatesBackground(ctx, s.WSHub) },
		// Idle unless monitoring_mode is "background"; then it records status
		// history 24/7 on its own interval.
		"monitor scheduler": func() { api.NewMonitorScheduler(s.DB).Run(ctx) },
	}

	for name, task := range tasks {
		wg.Add(1)
		go func(name string, task func()) {
			defer wg.Done()
			task()
			slog.Debug("background task stopped", "task", name)
		}(name, task)
	}
}

func initSessionSecret(db *sql.DB) []byte {
	var secretHex string
	err := db.QueryRow("SELECT value FROM system_settings WHERE key = 'session_secret'").Scan(&secretHex)
	if err == sql.ErrNoRows {
		// Generate new secret
		bytes := make([]byte, 32)
		if _, err := rand.Read(bytes); err != nil {
			slog.Error("Failed to generate session secret", "error", err)
			os.Exit(1)
		}
		secretHex = hex.EncodeToString(bytes)
		_, err := db.Exec("INSERT INTO system_settings (key, value) VALUES ('session_secret', ?)", secretHex)
		if err != nil {
			// Fatal: a non-persisted secret lives only in memory, so the next
			// restart generates a new one and silently invalidates every
			// session. Fail loudly instead of logging a warning nobody sees.
			slog.Error("Failed to persist session secret", "error", err)
			os.Exit(1)
		}
	} else if err != nil {
		slog.Error("Failed to load session secret", "error", err)
		os.Exit(1)
	}

	secret, err := hex.DecodeString(secretHex)
	if err != nil {
		slog.Error("Invalid session secret in DB", "error", err)
		os.Exit(1)
	}
	return secret
}

// Simple wrapper to implement fs.FS for os directories if needed
type osDir string

func (d osDir) Open(name string) (fs.File, error) {
	cleaned := filepath.Clean("/" + name)
	return os.Open(filepath.Join(string(d), cleaned))
}

func (s *Server) routes() {
	// Middleware wrapping
	setupCheck := middleware.SetupRequired(s.DB)
	authCheck := middleware.AuthRequired(s.DB, s.sessionSecret)

	protect := func(h http.Handler) http.Handler {
		return middleware.RateLimit(setupCheck(authCheck(h)))
	}

	// File Server for static assets with gzip compression and cache headers.
	fileServer := middleware.StaticAssets(http.FileServer(http.FS(s.assets)))

	// Dynamic Index Handler (UNPROTECTED wrapper to check for static files first)
	// We need 'protect' middleware available for the fallback
	protectedIndex := protect(http.HandlerFunc(s.serveIndex))

	indexHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Demo-Only mode: redirect all non-asset traffic to /demo
		if os.Getenv("DEMO_ONLY") == "true" {
			// Allow static assets through
			if path != "/" && path != "/index.html" {
				f, err := s.assets.Open(strings.TrimPrefix(path, "/"))
				if err == nil {
					f.Close()
					fileServer.ServeHTTP(w, r)
					return
				}
			}
			http.Redirect(w, r, "/demo", http.StatusFound)
			return
		}

		// 1. Explicit Public Pages
		if path == "/login" || path == "/login.html" {
			s.serveLoginPage(w, r)
			return
		}
		// 2. Try to serve static file (Public)
		// If it's a file that exists in assets, serve it.
		// Avoid serving raw template files as static assets.
		if path != "/" && path != "/index.html" && path != "/login.html" {
			f, err := s.assets.Open(strings.TrimPrefix(path, "/"))
			if err == nil {
				f.Close()
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		// 3. Fallback to Protected Index (SPA Root)
		// If we got here, it's either "/" or a client-side route, OR a real 404.
		// We treat it as SPA root which requires Auth.
		protectedIndex.ServeHTTP(w, r)
	})

	// Mount UNPROTECTED handler because it handles its own static file exemption
	s.Router.Handle("/", indexHandler)

	// Public Health Check (Docker / orchestrator)
	s.Router.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Public Routes requiring explicit handlers to bypass 'protect' wrapper if needed?
	// The previous logic used specific handlers.
	// We need to keep the explicit handlers from strict server.go but updated for FS.

	// Login Page (Public)
	s.Router.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		// Prevent aggressive caching for HTML
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")

		// Demo-Only mode: skip login entirely
		if os.Getenv("DEMO_ONLY") == "true" {
			http.Redirect(w, r, "/demo", http.StatusFound)
			return
		}

		// Check if setup is needed (Clean Install)
		var exists bool
		if err := s.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users)").Scan(&exists); err != nil {
			slog.Error("Database error", "error", err)
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
		if !exists {
			http.Redirect(w, r, "/setup", http.StatusSeeOther)
			return
		}

		// Smart Redirect: If already logged in, go to dashboard
		cookie, err := r.Cookie("session_token")
		if err == nil && cookie.Value != "" {
			// Basic Validation to prevent loops
			if _, err := util.VerifyToken(cookie.Value, s.sessionSecret); err == nil {
				http.Redirect(w, r, "/", http.StatusSeeOther)
				return
			}
		}
		// Render login page with template data (e.g. DemoOnly flag)
		s.serveLoginPage(w, r)
	})

	// Auth API
	authHandler := api.NewAuthHandler(s.DB, s.sessionSecret)
	// RefuseCrossSite because these two create the session the CSRF token is
	// compared against, so they have nothing to compare yet — see the comment
	// on the middleware.
	s.Router.Handle("POST /api/login", middleware.RateLimit(middleware.RefuseCrossSite(http.HandlerFunc(authHandler.Login))))
	s.Router.Handle("POST /logout", protect(http.HandlerFunc(authHandler.Logout)))

	// Dashboard API
	dashHandler := api.NewDashboardHandler(s.DB)
	s.Router.Handle("/api/dashboard", protect(http.HandlerFunc(dashHandler.GetDashboard)))
	s.Router.Handle("POST /api/dashboard/item", protect(http.HandlerFunc(dashHandler.CreateItem)))
	s.Router.Handle("PATCH /api/dashboard/item/{id}/move", protect(http.HandlerFunc(dashHandler.MoveItem)))
	s.Router.Handle("PATCH /api/dashboard/item/", protect(http.HandlerFunc(dashHandler.UpdateItem)))
	s.Router.Handle("DELETE /api/dashboard/item/", protect(http.HandlerFunc(dashHandler.DeleteItem)))
	s.Router.Handle("/api/dashboard/health", protect(http.HandlerFunc(dashHandler.CheckHealth)))
	s.Router.Handle("POST /api/dashboard/health/batch", protect(http.HandlerFunc(dashHandler.CheckHealthBatch)))

	// Icons, kept locally so the dashboard doesn't ask a CDN on every paint.
	iconHandler := api.NewIconHandler(s.DB)
	s.Router.Handle("POST /api/icons", protect(http.HandlerFunc(iconHandler.Store)))
	// More specific than the catch-all below it, which ServeMux honours: these
	// two are about the board's icons, not about serving one.
	s.Router.Handle("GET /api/icons/pending", protect(http.HandlerFunc(iconHandler.PendingStatus)))
	s.Router.Handle("POST /api/icons/localize", protect(http.HandlerFunc(iconHandler.Localize)))
	s.Router.Handle("GET /api/icons/", protect(http.HandlerFunc(iconHandler.Serve)))

	// Generic API widget (server-side fetch + field extraction)
	widgetHandler := api.NewWidgetHandler()
	s.Router.Handle("POST /api/widget/api-fetch", protect(http.HandlerFunc(widgetHandler.ApiFetch)))

	// Multi-Dashboard API
	multiDashHandler := api.NewMultiDashboardHandler(s.DB)
	s.Router.Handle("GET /api/dashboards", protect(http.HandlerFunc(multiDashHandler.GetDashboards)))
	s.Router.Handle("POST /api/dashboards", protect(http.HandlerFunc(multiDashHandler.CreateDashboard)))
	s.Router.Handle("DELETE /api/dashboards/", protect(http.HandlerFunc(multiDashHandler.DeleteDashboard)))
	s.Router.Handle("PATCH /api/dashboards/", protect(http.HandlerFunc(multiDashHandler.RenameDashboard)))
	s.Router.Handle("POST /api/dashboards/{id}/default", protect(http.HandlerFunc(multiDashHandler.SetDefaultDashboard)))
	s.Router.Handle("PUT /api/dashboards/reorder", protect(http.HandlerFunc(multiDashHandler.ReorderDashboards)))

	// Docker API
	// Proxmox. The connection is server-wide and the credential never leaves
	// the server, so unlike the Docker widget nothing about it is passed in a
	// query string. Power actions are admin-only — see the handler.
	proxmoxHandler := api.NewProxmoxHandler(s.DB)
	s.Router.Handle("GET /api/proxmox/settings", protect(http.HandlerFunc(proxmoxHandler.GetSettings)))
	s.Router.Handle("POST /api/proxmox/settings", protect(http.HandlerFunc(proxmoxHandler.UpdateSettings)))
	s.Router.Handle("GET /api/proxmox/overview", protect(http.HandlerFunc(proxmoxHandler.GetOverview)))
	s.Router.Handle("GET /api/proxmox/series", protect(http.HandlerFunc(proxmoxHandler.GetSeries)))
	s.Router.Handle("POST /api/proxmox/power", protect(http.HandlerFunc(proxmoxHandler.Power)))
	s.Router.Handle("POST /api/proxmox/icon", protect(http.HandlerFunc(proxmoxHandler.SetIcon)))

	dockerHandler := api.NewDockerHandler(s.DB)
	s.Router.Handle("GET /api/docker/containers", protect(http.HandlerFunc(dockerHandler.GetContainers)))
	s.Router.Handle("GET /api/docker/stats", protect(http.HandlerFunc(dockerHandler.GetStats)))
	s.Router.Handle("POST /api/docker/containers", protect(http.HandlerFunc(dockerHandler.ListContainersFor)))
	s.Router.Handle("POST /api/docker/stats", protect(http.HandlerFunc(dockerHandler.StatsFor)))
	s.Router.Handle("POST /api/docker/agent-version", protect(http.HandlerFunc(dockerHandler.AgentVersionFor)))
	s.Router.Handle("POST /api/docker/action", protect(http.HandlerFunc(dockerHandler.Action)))

	// User API
	userHandler := api.NewUserHandler(s.DB, s.sessionSecret)
	s.Router.Handle("/api/me", protect(http.HandlerFunc(userHandler.GetMe)))
	s.Router.Handle("POST /api/user/update-profile", protect(http.HandlerFunc(userHandler.UpdateProfile)))
	s.Router.Handle("POST /api/user/change-password", protect(http.HandlerFunc(userHandler.ChangePassword)))
	s.Router.Handle("POST /api/user/preferences", protect(http.HandlerFunc(userHandler.UpdatePreferences)))

	// Admin User Management
	s.Router.Handle("GET /api/users", protect(http.HandlerFunc(userHandler.GetUsers)))
	s.Router.Handle("POST /api/users", protect(http.HandlerFunc(userHandler.CreateUser)))
	s.Router.Handle("PUT /api/users", protect(http.HandlerFunc(userHandler.UpdateUser)))
	s.Router.Handle("POST /api/users/delete", protect(http.HandlerFunc(userHandler.DeleteUser)))

	// Demo Route — only available when DEMO_ONLY=true.
	// In normal production installs this returns 404 so the route is invisible.
	s.Router.HandleFunc("/demo", func(w http.ResponseWriter, r *http.Request) {
		if os.Getenv("DEMO_ONLY") != "true" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		s.serveIndexDemo(w, r)
	})

	// Setup Page (Secured)
	s.Router.HandleFunc("/setup", func(w http.ResponseWriter, r *http.Request) {
		// Prevent aggressive caching for HTML
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		// Security Check: If users exist, redirect to login
		var exists bool
		err := s.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users)").Scan(&exists)
		if err != nil {
			slog.Error("Error checking system state", "error", err)
			http.Error(w, "general.internal_error", http.StatusInternalServerError)
			return
		}

		if exists {
			// Smart Redirect: If already logged in, go to dashboard
			cookie, err := r.Cookie("session_token")
			if err == nil && cookie.Value != "" {
				if _, err := util.VerifyToken(cookie.Value, s.sessionSecret); err == nil {
					http.Redirect(w, r, "/", http.StatusSeeOther)
					return
				}
			}

			// CRITICAL: Prevent access to HTML
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		s.serveSetupPage(w, r)
	})

	// Setup API — public and state-changing, so rate limited like /api/login.
	setupHandler := api.NewSetupHandler(s.DB)
	s.Router.Handle("POST /api/setup", middleware.RateLimit(middleware.RefuseCrossSite(http.HandlerFunc(setupHandler.SetupSystem))))

	// System API
	systemHandler := api.NewSystemHandler(s.DB)
	s.Router.Handle("GET /api/system/backup", protect(http.HandlerFunc(systemHandler.DownloadBackup)))
	s.Router.Handle("POST /api/system/backup", protect(http.HandlerFunc(systemHandler.DownloadProtectedBackup)))
	s.Router.Handle("POST /api/system/restore", protect(http.HandlerFunc(systemHandler.RestoreBackup)))
	s.Router.Handle("POST /api/system/reset", protect(http.HandlerFunc(systemHandler.FactoryReset)))

	// Update API
	updateHandler := api.NewUpdateHandler(s.DB)
	s.Router.Handle("GET /api/system/update/check", protect(http.HandlerFunc(updateHandler.CheckUpdate)))
	s.Router.Handle("POST /api/system/update/perform", protect(http.HandlerFunc(updateHandler.PerformUpdate)))

	// Monitoring settings API
	monitorHandler := api.NewMonitorHandler(s.DB)
	s.Router.Handle("GET /api/monitor/settings", protect(http.HandlerFunc(monitorHandler.GetSettings)))
	s.Router.Handle("POST /api/monitor/settings", protect(http.HandlerFunc(monitorHandler.UpdateSettings)))
	s.Router.Handle("POST /api/monitor/test", protect(http.HandlerFunc(monitorHandler.TestNotify)))

	// Import / export API
	impExpHandler := api.NewImportExportHandler(s.DB)
	s.Router.Handle("GET /api/export/native", protect(http.HandlerFunc(impExpHandler.ExportNative)))
	s.Router.Handle("POST /api/import/parse", protect(http.HandlerFunc(impExpHandler.ImportParse)))
	s.Router.Handle("GET /api/monitor/history", protect(http.HandlerFunc(monitorHandler.GetHistory)))
	s.Router.Handle("DELETE /api/monitor/history", protect(http.HandlerFunc(monitorHandler.ClearHistory)))
	s.Router.Handle("GET /api/monitor/overview", protect(http.HandlerFunc(monitorHandler.GetOverview)))

	// WebSocket Endpoint
	s.Router.Handle("/ws", protect(http.HandlerFunc(s.WSHub.HandleWebSocket)))
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Per-request CSP nonce for the handful of inline <script> blocks (the
	// runtime config and the theme bootstrap). This lets script-src drop
	// 'unsafe-inline', so injected markup can no longer execute as script.
	// style-src keeps 'unsafe-inline' intentionally: the UI relies on inline
	// style attributes and per-component <style> injected into shadow roots.
	nonceBytes := make([]byte, 16)
	_, _ = rand.Read(nonceBytes)
	nonce := base64.StdEncoding.EncodeToString(nonceBytes)
	r = r.WithContext(context.WithValue(r.Context(), nonceCtxKey{}, nonce))

	// Security Headers
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("X-Frame-Options", "SAMEORIGIN")
	w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
	w.Header().Set("Content-Security-Policy",
		"default-src 'self'; "+
			"script-src 'self' 'nonce-"+nonce+"'; "+
			"style-src 'self' 'unsafe-inline'; "+
			"img-src 'self' data: https:; "+
			"connect-src 'self' wss: ws: https://cdn.jsdelivr.net https://unpkg.com https://api.github.com https://git.codigosh.com https://*.open-meteo.com https://timeapi.io; "+
			"font-src 'self'; "+
			"object-src 'none'; "+
			"frame-ancestors 'self'")

	// A demo instance is public, but it must stay out of search results: every
	// URL renders the same page from mock data, so search engines read the site
	// as duplicate content and it competes with the real one. Crawling is left
	// allowed on purpose — blocking it in robots.txt would hide this header,
	// and a page that can't be fetched can't be told not to index.
	if os.Getenv("DEMO_ONLY") == "true" {
		w.Header().Set("X-Robots-Tag", "noindex, nofollow")
	}

	// HSTS (HTTP Strict Transport Security)
	// Only send over HTTPS to prevent MITM attacks
	// max-age=31536000 (1 year), includeSubDomains, preload
	if util.IsSecureRequest(r) {
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
	}

	s.Router.ServeHTTP(w, r)
}

// serveLoginPage renders login.html as a Go template, injecting server-side flags.
// DemoOnly: when true, the "Try Demo" button is rendered; otherwise completely absent.
func (s *Server) serveLoginPage(w http.ResponseWriter, r *http.Request) {
	tmpl, err := htmltemplate.ParseFS(s.assets, "login.html")
	if err != nil {
		slog.Error("Error loading login template", "error", err)
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	language := preferredLanguage(r.Header.Get("Accept-Language"), s.locales)
	data := struct {
		DemoOnly   bool
		Nonce      string
		Language   string
		Direction  string
		ThemeColor string
	}{
		DemoOnly:   os.Getenv("DEMO_ONLY") == "true",
		Nonce:      cspNonce(r),
		Language:   language,
		Direction:  directionOf(language),
		ThemeColor: themeColorFromRequest(r),
	}

	if err := tmpl.Execute(w, data); err != nil {
		slog.Error("Error executing login template", "error", err)
	}
}

// serveSetupPage renders setup.html as a Go template so its inline theme-bootstrap
// script can carry the per-request CSP nonce (served as a template, not a static
// file, for that reason). Callers must have already verified no users exist.
func (s *Server) serveSetupPage(w http.ResponseWriter, r *http.Request) {
	tmpl, err := htmltemplate.ParseFS(s.assets, "setup.html")
	if err != nil {
		slog.Error("Error loading setup template", "error", err)
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	language := preferredLanguage(r.Header.Get("Accept-Language"), s.locales)
	data := struct {
		Nonce      string
		Language   string
		Direction  string
		ThemeColor string
	}{
		Nonce:      cspNonce(r),
		Language:   language,
		Direction:  directionOf(language),
		ThemeColor: themeColorFromRequest(r),
	}

	if err := tmpl.Execute(w, data); err != nil {
		slog.Error("Error executing setup template", "error", err)
	}
}

func (s *Server) serveIndex(w http.ResponseWriter, r *http.Request) {
	// Prevent aggressive caching for HTML so we always get fresh asset links
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	username := middleware.GetUserFromContext(r)
	var projectName string = "Lastboard"
	var dbTheme string = ""
	var dbLanguage string = ""

	if username != "" {
		// Fetch Project Name, Theme AND language
		err := s.DB.QueryRowContext(r.Context(),
			"SELECT project_name, COALESCE(theme, ''), COALESCE(language, '') FROM users WHERE username = ?",
			username).Scan(&projectName, &dbTheme, &dbLanguage)
		if err != nil && err != sql.ErrNoRows {
			slog.Warn("Error fetching user data", "error", err)
		}
	}

	// Use the per-user database value directly.  A shared cookie would leak
	// the previous user's preference to the next user on the same browser;
	// the DB row is already scoped to the authenticated session.
	//
	// Two answers, both known here, so the page is painted in the right theme
	// from the first byte and the client never has to correct it. Anything that
	// is not "light" is dark, which is the app's default everywhere else.

	tmpl, err := htmltemplate.ParseFS(s.assets, "index.html")
	if err != nil {
		slog.Error("Error loading template", "error", err)
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	// Known here, so the page arrives in the right language and the right
	// reading direction instead of starting English and left-to-right and
	// being corrected once the bundle has loaded.
	data := newIndexPageData(projectName, dbTheme, dbLanguage, false, cspNonce(r))

	if err := tmpl.Execute(w, data); err != nil {
		slog.Error("Error executing template", "error", err)
	}
}

// serveIndexDemo serves the dashboard in fully isolated demo mode.
// No authentication is required. All data is stored in the visitor's localStorage
// via demoService.ts — the production database is never touched.
func (s *Server) serveIndexDemo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	tmpl, err := htmltemplate.ParseFS(s.assets, "index.html")
	if err != nil {
		slog.Error("Error loading demo template", "error", err)
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	data := newIndexPageData("Lastboard", "dark", "", true, cspNonce(r))

	if err := tmpl.Execute(w, data); err != nil {
		slog.Error("Error executing demo template", "error", err)
	}
}

// indexPageData is what index.html is rendered with. Both the dashboard and the
// demo build it through newIndexPageData rather than declaring a struct each:
// when the template grew `lang` and `dir` the demo handler kept its own literal
// without them, and every demo page died at line 2 — twenty-eight bytes and a
// blank screen — because a missing field is an execution error, not a blank.
type indexPageData struct {
	ProjectName string
	ThemeClass  string
	ThemeColor  string
	// FollowsSystem says the account asked to follow the device rather than to
	// be light or dark. The server cannot know which the device is — the client
	// hint that would say is Chromium-only — so the page carries a scrap of
	// script that settles it before the stylesheet is parsed, the same trick the
	// login and setup pages already use for their own theme.
	FollowsSystem bool
	Language      string
	Direction     string
	DemoMode      bool
	Nonce         string
}

// The colour the top bar paints, per theme — which is what the status bar of an
// installed app sits on top of, so it is what theme-color has to say. These are
// the --panel values of web/styles/theme.css, and a test holds them to it.
const (
	panelDark  = "#1a1a1a"
	panelLight = "#ffffff"
)

// themeColorOf maps a theme class to the colour the interface wears under it.
// Anything that is not the light theme is dark, which is how the app decides
// everywhere else.
func themeColorOf(themeClass string) string {
	if themeClass == "" {
		return panelLight
	}
	return panelDark
}

// themeClassOf maps a stored theme to the class the page is served with.
//
// "system" gets the dark class: it is the app's default everywhere, so the
// device that agrees needs no correcting at all, and the one that does not is
// corrected before the stylesheet is parsed rather than after it has painted.
func themeClassOf(theme string) string {
	if theme == "light" {
		return ""
	}
	return "dark-mode"
}

// themeColorFromRequest reads the theme out of the cookie ThemeService writes
// beside its localStorage copy.
//
// The login and setup pages are painted before anyone is logged in, so there is
// no account row to read a theme from — but the visitor's previous choice is
// already on the wire, and using it puts the right colour in the page from the
// first byte instead of leaving the status bar wrong until the bundle loads.
// No cookie means a first visit, which is dark like every other default here.
//
// The value is never interpolated: it only picks between two constants.
func themeColorFromRequest(r *http.Request) string {
	if cookie, err := r.Cookie("lastboard_theme"); err == nil && cookie.Value == "light" {
		return panelLight
	}
	return panelDark
}

// newIndexPageData fills in the pairs that have to agree — a language and the
// direction it reads in, a theme and the colour it wears — so no caller can set
// one and forget the other. An empty language means English, which is what the
// frontend falls back to.
func newIndexPageData(projectName, theme, language string, demo bool, nonce string) indexPageData {
	if language == "" {
		language = "en"
	}
	themeClass := themeClassOf(theme)
	return indexPageData{
		ProjectName:   projectName,
		ThemeClass:    themeClass,
		ThemeColor:    themeColorOf(themeClass),
		FollowsSystem: theme == "system",
		Language:      language,
		Direction:     directionOf(language),
		DemoMode:      demo,
		Nonce:         nonce,
	}
}

// shippedLocales lists the language codes that have a locale file, so nothing
// has to repeat the list of twenty by hand. An unreadable directory yields just
// English, which is the fallback everywhere else too.
func shippedLocales(assets fs.FS) []string {
	entries, err := fs.ReadDir(assets, "locales")
	if err != nil {
		slog.Warn("Could not read the locales directory", "error", err)
		return []string{"en"}
	}
	codes := make([]string, 0, len(entries))
	for _, entry := range entries {
		if name, ok := strings.CutSuffix(entry.Name(), ".json"); ok {
			codes = append(codes, name)
		}
	}
	if len(codes) == 0 {
		return []string{"en"}
	}
	return codes
}

// preferredLanguage picks a shipped language out of an Accept-Language header.
//
// The login and setup pages are painted before anyone is logged in, so there is
// no stored preference to read: the header is the only thing the server knows.
// It gets the first paint right for whoever has not overridden the language,
// and for whoever has, the frontend corrects it as it does today — which beats
// telling every visitor the page is in English.
//
// Quality values order the candidates; a tag with a region ("es-ES") matches on
// its base. Anything unparseable is skipped rather than failing the request.
func preferredLanguage(header string, available []string) string {
	if header == "" {
		return "en"
	}
	shipped := make(map[string]bool, len(available))
	for _, code := range available {
		shipped[code] = true
	}

	type candidate struct {
		code    string
		quality float64
		order   int
	}
	var candidates []candidate

	for index, part := range strings.Split(header, ",") {
		tag, params, _ := strings.Cut(strings.TrimSpace(part), ";")
		tag = strings.TrimSpace(tag)
		if tag == "" || tag == "*" {
			continue
		}
		quality := 1.0
		if value, ok := strings.CutPrefix(strings.TrimSpace(params), "q="); ok {
			parsed, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
			if err != nil {
				continue
			}
			quality = parsed
		}
		if quality <= 0 {
			continue
		}
		base, _, _ := strings.Cut(tag, "-")
		candidates = append(candidates, candidate{strings.ToLower(base), quality, index})
	}

	// Stable by quality, then by the order they were written in.
	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].quality != candidates[j].quality {
			return candidates[i].quality > candidates[j].quality
		}
		return candidates[i].order < candidates[j].order
	})

	for _, c := range candidates {
		if shipped[c.code] {
			return c.code
		}
	}
	return "en"
}

// directionOf reports how a language reads, for the document's dir attribute.
// The list mirrors the one the frontend keeps in i18n.helpers.ts; both are
// asserted against the shipped locales by a test.
func directionOf(language string) string {
	base, _, _ := strings.Cut(language, "-")
	switch strings.ToLower(base) {
	case "ar", "fa", "ur", "he":
		return "rtl"
	}
	return "ltr"
}
