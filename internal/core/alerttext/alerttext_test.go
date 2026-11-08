package alerttext

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
	"testing/fstest"
	"time"
)

// The real locale files, read from the repository: what the browser loads is what the server reads.
func realCatalog(t *testing.T) *Catalog {
	t.Helper()
	return New(os.DirFS("../../../web/public"))
}

var languages = []string{"ar", "bn", "de", "el", "en", "es", "fa", "fr", "hi", "id", "it", "ja", "ko", "nl", "pl", "pt", "ru", "tr", "ur", "zh"}

func locale(t *testing.T, lang string) map[string]any {
	t.Helper()
	raw, err := os.ReadFile("../../../web/public/locales/" + lang + ".json")
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatal(err)
	}
	return m
}

// The English kept in the package is for the day a file cannot be read. It must be what en.json says.
func TestTheBuiltInEnglishIsTheEnglishFile(t *testing.T) {
	en := locale(t, "en")
	for _, k := range Keys() {
		if got, _ := en[k].(string); got != English(k) {
			t.Errorf("%s: en.json says %q, the package says %q", k, got, English(k))
		}
	}
	if len(Keys()) == 0 {
		t.Fatal("no keys: this test is reading nothing")
	}
}

// Every language has every key, with the markers its text needs. A translation that dropped {service}
// would send an alert that does not say which service.
func TestEveryLanguageHasEveryAlertText(t *testing.T) {
	needs := map[string][]string{
		KeyDownTitle: {"{service}"}, KeyUpTitle: {"{service}"},
		KeyDownBody: {"{reason}", "{count}"}, KeyUpBody: {"{duration}"}, KeyReasonCode: {"{code}"},
	}
	for _, lang := range languages {
		m := locale(t, lang)
		for _, k := range Keys() {
			s, _ := m[k].(string)
			if strings.TrimSpace(s) == "" {
				t.Errorf("%s has no %s", lang, k)
				continue
			}
			for _, marker := range needs[k] {
				if !strings.Contains(s, marker) {
					t.Errorf("%s: %s is %q, without %s", lang, k, s, marker)
				}
			}
		}
	}
}

func TestAnOutageAndARecoveryReadInTheLanguageOfTheAccount(t *testing.T) {
	c := realCatalog(t)
	title, body := c.Down("es", Values{Service: "Router", Count: 3, Code: 503}, Templates{})
	if title != "Router está caído" {
		t.Errorf("title %q", title)
	}
	if body != "Respondió con HTTP 503 · Comprobaciones fallidas seguidas: 3" {
		t.Errorf("body %q", body)
	}
	title, body = c.Down("en", Values{Service: "Router", Count: 1}, Templates{})
	if title != "Router is down" || body != "No response · Failed checks in a row: 1" {
		t.Errorf("english: %q / %q", title, body)
	}
	title, body = c.Up("de", Values{Service: "Router", Down: 85 * time.Minute}, Templates{})
	if title != "Router ist wieder erreichbar" || body != "Ausfallzeit: 1 Std. 25 Min." {
		t.Errorf("recovery: %q / %q", title, body)
	}
}

func TestTheLengthOfAnOutageIsWrittenInTheLargestUnitsThatFit(t *testing.T) {
	c := New(nil)
	for d, want := range map[time.Duration]string{
		10 * time.Second:                "1 min",
		5 * time.Minute:                 "5 min",
		60 * time.Minute:                "1 h",
		85 * time.Minute:                "1 h 25 min",
		26*time.Hour + 10*time.Minute:   "1 d 2 h",
		49 * time.Hour:                  "2 d 1 h",
		3*24*time.Hour + 20*time.Minute: "3 d",
	} {
		if _, body := c.Up("en", Values{Service: "x", Down: d}, Templates{}); body != "Downtime: "+want {
			t.Errorf("%v: %q, want %q", d, body, "Downtime: "+want)
		}
	}
}

// After a restart nobody knows how long a service had been down, and saying "1 min" would be a lie.
func TestARecoveryWhoseOutageIsNotKnownDoesNotInventALength(t *testing.T) {
	_, body := New(nil).Up("en", Values{Service: "x"}, Templates{})
	if body != "Responding normally again." {
		t.Errorf("%q", body)
	}
}

