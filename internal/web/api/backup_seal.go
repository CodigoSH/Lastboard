package api

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"

	"golang.org/x/crypto/argon2"
)

/*
A backup can be protected with a password chosen at the moment it is made.

The file is the whole backup sealed under a key derived from that password, so
nothing inside it — accounts, boards, the API keys held in widgets, the
Proxmox token — is readable without it. The password is not stored anywhere:
lose it and the file cannot be opened, which is why the interface says so
before the backup is made.

The envelope names its own parameters so a later version can raise them, and
binds them to the ciphertext so they cannot be swapped for weaker ones.
*/

const (
	sealFormat  = "lastboard-backup"
	sealVersion = 1

	// The same cost the house uses for passwords: 64 MiB, 3 passes, 2 lanes.
	sealMemoryKiB = 64 * 1024
	sealPasses    = 3
	sealLanes     = 2
)

var (
	// errBackupPassword is what a wrong password and a damaged file both look
	// like: AES-GCM cannot tell them apart, and pretending it could would only
	// be guessing.
	errBackupPassword = errors.New("backup password is wrong or the file is damaged")

	errBackupUnsupported = errors.New("backup was sealed with parameters this version does not read")
)

type sealedBackup struct {
	Format    string `json:"format"`
	Encrypted bool   `json:"encrypted"`
	Version   int    `json:"version"`
	KDF       string `json:"kdf"`
	Memory    uint32 `json:"m"`
	Passes    uint32 `json:"t"`
	Lanes     uint8  `json:"p"`
	Salt      string `json:"salt"`
	Nonce     string `json:"nonce"`
	Data      string `json:"data"`
}

// header is what the ciphertext is bound to, so changing any parameter in the
// file makes it fail to open instead of opening under a cheaper key.
func (s sealedBackup) header() []byte {
	return []byte(fmt.Sprintf("%s/%d/%s/%d/%d/%d", s.Format, s.Version, s.KDF, s.Memory, s.Passes, s.Lanes))
}

func sealKey(password string, salt []byte, memory, passes uint32, lanes uint8) []byte {
	return argon2.IDKey([]byte(password), salt, passes, memory, lanes, 32)
}

// isSealedBackup says whether the bytes are a protected backup, without
// needing the password.
func isSealedBackup(data []byte) bool {
	var probe struct {
		Format    string `json:"format"`
		Encrypted bool   `json:"encrypted"`
	}
	if err := json.Unmarshal(data, &probe); err != nil {
		return false
	}
	return probe.Encrypted && probe.Format == sealFormat
}

// sealBackup protects plain under password.
func sealBackup(plain []byte, password string) ([]byte, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return nil, err
	}
	env := sealedBackup{
		Format: sealFormat, Encrypted: true, Version: sealVersion, KDF: "argon2id",
		Memory: sealMemoryKiB, Passes: sealPasses, Lanes: sealLanes,
	}
	block, err := aes.NewCipher(sealKey(password, salt, env.Memory, env.Passes, env.Lanes))
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	env.Salt = base64.StdEncoding.EncodeToString(salt)
	env.Nonce = base64.StdEncoding.EncodeToString(nonce)
	env.Data = base64.StdEncoding.EncodeToString(gcm.Seal(nil, nonce, plain, env.header()))

	var out bytes.Buffer
	enc := json.NewEncoder(&out)
	enc.SetIndent("", "  ")
	if err := enc.Encode(env); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

// openBackup reverses sealBackup.
//
// Only the parameters this version writes are accepted. A file that names a
// different memory cost would otherwise let whoever made it choose how much
// memory the server spends on the attempt.
func openBackup(sealed []byte, password string) ([]byte, error) {
	var env sealedBackup
	if err := json.Unmarshal(sealed, &env); err != nil || env.Format != sealFormat || !env.Encrypted {
		return nil, errBackupPassword
	}
	if env.Version != sealVersion || env.KDF != "argon2id" ||
		env.Memory != sealMemoryKiB || env.Passes != sealPasses || env.Lanes != sealLanes {
		return nil, errBackupUnsupported
	}
	salt, err1 := base64.StdEncoding.DecodeString(env.Salt)
	nonce, err2 := base64.StdEncoding.DecodeString(env.Nonce)
	data, err3 := base64.StdEncoding.DecodeString(env.Data)
	if err1 != nil || err2 != nil || err3 != nil || len(salt) == 0 {
		return nil, errBackupPassword
	}
	block, err := aes.NewCipher(sealKey(password, salt, env.Memory, env.Passes, env.Lanes))
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if len(nonce) != gcm.NonceSize() {
		return nil, errBackupPassword
	}
	plain, err := gcm.Open(nil, nonce, data, env.header())
	if err != nil {
		return nil, errBackupPassword
	}
	return plain, nil
}
