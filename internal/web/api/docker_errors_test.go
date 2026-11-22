package api

import (
	"net"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// The causes are read from real failures, not from made-up errors: what the
// operating system says is the thing being relied on.
func TestConnectionKeyNamesWhyASocketCannotBeReached(t *testing.T) {
	dir := t.TempDir()

	missing := filepath.Join(dir, "none.sock")
	if _, err := net.Dial("unix", missing); connectionKey(err) != keyMissing {
		t.Errorf("a socket that is not there: %q (%v)", connectionKey(err), err)
	}

	// A file that is not listening: the path exists, nothing answers.
	dead := filepath.Join(dir, "dead.sock")
	l, err := net.Listen("unix", dead)
	if err != nil {
		t.Fatal(err)
	}
	l.(*net.UnixListener).SetUnlinkOnClose(false)
	l.Close()
	if _, err := net.Dial("unix", dead); connectionKey(err) != keyRefused {
		t.Errorf("a socket nobody listens on: %q (%v)", connectionKey(err), err)
	}

	// One the process may not open.
	if os.Geteuid() != 0 {
		locked := filepath.Join(dir, "locked.sock")
		l2, err := net.Listen("unix", locked)
		if err != nil {
			t.Fatal(err)
		}
		defer l2.Close()
		os.Chmod(locked, 0)
		if _, err := net.Dial("unix", locked); connectionKey(err) != keyDenied {
			t.Errorf("a socket that may not be opened: %q (%v)", connectionKey(err), err)
		}
	}
}

func TestConnectionKeyForANetworkHost(t *testing.T) {
	// Nothing listens on this port any more.
	l, _ := net.Listen("tcp", "127.0.0.1:0")
	addr := l.Addr().String()
	l.Close()
	client := &http.Client{Timeout: 2 * time.Second}
	_, err := client.Get("http://" + addr)
	if connectionKey(err) != keyRefused {
		t.Errorf("a closed port: %q (%v)", connectionKey(err), err)
	}

	// A host that accepts and never answers.
	l2, _ := net.Listen("tcp", "127.0.0.1:0")
	defer l2.Close()
	slow := &http.Client{Timeout: 150 * time.Millisecond}
	_, err = slow.Get("http://" + l2.Addr().String())
	if connectionKey(err) != keyTimeout {
		t.Errorf("a host that does not answer: %q (%v)", connectionKey(err), err)
	}

	if connectionKey(nil) != keyConnection {
		t.Error("no error must stay the general key")
	}
}
