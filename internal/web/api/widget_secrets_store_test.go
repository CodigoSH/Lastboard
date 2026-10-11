package api

import (
	"strings"
	"testing"
)

func secretsFixture(t *testing.T) (*WidgetSecrets, int) {
	t.Helper()
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	db.Exec(`INSERT INTO users (id, username, password, role) VALUES (1, 'u', 'p', 'user')`)
	res, err := db.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (1, 'widget', 0, 0, 1, 1, '{}')`)
	if err != nil {
		t.Fatal(err)
	}
	id, _ := res.LastInsertId()
	return NewWidgetSecrets(db), int(id)
}

func TestSecretsAreSetReadAndCleared(t *testing.T) {
	s, id := secretsFixture(t)
	if err := s.Apply(id, map[string]string{"password": "first", "header.x-api-key": "k1"}, nil); err != nil {
		t.Fatal(err)
	}
	names, _ := s.Names(id)
	if strings.Join(names, ",") != "header.x-api-key,password" {
		t.Fatalf("names = %v", names)
	}
	if v, ok := s.Get(id, "password"); !ok || v != "first" {
		t.Fatalf("get = %q %v", v, ok)
	}

	// A second set replaces; a clear removes; one call can do both.
	if err := s.Apply(id, map[string]string{"password": "second"}, []string{"header.x-api-key"}); err != nil {
		t.Fatal(err)
	}
	if v, _ := s.Get(id, "password"); v != "second" {
		t.Errorf("replace failed: %q", v)
	}
	if _, ok := s.Get(id, "header.x-api-key"); ok {
		t.Error("clear did not remove it")
	}
}

// A refused name or value must change nothing, not half of the batch.
func TestABadSecretLeavesTheOthersAlone(t *testing.T) {
	s, id := secretsFixture(t)
	s.Apply(id, map[string]string{"password": "keep"}, nil)

	cases := map[string]map[string]string{
		"upper case name": {"Password": "x"},
		"space in name":   {"pass word": "x"},
		"starts with dot": {".password": "x"},
		"empty name":      {"": "x"},
		"empty value":     {"token": ""},
		"too long":        {"token": strings.Repeat("a", maxSecretLen+1)},
	}
	for label, set := range cases {
		// Pair the bad entry with a good one to prove the good one does not land either.
		batch := map[string]string{"good": "v"}
		for k, v := range set {
			batch[k] = v
		}
		if err := s.Apply(id, batch, []string{"password"}); err == nil {
			t.Errorf("%s: accepted", label)
		}
		if v, ok := s.Get(id, "password"); !ok || v != "keep" {
			t.Fatalf("%s: the existing secret changed (%q, %v)", label, v, ok)
		}
		if _, ok := s.Get(id, "good"); ok {
			t.Fatalf("%s: part of a refused batch was stored", label)
		}
	}
	if err := s.Apply(id, nil, []string{"Bad Name"}); err == nil {
		t.Error("a bad name to clear was accepted")
	}
}

func TestAWidgetHasAnUpperLimitOfSecrets(t *testing.T) {
	s, id := secretsFixture(t)
	set := map[string]string{}
	for i := 0; i < maxSecretsPerWidget; i++ {
		set["s"+string(rune('a'+i))] = "v"
	}
	if err := s.Apply(id, set, nil); err != nil {
		t.Fatalf("exactly the limit was refused: %v", err)
	}
	if err := s.Apply(id, map[string]string{"one-more": "v"}, nil); err == nil {
		t.Fatal("one more than the limit was accepted")
	}
	if names, _ := s.Names(id); len(names) != maxSecretsPerWidget {
		t.Errorf("a refused batch left %d secrets", len(names))
	}
}

// Deleting the widget deletes what it kept: nothing is left behind to be read
// by whoever is given the same id later, or to sit in a backup.
func TestDeletingAWidgetDeletesItsSecrets(t *testing.T) {
	s, id := secretsFixture(t)
	s.Apply(id, map[string]string{"password": "p"}, nil)
	if _, err := s.DB.Exec(`DELETE FROM items WHERE id = ?`, id); err != nil {
		t.Fatal(err)
	}
	var n int
	s.DB.QueryRow(`SELECT COUNT(*) FROM widget_secrets`).Scan(&n)
	if n != 0 {
		t.Fatalf("%d secrets outlived their widget", n)
	}
}
