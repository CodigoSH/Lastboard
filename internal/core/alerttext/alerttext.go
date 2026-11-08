// Package alerttext writes what an alert says, in the language of the account it is for.
//
// The texts live with every other string of the product, in web/public/locales, so they are
// translated in the same twenty languages by the same hand and read by the server from the same
// files the browser loads. A copy of the English wording is kept in this package for the day a file
// cannot be read; a test holds it equal to en.json so the two cannot drift.
//
// An account may write its own wording for each event. That text is the account's and is used as
// written, in whatever language it chose; only the markers in it ({service}, {count}, {reason},
// {duration}) are filled in.
package alerttext

import (
	"encoding/json"
	"io/fs"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"
	"unicode/utf8"
)

// MaxTemplate is the longest a custom text may be, in characters and not bytes: what limits it is
// what fits on a lock screen, and a Japanese character is three bytes.
const MaxTemplate = 200

// The keys, as they are in the locale files.
const (
	KeyDownTitle   = "alert.down.title"
	KeyDownBody    = "alert.down.body"
	KeyUpTitle     = "alert.up.title"
	KeyUpBody      = "alert.up.body"
	KeyUpBodyPlain = "alert.up.body_plain"
	KeyReasonNone  = "alert.reason.none"
	KeyReasonCode  = "alert.reason.code"
	KeyTestLabel   = "alert.test_label"
	KeyUnitMin     = "alert.unit.min"
	KeyUnitHour    = "alert.unit.hour"
	KeyUnitDay     = "alert.unit.day"
)

// english is the fallback wording. Held equal to web/public/locales/en.json by a test.
var english = map[string]string{
	KeyDownTitle:   "{service} is down",
	KeyDownBody:    "{reason} · Failed checks in a row: {count}",
	KeyUpTitle:     "{service} is back up",
	KeyUpBody:      "Downtime: {duration}",
	KeyUpBodyPlain: "Responding normally again.",
	KeyReasonNone:  "No response",
	KeyReasonCode:  "Answered with HTTP {code}",
	KeyTestLabel:   "Test",
	KeyUnitMin:     "min",
	KeyUnitHour:    "h",
	KeyUnitDay:     "d",
}

// Keys is every key this package reads, for the test that checks every locale has them.
func Keys() []string {
	out := make([]string, 0, len(english))
	for k := range english {
		out = append(out, k)
	}
	return out
}

// English returns the built-in wording of a key.
func English(key string) string { return english[key] }

// Templates are an account's own wording. An empty one means "use the translated default".
type Templates struct {
	DownTitle, DownBody, UpTitle, UpBody string
}

// Values are what an alert is about.
type Values struct {
	Service string
	// Count is how many checks in a row failed; Code is what the failing check got back (0 when nothing answered).
	Count int
	Code  int
	// Down is how long the outage lasted. Zero when it is not known, as after a restart.
	Down time.Duration
}

// Catalog reads the locale files once per language.
type Catalog struct {
	fsys  fs.FS
	mu    sync.Mutex
	cache map[string]map[string]string
}

// New returns a catalog over a file system that has locales/<lang>.json. A nil one is valid and
// answers in English.
func New(fsys fs.FS) *Catalog {
	return &Catalog{fsys: fsys, cache: map[string]map[string]string{}}
}

