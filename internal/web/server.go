package web

import (
	"crypto/rand"
	"database/sql"
	"embed"
	"encoding/hex"
	"html/template"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/CodigoSH/Lastboard/internal/web/api"
	"github.com/CodigoSH/Lastboard/internal/web/middleware"
	"github.com/CodigoSH/Lastboard/internal/web/util"
)

//go:embed dist/*
var content embed.FS

type Server struct {
	DB            *sql.DB
	Router        *http.ServeMux
	WSHub         *api.Hub
	assets        fs.FS
	sessionSecret []byte
}

func NewServer(db *sql.DB) *Server {
	// Initialize Session Secret
	secret := initSessionSecret(db)

	// Root the assets to the 'dist' folder
	assets, err := fs.Sub(content, "dist")
	if err != nil {
		// Fallback for local dev or build failure (won't happen if strict embed but good safety)
		log.Printf("Warning: Embed 'dist' failed: %v. Using local file system.", err)
		assets = osDir("./web/dist")
	}

	s := &Server{
		DB:            db,
		Router:        http.NewServeMux(),
		WSHub:         api.NewHub(),
		assets:        assets,
		sessionSecret: secret,
	}

	// Start WebSocket Hub
	go s.WSHub.Run()
	// Start broadcasting stats every 1 second
	go s.WSHub.StartBroadcasting(1 * time.Second)

	// Start Background Update Check (Gold Standard)
	updateHandler := api.NewUpdateHandler(db)
	go updateHandler.CheckForUpdatesBackground(s.WSHub)

	s.routes()
	return s
}

func initSessionSecret(db *sql.DB) []byte {
	var secretHex string
	err := db.QueryRow("SELECT value FROM system_settings WHERE key = 'session_secret'").Scan(&secretHex)
	if err == sql.ErrNoRows {
		// Generate new secret
		bytes := make([]byte, 32)
		if _, err := rand.Read(bytes); err != nil {
			log.Fatalf("Failed to generate session secret: %v", err)
		}
		secretHex = hex.EncodeToString(bytes)
		_, err := db.Exec("INSERT INTO system_settings (key, value) VALUES ('session_secret', ?)", secretHex)
		if err != nil {
			log.Printf("Warning: Failed to persist session secret: %v", err)
		}
	} else if err != nil {
		log.Fatalf("Failed to load session secret: %v", err)
	}

	secret, err := hex.DecodeString(secretHex)
	if err != nil {
		log.Fatalf("Invalid session secret in DB: %v", err)
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
		// Check if setup is needed (Clean Install)
		var exists bool
		if err := s.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users)").Scan(&exists); err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
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
		s.serveFile(w, r, "login.html")
	})

	// Auth API
	authHandler := api.NewAuthHandler(s.DB, s.sessionSecret)
	s.Router.Handle("POST /api/login", middleware.RateLimit(http.HandlerFunc(authHandler.Login)))
	s.Router.Handle("POST /logout", protect(http.HandlerFunc(authHandler.Logout)))

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
				if _, err := util.VerifyToken(cookie.Value, s.sessionSecret); err == nil {
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
	s.Router.Handle("/ws", protect(http.HandlerFunc(s.WSHub.HandleWebSocket)))
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("X-Frame-Options", "SAMEORIGIN")
	w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
	s.Router.ServeHTTP(w, r)
}

func (s *Server) serveFile(w http.ResponseWriter, r *http.Request, filename string) {
	f, err := s.assets.Open(filename)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	defer f.Close()

	stat, err := f.Stat()
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	rs, ok := f.(io.ReadSeeker)
	if !ok {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	http.ServeContent(w, r, filename, stat.ModTime(), rs)
}

func (s *Server) serveIndex(w http.ResponseWriter, r *http.Request) {
	username := middleware.GetUserFromContext(r)
	var projectName string = "Lastboard"
	var dbTheme string = ""

	if username != "" {
		// Fetch Project Name AND Theme
		err := s.DB.QueryRow("SELECT project_name, COALESCE(theme, '') FROM users WHERE username = ?", username).Scan(&projectName, &dbTheme)
		if err != nil && err != sql.ErrNoRows {
			log.Printf("Error fetching user data for %s: %v", username, err)
		}
	}

	var themeClass string = ""
	// Use the per-user database value directly.  A shared cookie would leak
	// the previous user's preference to the next user on the same browser;
	// the DB row is already scoped to the authenticated session.
	// "system" or empty → dark-mode default; the client-side ThemeService
	// corrects this to the real OS preference after the page loads.
	if dbTheme == "dark" {
		themeClass = "dark-mode"
	} else if dbTheme == "light" {
		themeClass = ""
	} else {
		themeClass = "dark-mode"
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
