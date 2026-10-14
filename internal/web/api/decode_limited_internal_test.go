package api

import (
	"errors"
	"strings"
	"testing"
)

func TestDecodeLimitedTakesWhatFitsAndRefusesWhatDoesNot(t *testing.T) {
	body := `{"name":"` + strings.Repeat("x", 100) + `"}`

	var ok struct{ Name string }
	if err := decodeLimited(strings.NewReader(body), int64(len(body)), &ok); err != nil || len(ok.Name) != 100 {
		t.Fatalf("an answer exactly at the ceiling: %v, %d bytes of name", err, len(ok.Name))
	}

	var big struct{ Name string }
	err := decodeLimited(strings.NewReader(body), int64(len(body))-1, &big)
	if !errors.Is(err, errAnswerTooLarge) {
		t.Errorf("an answer one byte over the ceiling answered %v, want errAnswerTooLarge", err)
	}

	// A truncated answer that is simply broken is still reported as broken.
	var broken struct{ Name string }
	if err := decodeLimited(strings.NewReader(`{"name":`), 1000, &broken); err == nil || errors.Is(err, errAnswerTooLarge) {
		t.Errorf("a broken answer under the ceiling answered %v, want a decode error", err)
	}
}
