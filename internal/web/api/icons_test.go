package api

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// A one-pixel PNG, so the tests exercise real image bytes rather than a string
// that happens to pass a check.
const onePixelPNGBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

func onePixelPNG(t *testing.T) []byte {
	t.Helper()
	data, err := base64.StdEncoding.DecodeString(onePixelPNGBase64)
	if err != nil {
		t.Fatalf("bad test fixture: %v", err)
	}
	return data
}

func TestLooksLikeSVG(t *testing.T) {
	cases := map[string]bool{
		`<svg xmlns="http://www.w3.org/2000/svg"></svg>`:                 true,
		`<?xml version="1.0"?>` + "\n" + `<svg viewBox="0 0 1 1"></svg>`: true,
		"\ufeff" + `<svg></svg>`:                                         true,
		`   <!-- a comment -->` + "\n\t" + `<SVG></SVG>`:                 true,
		`<html><body>no</body></html>`:                                   false,
		`{"json":true}`:                                                  false,
		``:                                                               false,
	}
	for input, want := range cases {
		if got := looksLikeSVG([]byte(input)); got != want {
			t.Errorf("looksLikeSVG(%.30q) = %v, want %v", input, got, want)
		}
	}
}

func TestNormalizeIconType(t *testing.T) {
	png := onePixelPNG(t)

	t.Run("bytes win over a wrong declared type", func(t *testing.T) {
		got, err := normalizeIconType("text/html", png)
		if err != nil || got != "image/png" {
			t.Fatalf("got (%q, %v), want image/png", got, err)
		}
	})

	t.Run("svg is recognised from its root element", func(t *testing.T) {
		got, err := normalizeIconType("text/plain", []byte(`<svg></svg>`))
		if err != nil || got != "image/svg+xml" {
			t.Fatalf("got (%q, %v), want image/svg+xml", got, err)
		}
	})

	t.Run("declared type is the fallback for inconclusive bytes", func(t *testing.T) {
		got, err := normalizeIconType("image/x-icon; charset=binary", []byte{0x00, 0x00, 0x01, 0x00, 0x01})
		if err != nil || got != "image/x-icon" {
			t.Fatalf("got (%q, %v), want image/x-icon", got, err)
		}
	})

	t.Run("anything else is refused", func(t *testing.T) {
		if _, err := normalizeIconType("application/pdf", []byte("%PDF-1.4\n%âãÏÓ")); !errors.Is(err, errIconType) {
			t.Fatalf("a PDF was accepted, want errIconType (got %v)", err)
		}
		if _, err := normalizeIconType("image/png", []byte("#!/bin/sh\necho hi\n")); !errors.Is(err, errIconType) {
			t.Fatalf("a shell script declared as PNG was accepted, want errIconType (got %v)", err)
		}
	})
}

func TestDecodeDataURI(t *testing.T) {
	png := onePixelPNG(t)

	mime, data, err := decodeDataURI("data:image/png;base64," + onePixelPNGBase64)
	if err != nil {
		t.Fatalf("decodeDataURI failed: %v", err)
	}
	if mime != "image/png" {
		t.Errorf("mime = %q, want image/png", mime)
	}
	if !bytes.Equal(data, png) {
		t.Error("decoded bytes differ from the fixture")
	}

	if _, _, err := decodeDataURI("https://example.com/i.png"); err == nil {
		t.Error("a plain URL was accepted as a data URI")
	}
	if _, _, err := decodeDataURI("data:image/png,notbase64"); err == nil {
		t.Error("a non-base64 data URI was accepted")
	}
	if _, _, err := decodeDataURI("data:image/png;base64,!!!!"); err == nil {
		t.Error("invalid base64 was accepted")
	}
}

func TestDecodeDataURIRejectsOversize(t *testing.T) {
	// Valid base64, but past the cap once decoded.
	big := base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{0x41}, maxIconBytes+1))
	if _, _, err := decodeDataURI("data:image/png;base64," + big); err == nil {
		t.Fatal("an oversized data URI was accepted")
	}
}

