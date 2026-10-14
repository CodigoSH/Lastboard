package password

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"testing"
)

// Every argon2 derivation holds 64 MiB while it runs. Nothing used to bound how
// many ran at once, and signing in is open to anyone who can reach the server: a
// few dozen simultaneous attempts, measured, took the process from 83 MiB to
// 1.3 GiB — past the 512 MiB the service unit allows, so the service was killed.
// Waiting a moment for a slot costs a login a fraction of a second; not waiting
// costs the server.
func TestDerivationsRunAtMostAFewAtATime(t *testing.T) {
	peak.Store(0)

	var wg sync.WaitGroup
	for i := 0; i < 24; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			Waste("anything")
		}()
	}
	wg.Wait()

	got := int(peak.Load())
	if got > MaxConcurrent {
		t.Fatalf("%d derivations ran at once, the limit is %d", got, MaxConcurrent)
	}
	// The control: the work did overlap, so a limit of one would also pass the
	// check above. Without this a broken counter reads as a working limit.
	if got < 2 {
		t.Fatalf("peak of %d: the derivations never overlapped, so this test proves nothing", got)
	}
}

// The limit only holds if there is one way in. A direct call to argon2.IDKey
// anywhere in the product walks around it. This reads every production file;
// it must find the one allowed call, or it is reading the wrong tree.
func TestArgon2IsOnlyEverCalledThroughTheLimit(t *testing.T) {
	root := filepath.Join("..", "..", "..")
	call := regexp.MustCompile(`argon2\.IDKey\(`)
	direct := 0
	var stray []string
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") ||
			strings.Contains(path, "node_modules") {
			return nil
		}
		raw, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		for _, line := range strings.Split(string(raw), "\n") {
			code := line
			if i := strings.Index(code, "//"); i >= 0 {
				code = code[:i] // a comment explaining the rule is not a call
			}
			if call.MatchString(code) {
				if strings.HasSuffix(path, filepath.Join("password", "password.go")) {
					direct++
				} else {
					stray = append(stray, path)
				}
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if direct != 1 {
		t.Fatalf("found %d direct calls in password.go, want exactly 1: this is reading the wrong tree or the limit has a second door", direct)
	}
	if len(stray) > 0 {
		t.Fatalf("argon2.IDKey is called outside the limit in: %v", stray)
	}
}
