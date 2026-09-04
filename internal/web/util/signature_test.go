package util

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"testing"
)

func TestVerifyEd25519(t *testing.T) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	pubB64 := base64.StdEncoding.EncodeToString(pub)
	data := []byte("sha256sum  lastboard-linux-amd64.tar.gz\n")
	sigB64 := base64.StdEncoding.EncodeToString(ed25519.Sign(priv, data))

	t.Run("valid signature", func(t *testing.T) {
		if err := verifyEd25519(pubB64, data, sigB64); err != nil {
			t.Fatalf("valid signature rejected: %v", err)
		}
	})

	t.Run("tampered data rejected", func(t *testing.T) {
		if err := verifyEd25519(pubB64, []byte("tampered"), sigB64); err == nil {
			t.Fatal("tampered data should fail verification")
		}
	})

	t.Run("wrong key rejected", func(t *testing.T) {
		otherPub, _, _ := ed25519.GenerateKey(rand.Reader)
		if err := verifyEd25519(base64.StdEncoding.EncodeToString(otherPub), data, sigB64); err == nil {
			t.Fatal("signature from another key should fail")
		}
	})

	t.Run("empty key means not configured", func(t *testing.T) {
		if err := verifyEd25519("", data, sigB64); err == nil {
			t.Fatal("empty public key should report not configured")
		}
	})

	t.Run("malformed signature rejected", func(t *testing.T) {
		if err := verifyEd25519(pubB64, data, "not-base64!!"); err == nil {
			t.Fatal("malformed signature should fail")
		}
		if err := verifyEd25519(pubB64, data, base64.StdEncoding.EncodeToString([]byte("short"))); err == nil {
			t.Fatal("wrong-length signature should fail")
		}
	})
}

func TestEmbeddedReleaseKey(t *testing.T) {
	// A release public key is embedded, so signing is active.
	if !SigningConfigured() {
		t.Fatal("expected release signing to be configured (public key embedded)")
	}
	// Every embedded key must decode to a valid 32-byte Ed25519 public key.
	// A malformed one added during a rotation would be silently useless: the
	// key it is meant to replace would keep working, and the failure would only
	// show up once the old one is dropped.
	for i, key := range releasePublicKeys {
		pub, err := base64.StdEncoding.DecodeString(key)
		if err != nil {
			t.Fatalf("embedded key %d is not valid base64: %v", i, err)
		}
		if len(pub) != ed25519.PublicKeySize {
			t.Fatalf("embedded key %d is %d bytes, want %d", i, len(pub), ed25519.PublicKeySize)
		}
	}
}

// Rotation is only useful if a binary carrying both keys accepts a release
// signed with either. This is the whole point of the list.
func TestEitherKeyVerifiesDuringARotation(t *testing.T) {
	oldPub, oldPriv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	newPub, newPriv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}

	keys := []string{
		base64.StdEncoding.EncodeToString(oldPub),
		base64.StdEncoding.EncodeToString(newPub),
	}
	data := []byte("checksums for some release\n")

	for name, priv := range map[string]ed25519.PrivateKey{"retiring key": oldPriv, "incoming key": newPriv} {
		signature := base64.StdEncoding.EncodeToString(ed25519.Sign(priv, data))
		if err := verifyAny(keys, data, signature); err != nil {
			t.Errorf("a release signed with the %s was rejected: %v", name, err)
		}
	}

	// And a key on neither side of the rotation still gets nowhere.
	_, strangerPriv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	forged := base64.StdEncoding.EncodeToString(ed25519.Sign(strangerPriv, data))
	if err := verifyAny(keys, data, forged); err == nil {
		t.Error("a signature from an unknown key was accepted")
	}
}
