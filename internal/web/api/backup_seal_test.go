package api

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"testing"
)

// The file must not contain what it protects. A sealed backup that still had
// the usernames or the API keys in it would be a plain one with extra steps.
func TestSealedBackupHidesItsContents(t *testing.T) {
	plain := []byte(`{"users":[{"username":"marta","password":"$2a$hash"}],"settings":{"proxmox_hosts":"{\"secret\":\"tok-123\"}"}}`)

	sealed, err := sealBackup(plain, "correct horse")
	if err != nil {
		t.Fatal(err)
	}
	for _, leak := range []string{"marta", "tok-123", "$2a$hash", "proxmox_hosts"} {
		if bytes.Contains(sealed, []byte(leak)) {
			t.Errorf("sealed file still contains %q", leak)
		}
	}
	if !isSealedBackup(sealed) {
		t.Error("a sealed file is not recognised as sealed")
	}
	if isSealedBackup(plain) {
		t.Error("a plain backup is taken for a sealed one")
	}

	opened, err := openBackup(sealed, "correct horse")
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(opened, plain) {
		t.Errorf("round trip changed the backup: %s", opened)
	}
}

func TestSealedBackupRefusesAWrongPassword(t *testing.T) {
	sealed, err := sealBackup([]byte(`{"users":[]}`), "right")
	if err != nil {
		t.Fatal(err)
	}
	for _, pw := range []string{"wrong", "Right", "right ", ""} {
		if _, err := openBackup(sealed, pw); !errors.Is(err, errBackupPassword) {
			t.Errorf("password %q: got %v, want errBackupPassword", pw, err)
		}
	}
}

// Two backups of the same data under the same password must differ, or the
// file gives away that nothing changed between them.
func TestSealedBackupsDoNotRepeat(t *testing.T) {
	a, _ := sealBackup([]byte(`{}`), "pw")
	b, _ := sealBackup([]byte(`{}`), "pw")
	if bytes.Equal(a, b) {
		t.Error("two seals of the same backup are identical: salt or nonce is fixed")
	}
}

// The parameters sit in the file, so they must be tied to the ciphertext and
// limited: a file that names its own cost chooses what the server spends.
func TestSealedBackupParametersCannotBeChanged(t *testing.T) {
	sealed, err := sealBackup([]byte(`{}`), "pw")
	if err != nil {
		t.Fatal(err)
	}
	var env sealedBackup
	if err := json.Unmarshal(sealed, &env); err != nil {
		t.Fatal(err)
	}

	cheaper := env
	cheaper.Passes = 1
	raw, _ := json.Marshal(cheaper)
	if _, err := openBackup(raw, "pw"); !errors.Is(err, errBackupUnsupported) {
		t.Errorf("lowered passes: got %v, want errBackupUnsupported", err)
	}

	huge := env
	huge.Memory = 4 * 1024 * 1024
	raw, _ = json.Marshal(huge)
	if _, err := openBackup(raw, "pw"); !errors.Is(err, errBackupUnsupported) {
		t.Errorf("a file naming 4 GiB: got %v, want errBackupUnsupported", err)
	}

	tampered := env
	data, _ := base64.StdEncoding.DecodeString(env.Data)
	data[0] ^= 1
	tampered.Data = base64.StdEncoding.EncodeToString(data)
	raw, _ = json.Marshal(tampered)
	if _, err := openBackup(raw, "pw"); !errors.Is(err, errBackupPassword) {
		t.Errorf("flipped bit: got %v, want errBackupPassword", err)
	}
}
