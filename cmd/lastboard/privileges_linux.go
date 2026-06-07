//go:build linux

package main

import (
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"syscall"
)

// dropPrivileges, when running as root with a non-zero PUID/PGID, makes the data
// directory owned by that user and then permanently drops the process to it.
//
// This lets the container run unprivileged while still fixing bind-mount
// ownership automatically — the usual pain on Proxmox/LXC, where the host
// directory may be owned by an id the app can't write to. With the default
// PUID=0/PGID=0 (or when not started as root) it is a no-op, preserving the
// historical root behavior so existing deployments keep working unchanged.
func dropPrivileges(dbFile string) error {
	puid, err := intFromEnv("PUID", 0)
	if err != nil {
		return err
	}
	pgid, err := intFromEnv("PGID", 0)
	if err != nil {
		return err
	}

	// Targeting root is the historical default: nothing to drop.
	if puid == 0 && pgid == 0 {
		return nil
	}
	// Can only drop privileges if we actually have them.
	if os.Geteuid() != 0 {
		slog.Warn("PUID/PGID set but not running as root; running as-is", "puid", puid, "pgid", pgid)
		return nil
	}

	// Make the data directory writable by the target user before we drop, so
	// SQLite can open/create the database regardless of bind-mount ownership.
	dir := filepath.Dir(dbFile)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return fmt.Errorf("create data dir %s: %w", dir, err)
	}
	// Best-effort: this chown fixes bind-mount ownership automatically, but it
	// may fail where it isn't permitted (e.g. rootless) or isn't needed (the host
	// already set ownership). Don't abort — if the directory really isn't writable
	// after dropping, database init reports it with a clear, actionable message.
	if err := chownRecursive(dir, puid, pgid); err != nil {
		slog.Warn("Could not chown data dir; relying on existing permissions", "dir", dir, "error", err)
	}

	// Order matters: supplementary groups, then gid, then uid (once we drop the
	// uid we can no longer change the others).
	if err := syscall.Setgroups([]int{pgid}); err != nil {
		return fmt.Errorf("setgroups: %w", err)
	}
	if err := syscall.Setgid(pgid); err != nil {
		return fmt.Errorf("setgid: %w", err)
	}
	if err := syscall.Setuid(puid); err != nil {
		return fmt.Errorf("setuid: %w", err)
	}

	slog.Info("Dropped privileges", "uid", puid, "gid", pgid)
	return nil
}

// intFromEnv reads a non-negative integer from an env var, returning def when unset.
func intFromEnv(key string, def int) (int, error) {
	v := os.Getenv(key)
	if v == "" {
		return def, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, fmt.Errorf("invalid %s=%q: %w", key, v, err)
	}
	if n < 0 {
		return 0, fmt.Errorf("invalid %s=%d: must be >= 0", key, n)
	}
	return n, nil
}

func chownRecursive(root string, uid, gid int) error {
	return filepath.WalkDir(root, func(path string, _ fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		return os.Chown(path, uid, gid)
	})
}
