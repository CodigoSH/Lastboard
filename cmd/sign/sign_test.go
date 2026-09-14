package main

import (
	"crypto/ed25519"
	"encoding/base64"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// TestTheInstallerCanVerifyWhatWeSign.
//
// Two implementations have to agree: this signer, in Go, and install.sh, which
// verifies with openssl on somebody else's machine. Each one's own tests would
// pass with both of them wrong in the same way, and the failure mode is the
// worst kind — every release verifies here and none of them installs.
//
// So this signs with the real code and verifies with the exact command the
// installer runs, including the DER prefix trick that lets openssl read a key
// shipped as plain base64.
func TestTheInstallerCanVerifyWhatWeSign(t *testing.T) {
	openssl, err := exec.LookPath("openssl")
	if err != nil {
		t.Skip("openssl is not on this machine; the installer needs it and this cannot check without it")
	}

	// Verifying an ed25519 signature over raw data needs `pkeyutl -rawin`,
	// which arrived in OpenSSL 3.0; 1.1.1 cannot do it from the command line at
	// all. On such a machine this can prove nothing, so it says so rather than
	// failing as though the signing code were wrong.
	version, _ := exec.Command(openssl, "version").Output()
	if !strings.HasPrefix(strings.TrimSpace(string(version)), "OpenSSL 3") {
		t.Skipf("this machine has %s; verifying ed25519 from the command line needs "+
			"OpenSSL 3.0, and install.sh refuses on anything older",
			strings.TrimSpace(string(version)))
	}

	dir := t.TempDir()
	public, private, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatal(err)
	}

	sums := filepath.Join(dir, "checksums.txt")
	if err := os.WriteFile(sums, []byte("deadbeef  lastboard-linux-amd64.tar.gz\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	// Signed by the code the release workflow runs.
	t.Setenv("RELEASE_SIGNING_KEY", base64.StdEncoding.EncodeToString(private))
	signFile(sums)

	rawSig, err := os.ReadFile(sums + ".sig")
	if err != nil {
		t.Fatal(err)
	}
	signature, err := base64.StdEncoding.DecodeString(strings.TrimSpace(string(rawSig)))
	if err != nil {
		t.Fatal(err)
	}
	sigFile := filepath.Join(dir, "signature.bin")
	if err := os.WriteFile(sigFile, signature, 0o644); err != nil {
		t.Fatal(err)
	}

	// The key in the shape install.sh builds: a fixed 12-byte DER
	// SubjectPublicKeyInfo prefix followed by the 32 raw bytes.
	prefix, err := base64.StdEncoding.DecodeString("MCowBQYDK2VwAyEA")
	if err != nil {
		t.Fatal(err)
	}
	keyDER := filepath.Join(dir, "key.der")
	if err := os.WriteFile(keyDER, append(prefix, public...), 0o644); err != nil {
		t.Fatal(err)
	}

	keyPEM := filepath.Join(dir, "key.pem")
	if out, err := exec.Command(openssl, "pkey", "-pubin", "-inform", "DER",
		"-in", keyDER, "-out", keyPEM).CombinedOutput(); err != nil {
		t.Fatalf("openssl could not read the key install.sh builds: %v\n%s", err, out)
	}

	// CombinedOutput, not Run: "exit status 1" is every reason openssl can have
	// for refusing collapsed into one, and what it actually said is the whole
	// diagnosis.
	verify := func(file string) ([]byte, error) {
		return exec.Command(openssl, "pkeyutl", "-verify", "-pubin", "-inkey", keyPEM,
			"-rawin", "-in", file, "-sigfile", sigFile).CombinedOutput()
	}

	if out, err := verify(sums); err != nil {
		t.Fatalf("the installer's command could not verify a signature this code produced: %v\n"+
			"openssl said: %s\nusing: %s\n\n"+
			"Every release would verify in our tests and none of them would install.",
			err, out, strings.TrimSpace(string(version)))
	}

	// And the other direction, or the check above proves only that openssl ran.
	tampered := filepath.Join(dir, "TAMPERED")
	if err := os.WriteFile(tampered, []byte("tampered  lastboard-linux-amd64.tar.gz\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := verify(tampered); err == nil {
		t.Error("the installer's command accepted a changed checksum file")
	}
}

// TestTheInstallerAndTheBinaryTrustTheSameKeys.
//
// There are two lists of release keys: releasePublicKeys in
// internal/web/util/signature.go, which the running binary verifies an update
// with, and RELEASE_KEYS in install.sh, which a fresh install verifies with.
// When they diverge, either every new install stops verifying or the updater
// does — and only one of those gets noticed.
func TestTheInstallerAndTheBinaryTrustTheSameKeys(t *testing.T) {
	root := filepath.Join("..", "..")

	source, err := os.ReadFile(filepath.Join(root, "internal", "web", "util", "signature.go"))
	if err != nil {
		t.Fatal(err)
	}
	installer, err := os.ReadFile(filepath.Join(root, "install.sh"))
	if err != nil {
		t.Fatal(err)
	}

	keys := base64Keys(string(source))
	if len(keys) == 0 {
		t.Fatal("no release keys found in signature.go; this test is reading the wrong thing")
	}

	for _, key := range keys {
		if !strings.Contains(string(installer), key) {
			t.Errorf("\nthe binary trusts a release key that install.sh does not:\n  %s\n\n"+
				"A fresh install would refuse a release the updater accepts.", key)
		}
	}

	for _, key := range base64Keys(string(installer)) {
		if !strings.Contains(string(source), key) {
			t.Errorf("\ninstall.sh trusts a release key the binary does not:\n  %s\n\n"+
				"An update would be refused by a binary that was installed happily.", key)
		}
	}
}

// base64Keys pulls every quoted 44-character base64 value out of a file, which
// is what an ed25519 public key looks like in both of them.
func base64Keys(text string) []string {
	var found []string
	for _, quoted := range strings.Split(text, `"`)[1:] {
		if len(quoted) != 44 || !strings.HasSuffix(quoted, "=") {
			continue
		}
		if raw, err := base64.StdEncoding.DecodeString(quoted); err == nil && len(raw) == ed25519.PublicKeySize {
			found = append(found, quoted)
		}
	}
	return found
}

// Three things the installer must not go back to doing. Each is a grep, and
// deliberately so: no particular line is wrong, what would be wrong is the
// behaviour returning, and none of it can be caught by running the script here
// because all three paths need root and a systemd machine.
func TestTheInstallerIsSafeToRunOnSomebodyElsesMachine(t *testing.T) {
	installer, err := os.ReadFile(filepath.Join("..", "..", "install.sh"))
	if err != nil {
		t.Fatal(err)
	}
	// Comment lines are dropped first: the port check explains in prose what it
	// used to do, and a test that forbids naming the old behaviour would forbid
	// documenting it. Good enough for shell — a line whose first character is a
	// hash is a comment.
	var code []string
	for _, line := range strings.Split(string(installer), "\n") {
		if !strings.HasPrefix(strings.TrimSpace(line), "#") {
			code = append(code, line)
		}
	}
	script := strings.Join(code, "\n")

	// It used to find whatever listened on the port and kill it outright. On a machine
	// where 8080 is another service, that is an outage caused by an installer.
	for _, weapon := range []string{"kill -9", "kill -KILL", "pkill", "killall"} {
		if strings.Contains(script, weapon) {
			t.Errorf("install.sh uses %q.\n\n"+
				"Whatever holds the port may not be ours. Report it and stop, the way "+
				"the port check does now — the person running the script knows what "+
				"runs on their machine and the script does not.", weapon)
		}
	}
	// And the check that replaced it has to keep telling our process apart from
	// a stranger's, or it either kills nothing or refuses every upgrade.
	if !strings.Contains(script, "/proc/$PID/exe") {
		t.Error("install.sh no longer identifies what holds the port.\n\n" +
			"Without that it cannot tell its own service from somebody else's.")
	}

	// A checksum says the bytes arrived, not that they run: wrong architecture,
	// truncated file, missing library. Measured: a truncated binary exits 139
	// and an arm64 one on x86 exits 126.
	if !strings.Contains(script, "./lastboard --version") {
		t.Error("install.sh no longer runs the downloaded binary before installing it.\n\n" +
			"An unusable download would replace a working one and be discovered while down.")
	}

	// A new version may migrate the schema on first start. The moment somebody
	// wants a copy is after it is too late to take one.
	if !strings.Contains(script, ".db.backup-") {
		t.Error("install.sh no longer copies the database before swapping the binary.")
	}

	// --purge deletes the database, so it asks first and checks the paths it is
	// about to remove.
	//
	// Both checks below catch these being deleted, which is the regression that
	// actually happens; neither catches them being rewired, and a grep on source
	// cannot. The behaviour itself was verified by running the script as root in
	// a container: with no terminal, --purge refuses and leaves the database and
	// the binary exactly where they were.
	if !strings.Contains(script, "safe_to_remove") {
		t.Error("install.sh removes paths without checking them first.\n\n" +
			"An empty or relative variable turns a tidy-up into whatever is in the " +
			"working directory.")
	}
	if !strings.Contains(script, "--purge needs a terminal to confirm on") {
		t.Error("install.sh no longer refuses --purge without a terminal.\n\n" +
			"Run from a script or from CI it would erase the database with nobody " +
			"having agreed to it.")
	}
}
