package api

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/webauthn"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

/* ---------------------------------------------------------------------------
 * Passkeys: signing in without a password
 *
 * A passkey is made while signed in, from My Profile, and from then on signs in
 * with nothing typed: the device asks for its fingerprint, face or PIN, and
 * signs. That is both factors at once, so a passkey sign-in asks for no code
 * after it. The password keeps working as it did.
 *
 * A passkey belongs to a site by name, so the site is read from each request —
 * the host the browser asked for, as a proxy passes it on. Browsers only offer
 * passkeys on https or on localhost, and never for a bare IP address; the
 * server refuses there too, with a reason the screen can say.
 * ------------------------------------------------------------------------ */

const (
	passkeyRPName          = "Lastboard"
	passkeyChallengeTTL    = 5 * time.Minute
	passkeyTimeoutMS       = 300000
	maxPasskeyName         = 64
	passkeyPurposeRegister = "register"
	passkeyPurposeLogin    = "login"
)

// errPasskeyUnavailable: this address cannot have passkeys — plain http to
// somewhere that is not this machine, or a bare IP address.
var errPasskeyUnavailable = errors.New("passkeys need https and a name, not an IP address")

// relyingParty is the site a passkey belongs to, as this request reached it:
// its name (the host without the port) and its origin.
func relyingParty(r *http.Request) (rpID, origin string, err error) {
	host := strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-Host"), ",")[0])
	if host == "" {
		host = r.Host
	}
	name := host
	if h, _, splitErr := net.SplitHostPort(host); splitErr == nil {
		name = h
	}
	name = strings.TrimSuffix(strings.ToLower(name), ".")
	if name == "" || net.ParseIP(strings.Trim(name, "[]")) != nil {
		return "", "", errPasskeyUnavailable
	}
	secure := util.IsSecureRequest(r)
	if !secure && name != "localhost" && !strings.HasSuffix(name, ".localhost") {
		return "", "", errPasskeyUnavailable
	}
	scheme := "http"
	if secure {
		scheme = "https"
	}
	return name, scheme + "://" + strings.ToLower(host), nil
}

func passkeyChallengeHash(challenge []byte) string {
	sum := sha256.Sum256(challenge)
	return hex.EncodeToString(sum[:])
}

// newPasskeyChallenge hands out a challenge for one ceremony.
func newPasskeyChallenge(ctx context.Context, db *sql.DB, purpose string, userID int, remember bool) ([]byte, error) {
	challenge := make([]byte, 32)
	if _, err := rand.Read(challenge); err != nil {
		return nil, err
	}
	now := time.Now()
	if _, err := db.ExecContext(ctx, `DELETE FROM passkey_challenges WHERE expires_at < ?`, now.Unix()); err != nil {
		return nil, err
	}
	var owner any
	if userID > 0 {
		owner = userID
	}
	rem := 0
	if remember {
		rem = 1
	}
	_, err := db.ExecContext(ctx, `INSERT INTO passkey_challenges (challenge_hash, purpose, user_id, remember, expires_at)
		VALUES (?, ?, ?, ?, ?)`, passkeyChallengeHash(challenge), purpose, owner, rem, now.Add(passkeyChallengeTTL).Unix())
	return challenge, err
}

// errChallengeGone: not issued here, already answered, or out of time.
var errChallengeGone = errors.New("challenge gone")

// takePasskeyChallenge spends a challenge: one statement, so the same answer
// sent twice is accepted once.
func takePasskeyChallenge(ctx context.Context, db *sql.DB, challenge []byte, purpose string) (userID sql.NullInt64, remember bool, err error) {
	var rem int
	err = db.QueryRowContext(ctx, `DELETE FROM passkey_challenges
		WHERE challenge_hash = ? AND purpose = ? AND expires_at >= ?
		RETURNING user_id, remember`, passkeyChallengeHash(challenge), purpose, time.Now().Unix()).Scan(&userID, &rem)
	if errors.Is(err, sql.ErrNoRows) {
		return userID, false, errChallengeGone
	}
	return userID, rem == 1, err
}

