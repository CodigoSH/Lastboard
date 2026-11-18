package api

import (
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

/* ---------------------------------------------------------------------------
 * Replacing the running server without closing its port
 *
 * After an update the process replaces itself with the new binary (exec). It
 * used to close everything on the way: for a fraction of a second nothing
 * listened on the port, so whatever arrived was refused, and the connections
 * that were open (the pages' WebSockets, a request in flight) were cut. A
 * reverse proxy in front reads that as a server that failed, and some then
 * stopped sending to it for half a minute while it was already healthy: "no
 * available server" after every update.
 *
 * Now the listening socket survives the exec. Before it, the server stops
 * accepting, answers what is in flight and closes the WebSockets cleanly, while
 * a duplicate of the socket stays open: whatever arrives meanwhile waits in the
 * kernel's queue. The duplicate is handed to the new process by its number, in
 * LASTBOARD_LISTEN_FD, and it serves the queue as soon as it starts. Nobody is
 * refused and nothing is cut short.
 * ------------------------------------------------------------------------ */

// ListenFDEnv names the variable a replaced process finds its listening socket under.
const ListenFDEnv = "LASTBOARD_LISTEN_FD"

var (
	handoffMu sync.Mutex
	// handoff readies the running server to be replaced and returns a duplicate of its listening socket. Set by
	// whoever owns the server (cmd/lastboard); nil until then.
	handoff func() (*os.File, error)
)

// handoffDrain is how long the requests in flight are given to finish: the new binary is waiting.
const handoffDrain = 3 * time.Second

// Handoff is how a server serving on ln is handed over. The server is to serve on the listener returned, which
// counts the connections it accepts; prepare, called by the updater, keeps a duplicate of the socket so the port
// never closes, stops accepting, closes what does not end by itself (closeSockets: the WebSockets, which the server
// does not track) and waits, briefly, for every connection accepted to be answered and closed.
//
// It does not use server.Shutdown: that closes, without a word, a connection accepted a moment before whose
// request it had not read yet, and the client sees the connection end with no answer (measured: one in a few
// thousand under load, in one restart of three). Turning keep-alive off instead answers each one and then closes it.
//
// Serve returns net.ErrClosed once prepare has run.
func Handoff(server *http.Server, ln net.Listener, closeSockets func()) (serveOn net.Listener, prepare func() (*os.File, error)) {
	counted := &countingListener{Listener: ln}
	return counted, func() (*os.File, error) {
		tcp, ok := ln.(*net.TCPListener)
		if !ok {
			return nil, fmt.Errorf("the listener is not a TCP one")
		}
		socket, err := tcp.File()
		if err != nil {
			return nil, err
		}
		_ = counted.Close() // the duplicate keeps the socket open: what arrives now waits for the new process
		server.SetKeepAlivesEnabled(false)
		if closeSockets != nil {
			closeSockets()
		}
		if !counted.waitClosed(handoffDrain) {
			slog.Warn("restart: some requests were still running and are cut")
		}
		return socket, nil
	}
}

// countingListener counts the connections it accepted that are still open.
type countingListener struct {
	net.Listener
	open atomic.Int64
}

func (l *countingListener) Accept() (net.Conn, error) {
	c, err := l.Listener.Accept()
	if err != nil {
		return nil, err
	}
	l.open.Add(1)
	return &countedConn{Conn: c, done: func() { l.open.Add(-1) }}, nil
}

// waitClosed reports whether every connection accepted was closed within d.
func (l *countingListener) waitClosed(d time.Duration) bool {
	for deadline := time.Now().Add(d); l.open.Load() > 0; time.Sleep(5 * time.Millisecond) {
		if time.Now().After(deadline) {
			return false
		}
	}
	return true
}

// countedConn tells its listener when it closes, once, however many times Close is called (the server and a
// WebSocket that took the connection over may both close it).
type countedConn struct {
	net.Conn
	once sync.Once
	done func()
}

func (c *countedConn) Close() error {
	err := c.Conn.Close()
	c.once.Do(c.done)
	return err
}

// SetRestartHandoff tells the updater how to hand over the running server: stop it accepting, let it finish what
// is in flight, and return a duplicate of its listening socket.
func SetRestartHandoff(prepare func() (*os.File, error)) {
	handoffMu.Lock()
	defer handoffMu.Unlock()
	handoff = prepare
}

// ListenerFromParent is the listening socket a replaced process handed over, or nil when there is none or it
// cannot be used (then the caller listens as it always did). The variable is cleared either way, so it never
// reaches a process started later. A socket on a port other than the one asked for is not used.
func ListenerFromParent(port string) net.Listener {
	raw := os.Getenv(ListenFDEnv)
	_ = os.Unsetenv(ListenFDEnv)
	if raw == "" {
		return nil
	}
	fd, err := strconv.Atoi(raw)
	if err != nil || fd < 3 {
		slog.Warn("restart: ignoring a listening socket that is not one", "value", raw)
		return nil
	}
	f := os.NewFile(uintptr(fd), "inherited-listener")
	if f == nil {
		return nil
	}
	ln, err := net.FileListener(f) // a duplicate of its own; the inherited number is closed below
	_ = f.Close()
	if err != nil {
		slog.Warn("restart: the inherited socket cannot be listened on", "error", err)
		return nil
	}
	if addr, ok := ln.Addr().(*net.TCPAddr); !ok || strconv.Itoa(addr.Port) != strings.TrimPrefix(port, ":") {
		slog.Warn("restart: the inherited socket is for another port; listening anew", "socket", ln.Addr().String(), "port", port)
		_ = ln.Close()
		return nil
	}
	return ln
}

// restartSelf replaces this process with the binary at exePath, handing over the listening socket when the server
// can. If the replacement fails, the process exits with an error so that whatever supervises it (systemd, with
// Restart=always or Restart=on-failure alike) starts it again: an exit status of 0 reads as "stopped on purpose"
// to a unit that restarts only on failure, and the server stayed down.
func (h *UpdateHandler) restartSelf(exePath string) {
	env := withoutEnv(os.Environ(), ListenFDEnv)

	handoffMu.Lock()
	prepare := handoff
	handoffMu.Unlock()

	var socket *os.File
	if prepare != nil {
		f, err := prepare()
		switch {
		case err != nil:
			slog.Warn("restart: the server could not hand over its socket; the port closes for a moment", "error", err)
		default:
			if err := inheritable(f); err != nil {
				slog.Warn("restart: the socket cannot be passed on; the port closes for a moment", "error", err)
				_ = f.Close()
			} else {
				socket = f
				env = append(env, fmt.Sprintf("%s=%d", ListenFDEnv, f.Fd()))
			}
		}
	}

	err := syscall.Exec(exePath, os.Args, env)
	// Only reached when the exec failed. The socket must stay open until here: closing it earlier would close the
	// port the new process was going to take.
	runtime.KeepAlive(socket)
	slog.Error("Failed to restart, exiting for supervisor", "error", err)
	os.Exit(1)
}

// inheritable lets a file survive an exec: Go opens everything close-on-exec.
func inheritable(f *os.File) error {
	_, _, errno := syscall.Syscall(syscall.SYS_FCNTL, f.Fd(), syscall.F_SETFD, 0)
	if errno != 0 {
		return errno
	}
	return nil
}

// withoutEnv is env without the variable named.
func withoutEnv(env []string, name string) []string {
	out := make([]string, 0, len(env))
	for _, kv := range env {
		if !strings.HasPrefix(kv, name+"=") {
			out = append(out, kv)
		}
	}
	return out
}
