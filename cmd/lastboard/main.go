package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/config"
	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/version"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
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

	// Say so before anything uses them. Each of these falls back to a default
	// when it cannot be understood, so without this a typo looks like a setting
	// that took effect.
	for _, problem := range config.CheckEnvironment() {
		slog.Warn("configuration ignored", "setting", problem.String())
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

	// What an earlier version kept for the whole server — the alert channel and
	// the Proxmox connections — belongs to the first administrator now.
	if err := api.MigrateUserSettings(db.DB); err != nil {
		slog.Error("Moving settings to the first administrator failed", "error", err)
	}

	// Credentials an earlier version left inside widgets move to the secret store
	// before the first request can carry them to a browser.
	if _, err := api.MigrateWidgetSecrets(db.DB); err != nil {
		slog.Error("Moving widget credentials failed", "error", err)
	}

	// Cancelled on SIGTERM/SIGINT. Everything that runs in the background takes
	// it, so a restart tells them to stop rather than being cut off mid-write.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()

	// 2. Initialize Server (Dependency Injection)
	srv := web.NewServer(db.DB)

	var background sync.WaitGroup
	srv.StartBackground(ctx, &background)

	// 3. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr: ":" + port,
		// Recover is outermost so it also covers the middleware below it.
		Handler: middleware.Recover(middleware.LimitBody(srv)),
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

	// Boards built before icons were stored locally still point at the CDN
	// they were made with. Bring those home, off the critical path: it is
	// network-bound work and nobody should wait on a third party to reach
	// their own dashboard.
	background.Add(1)
	go func() {
		defer background.Done()
		api.RunIconMigration(ctx, db.DB)
	}()

	<-ctx.Done()
	stop() // a second signal from here on gets the default behaviour: die now

	slog.Info("shutting down server...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown error", "error", err)
	}

	// The background tasks were told to stop when the signal arrived; wait for
	// them to actually finish, so the database is closed after the last write
	// and not during it. Bounded, because a task that will not stop must not
	// keep the process alive forever.
	stopped := make(chan struct{})
	go func() {
		background.Wait()
		close(stopped)
	}()
	select {
	case <-stopped:
	case <-time.After(10 * time.Second):
		slog.Warn("background tasks did not stop in time; exiting anyway")
	}

	slog.Info("server stopped")
}
