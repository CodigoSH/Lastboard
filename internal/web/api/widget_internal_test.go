package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
)

func TestTokenizePath(t *testing.T) {
	cases := map[string][]any{
		"a":         {"a"},
		"a.b.c":     {"a", "b", "c"},
		"a.b[0].c":  {"a", "b", 0, "c"},
		"[2]":       {2},
		"a[0][1]":   {"a", 0, 1},
		"queue[10]": {"queue", 10},
	}
	for path, want := range cases {
		if got := tokenizePath(path); !reflect.DeepEqual(got, want) {
			t.Errorf("tokenizePath(%q) = %v, want %v", path, got, want)
		}
	}
}

func TestExtractPath(t *testing.T) {
	var data any
	json.Unmarshal([]byte(`{"a":{"b":[10,20]},"totals":{"today":42}}`), &data)

	if got := extractPath(data, "totals.today"); got != float64(42) {
		t.Errorf(`extractPath "totals.today" = %v, want 42`, got)
	}
	if got := extractPath(data, "a.b[1]"); got != float64(20) {
		t.Errorf(`extractPath "a.b[1]" = %v, want 20`, got)
	}
	if got := extractPath(data, "a.missing"); got != nil {
		t.Errorf(`extractPath "a.missing" = %v, want nil`, got)
	}
	if got := extractPath(data, "a.b[9]"); got != nil {
		t.Errorf(`extractPath "a.b[9]" (out of range) = %v, want nil`, got)
	}
}

func TestApiFetch_ExtractsValues(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Api-Key") != "secret" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"totals":{"today":42},"items":[{"name":"alpha"}]}`))
	}))
	defer upstream.Close()

	body := `{"url":"` + upstream.URL + `","headers":{"X-Api-Key":"secret"},"paths":["totals.today","items[0].name"]}`
	req := httptest.NewRequest("POST", "/api/widget/api-fetch", strings.NewReader(body))
	rec := httptest.NewRecorder()

	NewWidgetHandler().ApiFetch(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var resp struct {
		OK     bool           `json:"ok"`
		Values map[string]any `json:"values"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !resp.OK {
		t.Error("expected ok=true")
	}
	if resp.Values["totals.today"] != float64(42) {
		t.Errorf("totals.today = %v, want 42", resp.Values["totals.today"])
	}
	if resp.Values["items[0].name"] != "alpha" {
		t.Errorf("items[0].name = %v, want alpha", resp.Values["items[0].name"])
	}
}

func TestApiFetch_RejectsBadScheme(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/widget/api-fetch", strings.NewReader(`{"url":"file:///etc/passwd","paths":["x"]}`))
	rec := httptest.NewRecorder()
	NewWidgetHandler().ApiFetch(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for non-http scheme, got %d", rec.Code)
	}
}
