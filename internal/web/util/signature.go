package util

import (
	"crypto/ed25519"
	"encoding/base64"
	"errors"
)

// releasePublicKeys are the base64-encoded Ed25519 public keys accepted when
// verifying a release's checksums.txt during auto-update and install. A
// signature is good if any of them verifies it.
//
// There is more than one entry for a reason. A binary can only verify with the
// keys it was built with, so replacing the single key outright would leave
// every installation still running an older build unable to verify the next
// release — the auto-updater would refuse it, and the people furthest behind,
// who most need the update, would be the ones stuck.
//
// Rotation is therefore done with an overlap:
//  1. Add the new public key here, second, and release. Releases are still
//     signed with the old private key.
//  2. Once that release has had time to reach installations, switch the CI
//     secret RELEASE_SIGNING_KEY to the new private key.
//  3. In a later release, drop the retired key from this list.
//
// Verification is decoupled from the download server: even if the release host
// is compromised, an attacker cannot forge checksums.txt without a private key,
// and none of them ever live on that server.
var releasePublicKeys = []string{
	"kip44L4a8PBJ7CVWJSOJx5AaBTcpgM1tu9x05r+1Rz0=",
}

// SigningConfigured reports whether a release public key has been embedded, i.e.
// whether update/install should verify signatures.
func SigningConfigured() bool {
	for _, key := range releasePublicKeys {
		if key != "" {
			return true
		}
	}
	return false
}

// VerifyReleaseSignature checks that sigBase64 is a valid Ed25519 signature of
// data under any of the embedded release public keys.
func VerifyReleaseSignature(data []byte, sigBase64 string) error {
	return verifyAny(releasePublicKeys, data, sigBase64)
}

// verifyAny accepts the signature if any key verifies it, and otherwise reports
// the last failure. Keys are tried in order; the first is the current one.
func verifyAny(pubKeys []string, data []byte, sigBase64 string) error {
	err := errors.New("release signing not configured")
	for _, key := range pubKeys {
		if key == "" {
			continue
		}
		if err = verifyEd25519(key, data, sigBase64); err == nil {
			return nil
		}
	}
	return err
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
