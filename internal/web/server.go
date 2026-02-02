package web

import (
	"database/sql"
	"embed"
	"encoding/base64"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"
	"text/template"
	"time"

	"github.com/codigosh/Kashboard/internal/web/api"
	"github.com/codigosh/Kashboard/internal/web/middleware"
)

//go:embed dist/*
var content embed.FS

type Server struct {
	DB     *sql.DB
	Router *http.ServeMux
	WSHub  *api.Hub
	assets fs.FS
}

func NewServer(db *sql.DB) *Server {
	// Root the assets to the 'dist' folder
	assets, err := fs.Sub(content, "dist")
	if err != nil {
		// Fallback for local dev or build failure (won't happen if strict embed but good safety)
		log.Printf("Warning: Embed 'dist' failed: %v. Using local file system.", err)
		assets = osDir("./web/dist")
	}

	s := &Server{
		DB:     db,
		Router: http.NewServeMux(),
		WSHub:  api.NewHub(),
		assets: assets,
	}

	// Start WebSocket Hub
	go s.WSHub.Run()
	// Start broadcasting stats every 1 second
	go s.WSHub.StartBroadcasting(1 * time.Second)

	s.routes()
	return s
}

// Simple wrapper to implement fs.FS for os directories if needed
type osDir string

func (d osDir) Open(name string) (fs.File, error) {
	return os.Open(string(d) + "/" + name)
}

func (s *Server) routes() {
	// Middleware wrapping
	setupCheck := middleware.SetupRequired(s.DB)
	authCheck := middleware.AuthRequired(s.DB)

	protect := func(h http.Handler) http.Handler {
		return setupCheck(authCheck(h))
	}

	// File Server for static assets
	// Since we are using a Single Page App (SPA) / or hybrid, we serve assets.
	fileServer := http.FileServer(http.FS(s.assets))

	// Dynamic Index Handler (UNPROTECTED wrapper to check for static files first)
	// We need 'protect' middleware available for the fallback
	protectedIndex := protect(http.HandlerFunc(s.serveIndex))

	indexHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// 1. Explicit Public Pages
		if path == "/login" || path == "/login.html" {
			s.serveFile(w, r, "login.html")
			return
		}
		// Setup page is now handled by explicit handler below to ensure security check precedence
		if path == "/setup" || path == "/setup.html" {
			// Fallthrough to standard handler which will be caught by router exact match?
			// No, ServeMux might route /setup to here if registered as "/"?
			// Actually, if we register "/setup", ServeMux prefers looking for most specific pattern.
			// But if main handler is "/", and we request "/setup", does it go to "/" or "/setup"?
			// It goes to "/setup" if exact match exists.
			// However, explicit specific handlers take precedence in standard ServeMux.
			// So we can safely remove this block.
		}

		// 2. Try to serve static file (Public)
		// If it's a file that exists in assets, serve it.
		if path != "/" && path != "/index.html" {
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

	// Public Routes requiring explicit handlers to bypass 'protect' wrapper if needed?
	// The previous logic used specific handlers.
	// We need to keep the explicit handlers from strict server.go but updated for FS.

	// Login Page (Public)
	s.Router.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		// Smart Redirect: If already logged in, go to dashboard
		cookie, err := r.Cookie("session_token")
		if err == nil && cookie.Value != "" {
			// Basic Validation to prevent loops
			if _, err := base64.StdEncoding.DecodeString(cookie.Value); err == nil {
				http.Redirect(w, r, "/", http.StatusSeeOther)
				return
			}
		}
		s.serveFile(w, r, "login.html")
	})

	// Auth API
	authHandler := api.NewAuthHandler(s.DB)
	s.Router.Handle("POST /api/login", http.HandlerFunc(authHandler.Login))
	s.Router.Handle("/logout", http.HandlerFunc(authHandler.Logout))

	// Dashboard API
	dashHandler := api.NewDashboardHandler(s.DB)
	s.Router.Handle("/api/dashboard", protect(http.HandlerFunc(dashHandler.GetDashboard)))
	s.Router.Handle("POST /api/dashboard/item", protect(http.HandlerFunc(dashHandler.CreateItem)))
	s.Router.Handle("PATCH /api/dashboard/item/", protect(http.HandlerFunc(dashHandler.UpdateItem)))
	s.Router.Handle("DELETE /api/dashboard/item/", protect(http.HandlerFunc(dashHandler.DeleteItem)))
	s.Router.Handle("/api/dashboard/health", protect(http.HandlerFunc(dashHandler.CheckHealth)))

	// User API
	userHandler := api.NewUserHandler(s.DB)
	s.Router.Handle("/api/me", protect(http.HandlerFunc(userHandler.GetMe)))
	s.Router.Handle("POST /api/user/update-profile", protect(http.HandlerFunc(userHandler.UpdateProfile)))
	s.Router.Handle("POST /api/user/change-password", protect(http.HandlerFunc(userHandler.ChangePassword)))
	s.Router.Handle("POST /api/user/preferences", protect(http.HandlerFunc(userHandler.UpdatePreferences)))

	// Admin User Management
	s.Router.Handle("GET /api/users", protect(http.HandlerFunc(userHandler.GetUsers)))
	s.Router.Handle("POST /api/users", protect(http.HandlerFunc(userHandler.CreateUser)))
	s.Router.Handle("PUT /api/users", protect(http.HandlerFunc(userHandler.UpdateUser)))
	s.Router.Handle("DELETE /api/users", protect(http.HandlerFunc(userHandler.DeleteUser)))

	// Setup Page (Secured)
	s.Router.HandleFunc("/setup", func(w http.ResponseWriter, r *http.Request) {
		// Security Check: If users exist, redirect to login
		var exists bool
		err := s.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users)").Scan(&exists)
		if err != nil {
			log.Printf("Error checking system state: %v", err)
			http.Error(w, "Internal System Error", http.StatusInternalServerError)
			return
		}

		if exists {
			// Smart Redirect: If already logged in, go to dashboard
			cookie, err := r.Cookie("session_token")
			if err == nil && cookie.Value != "" {
				if _, err := base64.StdEncoding.DecodeString(cookie.Value); err == nil {
					http.Redirect(w, r, "/", http.StatusSeeOther)
					return
				}
			}

			// CRITICAL: Prevent access to HTML
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		s.serveFile(w, r, "setup.html")
	})

	// Setup API
	setupHandler := api.NewSetupHandler(s.DB)
	s.Router.Handle("POST /api/setup", http.HandlerFunc(setupHandler.SetupSystem))

	// System API
	systemHandler := api.NewSystemHandler(s.DB)
	s.Router.Handle("GET /api/system/backup", protect(http.HandlerFunc(systemHandler.DownloadBackup)))
	s.Router.Handle("POST /api/system/restore", protect(http.HandlerFunc(systemHandler.RestoreBackup)))
	s.Router.Handle("POST /api/system/reset", protect(http.HandlerFunc(systemHandler.FactoryReset)))

	// Update API
	updateHandler := api.NewUpdateHandler(s.DB)
	s.Router.Handle("GET /api/system/update/check", protect(http.HandlerFunc(updateHandler.CheckUpdate)))
	s.Router.Handle("POST /api/system/update/perform", protect(http.HandlerFunc(updateHandler.PerformUpdate)))

	// WebSocket Endpoint
	s.Router.HandleFunc("/ws", s.WSHub.HandleWebSocket)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.Router.ServeHTTP(w, r)
}

