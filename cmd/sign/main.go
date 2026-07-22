// Command sign is the release-signing helper for Lastboard.
//
// It uses Ed25519 (Go stdlib only — no external tooling) so the whole signing
// ceremony stays self-contained. Two modes:
//
//	sign keygen        Generate a keypair. Prints the base64 PRIVATE key (store
//	                   it as the CI secret RELEASE_SIGNING_KEY) and the base64
//	                   PUBLIC key (paste into internal/web/util/signature.go).
//
//	sign <file>        Sign <file> with the key in $RELEASE_SIGNING_KEY and write
//	                   the detached base64 signature to <file>.sig. Used by the
//	                   release workflow on checksums.txt.
//
//	sign verify <file> <sig>
//	                   Verify <sig> over <file> against the PUBLIC key embedded in
//	                   the binary (internal/web/util). Handy to self-test the
//	                   keypair before cutting a release.
package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"strings"

	"github.com/CodigoSH/Lastboard/internal/web/util"
)

func main() {
	if len(os.Args) < 2 {
		usage()
	}

	switch os.Args[1] {
	case "keygen":
		keygen()
	case "verify":
		if len(os.Args) != 4 {
			usage()
		}
		verify(os.Args[2], os.Args[3])
	default:
		signFile(os.Args[1])
	}
}

func usage() {
	fmt.Fprintln(os.Stderr, "usage:")
	fmt.Fprintln(os.Stderr, "  sign keygen              generate a keypair")
	fmt.Fprintln(os.Stderr, "  sign <file>              sign <file> -> <file>.sig using $RELEASE_SIGNING_KEY")
	fmt.Fprintln(os.Stderr, "  sign verify <file> <sig> verify <sig> over <file> against the embedded public key")
	os.Exit(2)
}

func verify(filePath, sigPath string) {
	if !util.SigningConfigured() {
		fail(fmt.Errorf("no public key embedded (releasePublicKey is empty)"))
	}
	data, err := os.ReadFile(filePath)
	if err != nil {
		fail(err)
	}
	sig, err := os.ReadFile(sigPath)
	if err != nil {
		fail(err)
	}
	if err := util.VerifyReleaseSignature(data, strings.TrimSpace(string(sig))); err != nil {
		fail(fmt.Errorf("verification FAILED: %w", err))
	}
	fmt.Println("signature OK")
}

func keygen() {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		fail(err)
	}
	fmt.Println("PRIVATE (store as CI secret RELEASE_SIGNING_KEY):")
	fmt.Println(base64.StdEncoding.EncodeToString(priv))
	fmt.Println()
	fmt.Println("PUBLIC (paste into internal/web/util/signature.go releasePublicKey):")
	fmt.Println(base64.StdEncoding.EncodeToString(pub))
}

func signFile(pathArg string) {
	keyB64 := os.Getenv("RELEASE_SIGNING_KEY")
	if keyB64 == "" {
		fail(fmt.Errorf("RELEASE_SIGNING_KEY is not set"))
	}
	key, err := base64.StdEncoding.DecodeString(keyB64)
	if err != nil || len(key) != ed25519.PrivateKeySize {
		fail(fmt.Errorf("RELEASE_SIGNING_KEY must be a base64 Ed25519 private key"))
	}
	data, err := os.ReadFile(pathArg)
	if err != nil {
		fail(err)
	}
	sig := ed25519.Sign(ed25519.PrivateKey(key), data)
	outPath := pathArg + ".sig"
	if err := os.WriteFile(outPath, []byte(base64.StdEncoding.EncodeToString(sig)+"\n"), 0o644); err != nil {
		fail(err)
	}
	fmt.Println("wrote", outPath)
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "sign:", err)
	os.Exit(1)
}
