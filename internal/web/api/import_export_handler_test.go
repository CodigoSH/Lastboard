package api

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// importRequest builds the multipart upload the frontend sends to ImportParse.
// Passing an empty filename omits the file part entirely.
func importRequest(t *testing.T, format, filename, content string) *http.Request {
	t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	if format != "" {
		if err := mw.WriteField("format", format); err != nil {
			t.Fatalf("write format field: %v", err)
		}
	}
	if filename != "" {
		part, err := mw.CreateFormFile("file", filename)
		if err != nil {
			t.Fatalf("create form file: %v", err)
		}
		if _, err := part.Write([]byte(content)); err != nil {
			t.Fatalf("write file part: %v", err)
		}
	}
	if err := mw.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/import/parse", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	return req
}

const dashyYAML = `
sections:
  - name: Media
    items:
      - title: Plex
        url: https://plex.tv
        statusCheck: true
`

// TestImportParseDashy walks the whole handler for a real Dashy file and checks
// the JSON the frontend materializes actually carries the parsed items.
func TestImportParseDashy(t *testing.T) {
	h := NewImportExportHandler(nil)
	rec := httptest.NewRecorder()
	h.ImportParse(rec, importRequest(t, "dashy", "conf.yml", dashyYAML))

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q", ct)
	}
	var cfg NativeConfig
	if err := json.Unmarshal(rec.Body.Bytes(), &cfg); err != nil {
		t.Fatalf("response is not a NativeConfig: %v", err)
	}
	if len(cfg.Dashboards) != 1 || len(cfg.Dashboards[0].Items) != 1 {
		t.Fatalf("unexpected shape: %+v", cfg)
	}
	if got := cfg.Dashboards[0].Items[0].Title; got != "Plex" {
		t.Errorf("title = %q, want Plex", got)
	}
}

// TestImportParseAcceptsEveryFormat guards the format switch: a typo in any
// case label would silently degrade to "unsupported file".
func TestImportParseAcceptsEveryFormat(t *testing.T) {
	cases := []struct {
		format  string
		content string
	}{
		{"dashy", dashyYAML},
		{"native", "version: 1\ndashboards:\n  - name: Home\n    items:\n      - type: bookmark\n        title: Router\n        url: http://192.168.1.1\n"},
		{"homepage-services", "- Media:\n    - Plex:\n        href: https://plex.tv\n"},
		{"homepage-bookmarks", "- Dev:\n    - Forgejo:\n        - href: https://codigosh.com\n"},
	}
	for _, tc := range cases {
		t.Run(tc.format, func(t *testing.T) {
			h := NewImportExportHandler(nil)
			rec := httptest.NewRecorder()
			h.ImportParse(rec, importRequest(t, tc.format, "in.yaml", tc.content))

			if rec.Code != http.StatusOK {
				t.Fatalf("expected 200 for %s, got %d (%s)", tc.format, rec.Code, rec.Body.String())
			}
			var cfg NativeConfig
			if err := json.Unmarshal(rec.Body.Bytes(), &cfg); err != nil {
				t.Fatalf("response is not a NativeConfig: %v", err)
			}
			if len(cfg.Dashboards) == 0 {
				t.Errorf("%s produced no dashboards", tc.format)
			}
		})
	}
}

func TestImportParseRejectsUnknownFormat(t *testing.T) {
	h := NewImportExportHandler(nil)
	rec := httptest.NewRecorder()
	h.ImportParse(rec, importRequest(t, "heimdall", "conf.yml", dashyYAML))

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestImportParseRejectsMissingFile(t *testing.T) {
	h := NewImportExportHandler(nil)
	rec := httptest.NewRecorder()
	h.ImportParse(rec, importRequest(t, "dashy", "", ""))

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 when no file is uploaded, got %d", rec.Code)
	}
}

func TestImportParseRejectsNonMultipart(t *testing.T) {
	h := NewImportExportHandler(nil)
	req := httptest.NewRequest(http.MethodPost, "/api/import/parse", strings.NewReader(`{"format":"dashy"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ImportParse(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for a non-multipart body, got %d", rec.Code)
	}
}

// TestImportParseRejectsMalformedYAML distinguishes "bad request" from "valid
// request, unusable file": a broken upload must be 422, not 400, so the UI can
// tell the user their file is the problem.
func TestImportParseRejectsMalformedYAML(t *testing.T) {
	h := NewImportExportHandler(nil)
	rec := httptest.NewRecorder()
	h.ImportParse(rec, importRequest(t, "dashy", "conf.yml", "sections: [this is: not valid yaml"))

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for malformed YAML, got %d (%s)", rec.Code, rec.Body.String())
	}
}

// TestImportParseRejectsEmptyResult covers valid YAML that yields nothing
// importable — the parsers report "no items" and the handler must not answer
// 200 with an empty config.
func TestImportParseRejectsEmptyResult(t *testing.T) {
	h := NewImportExportHandler(nil)
	rec := httptest.NewRecorder()
	h.ImportParse(rec, importRequest(t, "dashy", "conf.yml", "sections: []"))

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for an empty Dashy file, got %d (%s)", rec.Code, rec.Body.String())
	}
}
