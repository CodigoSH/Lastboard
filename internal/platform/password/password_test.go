package password

import (
	"encoding/base64"
	"errors"
	"strings"
	"testing"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
)

func TestARoundTrip(t *testing.T) {
	hash, err := Hash("correct horse battery staple")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(hash, "$argon2id$") {
		t.Fatalf("a new hash is not Argon2id: %q", hash)
	}
	if err := Verify("correct horse battery staple", hash); err != nil {
		t.Fatalf("the right password did not verify: %v", err)
	}
	if err := Verify("wrong horse battery staple", hash); !errors.Is(err, ErrMismatch) {
		t.Fatalf("the wrong password gave %v, want ErrMismatch", err)
	}
	if NeedsRehash(hash) {
		t.Error("a hash made today asks to be made again")
	}
}

// TestAHashFromBeforeStillSignsIn is the promise of the migration: every
// account on an existing installation has a bcrypt hash, and none of them may
// be locked out by the update.
func TestAHashFromBeforeStillSignsIn(t *testing.T) {
	for _, cost := range []int{bcrypt.MinCost, bcrypt.DefaultCost} {
		old, err := bcrypt.GenerateFromPassword([]byte("from-v1.8"), cost)
		if err != nil {
			t.Fatal(err)
		}
		if err := Verify("from-v1.8", string(old)); err != nil {
			t.Errorf("cost %d: a bcrypt hash stopped verifying: %v", cost, err)
		}
		if err := Verify("not it", string(old)); !errors.Is(err, ErrMismatch) {
			t.Errorf("cost %d: wrong password against bcrypt gave %v", cost, err)
		}
		if !NeedsRehash(string(old)) {
			t.Errorf("cost %d: a bcrypt hash does not ask to be replaced", cost)
		}
		if !Recognised(string(old)) {
			t.Errorf("cost %d: a bcrypt hash is not recognised", cost)
		}
	}
}

// TestTheSamePasswordHashesDifferently is the salt, asserted.
func TestTheSamePasswordHashesDifferently(t *testing.T) {
	a, _ := Hash("same")
	b, _ := Hash("same")
	if a == b {
		t.Error("two hashes of the same password are identical: the salt is not being used")
	}
}

// TestALongPassphraseIsNotTruncated is why this is not bcrypt.
func TestALongPassphraseIsNotTruncated(t *testing.T) {
	prefix := strings.Repeat("a", 72)
	hash, err := Hash(prefix + "ending one")
	if err != nil {
		t.Fatal(err)
	}
	if err := Verify(prefix+"ending two", hash); !errors.Is(err, ErrMismatch) {
		t.Error("two passphrases differing after 72 bytes verified against the same hash")
	}
}

// TestAMalformedHashDoesNotPanicAndDoesNotPass.
func TestAMalformedHashDoesNotPanicAndDoesNotPass(t *testing.T) {
	for _, bad := range []string{
		"",
		"$argon2id$",
		"$2a$10$abcdefghijklmnopqrstuv", // a truncated bcrypt hash
		"$argon2id$v=19$m=x,t=y,p=z$AAAA$BBBB",
		"$argon2id$v=19$m=65536,t=3,p=2$not-base64!$also-not",
		strings.Repeat("$", 6),
	} {
		if err := Verify("anything", bad); err == nil {
			t.Errorf("the malformed hash %q accepted a password", bad)
		}
	}
}

// TestAStoredHashCannotChooseAHugeCost. A hash arrives from the database or
// from a restored backup; a cost it names is spent on every attempt.
func TestAStoredHashCannotChooseAHugeCost(t *testing.T) {
	salt := base64.RawStdEncoding.EncodeToString([]byte("saltsaltsaltsalt"))
	for _, params := range []string{"m=4194304,t=3,p=2", "m=65536,t=1000,p=2", "m=0,t=3,p=2"} {
		h := "$argon2id$v=19$" + params + "$" + salt + "$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
		if Recognised(h) {
			t.Errorf("%s is recognised", params)
		}
		if err := Verify("x", h); err == nil {
			t.Errorf("%s verified", params)
		}
	}
}

// TestParametersComeFromTheStoredHash: a hash made with older, weaker
// parameters keeps verifying, and asks to be brought up to date.
func TestParametersComeFromTheStoredHash(t *testing.T) {
	salt := []byte("saltsaltsaltsalt")
	key := argon2.IDKey([]byte("legacy"), salt, 1, 8192, 1, keyLength)
	old := "$argon2id$v=19$m=8192,t=1,p=1$" +
		base64.RawStdEncoding.EncodeToString(salt) + "$" +
		base64.RawStdEncoding.EncodeToString(key)

	if err := Verify("legacy", old); err != nil {
		t.Errorf("a hash written with older parameters stopped verifying: %v", err)
	}
	if !NeedsRehash(old) {
		t.Error("a hash with older parameters does not ask to be replaced")
	}
}
