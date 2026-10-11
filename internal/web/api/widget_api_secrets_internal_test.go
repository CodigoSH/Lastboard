package api

import (
	"encoding/base64"
	"encoding/json"
	"os"
	"strings"
	"testing"
)

type oldPresetWidget struct {
	ID      string         `json:"id"`
	Key     string         `json:"key"`
	Content map[string]any `json:"content"`
}

func oldPresetWidgets(t *testing.T) []oldPresetWidget {
	t.Helper()
	b, err := os.ReadFile("testdata/api_widget_presets_old.json")
	if err != nil {
		t.Fatal(err)
	}
	var out []oldPresetWidget
	if err := json.Unmarshal(b, &out); err != nil || len(out) < 10 {
		t.Fatalf("fixture: %v (%d presets)", err, len(out))
	}
	return out
}

// Every preset, as the widget editor of the previous version wrote it — the
// contents come from the real preset code, keys with characters that need
// escaping included. After the move the key is nowhere in the content, and
// resolving the templates gives back exactly the request that was configured.
func TestEveryPresetMovesItsKeyAndStillMakesTheSameRequest(t *testing.T) {
	for _, p := range oldPresetWidgets(t) {
		raw, _ := json.Marshal(p.Content)
		next, secrets, ok := migrateAPIContent(string(raw))
		if p.Key == "" {
			if ok {
				t.Errorf("%s: a widget with no key was changed", p.ID)
			}
			continue
		}
		if !ok {
			t.Errorf("%s: nothing moved", p.ID)
			continue
		}
		if secrets["key"] != p.Key {
			t.Errorf("%s: the key was not stored", p.ID)
		}
		for _, form := range []string{p.Key, jsEncodeURIComponent(p.Key), base64.StdEncoding.EncodeToString([]byte(p.Key))} {
			if strings.Contains(next, form) {
				t.Errorf("%s: the key is still in the content: %s", p.ID, next)
			}
		}
		var after struct {
			URL     string            `json:"url"`
			Headers map[string]string `json:"headers"`
			APIKey  string            `json:"apiKey"`
		}
		json.Unmarshal([]byte(next), &after)
		if after.APIKey != "" {
			t.Errorf("%s: apiKey kept", p.ID)
		}
		if got := resolveKey(after.URL, p.Key); got != p.Content["url"] {
			t.Errorf("%s: url\n got %s\nwant %s", p.ID, got, p.Content["url"])
		}
		want := p.Content["headers"].(map[string]any)
		if len(after.Headers) != len(want) {
			t.Errorf("%s: headers %v, want %v", p.ID, after.Headers, want)
		}
		for name, v := range want {
			if got := resolveKey(after.Headers[name], p.Key); got != v {
				t.Errorf("%s: header %s = %q, want %q", p.ID, name, got, v)
			}
		}

		// Run again on what came out: nothing left to move.
		if _, _, again := migrateAPIContent(next); again {
			t.Errorf("%s: the migration is not idempotent", p.ID)
		}
	}
}

func TestAdvancedHeadersBecomeSecretsAndKeepTheirNames(t *testing.T) {
	old := `{"widgetId":"api","title":"X","preset":"","url":"http://h/x","method":"GET",` +
		`"headers":{"X-Api-Key":"abc 123","Authorization":"Bearer t0k","Empty":""},"mappings":[{"label":"a","path":"a"}]}`
	next, secrets, ok := migrateAPIContent(old)
	if !ok {
		t.Fatal("nothing moved")
	}
	if secrets["header.x-api-key"] != "abc 123" || secrets["header.authorization"] != "Bearer t0k" {
		t.Errorf("secrets = %v", secrets)
	}
	if _, set := secrets["header.empty"]; set {
		t.Error("an empty value became a secret")
	}
	if strings.Contains(next, "abc 123") || strings.Contains(next, "t0k") || strings.Contains(next, `"headers"`) {
		t.Errorf("values left in the content: %s", next)
	}
	var m struct {
		Names []string `json:"secret_headers"`
		URL   string   `json:"url"`
	}
	json.Unmarshal([]byte(next), &m)
	if strings.Join(m.Names, ",") != "Authorization,Empty,X-Api-Key" || m.URL != "http://h/x" {
		t.Errorf("content = %s", next)
	}
	if _, _, again := migrateAPIContent(next); again {
		t.Error("not idempotent")
	}
}

func TestOtherWidgetsAndBrokenContentAreLeftAlone(t *testing.T) {
	for _, c := range []string{`{"widgetId":"clock"}`, `not json`, ``, `{"widgetId":"api","preset":"","headers":{}}`, `{"widgetId":"api","preset":"adguard"}`} {
		if _, _, ok := migrateAPIContent(c); ok {
			t.Errorf("changed %q", c)
		}
	}
}

func TestTheTemplatesResolveTheWayThePresetsWriteThem(t *testing.T) {
	cases := map[string]string{
		"Token {{key}}":        "Token a b+c",
		"Basic {{key|base64}}": "Basic YSBiK2M=",
		"x={{key|url}}&y=1":    "x=a%20b%2Bc&y=1",
		"no template":          "no template",
	}
	for in, want := range cases {
		if got := resolveKey(in, "a b+c"); got != want {
			t.Errorf("%q -> %q, want %q", in, got, want)
		}
	}
}
