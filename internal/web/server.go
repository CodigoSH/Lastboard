package web

import (
	"database/sql"
	"net/http"

	"github.com/kiwinho/CSH-Dashboard/internal/web/api"
	"github.com/kiwinho/CSH-Dashboard/internal/web/middleware"
)

type Server struct {
	DB     *sql.DB
	Router *http.ServeMux
}

func NewServer(db *sql.DB) *Server {
	s := &Server{
		DB:     db,
		Router: http.NewServeMux(),
	}

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
	s.Router.Handle("/", protect(fs))

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
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.Router.ServeHTTP(w, r)
}
