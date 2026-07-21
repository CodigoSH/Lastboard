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
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return "", errors.New("invalid token format")
	}

	encodedData := parts[0]
	encodedSig := parts[1]

	// Verify HMAC (constant-time)
	h := hmac.New(sha256.New, secret)
	h.Write([]byte(encodedData))
	expectedSig := h.Sum(nil)

	gotSig, err := base64.RawURLEncoding.DecodeString(encodedSig)
	if err != nil {
		return "", errors.New("invalid signature encoding")
	}

	if !hmac.Equal(expectedSig, gotSig) {
		return "", errors.New("invalid signature")
	}

	// Decode payload
	dataBytes, err := base64.RawURLEncoding.DecodeString(encodedData)
	if err != nil {
		return "", errors.New("invalid data encoding")
	}

	// Parse "data:expiry" — LastIndex so data containing colons works
	payload := string(dataBytes)
	colonIdx := strings.LastIndex(payload, ":")
	if colonIdx < 1 {
		return "", errors.New("invalid token payload")
	}

	data := payload[:colonIdx]
	expiryStr := payload[colonIdx+1:]

	expiry, err := strconv.ParseInt(expiryStr, 10, 64)
	if err != nil {
		return "", errors.New("invalid token expiry")
	}

	if time.Now().Unix() > expiry {
		return "", errors.New("token expired")
	}

	return data, nil
}
