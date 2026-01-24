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
	setupMiddleware := middleware.SetupRequired(s.DB)

	// File Server for static assets
	fs := http.FileServer(http.Dir("./web"))

	// We wrap the file server with the setup middleware
	// Note: In reality, you probably want to allow static assets to serve always (like css),
	// and only protect the main dashboard routes.
	// For this task, we'll keep it simple and let the middleware decide (it whitelists /setup).
	s.Router.Handle("/", setupMiddleware(fs))

	// Dashboard API
	dashHandler := api.NewDashboardHandler()
	s.Router.Handle("/api/dashboard", setupMiddleware(http.HandlerFunc(dashHandler.GetDashboard)))

	// User API
	userHandler := api.NewUserHandler(s.DB)
	s.Router.Handle("/api/me", setupMiddleware(http.HandlerFunc(userHandler.GetMe)))
	s.Router.Handle("POST /api/user/update-profile", setupMiddleware(http.HandlerFunc(userHandler.UpdateProfile)))
	s.Router.Handle("POST /api/user/change-password", setupMiddleware(http.HandlerFunc(userHandler.ChangePassword)))
	s.Router.Handle("POST /api/user/preferences", setupMiddleware(http.HandlerFunc(userHandler.UpdatePreferences)))

	// Setup Page
	s.Router.HandleFunc("/setup", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./web/setup.html")
	})
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.Router.ServeHTTP(w, r)
}
