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