// passkeyHandle is the id an account's devices store for it, drawn the first
// time it is asked for.
func passkeyHandle(ctx context.Context, db *sql.DB, userID int) ([]byte, error) {
	var handle []byte
	err := db.QueryRowContext(ctx, `SELECT handle FROM user_passkey_handles WHERE user_id = ?`, userID).Scan(&handle)
	if err == nil {
		return handle, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	handle = make([]byte, 16)
	if _, err := rand.Read(handle); err != nil {
		return nil, err
	}
	if _, err := db.ExecContext(ctx, `INSERT OR IGNORE INTO user_passkey_handles (user_id, handle) VALUES (?, ?)`, userID, handle); err != nil {
		return nil, err
	}
	err = db.QueryRowContext(ctx, `SELECT handle FROM user_passkey_handles WHERE user_id = ?`, userID).Scan(&handle)
	return handle, err
}

func decodeB64Field(s string) ([]byte, bool) {
	b, err := webauthn.B64.DecodeString(strings.TrimRight(s, "="))
	return b, err == nil && len(b) > 0
}

/* ---------------------------------------------------------------------------
 * The account's own passkeys
 * ------------------------------------------------------------------------ */

// PasskeyHandler is the account's own passkeys.
type PasskeyHandler struct {
	DB *sql.DB
}

type passkeyView struct {
	ID         int64      `json:"id"`
	Name       string     `json:"name"`
	CreatedAt  time.Time  `json:"created_at"`
	LastUsedAt *time.Time `json:"last_used_at"`
}

// List answers with the account's passkeys, and whether this address can make
// one — the screen says why not, instead of a button that fails.
func (h *PasskeyHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.QueryContext(r.Context(), `SELECT id, name, created_at, last_used_at FROM user_passkeys
		WHERE user_id = ? ORDER BY created_at, id`, middleware.GetUserIDFromContext(r))
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	list := []passkeyView{}
	for rows.Next() {
		var (
			p       passkeyView
			created int64
			used    sql.NullInt64
		)
		if err := rows.Scan(&p.ID, &p.Name, &created, &used); err != nil {
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
		p.CreatedAt = time.Unix(created, 0)
		if used.Valid {
			t := time.Unix(used.Int64, 0)
			p.LastUsedAt = &t
		}
		list = append(list, p)
	}
	_, _, unavailable := relyingParty(r)
	writeJSON(w, map[string]any{"available": unavailable == nil, "passkeys": list})
}

// RegisterBegin hands the browser what navigator.credentials.create needs.
func (h *PasskeyHandler) RegisterBegin(w http.ResponseWriter, r *http.Request) {
	rpID, _, err := relyingParty(r)
	if err != nil {
		http.Error(w, "passkey.not_available", http.StatusConflict)
		return
	}
	userID := middleware.GetUserIDFromContext(r)
	handle, err := passkeyHandle(r.Context(), h.DB, userID)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	challenge, err := newPasskeyChallenge(r.Context(), h.DB, passkeyPurposeRegister, userID, false)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	// The passkeys it already has, so the same device does not make a second.
	exclude := []map[string]string{}
	rows, err := h.DB.QueryContext(r.Context(), `SELECT credential_id FROM user_passkeys WHERE user_id = ?`, userID)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			exclude = append(exclude, map[string]string{"type": "public-key", "id": id})
		}
	}
	rows.Close()

	name := middleware.GetUserFromContext(r)
	writeJSON(w, map[string]any{
		"challenge": webauthn.B64.EncodeToString(challenge),
		"rp":        map[string]string{"id": rpID, "name": passkeyRPName},
		"user": map[string]string{
			"id": webauthn.B64.EncodeToString(handle), "name": name, "displayName": name,
		},
		"pubKeyCredParams": []map[string]any{
			{"type": "public-key", "alg": webauthn.AlgES256},
			{"type": "public-key", "alg": webauthn.AlgEdDSA},
		},
		"timeout":     passkeyTimeoutMS,
		"attestation": "none",
		"authenticatorSelection": map[string]any{
			"residentKey": "required", "requireResidentKey": true, "userVerification": "required",
		},
		"excludeCredentials": exclude,
	})
}

