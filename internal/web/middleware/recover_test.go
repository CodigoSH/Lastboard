package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// A panicking handler answers 500 instead of dropping the connection, and the
// server keeps serving.
func TestRecoverAnswersInsteadOfDroppingTheConnection(t *testing.T) {
	h := Recover(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("something went wrong deep inside")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/dashboard/items", nil)
	w := httptest.NewRecorder()

	defer func() {
		if rec := recover(); rec != nil {
			t.Fatalf("the panic escaped Recover: %v", rec)
		}
	}()
	h.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", w.Code, http.StatusInternalServerError)
	}
}

// A client hanging up mid-response makes handlers panic with ErrAbortHandler by
// design. That is not a fault, and swallowing it would turn a normal
// disconnection into a logged incident.
func TestRecoverLetsAbortHandlerThrough(t *testing.T) {
	h := Recover(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic(http.ErrAbortHandler)
	}))

	got := func() (rec any) {
		defer func() { rec = recover() }()
		h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
		return nil
	}()
	if got != http.ErrAbortHandler {
		t.Errorf("Recover swallowed ErrAbortHandler, got %v", got)
	}
}

// The handler that does not panic is left entirely alone.
func TestRecoverIsTransparentWhenNothingPanics(t *testing.T) {
	reached := false
	h := Recover(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reached = true
		w.WriteHeader(http.StatusTeapot)
	}))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/", nil))
	if !reached || w.Code != http.StatusTeapot {
		t.Errorf("want the handler reached and its own status, got %d reached=%v", w.Code, reached)
	}
}
