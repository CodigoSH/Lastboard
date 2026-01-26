package api

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	DB *sql.DB
}

func NewAuthHandler(db *sql.DB) *AuthHandler {
	return &AuthHandler{DB: db}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	// 1. Fetch User
	var storedHash string
	// Allow login with either 'admin' (if created as such) or the user's username
	// But our DB has specific username. Let's check by username.
	err := h.DB.QueryRow("SELECT password FROM users WHERE username = ?", input.Username).Scan(&storedHash)
	if err != nil {
		// Dummy comparison to prevent timing attacks
		bcrypt.CompareHashAndPassword([]byte("$2a$10$dummyhashdummyhashdummyh"), []byte(input.Password))
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// 2. Verify Password
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(input.Password)); err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// 3. Set Cookie
	// Store username in cookie (Base64 encoded)
	// In production, use a signed session token.
	token := base64.StdEncoding.EncodeToString([]byte(input.Username))

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
		Secure:   false, // Set to true if using HTTPS
		SameSite: http.SameSiteLaxMode,
	})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Login successful"})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		Expires:  time.Now().Add(-1 * time.Hour),
		HttpOnly: true,
	})
	http.Redirect(w, r, "/login", http.StatusFound)
}
