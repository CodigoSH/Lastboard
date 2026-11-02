package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func serve(h http.Handler, acceptGzip bool) *httptest.ResponseRecorder {
	r := httptest.NewRequest("GET", "/api/x", nil)
	if acceptGzip {
		r.Header.Set("Accept-Encoding", "gzip, br")
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestJSONIsCompressedForWhoAcceptsItAndOnlyThen(t *testing.T) {
	body := strings.Repeat(`{"name":"service","status":"up"},`, 200)
	jsonH := GzipJSON(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, body)
	}))

	w := serve(jsonH, true)
	if w.Header().Get("Content-Encoding") != "gzip" {
		t.Fatalf("not compressed for a client that accepts gzip: %v", w.Header())
	}
	zr, err := gzip.NewReader(w.Body)
	if err != nil {
		t.Fatal(err)
	}
	got, _ := io.ReadAll(zr)
	if string(got) != body {
		t.Errorf("the body does not survive compression")
	}
	if w.Body.Len() >= len(body)/2 {
		t.Errorf("compressed %d of %d bytes: barely smaller", w.Body.Len(), len(body))
	}

	plain := serve(jsonH, false)
	if plain.Header().Get("Content-Encoding") != "" || plain.Body.String() != body {
		t.Errorf("a client that does not accept gzip must get the body as it was")
	}
	if !strings.Contains(plain.Header().Get("Vary"), "Accept-Encoding") {
		t.Errorf("a cache must be told the answer depends on Accept-Encoding")
	}
}

func TestAnErrorOrANonJSONAnswerGoesThroughAsItWas(t *testing.T) {
	errH := GzipJSON(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
	}))
	if w := serve(errH, true); w.Header().Get("Content-Encoding") != "" || !strings.Contains(w.Body.String(), "general.internal_error") {
		t.Errorf("an error was compressed: %v %q", w.Header(), w.Body.String())
	}
	textH := GzipJSON(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		io.WriteString(w, "data: x\n\n")
	}))
	if w := serve(textH, true); w.Header().Get("Content-Encoding") != "" || w.Body.String() != "data: x\n\n" {
		t.Errorf("a stream was compressed: %v", w.Header())
	}
}
