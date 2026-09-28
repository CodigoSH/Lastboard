package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestAFailedCheckIsNotUpToDate.
//
// A release server that could not be asked used to be answered exactly like
// one that had nothing newer — available false, latest equal to current — and
// the panel told the operator "You're up to date". The answer now says the
// check failed, and a check that worked says nothing of the kind.
func TestAFailedCheckIsNotUpToDate(t *testing.T) {
	check := func(latest func(bool) (string, string, error)) UpdateResponse {
		h := &UpdateHandler{latest: latest, docker: func() bool { return false }}
		rec := httptest.NewRecorder()
		h.CheckUpdate(rec, httptest.NewRequest(http.MethodGet, "/api/system/update/check?beta=true", nil))
		var out UpdateResponse
		if err := json.NewDecoder(rec.Body).Decode(&out); err != nil {
			t.Fatal(err)
		}
		return out
	}

	failed := check(func(bool) (string, string, error) { return "", "", errors.New("no route to host") })
	if failed.CheckError != "settings.update_check_failed" || failed.Available {
		t.Errorf("a check that could not reach the forge answered %+v", failed)
	}

	reached := check(func(bool) (string, string, error) { return "v0.0.1", "", nil })
	if reached.CheckError != "" {
		t.Errorf("a check that reached the forge reported %q", reached.CheckError)
	}
}
