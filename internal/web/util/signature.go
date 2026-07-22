package util

import (
	"crypto/ed25519"
	"encoding/base64"
	"errors"
)

// releasePublicKey is the base64-encoded Ed25519 public key used to verify the
// signature of a release's checksums.txt during auto-update and install.
//
// It is EMPTY by default: release signing is opt-in. To enable it:
//  1. Generate an Ed25519 keypair (see docs/deploying/release-signing.md).
//  2. Paste the base64 PUBLIC key here.
//  3. Store the base64 PRIVATE key as the CI secret RELEASE_SIGNING_KEY so the
//     release workflow can sign checksums.txt into checksums.txt.sig.
//
// Verification is decoupled from the download server: even if the release host
// is compromised, an attacker cannot forge checksums.txt without the private
// key, which never lives on that server.
const releasePublicKey = "kip44L4a8PBJ7CVWJSOJx5AaBTcpgM1tu9x05r+1Rz0="

// SigningConfigured reports whether a release public key has been embedded, i.e.
// whether update/install should verify signatures.
func SigningConfigured() bool {
	return releasePublicKey != ""
}

// VerifyReleaseSignature checks that sigBase64 is a valid Ed25519 signature of
// data under the embedded release public key.
func VerifyReleaseSignature(data []byte, sigBase64 string) error {
	return verifyEd25519(releasePublicKey, data, sigBase64)
}

// verifyEd25519 is the pure verification core (public key passed in) so it can be
// unit-tested with a generated keypair without touching the embedded constant.
func verifyEd25519(pubBase64 string, data []byte, sigBase64 string) error {
	if pubBase64 == "" {
		return errors.New("release signing not configured")
	}
	pub, err := base64.StdEncoding.DecodeString(pubBase64)
	if err != nil || len(pub) != ed25519.PublicKeySize {
		return errors.New("invalid embedded release public key")
	}
	sig, err := base64.StdEncoding.DecodeString(sigBase64)
	if err != nil || len(sig) != ed25519.SignatureSize {
		return errors.New("invalid signature encoding")
	}
	if !ed25519.Verify(ed25519.PublicKey(pub), data, sig) {
		return errors.New("signature verification failed")
	}
	return nil
}
