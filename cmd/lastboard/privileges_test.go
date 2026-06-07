//go:build linux

package main

import (
	"os"
	"testing"
)

func TestIntFromEnv(t *testing.T) {
	const key = "TEST_LASTBOARD_PUID"
	os.Unsetenv(key)

	if n, err := intFromEnv(key, 0); err != nil || n != 0 {
		t.Fatalf("unset: got %d, %v; want 0, nil", n, err)
	}

	os.Setenv(key, "1000")
	if n, err := intFromEnv(key, 0); err != nil || n != 1000 {
		t.Fatalf("valid: got %d, %v; want 1000, nil", n, err)
	}

	os.Setenv(key, "abc")
	if _, err := intFromEnv(key, 0); err == nil {
		t.Fatal("invalid value: expected error, got nil")
	}

	os.Setenv(key, "-5")
	if _, err := intFromEnv(key, 0); err == nil {
		t.Fatal("negative value: expected error, got nil")
	}

	os.Unsetenv(key)
}

// TestDropPrivileges_DefaultIsNoop verifies the historical default (target root)
// returns immediately without touching the filesystem or syscalls. We never test
// the PUID!=0 path here: it would call setuid and irreversibly drop the test
// process's privileges if the suite runs as root.
func TestDropPrivileges_DefaultIsNoop(t *testing.T) {
	os.Unsetenv("PUID")
	os.Unsetenv("PGID")
	if err := dropPrivileges("/nonexistent/lastboard.db"); err != nil {
		t.Fatalf("default (root target) must be a no-op, got %v", err)
	}
}
