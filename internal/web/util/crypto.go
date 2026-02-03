package util

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

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
