// Package password hashes and verifies account passwords.
//
// Argon2id, not bcrypt: it is the current recommendation, it is memory-hard —
// which is what makes a GPU farm expensive rather than merely busy — and bcrypt
// silently truncates at 72 bytes, so a long passphrase is not as strong as the
// person typing it believes.
//
// Hashes written by earlier versions are bcrypt, and they keep verifying. The
// first correct sign-in replaces one with an Argon2id hash (see NeedsRehash),
// so an installation moves over without anybody resetting a password.
package password

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
)

// ErrMismatch is returned when the password is wrong. It is deliberately the
// same error whatever went wrong below, so that nothing about the stored hash
// leaks through the difference.
var ErrMismatch = errors.New("password does not match")

// The cost. Roughly 64 MiB and a few tens of milliseconds on a modern machine:
// slow enough to matter to somebody trying millions of guesses, quick enough
// that signing in feels instant.
//
// These live in the encoded hash, so raising them later does not invalidate
// what is already stored — an old hash keeps verifying with the parameters it
// was made with, and NeedsRehash moves it up at the next sign-in.
const (
	timeCost    = 3
	memoryCost  = 64 * 1024 // KiB
	parallelism = 2
	saltLength  = 16
	keyLength   = 32

	// Ceilings on what a stored hash may ask for. A hash is read from the
	// database or from a restored backup, and a cost it names is memory and
	// time the server spends on every attempt against it.
	maxMemory = 256 * 1024 // KiB
	maxTime   = 10
)

// Hash returns a PHC-format string: the algorithm, its parameters, the salt and
// the digest, all in one column. Storing the parameters alongside is what makes
// them changeable.
func Hash(plain string) (string, error) {
	salt := make([]byte, saltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generating a salt: %w", err)
	}

	key := argon2.IDKey([]byte(plain), salt, timeCost, memoryCost, parallelism, keyLength)

	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, memoryCost, timeCost, parallelism,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

// isBcrypt says whether a stored hash was written by an earlier version.
func isBcrypt(encoded string) bool {
	return strings.HasPrefix(encoded, "$2a$") || strings.HasPrefix(encoded, "$2b$") || strings.HasPrefix(encoded, "$2y$")
}

type argonParams struct {
	memory  uint32
	time    uint32
	threads uint8
	salt    []byte
	key     []byte
}

func parseArgon(encoded string) (argonParams, bool) {
	var p argonParams
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[0] != "" || parts[1] != "argon2id" {
		return p, false
	}
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return p, false
	}
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &p.memory, &p.time, &p.threads); err != nil {
		return p, false
	}
	if p.memory == 0 || p.time == 0 || p.threads == 0 || p.memory > maxMemory || p.time > maxTime {
		return p, false
	}
	var err error
	if p.salt, err = base64.RawStdEncoding.DecodeString(parts[4]); err != nil || len(p.salt) == 0 {
		return p, false
	}
	if p.key, err = base64.RawStdEncoding.DecodeString(parts[5]); err != nil || len(p.key) == 0 {
		return p, false
	}
	return p, true
}

// Recognised says whether a stored hash is one this version can verify: a
// bcrypt hash from before, or an Argon2id hash within the ceilings. A restore
// uses it to refuse a file whose accounts could never sign in.
func Recognised(encoded string) bool {
	if isBcrypt(encoded) {
		return true
	}
	_, ok := parseArgon(encoded)
	return ok
}

// Verify checks a password against a stored hash, bcrypt or Argon2id.
//
// The comparison is constant-time. Argon2id parameters come from the stored
// string rather than from the constants above, so a hash written before they
// changed still verifies.
func Verify(plain, encoded string) error {
	if isBcrypt(encoded) {
		if bcrypt.CompareHashAndPassword([]byte(encoded), []byte(plain)) != nil {
			return ErrMismatch
		}
		return nil
	}
	p, ok := parseArgon(encoded)
	if !ok {
		return ErrMismatch
	}
	got := argon2.IDKey([]byte(plain), p.salt, p.time, p.memory, p.threads, uint32(len(p.key)))
	if subtle.ConstantTimeCompare(got, p.key) != 1 {
		return ErrMismatch
	}
	return nil
}

// NeedsRehash says whether a hash that just verified should be replaced: any
// bcrypt hash, and any Argon2id hash made with other parameters than today's.
func NeedsRehash(encoded string) bool {
	if isBcrypt(encoded) {
		return true
	}
	p, ok := parseArgon(encoded)
	return !ok || p.memory != memoryCost || p.time != timeCost || p.threads != parallelism || len(p.key) != keyLength
}

// dummySalt is fixed on purpose: Waste only has to cost what Verify costs.
var dummySalt = []byte("lastboard-waste!")

// Waste spends what a real verification spends, for the sign-in of an account
// that does not exist. Without it, a missing user answers faster than a wrong
// password and the difference says which usernames are real.
func Waste(plain string) {
	_ = argon2.IDKey([]byte(plain), dummySalt, timeCost, memoryCost, parallelism, keyLength)
}
