package api

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"sync"
	"syscall"
	"testing"
	"time"
)

// The helper is this test binary run again as a server: generation 1 serves for a moment and then replaces itself
// exactly as an update does (restartSelf), becoming generation 2.
const (
	helperEnv     = "LB_RESTART_HELPER"
	helperGenEnv  = "LB_RESTART_GEN"
	helperPortEnv = "LB_RESTART_PORT"
	// helperBareEnv makes the helper restart the way it did before: no handoff, the port closes for a moment.
	helperBareEnv = "LB_RESTART_BARE"
)

func restartHelper() {
	port := os.Getenv(helperPortEnv)
	gen := os.Getenv(helperGenEnv)
	ln := ListenerFromParent(port)
	if ln == nil {
		var err error
		if ln, err = net.Listen("tcp", "127.0.0.1:"+port); err != nil {
			fmt.Fprintln(os.Stderr, "helper:", err)
			os.Exit(2)
		}
	}
	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		io.WriteString(w, gen)
	})}
	if os.Getenv(helperBareEnv) == "" {
		serveOn, prepare := Handoff(server, ln, nil)
		go server.Serve(serveOn)
		SetRestartHandoff(prepare)
	} else {
		go server.Serve(ln)
	}
	if gen == "1" {
		time.Sleep(700 * time.Millisecond)
		os.Setenv(helperGenEnv, "2")
		exe, err := os.Executable()
		if err != nil {
			os.Exit(2)
		}
		(&UpdateHandler{}).restartSelf(exe)
	}
	select {} // generation 2 serves until the test stops it
}

func freePort(t *testing.T) string {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	return strconv.Itoa(ln.Addr().(*net.TCPAddr).Port)
}

// restartUnderLoad starts the helper, opens new connections without pause while it replaces itself, and tells how
// many were refused or cut, and which generations answered.
func restartUnderLoad(t *testing.T, bare bool) (failed []string, gens map[string]int) {
	t.Helper()
	port := freePort(t)
	cmd := exec.Command(os.Args[0], "-test.run=^TestARestartAfterAnUpdateNeverRefusesAConnection$", "-test.count=1")
	cmd.Env = append(os.Environ(), helperEnv+"=1", helperGenEnv+"=1", helperPortEnv+"="+port)
	if bare {
		cmd.Env = append(cmd.Env, helperBareEnv+"=1")
	}
	var logs bytes.Buffer
	cmd.Stdout, cmd.Stderr = &logs, &logs
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { cmd.Process.Kill(); cmd.Wait() })

	url := "http://127.0.0.1:" + port + "/"
	client := &http.Client{Timeout: 5 * time.Second, Transport: &http.Transport{DisableKeepAlives: true}}
	for deadline := time.Now().Add(5 * time.Second); ; time.Sleep(20 * time.Millisecond) {
		if res, err := client.Get(url); err == nil {
			res.Body.Close()
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("the helper never answered: %s", logs.String())
		}
	}

	var mu sync.Mutex
	gens = map[string]int{}
	var wg sync.WaitGroup
	stop := time.Now().Add(2500 * time.Millisecond)
	for w := 0; w < 4; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for time.Now().Before(stop) {
				res, err := client.Get(url)
				mu.Lock()
				if err != nil {
					failed = append(failed, time.Now().Format("15:04:05.000")+" "+err.Error())
				} else {
					body, _ := io.ReadAll(res.Body)
					res.Body.Close()
					gens[string(body)]++
				}
				mu.Unlock()
				time.Sleep(2 * time.Millisecond)
			}
		}()
	}
	wg.Wait()
	if gens["2"] == 0 {
		t.Fatalf("the helper never came back as the new generation (%v): %s", gens, logs.String())
	}
	return failed, gens
}

// After an update the server replaces itself. A proxy in front must see nothing fail meanwhile: every connection
// opened while it happens is answered, by the old process or by the new one, and none is refused or cut. A
// refused one is what made proxies stop sending to a server that was already healthy, for half a minute.
func TestARestartAfterAnUpdateNeverRefusesAConnection(t *testing.T) {
	if os.Getenv(helperEnv) != "" {
		restartHelper()
		return
	}
	if testing.Short() {
		t.Skip("starts a server process")
	}
	failed, gens := restartUnderLoad(t, false)
	if len(failed) != 0 {
		t.Errorf("%d connection(s) failed during the restart (answered: %v): %v", len(failed), gens, failed)
	}
	if gens["1"] == 0 {
		t.Errorf("nothing was answered before the restart: the load did not cover it (%v)", gens)
	}
}

// A process started after a replacement does not take a socket that is not one, nor one on another port.
//
// Every number handed over here is a raw descriptor that belongs to nobody else, as it does in a process that
// inherited it: ListenerFromParent closes it. One still held by an *os.File would be closed a second time by that
// file's finalizer, by then perhaps another test's database.
func TestOnlyAUsableSocketIsTakenFromTheProcessReplaced(t *testing.T) {
	for _, value := range []string{"", "x", "1"} {
		os.Setenv(ListenFDEnv, value)
		if ln := ListenerFromParent("8080"); ln != nil {
			ln.Close()
			t.Errorf("%q was taken as a socket", value)
		}
		if _, set := os.LookupEnv(ListenFDEnv); set {
			t.Errorf("the variable was left for the next process after %q", value)
		}
	}

	notASocket, err := syscall.Open(os.DevNull, syscall.O_RDONLY|syscall.O_CLOEXEC, 0)
	if err != nil {
		t.Fatal(err)
	}
	os.Setenv(ListenFDEnv, strconv.Itoa(notASocket))
	if ln := ListenerFromParent("8080"); ln != nil {
		ln.Close()
		t.Error("a file that is not a socket was taken")
	}

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	port := strconv.Itoa(ln.Addr().(*net.TCPAddr).Port)
	handOver := func() {
		raw, err := ln.(*net.TCPListener).SyscallConn()
		if err != nil {
			t.Fatal(err)
		}
		var fd int
		var dupErr error
		if err := raw.Control(func(s uintptr) { fd, dupErr = syscall.Dup(int(s)) }); err != nil || dupErr != nil {
			t.Fatal(err, dupErr)
		}
		syscall.CloseOnExec(fd)
		os.Setenv(ListenFDEnv, strconv.Itoa(fd))
	}

	handOver()
	if other := ListenerFromParent("1"); other != nil {
		other.Close()
		t.Error("a socket on another port was taken")
	}
	handOver()
	got := ListenerFromParent(port)
	if got == nil {
		t.Fatal("the socket on the right port was not taken")
	}
	got.Close()
}

// helperExecFailsEnv makes the helper try to replace itself with a binary that is not there.
const helperExecFailsEnv = "LB_RESTART_EXEC_FAILS"

// If the new binary cannot be started, the process ends with an error, so that systemd starts it again even under
// Restart=on-failure: ending with 0 read as "stopped on purpose" and the server stayed down.
func TestAFailedReplacementEndsWithAnError(t *testing.T) {
	if os.Getenv(helperExecFailsEnv) != "" {
		(&UpdateHandler{}).restartSelf(filepath.Join(t.TempDir(), "not-there"))
		return
	}
	cmd := exec.Command(os.Args[0], "-test.run=^TestAFailedReplacementEndsWithAnError$", "-test.count=1")
	cmd.Env = append(os.Environ(), helperExecFailsEnv+"=1")
	out, err := cmd.CombinedOutput()
	var exit *exec.ExitError
	if !errors.As(err, &exit) || exit.ExitCode() != 1 {
		t.Fatalf("got %v, want exit status 1: %s", err, out)
	}
}