// RegisterFinish checks what the device made and keeps its public key.
func (h *PasskeyHandler) RegisterFinish(w http.ResponseWriter, r *http.Request) {
	rpID, origin, err := relyingParty(r)
	if err != nil {
		http.Error(w, "passkey.not_available", http.StatusConflict)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	var input struct {
		Name              string `json:"name"`
		ClientDataJSON    string `json:"clientDataJSON"`
		AttestationObject string `json:"attestationObject"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	clientData, ok1 := decodeB64Field(input.ClientDataJSON)
	attestation, ok2 := decodeB64Field(input.AttestationObject)
	if !ok1 || !ok2 {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	userID := middleware.GetUserIDFromContext(r)

	challenge, err := webauthn.CheckClientData(clientData, webauthn.TypeCreate, origin)
	if err != nil {
		log.Printf("passkey: creation refused for account %d: %v", userID, err)
		http.Error(w, "passkey.refused", http.StatusBadRequest)
		return
	}
	owner, _, err := takePasskeyChallenge(r.Context(), h.DB, challenge, passkeyPurposeRegister)
	if errors.Is(err, errChallengeGone) || (err == nil && (!owner.Valid || int(owner.Int64) != userID)) {
		http.Error(w, "passkey.expired", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	ad, err := webauthn.ParseAttestationObject(attestation)
	if err == nil {
		err = ad.Check(rpID)
	}
	var key webauthn.PublicKey
	if err == nil {
		key, err = webauthn.ParsePublicKey(ad.PublicKey)
	}
	if err != nil {
		log.Printf("passkey: creation refused for account %d: %v", userID, err)
		http.Error(w, "passkey.refused", http.StatusBadRequest)
		return
	}

	name := strings.TrimSpace(input.Name)
	if runes := []rune(name); len(runes) > maxPasskeyName {
		name = string(runes[:maxPasskeyName])
	}
	if name == "" {
		name = "Passkey"
	}
	res, err := h.DB.ExecContext(r.Context(), `INSERT INTO user_passkeys
		(user_id, credential_id, public_key, alg, sign_count, name, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (credential_id) DO NOTHING`,
		userID, webauthn.B64.EncodeToString(ad.CredentialID), ad.PublicKey, key.Alg, ad.SignCount, name, time.Now().Unix())
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if n, _ := res.RowsAffected(); n != 1 {
		http.Error(w, "passkey.already_added", http.StatusConflict)
		return
	}
	id, _ := res.LastInsertId()
	writeJSONStatus(w, http.StatusCreated, map[string]any{"id": id, "name": name})
}

// Delete removes one of the account's passkeys. Another account's is not found.
func (h *PasskeyHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	res, err := h.DB.ExecContext(r.Context(), `DELETE FROM user_passkeys WHERE id = ? AND user_id = ?`,
		id, middleware.GetUserIDFromContext(r))
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if n, _ := res.RowsAffected(); n != 1 {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

/* ---------------------------------------------------------------------------
 * Signing in with a passkey
 * ------------------------------------------------------------------------ */

// PasskeyLoginBegin hands the browser a challenge. It does not ask who is
// signing in: the passkey the person picks says so.
func (h *AuthHandler) PasskeyLoginBegin(w http.ResponseWriter, r *http.Request) {
	rpID, _, err := relyingParty(r)
	if err != nil {
		http.Error(w, "passkey.not_available", http.StatusConflict)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1024)
	var input struct {
		RememberMe bool `json:"remember_me"`
	}
	_ = json.NewDecoder(r.Body).Decode(&input)
	challenge, err := newPasskeyChallenge(r.Context(), h.DB, passkeyPurposeLogin, 0, input.RememberMe)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{
		"challenge":        webauthn.B64.EncodeToString(challenge),
		"rpId":             rpID,
		"timeout":          passkeyTimeoutMS,
		"userVerification": "required",
	})
}

// PasskeyLoginFinish checks the passkey's signature and signs its account in.
func (h *AuthHandler) PasskeyLoginFinish(w http.ResponseWriter, r *http.Request) {
	ip := util.ClientIP(r)
	if locked, err := attemptsLockedOut(r.Context(), h.DB, ip); err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	} else if locked {
		http.Error(w, "auth.too_many_attempts", http.StatusTooManyRequests)
		return
	}
	rpID, origin, err := relyingParty(r)
	if err != nil {
		http.Error(w, "passkey.not_available", http.StatusConflict)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	var input struct {
		CredentialID      string `json:"credentialId"`
		ClientDataJSON    string `json:"clientDataJSON"`
		AuthenticatorData string `json:"authenticatorData"`
		Signature         string `json:"signature"`
		UserHandle        string `json:"userHandle"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	credID, ok1 := decodeB64Field(input.CredentialID)
	clientData, ok2 := decodeB64Field(input.ClientDataJSON)
	authData, ok3 := decodeB64Field(input.AuthenticatorData)
	sig, ok4 := decodeB64Field(input.Signature)
	if !ok1 || !ok2 || !ok3 || !ok4 {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	// Every way this can fail looks the same from outside, and counts.
	refuse := func(why error) {
		log.Printf("passkey: sign-in refused from %s: %v", ip, why)
		recordFailedAttempt(h.DB, ip)
		http.Error(w, "passkey.refused", http.StatusUnauthorized)
	}

	challenge, err := webauthn.CheckClientData(clientData, webauthn.TypeGet, origin)
	if err != nil {
		refuse(err)
		return
	}
	_, remember, err := takePasskeyChallenge(r.Context(), h.DB, challenge, passkeyPurposeLogin)
	if errors.Is(err, errChallengeGone) {
		http.Error(w, "passkey.expired", http.StatusUnauthorized)
		return
	}
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}

	var (
		passkeyID int64
		userID    int
		cose      []byte
		stored    int64
		handle    []byte
	)
	err = h.DB.QueryRowContext(r.Context(), `SELECT p.id, p.user_id, p.public_key, p.sign_count, COALESCE(h.handle, x'')
		FROM user_passkeys p LEFT JOIN user_passkey_handles h ON h.user_id = p.user_id
		WHERE p.credential_id = ?`, webauthn.B64.EncodeToString(credID)).Scan(&passkeyID, &userID, &cose, &stored, &handle)
	if errors.Is(err, sql.ErrNoRows) {
		refuse(errors.New("no such passkey"))
		return
	}
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	// A device that names its account must name this one.
	if input.UserHandle != "" {
		if sent, ok := decodeB64Field(input.UserHandle); !ok || string(sent) != string(handle) {
			refuse(errors.New("the passkey named another account"))
			return
		}
	}
	ad, err := webauthn.ParseAuthData(authData)
	if err == nil {
		err = ad.Check(rpID)
	}
	var key webauthn.PublicKey
	if err == nil {
		key, err = webauthn.ParsePublicKey(cose)
	}
	if err == nil {
		err = key.Verify(authData, clientData, sig)
	}
	if err == nil && !webauthn.CounterAllows(uint32(stored), ad.SignCount) {
		err = errors.New("the signature counter went back: the passkey may have been copied")
	}
	if err != nil {
		refuse(err)
		return
	}
	// The counter moves only from the value just read, so two answers signed
	// with the same count cannot both sign in.
	res, err := h.DB.ExecContext(r.Context(), `UPDATE user_passkeys SET sign_count = ?, last_used_at = ?
		WHERE id = ? AND sign_count = ?`, ad.SignCount, time.Now().Unix(), passkeyID, stored)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	if n, _ := res.RowsAffected(); n != 1 {
		refuse(errors.New("the passkey was used at the same moment"))
		return
	}

	clearAttempts(h.DB, ip)
	var passwordVersion int
	if err := h.DB.QueryRowContext(r.Context(), `SELECT password_version FROM users WHERE id = ?`, userID).Scan(&passwordVersion); err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	h.startSession(w, r, userID, passwordVersion, remember)
}
