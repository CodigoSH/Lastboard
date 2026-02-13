package util

import (
	"testing"
	"time"
)

// TestSignToken tests token signing functionality
func TestSignToken(t *testing.T) {
	secret := []byte("test-secret-key-32-bytes-long!!")
	data := "testuser"
	expiry := time.Now().Add(24 * time.Hour)

	token := SignToken(data, secret, expiry)

	if token == "" {
		t.Error("SignToken() returned empty token")
	}

	// Token should have two parts separated by "."
	if len(token) < 10 {
		t.Error("SignToken() returned token that is too short")
	}
}

// TestVerifyToken tests token verification
func TestVerifyToken(t *testing.T) {
	secret := []byte("test-secret-key-32-bytes-long!!")

	tests := []struct {
		name     string
		data     string
		expiry   time.Time
		wantErr  bool
		errMsg   string
	}{
		{
			name:    "Valid token - not expired",
			data:    "testuser",
			expiry:  time.Now().Add(1 * time.Hour),
			wantErr: false,
		},
		{
			name:    "Valid token - with special chars",
			data:    "user@example.com",
			expiry:  time.Now().Add(1 * time.Hour),
			wantErr: false,
		},
		{
			name:    "Valid token - with colon",
			data:    "user:123",
			expiry:  time.Now().Add(1 * time.Hour),
			wantErr: false,
		},
		{
			name:    "Invalid - expired token",
			data:    "testuser",
			expiry:  time.Now().Add(-1 * time.Hour),
			wantErr: true,
			errMsg:  "token expired",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Sign the token
			token := SignToken(tt.data, secret, tt.expiry)

			// Verify the token
			data, err := VerifyToken(token, secret)

			if (err != nil) != tt.wantErr {
				t.Errorf("VerifyToken() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr && data != tt.data {
				t.Errorf("VerifyToken() data = %v, want %v", data, tt.data)
			}

			if tt.wantErr && err != nil && tt.errMsg != "" {
				if err.Error() != tt.errMsg {
					t.Errorf("VerifyToken() error message = %v, want %v", err.Error(), tt.errMsg)
				}
			}
		})
	}
}

// TestVerifyToken_InvalidFormat tests invalid token formats
func TestVerifyToken_InvalidFormat(t *testing.T) {
	secret := []byte("test-secret-key-32-bytes-long!!")

	tests := []struct {
		name    string
		token   string
		wantErr bool
	}{
		{
			name:    "Invalid - empty token",
			token:   "",
			wantErr: true,
		},
		{
			name:    "Invalid - no separator",
			token:   "invalidtoken",
			wantErr: true,
		},
		{
			name:    "Invalid - only one part",
			token:   "part1.",
			wantErr: true,
		},
		{
			name:    "Invalid - random string",
			token:   "not.a.valid.token",
			wantErr: true,
		},
		{
			name:    "Invalid - base64 but wrong signature",
			token:   "dGVzdA.dGVzdA",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := VerifyToken(tt.token, secret)
			if (err != nil) != tt.wantErr {
				t.Errorf("VerifyToken() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// TestVerifyToken_WrongSecret tests verification with wrong secret
func TestVerifyToken_WrongSecret(t *testing.T) {
	correctSecret := []byte("correct-secret-key-32-bytes!!!")
	wrongSecret := []byte("wrong-secret-key-32-bytes!!!!!")

	data := "testuser"
	expiry := time.Now().Add(1 * time.Hour)

	// Sign with correct secret
	token := SignToken(data, correctSecret, expiry)

	// Try to verify with wrong secret
	_, err := VerifyToken(token, wrongSecret)

	if err == nil {
		t.Error("VerifyToken() should fail with wrong secret")
	}

	if err.Error() != "invalid signature" {
		t.Errorf("VerifyToken() error = %v, want 'invalid signature'", err.Error())
	}
}

// TestTokenRoundtrip tests complete sign-verify cycle
func TestTokenRoundtrip(t *testing.T) {
	secret := []byte("test-secret-key-32-bytes-long!!")
	testData := []string{
		"user1",
		"admin@example.com",
		"user:with:colons",
		"用户", // Chinese
		"😀",   // Emoji
		"a very long username with spaces and special chars!@#$%",
	}

	for _, data := range testData {
		t.Run("Roundtrip-"+data, func(t *testing.T) {
			expiry := time.Now().Add(1 * time.Hour)
			token := SignToken(data, secret, expiry)
			verified, err := VerifyToken(token, secret)

			if err != nil {
				t.Errorf("Token roundtrip failed for '%s': %v", data, err)
			}

			if verified != data {
				t.Errorf("Data mismatch: got '%s', want '%s'", verified, data)
			}
		})
	}
}

// TestTokenExpiration tests that tokens expire correctly
func TestTokenExpiration(t *testing.T) {
	secret := []byte("test-secret-key-32-bytes-long!!")
	data := "testuser"

	// Create token that expires in 1 second
	expiry := time.Now().Add(1 * time.Second)
	token := SignToken(data, secret, expiry)

	// Verify immediately - should work
	_, err := VerifyToken(token, secret)
	if err != nil {
		t.Error("Token should be valid immediately after creation")
	}

	// Wait for expiration
	time.Sleep(2 * time.Second)

	// Verify after expiration - should fail
	_, err = VerifyToken(token, secret)
	if err == nil {
		t.Error("Token should be expired after 2 seconds")
	}

	if err.Error() != "token expired" {
		t.Errorf("Expected 'token expired' error, got: %v", err)
	}
}

// Benchmark tests
func BenchmarkSignToken(b *testing.B) {
	secret := []byte("test-secret-key-32-bytes-long!!")
	data := "testuser"
	expiry := time.Now().Add(24 * time.Hour)

	for i := 0; i < b.N; i++ {
		SignToken(data, secret, expiry)
	}
}

func BenchmarkVerifyToken(b *testing.B) {
	secret := []byte("test-secret-key-32-bytes-long!!")
	data := "testuser"
	expiry := time.Now().Add(24 * time.Hour)
	token := SignToken(data, secret, expiry)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		VerifyToken(token, secret)
	}
}

func BenchmarkTokenRoundtrip(b *testing.B) {
	secret := []byte("test-secret-key-32-bytes-long!!")
	data := "testuser"
	expiry := time.Now().Add(24 * time.Hour)

	for i := 0; i < b.N; i++ {
		token := SignToken(data, secret, expiry)
		VerifyToken(token, secret)
	}
}
