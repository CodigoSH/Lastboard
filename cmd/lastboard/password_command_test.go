package main

import (
	"bytes"
	"context"
	"os"
	"strings"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/password"
)

// scripted stands in for the terminal: it answers each question in turn.
type scripted struct {
	terminal bool
	answers  []string
	asked    int
}

func (s *scripted) Terminal() bool { return s.terminal }
func (s *scripted) Ask(string) ([]byte, error) {
	a := s.answers[s.asked]
	s.asked++
	return []byte(a), nil
}

func resetFixture(t *testing.T) *database.DB {
	t.Helper()
	tmp, err := os.CreateTemp("", "lastboard_cmd_*.db")
	if err != nil {
		t.Fatal(err)
	}
	tmp.Close()
	db, err := database.InitDB(tmp.Name())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close(); os.Remove(tmp.Name()) })
	hash, err := password.Hash("the-old-password")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.DB.Exec(`INSERT INTO users (username, password, role) VALUES ('boss', ?, 'admin')`, hash); err != nil {
		t.Fatal(err)
	}
	return db
}

func storedMatches(t *testing.T, db *database.DB, plain string) bool {
	t.Helper()
	var hash string
	if err := db.DB.QueryRow(`SELECT password FROM users WHERE username = 'boss'`).Scan(&hash); err != nil {
		t.Fatal(err)
	}
	return password.Verify(plain, hash) == nil
}

func TestPasswordResetSetsTheNewPasswordAndSaysNothingOfIt(t *testing.T) {
	db := resetFixture(t)
	in := &scripted{terminal: true, answers: []string{"a-brand-new-pass", "a-brand-new-pass"}}
	var out, errOut bytes.Buffer

	if code := resetPassword(context.Background(), db, "boss", in, &out, &errOut); code != 0 {
		t.Fatalf("exit %d: %s", code, errOut.String())
	}
	if !storedMatches(t, db, "a-brand-new-pass") || storedMatches(t, db, "the-old-password") {
		t.Error("the stored password is not the new one")
	}
	if !strings.Contains(out.String(), "boss") {
		t.Errorf("the confirmation does not name the account: %q", out.String())
	}
	if strings.Contains(out.String()+errOut.String(), "a-brand-new-pass") {
		t.Error("the password was written to the output")
	}
}

func TestPasswordResetNeedsATerminal(t *testing.T) {
	db := resetFixture(t)
	in := &scripted{terminal: false, answers: []string{"a-brand-new-pass", "a-brand-new-pass"}}
	var out, errOut bytes.Buffer

	if code := resetPassword(context.Background(), db, "boss", in, &out, &errOut); code == 0 {
		t.Fatal("it went ahead without a terminal")
	}
	if in.asked != 0 {
		t.Errorf("it asked %d times with nobody to ask", in.asked)
	}
	if !strings.Contains(errOut.String(), "docker exec -it") {
		t.Errorf("the refusal does not say how to run it in Docker: %q", errOut.String())
	}
	if !storedMatches(t, db, "the-old-password") {
		t.Error("the password changed")
	}
}

func TestPasswordResetChangesNothingWhenTheTwoDiffer(t *testing.T) {
	db := resetFixture(t)
	in := &scripted{terminal: true, answers: []string{"a-brand-new-pass", "another-one-pass"}}
	var out, errOut bytes.Buffer

	if code := resetPassword(context.Background(), db, "boss", in, &out, &errOut); code == 0 {
		t.Fatal("two different passwords were accepted")
	}
	if !storedMatches(t, db, "the-old-password") {
		t.Error("the password changed")
	}
}

func TestPasswordResetRefusesAnUnknownAccountBeforeAsking(t *testing.T) {
	db := resetFixture(t)
	in := &scripted{terminal: true, answers: []string{"a-brand-new-pass", "a-brand-new-pass"}}
	var out, errOut bytes.Buffer

	if code := resetPassword(context.Background(), db, "nobody", in, &out, &errOut); code == 0 {
		t.Fatal("an account that does not exist was accepted")
	}
	if in.asked != 0 {
		t.Errorf("it asked for a password %d times for an account that is not there", in.asked)
	}
	if !strings.Contains(errOut.String(), "nobody") {
		t.Errorf("the refusal does not name the account: %q", errOut.String())
	}
}
