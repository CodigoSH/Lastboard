package util

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// IsSecureRequest reports whether the request arrived over HTTPS, either via a
// direct TLS connection or a reverse-proxy protocol header.
//
// This deliberately trusts X-Forwarded-Proto / CloudFront-Forwarded-Proto
// WITHOUT gating on TRUST_PROXY. Lastboard is self-hosted and most operators
// run it behind a reverse proxy (Pangolin/Traefik/NPM/Caddy) in Docker or LXC;
// staying lax here lets the Secure cookie flag work out of the box without
// requiring TRUST_PROXY=true. The risk is low: spoofing this header only sets
// Secure=true on cookies. Trusting X-Forwarded-For to bypass the rate limiter
// is a different risk profile and IS gated on TRUST_PROXY — do not unify them.
func IsSecureRequest(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	if proto := r.Header.Get("X-Forwarded-Proto"); proto == "https" {
		return true
	}
	if proto := r.Header.Get("CloudFront-Forwarded-Proto"); proto == "https" {
		return true
	}
	return false
}

// AccountSessionPayload is what a session token carries now: the account's id
// and the generation of its password the session was minted under.
//
// The id, not the name: names are reusable. Delete bob, create another bob, and
// a token that said "bob" was the new account's session. The leading "#" cannot
// be part of a username (they are [A-Za-z0-9_-]), so this form never reads as
// the former one.
func AccountSessionPayload(userID, passwordVersion int) string {
	return fmt.Sprintf("#%d:%d", userID, passwordVersion)
}

// ParseSession reads either form of payload. A token minted as an account id
// returns that id and no name; one minted before sessions carried an id returns
// the name it was minted with and a zero id, so updating signs nobody out — those
// tokens run out by themselves, within a month at the most.
func ParseSession(data string) (userID int, username string, passwordVersion int) {
	if rest, ok := strings.CutPrefix(data, "#"); ok {
		if idStr, versionStr, found := strings.Cut(rest, ":"); found {
			id, err1 := strconv.Atoi(idStr)
			version, err2 := strconv.Atoi(versionStr)
			if err1 == nil && err2 == nil && id > 0 {
				return id, "", version
			}
		}
	}
	username, passwordVersion = ParseSessionPayload(data)
	return 0, username, passwordVersion
}

// SessionPayload is what a session token carries: who you are, and which
// generation of your password the session was minted under.
//
// Usernames are restricted to [A-Za-z0-9_-], so the colon is unambiguous and
// the expiry is still parsed off the end.
func SessionPayload(username string, passwordVersion int) string {
	return fmt.Sprintf("%s:%d", username, passwordVersion)
}

// ParseSessionPayload splits what SessionPayload built.
//
// A payload with no version is a session minted before sessions carried one.
// It is read as version 0, which is what every account that has never changed
// its password still holds — those sessions survive the upgrade, and the ones
// belonging to an account whose password has since changed do not, which is
// precisely the behaviour being added.
func ParseSessionPayload(data string) (username string, passwordVersion int) {
	idx := strings.LastIndex(data, ":")
	if idx < 1 {
		return data, 0
	}
	v, err := strconv.Atoi(data[idx+1:])
	if err != nil {
		return data, 0
	}
	return data[:idx], v
}

// SignToken creates a signed token: base64(data:expiry_unix).base64(hmac_sha256)
func SignToken(data string, secret []byte, expiry time.Time) string {
	payload := fmt.Sprintf("%s:%d", data, expiry.Unix())
	encodedData := base64.RawURLEncoding.EncodeToString([]byte(payload))

	h := hmac.New(sha256.New, secret)
	h.Write([]byte(encodedData))
	signature := h.Sum(nil)

	encodedSig := base64.RawURLEncoding.EncodeToString(signature)
	return fmt.Sprintf("%s.%s", encodedData, encodedSig)
}

// VerifyToken validates the signature and expiry, returns the original data.
func VerifyToken(token string, secret []byte) (string, error) {
	data, _, err := VerifyTokenExpiry(token, secret)
	return data, err
}

// VerifyTokenExpiry is VerifyToken that also says when the token runs out, for a
// caller that has to carry that date over to something new.
func VerifyTokenExpiry(token string, secret []byte) (string, time.Time, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return "", time.Time{}, errors.New("invalid token format")
	}

	encodedData := parts[0]
	encodedSig := parts[1]

	// Verify HMAC (constant-time)
	h := hmac.New(sha256.New, secret)
	h.Write([]byte(encodedData))
	expectedSig := h.Sum(nil)

	gotSig, err := base64.RawURLEncoding.DecodeString(encodedSig)
	if err != nil {
		return "", time.Time{}, errors.New("invalid signature encoding")
	}

	if !hmac.Equal(expectedSig, gotSig) {
		return "", time.Time{}, errors.New("invalid signature")
	}

	// Decode payload
	dataBytes, err := base64.RawURLEncoding.DecodeString(encodedData)
	if err != nil {
		return "", time.Time{}, errors.New("invalid data encoding")
	}

	// Parse "data:expiry" — LastIndex so data containing colons works
	payload := string(dataBytes)
	colonIdx := strings.LastIndex(payload, ":")
	if colonIdx < 1 {
		return "", time.Time{}, errors.New("invalid token payload")
	}

	data := payload[:colonIdx]
	expiryStr := payload[colonIdx+1:]

	expiry, err := strconv.ParseInt(expiryStr, 10, 64)
	if err != nil {
		return "", time.Time{}, errors.New("invalid token expiry")
	}

	if time.Now().Unix() > expiry {
		return "", time.Time{}, errors.New("token expired")
	}

	return data, time.Unix(expiry, 0), nil
}
