package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/CodigoSH/Lastboard/internal/platform/database"
	"github.com/CodigoSH/Lastboard/internal/version"
	"github.com/CodigoSH/Lastboard/internal/web"
)

func main() {
	// Initialize structured logging first
	if os.Getenv("LOG_FORMAT") == "json" {
		slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	} else {
		slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, nil)))
	}

	// Parse flags
	versionFlag := flag.Bool("version", false, "Print version and exit")
	flag.Parse()

	if *versionFlag {
		fmt.Printf("Lastboard %s\n", version.Current)
		os.Exit(0)
	}

	// 1. Resolve DB path, then drop privileges if requested (PUID/PGID).
	// Done before opening the DB so the database file is created as the target
	// user. No-op by default (PUID=0), preserving the historical root behavior.
	dbFile := os.Getenv("DB_FILE")
	if dbFile == "" {
		dbFile = "./lastboard.db"
	}
	if err := dropPrivileges(dbFile); err != nil {
		slog.Error("Failed to drop privileges", "error", err)
		os.Exit(1)
	}

	// 2. Initialize Database
	db, err := database.InitDB(dbFile)
	if err != nil {
		slog.Error("Failed to initialize database", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	slog.Info("Database initialized", "path", dbFile)

	// 2. Initialize Server (Dependency Injection)
	srv := web.NewServer(db.DB)

	// 3. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: srv,
		// ReadTimeout/WriteTimeout/IdleTimeout intentionally unset:
		// the /ws WebSocket needs a long-lived connection. ReadHeaderTimeout
		// still protects against slow-loris attacks on regular HTTP routes.
		ReadHeaderTimeout: 5 * time.Second,
	}

	slog.Info("Starting server", "addr", ":"+port)

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
	<-quit

	slog.Info("shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		slog.Error("shutdown error", "error", err)
	}
	slog.Info("server stopped")
}
