package api_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// Every message handed to http.Error is a translation key, and every key exists
// in every language.
//
// The convention was already there and already good — http.Error(w,
// "auth.invalid_credentials", 401) hands the frontend something it can
// translate. But it was implicit: a string with dots was a key, a string with
// spaces was English, and nothing said so. Ninety-two calls had drifted to
// literal English, so half the errors a Japanese or Arabic user hit came back
// in a language they had not asked for.
//
// Being implicit is why it drifted, so it is written down here.
var keyShape = regexp.MustCompile(`^[a-z0-9_]+(\.[a-z0-9_]+)+$`)

// The mock servers inside tests answer with whatever they like; only the code
// that ships has to speak in keys.
//
// A restoreError carries its message to http.Error through a variable, so the
// call shape above never sees it: its literals are scanned too.
var callShape = regexp.MustCompile(`(?:http\.Error\([^,]+|restoreError\{[^,]+),\s*"([^"]+)"`)

func TestEveryErrorMessageIsATranslationKey(t *testing.T) {
	root := filepath.Join("..", "..", "..", "internal")

	var offenders []string
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return err
		}
		src, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		for _, m := range callShape.FindAllStringSubmatch(string(src), -1) {
			if !keyShape.MatchString(m[1]) {
				offenders = append(offenders, path+": "+m[1])
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	for _, o := range offenders {
		t.Errorf("http.Error is sending English to the browser instead of a key — %s", o)
	}
}

func TestEveryErrorKeyIsTranslatedEverywhere(t *testing.T) {
	root := filepath.Join("..", "..", "..", "internal")
	localeDir := filepath.Join("..", "..", "..", "web", "public", "locales")

	used := map[string]bool{}
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return err
		}
		src, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		for _, m := range callShape.FindAllStringSubmatch(string(src), -1) {
			if keyShape.MatchString(m[1]) {
				used[m[1]] = true
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(used) == 0 {
		t.Fatal("found no error keys at all — the scan is broken, not the code")
	}

	locales, err := filepath.Glob(filepath.Join(localeDir, "*.json"))
	if err != nil || len(locales) == 0 {
		t.Fatalf("no locale files under %s", localeDir)
	}
	for _, lf := range locales {
		raw, err := os.ReadFile(lf)
		if err != nil {
			t.Fatal(err)
		}
		var strs map[string]string
		if err := json.Unmarshal(raw, &strs); err != nil {
			t.Fatalf("%s: %v", lf, err)
		}
		lang := strings.TrimSuffix(filepath.Base(lf), ".json")
		for key := range used {
			if _, ok := strs[key]; !ok {
				t.Errorf("%s has no translation for %s, which the server sends", lang, key)
			}
		}
	}
}
