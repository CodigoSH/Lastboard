//go:build !linux

package main

import (
	"log/slog"
	"os"
)

// dropPrivileges is a no-op on non-Linux platforms; the PUID/PGID privilege
// drop relies on Linux setuid/setgid semantics. Lastboard runs on Linux in
// production (Docker / bare-metal), so this only affects local dev on other OSes.
func dropPrivileges(_ string) error {
	if os.Getenv("PUID") != "" || os.Getenv("PGID") != "" {
		slog.Warn("PUID/PGID are only supported on Linux; ignoring")
	}
	return nil
}