func (c *Catalog) table(lang string) map[string]string {
	if c == nil || c.fsys == nil || !safeLang(lang) {
		return nil
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if t, ok := c.cache[lang]; ok {
		return t
	}
	var t map[string]string
	if raw, err := fs.ReadFile(c.fsys, "locales/"+lang+".json"); err == nil {
		var all map[string]any
		if json.Unmarshal(raw, &all) == nil {
			t = map[string]string{}
			for _, k := range Keys() {
				if s, ok := all[k].(string); ok && s != "" {
					t[k] = s
				}
			}
		}
	}
	c.cache[lang] = t
	return t
}

// safeLang keeps a language code from being anything but a language code, since it names a file.
func safeLang(lang string) bool {
	if len(lang) < 2 || len(lang) > 8 {
		return false
	}
	for _, r := range lang {
		if !(r >= 'a' && r <= 'z') && r != '-' {
			return false
		}
	}
	return true
}

// Text is a key's wording in a language, falling back to English and then to the built-in copy.
func (c *Catalog) Text(lang, key string) string {
	if t := c.table(lang); t != nil {
		if s, ok := t[key]; ok {
			return s
		}
	}
	if lang != "en" {
		if t := c.table("en"); t != nil {
			if s, ok := t[key]; ok {
				return s
			}
		}
	}
	return english[key]
}

// rtl lists the languages written right to left. A value in the other script (a service name, a
// number) is isolated in them so that the punctuation around it does not land on the wrong side.
var rtl = map[string]bool{"ar": true, "fa": true, "ur": true}

const (
	isolateStart = "\u2068" // FIRST STRONG ISOLATE
	isolateEnd   = "\u2069" // POP DIRECTIONAL ISOLATE
)

// fill puts the values into a template in one pass, so a value that itself contains {something} is
// never read as a marker. A marker that is not known stays as written.
func fill(tpl string, values map[string]string, isolate bool) string {
	var b strings.Builder
	for i := 0; i < len(tpl); {
		if tpl[i] == '{' {
			if j := strings.IndexByte(tpl[i:], '}'); j > 0 {
				name := tpl[i+1 : i+j]
				if v, ok := values[name]; ok {
					if isolate && v != "" {
						b.WriteString(isolateStart + v + isolateEnd)
					} else {
						b.WriteString(v)
					}
					i += j + 1
					continue
				}
			}
		}
		b.WriteByte(tpl[i])
		i++
	}
	return b.String()
}

// Clean makes a custom text safe to keep: no control characters, trimmed, and at most MaxTemplate
// characters.
func Clean(s string) string {
	s = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, s)
	s = strings.TrimSpace(s)
	if utf8.RuneCountInString(s) > MaxTemplate {
		s = string([]rune(s)[:MaxTemplate])
	}
	return s
}

func (c *Catalog) duration(lang string, d time.Duration) string {
	mins := int(d.Round(time.Minute) / time.Minute)
	if mins < 1 {
		mins = 1
	}
	unit := func(key string) string { return c.Text(lang, key) }
	switch {
	case mins < 60:
		return strconv.Itoa(mins) + " " + unit(KeyUnitMin)
	case mins < 24*60:
		h, m := mins/60, mins%60
		s := strconv.Itoa(h) + " " + unit(KeyUnitHour)
		if m > 0 {
			s += " " + strconv.Itoa(m) + " " + unit(KeyUnitMin)
		}
		return s
	default:
		d, h := mins/(24*60), (mins%(24*60))/60
		s := strconv.Itoa(d) + " " + unit(KeyUnitDay)
		if h > 0 {
			s += " " + strconv.Itoa(h) + " " + unit(KeyUnitHour)
		}
		return s
	}
}

func (c *Catalog) values(lang string, v Values, up bool) map[string]string {
	iso := rtl[lang]
	reason := c.Text(lang, KeyReasonNone)
	if v.Code > 0 {
		reason = fill(c.Text(lang, KeyReasonCode), map[string]string{"code": strconv.Itoa(v.Code)}, iso)
	}
	m := map[string]string{"service": v.Service, "count": "", "reason": "", "duration": ""}
	if up {
		if v.Down > 0 {
			m["duration"] = c.duration(lang, v.Down)
		}
	} else {
		m["count"] = strconv.Itoa(v.Count)
		m["reason"] = reason
	}
	return m
}

func pick(custom, key string, c *Catalog, lang string) string {
	if t := Clean(custom); t != "" {
		return t
	}
	return c.Text(lang, key)
}

// Down is the notification of an outage: its title and its body.
func (c *Catalog) Down(lang string, v Values, t Templates) (title, body string) {
	m, iso := c.values(lang, v, false), rtl[lang]
	return fill(pick(t.DownTitle, KeyDownTitle, c, lang), m, iso), fill(pick(t.DownBody, KeyDownBody, c, lang), m, iso)
}

// Up is the notification of a recovery. When the length of the outage is not known the default body
// says only that the service answers again; a custom one is used as written, with {duration} empty.
func (c *Catalog) Up(lang string, v Values, t Templates) (title, body string) {
	m, iso := c.values(lang, v, true), rtl[lang]
	bodyKey := KeyUpBody
	if v.Down <= 0 {
		bodyKey = KeyUpBodyPlain
	}
	return fill(pick(t.UpTitle, KeyUpTitle, c, lang), m, iso), fill(pick(t.UpBody, bodyKey, c, lang), m, iso)
}

// TestLabel is the word put before a test notification, so it cannot be taken for a real outage.
func (c *Catalog) TestLabel(lang string) string { return c.Text(lang, KeyTestLabel) }