func TestStoreAndServeIcon(t *testing.T) {
	db, _ := setupTestDB(t)
	h := NewIconHandler(db)
	png := onePixelPNG(t)

	body, _ := json.Marshal(map[string]string{"source": "data:image/png;base64," + onePixelPNGBase64})
	req := httptest.NewRequest(http.MethodPost, "/api/icons", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.Store(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Store returned %d, want 200 (%s)", w.Code, w.Body.String())
	}
	var stored struct {
		URL  string `json:"url"`
		Hash string `json:"hash"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &stored); err != nil {
		t.Fatalf("bad Store response: %v", err)
	}
	if !strings.HasPrefix(stored.URL, "/api/icons/") || len(stored.Hash) != 64 {
		t.Fatalf("unexpected Store response %+v", stored)
	}

	// Serving it back returns the same bytes, cacheable forever and inert.
	req = httptest.NewRequest(http.MethodGet, stored.URL, nil)
	w = httptest.NewRecorder()
	h.Serve(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Serve returned %d, want 200", w.Code)
	}
	if !bytes.Equal(w.Body.Bytes(), png) {
		t.Error("served bytes differ from what was stored")
	}
	if ct := w.Header().Get("Content-Type"); ct != "image/png" {
		t.Errorf("Content-Type = %q, want image/png", ct)
	}
	if cc := w.Header().Get("Cache-Control"); !strings.Contains(cc, "immutable") {
		t.Errorf("Cache-Control = %q, want an immutable policy", cc)
	}
	if csp := w.Header().Get("Content-Security-Policy"); !strings.Contains(csp, "default-src 'none'") {
		t.Errorf("Content-Security-Policy = %q, want default-src 'none'", csp)
	}
	if w.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Error("missing nosniff on a user-supplied image")
	}
}

func TestStoreIsContentAddressed(t *testing.T) {
	db, _ := setupTestDB(t)
	png := onePixelPNG(t)

	first, err := storeIcon(db, "image/png", png)
	if err != nil {
		t.Fatalf("first store failed: %v", err)
	}
	second, err := storeIcon(db, "image/png", png)
	if err != nil {
		t.Fatalf("second store failed: %v", err)
	}
	if first != second {
		t.Errorf("same bytes produced different hashes: %s vs %s", first, second)
	}

	var rows int
	if err := db.QueryRow(`SELECT COUNT(*) FROM icons`).Scan(&rows); err != nil {
		t.Fatal(err)
	}
	if rows != 1 {
		t.Errorf("storing the same icon twice left %d rows, want 1", rows)
	}
}

func TestServeRejectsBadHashes(t *testing.T) {
	db, _ := setupTestDB(t)
	h := NewIconHandler(db)

	for _, path := range []string{
		"/api/icons/",
		"/api/icons/short",
		"/api/icons/../../etc/passwd",
		"/api/icons/" + strings.Repeat("z", 64), // well-formed, simply absent
	} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		w := httptest.NewRecorder()
		h.Serve(w, req)
		if w.Code != http.StatusNotFound {
			t.Errorf("Serve(%q) = %d, want 404", path, w.Code)
		}
	}
}

func TestPruneOrphanIcons(t *testing.T) {
	db, _ := setupTestDB(t)
	png := onePixelPNG(t)

	kept, err := storeIcon(db, "image/png", png)
	if err != nil {
		t.Fatal(err)
	}
	orphan, err := storeIcon(db, "image/svg+xml", []byte(`<svg><rect/></svg>`))
	if err != nil {
		t.Fatal(err)
	}

	// items.user_id is a foreign key, so the owner has to exist.
	res, err := db.Exec(`INSERT INTO users (username, password) VALUES ('tester', 'x')`)
	if err != nil {
		t.Fatal(err)
	}
	userID, _ := res.LastInsertId()

	// One icon is named by an item; the other by nobody.
	if _, err := db.Exec(
		`INSERT INTO items (type, x, y, w, h, content, user_id) VALUES ('bookmark', 0, 0, 1, 1, ?, ?)`,
		`{"label":"Router","icon":"/api/icons/`+kept+`"}`, userID,
	); err != nil {
		t.Fatal(err)
	}

	removed, err := PruneOrphanIcons(db)
	if err != nil {
		t.Fatalf("prune failed: %v", err)
	}
	if removed != 1 {
		t.Errorf("removed %d icons, want 1", removed)
	}

	var stillThere int
	db.QueryRow(`SELECT COUNT(*) FROM icons WHERE hash = ?`, kept).Scan(&stillThere)
	if stillThere != 1 {
		t.Error("the referenced icon was deleted")
	}
	db.QueryRow(`SELECT COUNT(*) FROM icons WHERE hash = ?`, orphan).Scan(&stillThere)
	if stillThere != 0 {
		t.Error("the unreferenced icon survived")
	}
}

// The icon an operator picks for a Proxmox machine is named in the settings
// table and nowhere else, and this sweep runs after every item deletion. Before
// the settings row was counted, deleting any bookmark took those icons with it
// and the machine tiles were left with a broken image.
func TestPruneKeepsAnIconNamedOnlyByASetting(t *testing.T) {
	db, _ := setupTestDB(t)

	hash, err := storeIcon(db, "image/png", onePixelPNG(t))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(
		`INSERT INTO system_settings (key, value) VALUES ('proxmox_icons', ?)`,
		`{"kprox|1018":"/api/icons/`+hash+`"}`,
	); err != nil {
		t.Fatal(err)
	}

	removed, err := PruneOrphanIcons(db)
	if err != nil {
		t.Fatalf("prune failed: %v", err)
	}
	if removed != 0 {
		t.Errorf("removed %d icons, want 0", removed)
	}

	var stillThere int
	db.QueryRow(`SELECT COUNT(*) FROM icons WHERE hash = ?`, hash).Scan(&stillThere)
	if stillThere != 1 {
		t.Fatal("a machine's icon was swept away because only items were counted")
	}
}

func TestStoreRefusesUnsupportedSources(t *testing.T) {
	db, _ := setupTestDB(t)
	h := NewIconHandler(db)

	for _, src := range []string{"", "ftp://example.com/i.png", "javascript:alert(1)"} {
		body, _ := json.Marshal(map[string]string{"source": src})
		req := httptest.NewRequest(http.MethodPost, "/api/icons", bytes.NewReader(body))
		w := httptest.NewRecorder()
		h.Store(w, req)
		if w.Code != http.StatusBadRequest {
			t.Errorf("Store(%q) = %d, want 400", src, w.Code)
		}
	}
}

func TestStorePassesThroughLocalURLs(t *testing.T) {
	db, _ := setupTestDB(t)
	h := NewIconHandler(db)

	local := "/api/icons/" + strings.Repeat("a", 64)
	body, _ := json.Marshal(map[string]string{"source": local})
	req := httptest.NewRequest(http.MethodPost, "/api/icons", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.Store(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Store returned %d, want 200", w.Code)
	}
	var got struct {
		URL string `json:"url"`
	}
	json.Unmarshal(w.Body.Bytes(), &got)
	if got.URL != local {
		t.Errorf("URL = %q, want it returned unchanged", got.URL)
	}
}

func TestFetchIconLimits(t *testing.T) {
	db, _ := setupTestDB(t)
	h := NewIconHandler(db)
	png := onePixelPNG(t)

	t.Run("downloads and stores a real image", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "image/png")
			w.Write(png)
		}))
		defer srv.Close()

		mime, data, err := h.fetchIcon(srv.URL + "/icon.png")
		if err != nil {
			t.Fatalf("fetchIcon failed: %v", err)
		}
		if mime != "image/png" || !bytes.Equal(data, png) {
			t.Errorf("got (%q, %d bytes), want image/png and the fixture", mime, len(data))
		}
	})

	t.Run("refuses a body past the cap", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "image/png")
			w.Write(bytes.Repeat([]byte{0x41}, maxIconBytes+10))
		}))
		defer srv.Close()

		if _, _, err := h.fetchIcon(srv.URL); err == nil {
			t.Fatal("an oversized download was accepted")
		}
	})

	t.Run("refuses something that isn't an image", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "image/png")
			w.Write([]byte("<html><body>login page</body></html>"))
		}))
		defer srv.Close()

		if _, _, err := h.fetchIcon(srv.URL); !errors.Is(err, errIconType) {
			t.Fatalf("an HTML page was accepted, want errIconType (got %v)", err)
		}
	})

	t.Run("reports a non-200", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			http.Error(w, "gone", http.StatusNotFound)
		}))
		defer srv.Close()

		if _, _, err := h.fetchIcon(srv.URL); err == nil {
			t.Fatal("a 404 was treated as success")
		}
	})
}