func TestACustomTextIsUsedAsWrittenWithItsMarkersFilledIn(t *testing.T) {
	c := New(nil)
	tpl := Templates{DownTitle: "🔥 {service} je mrtvý", DownBody: "{count}× {reason}", UpTitle: "{service} OK", UpBody: "po {duration}"}
	title, body := c.Down("es", Values{Service: "NAS", Count: 2, Code: 0}, tpl)
	if title != "🔥 NAS je mrtvý" || body != "2× No response" {
		t.Errorf("down: %q / %q", title, body)
	}
	title, body = c.Up("es", Values{Service: "NAS", Down: 5 * time.Minute}, tpl)
	if title != "NAS OK" || body != "po 5 min" {
		t.Errorf("up: %q / %q", title, body)
	}
	// One field written, the rest still the translated default.
	title, body = c.Down("en", Values{Service: "NAS", Count: 2}, Templates{DownTitle: "Help: {service}"})
	if title != "Help: NAS" || body != "No response · Failed checks in a row: 2" {
		t.Errorf("mixed: %q / %q", title, body)
	}
}

func TestAMarkerThatIsNotKnownStaysAsWrittenAndAValueIsNeverReadAsAMarker(t *testing.T) {
	c := New(nil)
	title, _ := c.Down("en", Values{Service: "{count}"}, Templates{DownTitle: "{service} / {nope} / {"})
	if title != "{count} / {nope} / {" {
		t.Errorf("%q", title)
	}
}

func TestACustomTextIsCleanedAndBounded(t *testing.T) {
	if got := Clean("  a\r\nb\x00c\t "); got != "abc" {
		t.Errorf("control characters: %q", got)
	}
	long := strings.Repeat("ぜ", MaxTemplate+50)
	if n := len([]rune(Clean(long))); n != MaxTemplate {
		t.Errorf("%d characters kept, want %d (characters, not bytes)", n, MaxTemplate)
	}
	// A custom title that is only whitespace is no title: the default is used.
	if title, _ := New(nil).Down("en", Values{Service: "x"}, Templates{DownTitle: " \n "}); title != "x is down" {
		t.Errorf("%q", title)
	}
}

// In the languages written right to left a Latin name or a number would let the punctuation around it
// land on the wrong side; the values are isolated there and nowhere else, so webhook and ntfy readers
// of the other languages see no invisible characters.
func TestValuesAreIsolatedOnlyInRightToLeftLanguages(t *testing.T) {
	c := realCatalog(t)
	title, _ := c.Down("ar", Values{Service: "Router"}, Templates{})
	if !strings.Contains(title, "\u2068Router\u2069") {
		t.Errorf("arabic title not isolated: %q", title)
	}
	// The number inside the reason is isolated too, not only the name.
	if _, body := c.Down("ar", Values{Service: "Router", Count: 2, Code: 503}, Templates{}); !strings.Contains(body, "\u2068503\u2069") {
		t.Errorf("arabic body: the code is not isolated: %q", body)
	}
	for _, lang := range []string{"en", "es", "ja", "ru"} {
		title, body := c.Down(lang, Values{Service: "Router", Count: 2, Code: 500}, Templates{})
		if strings.ContainsAny(title+body, "\u2068\u2069") {
			t.Errorf("%s carries isolation marks: %q %q", lang, title, body)
		}
	}
}

// A language that is not shipped, or is not a language at all, reads in English; and a code never
// names a file outside the locales.
func TestAnUnknownOrUnsafeLanguageReadsInEnglish(t *testing.T) {
	c := realCatalog(t)
	for _, lang := range []string{"xx", "", "../../etc/passwd", "EN", "en/../es", strings.Repeat("a", 40)} {
		if title, _ := c.Down(lang, Values{Service: "x"}, Templates{}); title != "x is down" {
			t.Errorf("%q: %q", lang, title)
		}
	}
}

// A file that cannot be read, or is damaged, or lacks a key, falls back instead of sending an empty alert.
func TestAMissingOrBrokenFileFallsBackToEnglish(t *testing.T) {
	broken := New(fstest.MapFS{
		"locales/es.json": {Data: []byte("{not json")},
		"locales/fr.json": {Data: []byte(`{"alert.down.title": "{service} est HS"}`)},
	})
	if title, _ := broken.Down("es", Values{Service: "x"}, Templates{}); title != "x is down" {
		t.Errorf("broken file: %q", title)
	}
	title, body := broken.Down("fr", Values{Service: "x", Count: 2}, Templates{})
	if title != "x est HS" || body != "No response · Failed checks in a row: 2" {
		t.Errorf("partial file: %q / %q", title, body)
	}
	if title, _ := broken.Down("de", Values{Service: "x"}, Templates{}); title != "x is down" {
		t.Errorf("missing file: %q", title)
	}
}
