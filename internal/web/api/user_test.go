package api

import (
	"testing"
)

// TestValidateUsername tests username validation rules
func TestValidateUsername(t *testing.T) {
	tests := []struct {
		name     string
		username string
		wantErr  bool
	}{
		{
			name:     "Valid username - lowercase",
			username: "john",
			wantErr:  false,
		},
		{
			name:     "Valid username - mixed case",
			username: "JohnDoe",
			wantErr:  false,
		},
		{
			name:     "Valid username - with numbers",
			username: "user123",
			wantErr:  false,
		},
		{
			name:     "Valid username - with underscore",
			username: "john_doe",
			wantErr:  false,
		},
		{
			name:     "Valid username - with hyphen",
			username: "john-doe",
			wantErr:  false,
		},
		{
			name:     "Invalid - too short (1 char)",
			username: "a",
			wantErr:  true,
		},
		{
			name:     "Invalid - too long (33 chars)",
			username: "abcdefghijklmnopqrstuvwxyz1234567",
			wantErr:  true,
		},
		{
			name:     "Invalid - contains space",
			username: "john doe",
			wantErr:  true,
		},
		{
			name:     "Invalid - contains special chars",
			username: "john@doe",
			wantErr:  true,
		},
		{
			name:     "Invalid - empty string",
			username: "",
			wantErr:  true,
		},
		{
			name:     "Edge case - exactly 2 chars (min)",
			username: "ab",
			wantErr:  false,
		},
		{
			name:     "Edge case - exactly 32 chars (max)",
			username: "abcdefghijklmnopqrstuvwxyz123456",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateUsername(tt.username)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateUsername() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// TestValidatePassword tests password validation rules
func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "Valid password - 8 chars",
			password: "password",
			wantErr:  false,
		},
		{
			name:     "Valid password - complex",
			password: "MyP@ssw0rd!2024",
			wantErr:  false,
		},
		{
			name:     "Valid password - max length (72 chars)",
			password: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890123456789",
			wantErr:  false,
		},
		{
			name:     "Invalid - too short (7 chars)",
			password: "pass123",
			wantErr:  true,
		},
		{
			name:     "Invalid - too short (4 chars)",
			password: "pass",
			wantErr:  true,
		},
		{
			name:     "Invalid - empty string",
			password: "",
			wantErr:  true,
		},
		{
			name:     "Invalid - too long (73 chars)",
			password: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ012345678901234567890",
			wantErr:  true,
		},
		{
			name:     "Edge case - exactly 8 chars (min)",
			password: "12345678",
			wantErr:  false,
		},
		{
			name:     "Valid - with spaces",
			password: "my password 123",
			wantErr:  false,
		},
		{
			name:     "Valid - special characters",
			password: "!@#$%^&*()_+-=[]{}|;:,.<>?",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validatePassword(tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("validatePassword() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// TestSafeInitials tests the initials generation function
func TestSafeInitials(t *testing.T) {
	tests := []struct {
		name     string
		username string
		want     string
	}{
		{
			name:     "Normal username",
			username: "john",
			want:     "jo",
		},
		{
			name:     "Short username (2 chars)",
			username: "ab",
			want:     "ab",
		},
		{
			name:     "Single char",
			username: "a",
			want:     "a",
		},
		{
			name:     "Long username",
			username: "johnathan",
			want:     "jo",
		},
		{
			name:     "Unicode characters",
			username: "josé",
			want:     "jo",
		},
		{
			name:     "Emoji",
			username: "😀user",
			want:     "😀u",
		},
		{
			name:     "Chinese characters",
			username: "用户名",
			want:     "用户",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := safeInitials(tt.username); got != tt.want {
				t.Errorf("safeInitials() = %v, want %v", got, tt.want)
			}
		})
	}
}

// Benchmark tests
func BenchmarkValidateUsername(b *testing.B) {
	username := "testuser123"
	for i := 0; i < b.N; i++ {
		validateUsername(username)
	}
}

func BenchmarkValidatePassword(b *testing.B) {
	password := "testpassword123"
	for i := 0; i < b.N; i++ {
		validatePassword(password)
	}
}

func BenchmarkSafeInitials(b *testing.B) {
	username := "testuser"
	for i := 0; i < b.N; i++ {
		safeInitials(username)
	}
}
