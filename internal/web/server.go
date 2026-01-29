package web

import (
	"database/sql"
	"log"
	"net/http"
	"text/template"
	"time"

	"github.com/codigosh/Kashboard/internal/web/api"
	"github.com/codigosh/Kashboard/internal/web/middleware"
)

type Server struct {
	DB     *sql.DB
	Router *http.ServeMux
	WSHub  *api.Hub
}

func NewServer(db *sql.DB) *Server {
	s := &Server{
		DB:     db,
		Router: http.NewServeMux(),
		WSHub:  api.NewHub(),
	}

	// Start WebSocket Hub
	go s.WSHub.Run()
	// Start broadcasting stats every 1 second
	go s.WSHub.StartBroadcasting(1 * time.Second)

	s.routes()
	return s
}

func (s *Server) routes() {
	// Middleware wrapping
	// 1. First check if system needs setup
	setupCheck := middleware.SetupRequired(s.DB)
	// 2. Then check if user is authenticated
	authCheck := middleware.AuthRequired(s.DB)

	// Chain: setupCheck -> authCheck -> handler
	// If setup needed, setupCheck takes over.
	// If setup done, authCheck verifies login.
	protect := func(h http.Handler) http.Handler {
		return setupCheck(authCheck(h))
	}

	// File Server for static assets
	fs := http.FileServer(http.Dir("./web"))

	// Dynamic Index Handler
	indexHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" || r.URL.Path == "/index.html" {
			s.serveIndex(w, r)
		} else {
			fs.ServeHTTP(w, r)
		}
	})

	s.Router.Handle("/", protect(indexHandler))

	// Login Page (Public)
	s.Router.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./web/login.html")
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

	// Setup Page
	s.Router.HandleFunc("/setup", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./web/setup.html")
	})

	// Setup API (Open, but self-protecting via count check)
	setupHandler := api.NewSetupHandler(s.DB)
	s.Router.Handle("POST /api/setup", http.HandlerFunc(setupHandler.SetupSystem))

	// System API (Backup & Reset)
	systemHandler := api.NewSystemHandler(s.DB)
	s.Router.Handle("GET /api/system/backup", protect(http.HandlerFunc(systemHandler.DownloadBackup)))
	s.Router.Handle("POST /api/system/restore", protect(http.HandlerFunc(systemHandler.RestoreBackup)))
	s.Router.Handle("POST /api/system/reset", protect(http.HandlerFunc(systemHandler.FactoryReset)))

	// Update API (Atomic Binary Updates)
	updateHandler := api.NewUpdateHandler()
	s.Router.Handle("GET /api/system/update/check", protect(http.HandlerFunc(updateHandler.CheckUpdate)))
	s.Router.Handle("POST /api/system/update/perform", protect(http.HandlerFunc(updateHandler.PerformUpdate)))

	// WebSocket Endpoint
	s.Router.HandleFunc("/ws", s.WSHub.HandleWebSocket)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.Router.ServeHTTP(w, r)
}

func (s *Server) serveIndex(w http.ResponseWriter, r *http.Request) {
	username := middleware.GetUserFromContext(r)
	var projectName string

	// Default
	projectName = "CSH Dashboard"

	if username != "" {
		// Query users table for project_name
		// Note: project_name column must exist (we ensured this via migration)
		err := s.DB.QueryRow("SELECT project_name FROM users WHERE username = ?", username).Scan(&projectName)
		if err != nil {
			// If error (e.g. no column or no user found), stick to default
			// In production, we might log only critical DB errors
			if err != sql.ErrNoRows {
				log.Printf("Error fetching project name for %s: %v", username, err)
			}
		}
	}

	// Parse template
	// In production, templates should be parsed once at startup for performance,
	// but for this task/scale, parsing per request allows hot-reload of HTML.
	tmpl, err := template.ParseFiles("./web/index.html")
	if err != nil {
		log.Printf("Error loading template: %v", err)
		http.Error(w, "Error loading template", http.StatusInternalServerError)
		return
	}

	data := struct {
		ProjectName string
	}{
		ProjectName: projectName,
	}

	if err := tmpl.Execute(w, data); err != nil {
		log.Printf("Error executing template: %v", err)
	}
}
