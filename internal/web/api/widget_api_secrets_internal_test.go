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

func TestADockerWidgetsAgentTokensMoveAndTheHostsStay(t *testing.T) {
	old := `{"widgetId":"docker","title":"D","refreshSec":30,"containerConfig":{"abcd1234":{"label":"x"}},` +
		`"hosts":[{"id":"h_abc123","name":"nas","type":"agent","url":"nas:9091","token":"a b/+c"},` +
		`{"id":"h_def456","name":"local","type":"local","token":""},` +
		`{"id":"h_ghi789","name":"tcp","type":"tcp","url":"10.0.0.5:2375"}]}`
	next, secrets, ok := migrateDockerContent(old)
	if !ok {
		t.Fatal("nothing moved")
	}
	if len(secrets) != 1 || secrets["docker.h_abc123"] != "a b/+c" {
		t.Errorf("secrets = %v", secrets)
	}
	if strings.Contains(next, "a b/+c") || strings.Contains(next, `"token"`) {
		t.Errorf("a token is still in the content: %s", next)
	}
	var m struct {
		Hosts []struct {
			ID, Name, Type, URL string
		}
		Title  string
		Config map[string]any `json:"containerConfig"`
	}
	json.Unmarshal([]byte(next), &m)
	if len(m.Hosts) != 3 || m.Hosts[0].URL != "nas:9091" || m.Hosts[2].ID != "h_ghi789" || m.Title != "D" || len(m.Config) != 1 {
		t.Errorf("the rest of the widget changed: %s", next)
	}
	if _, _, again := migrateDockerContent(next); again {
		t.Error("not idempotent")
	}
	if _, _, ok := migrateDockerContent(`{"widgetId":"docker","hosts":[{"id":"h_1","type":"local"}]}`); ok {
		t.Error("a widget with no token field was changed")
	}
	if _, _, ok := migrateDockerContent(`{"widgetId":"api"}`); ok {
		t.Error("migrated something that is not a Docker widget")
	}
}

// The browser computes the same name (web/src/services/dockerHostSecret.test.ts
// has this table too): a saved token is found by it.
func TestADockerSecretNameMatchesTheBrowsers(t *testing.T) {
	for id, want := range map[string]string{
		"h_abc123": "docker.h_abc123", "H ABC/1": "docker.h-abc-1", "ünï": "docker.-n-", "1": "docker.1",
	} {
		if got := dockerSecretName(id); got != want {
			t.Errorf("%q -> %q, want %q", id, got, want)
		}
	}
	if len(dockerSecretName(strings.Repeat("x", 200))) != 64 {
		t.Error("a long id is not cut to 64")
	}
}

func TestADockerSecretNameIsAlwaysAValidSecretName(t *testing.T) {
	for _, id := range []string{"h_abc123", "H ABC/1", "ünï", strings.Repeat("x", 200), "1"} {
		if n := dockerSecretName(id); !secretName.MatchString(n) {
			t.Errorf("%q -> %q is not a valid secret name", id, n)
		}
	}
}
