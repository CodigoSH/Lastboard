package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
)

// errAnswerTooLarge is what reading an answer that goes past its ceiling reports.
var errAnswerTooLarge = errors.New("answer too large")

// decodeLimited reads one JSON value from an answer that comes from outside —
// a Docker daemon, the release server — refusing to take more than max bytes.
// The client's timeout bounds how long an answer may take, not how much of it
// is kept in memory meanwhile.
func decodeLimited(r io.Reader, max int64, v any) error {
	// One byte past the ceiling is read, to tell an answer that ends exactly at
	// it from one that goes on.
	lr := &io.LimitedReader{R: r, N: max + 1}
	if err := json.NewDecoder(lr).Decode(v); err != nil {
		if lr.N <= 0 {
			return fmt.Errorf("%w: more than %d bytes", errAnswerTooLarge, max)
		}
		return err
	}
	if lr.N <= 0 {
		return fmt.Errorf("%w: more than %d bytes", errAnswerTooLarge, max)
	}
	return nil
}

// The most a Docker daemon or agent may send in one answer (a list of
// containers, one stats reading), and the most the release server may send.
const (
	dockerMaxAnswer  int64 = 32 << 20
	releaseMaxAnswer int64 = 8 << 20
)
