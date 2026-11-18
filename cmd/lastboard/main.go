package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net"
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
	flag.Usage = usage
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

	// A command on the machine itself, in place of starting the server.
	if args := flag.Args(); len(args) > 0 {
		os.Exit(runCommand(db, args))
	}

	// What an earlier version kept for the whole server — the alert channel and
	// the Proxmox connections — belongs to the first administrator now.
	if err := api.MigrateUserSettings(db.DB); err != nil {
		slog.Error("Moving settings to the first administrator failed", "error", err)
	}
	// Each account's single alert channel becomes the first entry of its list of channels.
	if err := api.MigrateNotifyChannels(db.DB); err != nil {
		slog.Error("Writing the alert channels to each account's list failed", "error", err)
	}

	// Credentials an earlier version left inside widgets move to the secret store
	// before the first request can carry them to a browser.
	if _, err := api.MigrateWidgetSecrets(db.DB); err != nil {
		slog.Error("Moving widget credentials failed", "error", err)
	}

	// Docker hosts move from each widget to the account that owns it, after the
	// credentials above have reached the secret store they are read from.
	if n, err := api.MigrateDockerHosts(db.DB); err != nil {
		slog.Error("Moving Docker hosts to their accounts failed", "error", err)
	} else if n > 0 {
		slog.Info("Docker hosts moved to their accounts", "widgets", n)
	}

	// Members that existed before permissions keep what they could do: they are
	// given it once, and every later choice the administrator makes is kept.
	if n, err := api.GiveMembersTheirAccess(db.DB); err != nil {
		slog.Error("Giving members their permissions failed", "error", err)
	} else if n > 0 {
		slog.Info("Members given the permissions they had", "count", n)
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

	// After an update the port comes already open from the process this one replaced, with whatever arrived in
	// between waiting in its queue (see internal/web/api/restart.go). Otherwise it is opened here.
	ln := api.ListenerFromParent(port)
	inherited := ln != nil
	if ln == nil {
		var err error
		if ln, err = net.Listen("tcp", ":"+port); err != nil {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}
	slog.Info("Starting server", "addr", ":"+port, "inherited", inherited)

	// What an update does before replacing this process: keep a duplicate of the socket so the port never closes,
	// stop accepting, close the WebSockets cleanly, and answer the requests in flight — briefly, since the new
	// binary is waiting. Serve ends with net.ErrClosed when that happens: the process is about to be replaced.
	serveOn, handoff := api.Handoff(server, ln, srv.WSHub.CloseAll)
	go func() {
		if err := server.Serve(serveOn); err != nil && !errors.Is(err, http.ErrServerClosed) && !errors.Is(err, net.ErrClosed) {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()
	api.SetRestartHandoff(handoff)

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

func usage() {
	fmt.Fprintf(flag.CommandLine.Output(), `Usage:
  lastboard                         start the server
  lastboard -version                print the version and exit
  lastboard 2fa reset <username>    take the second step of signing in off an account
  lastboard password reset <username>
                                    set a new password for an account (asked for on the terminal)

The commands use the same database as the server (DB_FILE), and run as the same
user (PUID/PGID), so run them where the server runs: inside its container, or as
the service's user.
`)
}

// runCommand runs a command given on the command line and returns the exit code.
func runCommand(db *database.DB, args []string) int {
	switch {
	case len(args) == 3 && args[0] == "2fa" && args[1] == "reset":
		// The way back for an account whose phone and recovery codes are both
		// gone — above all the administrator's, which nobody else can reset.
		if err := api.ResetTwoFactor(context.Background(), db.DB, args[2]); err != nil {
			fmt.Fprintf(os.Stderr, "lastboard: %v\n", err)
			return 1
		}
		fmt.Printf("Two-step sign-in is off for %s. They sign in with their password and can turn it on again in My Profile.\n", args[2])
		return 0
	case len(args) == 3 && args[0] == "password" && args[1] == "reset":
		// The way back for a forgotten password, the administrator's above all.
		return resetPassword(context.Background(), db, args[2], console{fd: int(os.Stdin.Fd())}, os.Stdout, os.Stderr)
	}
	usage()
	return 2
}