func (s *Server) serveFile(w http.ResponseWriter, r *http.Request, filename string) {
	// Serve static HTML files from embed
	f, err := s.assets.Open(filename)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	defer f.Close()

	stat, _ := f.Stat()
	http.ServeContent(w, r, filename, stat.ModTime(), f.(io.ReadSeeker))
}

// Need to inject http.Request into serveFile or pass it?
// Go's http.ServeContent needs ReadSeeker which embed.file implements.
// Oops, serveFile signature above is missing *http.Request.
// Fixed below in re-implementation.

func (s *Server) serveIndex(w http.ResponseWriter, r *http.Request) {
	username := middleware.GetUserFromContext(r)
	var projectName string = "Kashboard"
	var dbTheme string = ""

	if username != "" {
		// Fetch Project Name AND Theme
		err := s.DB.QueryRow("SELECT project_name, COALESCE(theme, '') FROM users WHERE username = ?", username).Scan(&projectName, &dbTheme)
		if err != nil && err != sql.ErrNoRows {
			log.Printf("Error fetching user data for %s: %v", username, err)
		}
	}

	var themeClass string = ""
	// 1. Priority: Cookie (Most recent client state)
	cookie, err := r.Cookie("kashboard_theme")
	if err == nil {
		if cookie.Value == "dark" {
			themeClass = "dark-mode"
		} else if cookie.Value == "light" {
			themeClass = ""
		}
	} else {
		// 2. Fallback: Database (Saved preference)
		if dbTheme == "dark" {
			themeClass = "dark-mode"
		} else if dbTheme == "light" {
			themeClass = "" // Explicit light
		} else {
			// 3. System Default (e.g. if db is empty or 'system')
			// We can default to dark-mode if we want a dark-first app
			themeClass = "dark-mode"
		}
	}

	tmpl, err := template.ParseFS(s.assets, "index.html")
	if err != nil {
		log.Printf("Error loading template: %v", err)
		http.Error(w, "Error loading template", http.StatusInternalServerError)
		return
	}

	data := struct {
		ProjectName string
		ThemeClass  string
	}{
		ProjectName: projectName,
		ThemeClass:  themeClass,
	}

	if err := tmpl.Execute(w, data); err != nil {
		log.Printf("Error executing template: %v", err)
	}
}
