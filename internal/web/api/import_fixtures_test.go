package api

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

// The files in testdata/import are written with the syntax Homepage and Dashy
// document — the shapes people actually have, not the shapes a parser was
// written against. The import broke for months on exactly that gap.

func fixture(t *testing.T, name string) []byte {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("testdata", "import", name))
	if err != nil {
		t.Fatal(err)
	}
	return b
}

type shortItem struct{ Group, Title, URL, Icon string }

func shorten(items []NativeItem) []shortItem {
	out := make([]shortItem, len(items))
	for i, it := range items {
		out[i] = shortItem{it.Group, it.Title, it.URL, it.Icon}
	}
	return out
}

// The file somebody reported: a bookmarks list with one entry whose icon is a
// file in their own Homepage folder.
func TestTheReportedBookmarksFileImports(t *testing.T) {
	cfg, err := parseHomepageBookmarks(fixture(t, "homepage-reported.bookmarks.yaml"))
	if err != nil {
		t.Fatalf("the reported file does not parse: %v", err)
	}
	want := []shortItem{{"SERVICES", "Unifi Console", "https://unifi.ui.com", "unifi"}}
	if got := shorten(cfg.Dashboards[0].Items); !reflect.DeepEqual(got, want) {
		t.Errorf("got %+v, want %+v", got, want)
	}
}

func TestHomepageBookmarksFromTheDocumentation(t *testing.T) {
	cfg, err := parseHomepageBookmarks(fixture(t, "homepage.bookmarks.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	want := []shortItem{
		{"Developer", "Github", "https://github.com/", ""},
		{"Social", "Reddit", "https://reddit.com/", "reddit"},
		{"Entertainment", "YouTube", "https://youtube.com/", ""},
	}
	if got := shorten(cfg.Dashboards[0].Items); !reflect.DeepEqual(got, want) {
		t.Errorf("got %+v, want %+v", got, want)
	}
	if cfg.Skipped != 0 {
		t.Errorf("skipped = %d, want 0", cfg.Skipped)
	}
}

// Nested groups, widgets with their own nested blocks, YAML comments, a
// leading "---", ${ENV} keys, an icon with a colour, a service that lives only
// in Docker and one whose address is a template: all in one file. A struct
// decode failed on the first nested group and called the whole file unreadable.
func TestHomepageServicesFromTheDocumentation(t *testing.T) {
	cfg, err := parseHomepageServices(fixture(t, "homepage.services.yaml"))
	if err != nil {
		t.Fatalf("a services file with nested groups does not parse: %v", err)
	}
	want := []shortItem{
		{"Media", "Emby", "http://emby.host.or.ip/", "emby"},
		{"Media", "Plex", "http://plex.host/", "plex"},
		{"Media / Servarr", "Sonarr", "http://sonarr.host/", "sonarr"},
		{"Media / Servarr", "Radarr", "http://radarr.host/", "radarr"},
		{"Infrastructure", "Proxmox", "https://proxmox.host:8006", "server"},
		{"Infrastructure", "UptimeRobot", "https://uptimerobot.com/", "uptimekuma"},
	}
	items := cfg.Dashboards[0].Items
	if got := shorten(items); !reflect.DeepEqual(got, want) {
		t.Errorf("got  %+v\nwant %+v", got, want)
	}
	if cfg.Skipped != 2 {
		t.Errorf("skipped = %d, want 2 (a Docker-only service and a templated address)", cfg.Skipped)
	}
	byTitle := map[string]NativeItem{}
	for _, it := range items {
		byTitle[it.Title] = it
	}
	if !byTitle["Plex"].StatusCheck || !byTitle["Sonarr"].StatusCheck {
		t.Error("siteMonitor and ping should turn the status check on")
	}
	if byTitle["Emby"].StatusCheck || byTitle["Emby"].Description != "Movies & TV Shows" {
		t.Errorf("Emby: %+v", byTitle["Emby"])
	}
}

// People pick the wrong one of the two Homepage formats. The shapes differ
// only in the leaves, so either file reads under either name.
func TestEitherHomepageFormatReadsUnderEitherName(t *testing.T) {
	a, err := parseHomepageServices(fixture(t, "homepage.bookmarks.yaml"))
	if err != nil || len(a.Dashboards[0].Items) != 3 {
		t.Errorf("bookmarks file as services: %v %+v", err, a)
	}
	b, err := parseHomepageBookmarks(fixture(t, "homepage.services.yaml"))
	if err != nil || len(b.Dashboards[0].Items) != 6 {
		t.Errorf("services file as bookmarks: %v %+v", err, b)
	}
}

func TestDashyFromARealConfig(t *testing.T) {
	cfg, err := parseDashy(fixture(t, "dashy.conf.yml"))
	if err != nil {
		t.Fatal(err)
	}
	want := []shortItem{
		{"Media", "Plex", "https://plex.tv", "plex"},
		{"Media", "Jellyfin", "https://jellyfin.org", ""},
		{"Media", "Jellyfin admin", "https://jellyfin.org/admin", "jellyfin"},
		{"Tools", "Router", "http://192.168.1.1", ""},
	}
	if got := shorten(cfg.Dashboards[0].Items); !reflect.DeepEqual(got, want) {
		t.Errorf("got  %+v\nwant %+v", got, want)
	}
	if cfg.Skipped != 1 {
		t.Errorf("skipped = %d, want 1 (an item with no address)", cfg.Skipped)
	}
}

// A file that is not a list of groups, or has nothing to import, is refused
// instead of producing an empty dashboard.
func TestNothingToImportIsRefused(t *testing.T) {
	for name, yml := range map[string]string{
		"a map":          "key: value\n",
		"empty":          "",
		"a null group":   "- Empty:\n",
		"only no-href":   "- G:\n    - Docker:\n        container: x\n",
		"only templates": "- G:\n    - A:\n        href: \"{{VAR}}\"\n",
	} {
		if cfg, err := parseHomepageServices([]byte(yml)); err == nil {
			t.Errorf("%s: parsed into %+v, want an error", name, cfg)
		}
	}
}

func TestNormalizeIconFromOtherTools(t *testing.T) {
	cases := map[string]string{
		"/images/unifi.png":    "unifi",
		"/icons/my-thing.svg":  "my-thing",
		"mdi-home-#ff0000":     "home",
		"si-github-#fff":       "github",
		"sh-nextcloud-light":   "nextcloud-light",
		"hl-plex":              "plex",
		"fas fa-rocket":        "",
		"fab fa-github":        "",
		"favicon":              "",
		"generative":           "",
		"plex.webp":            "plex",
		"https://x/y/icon.png": "https://x/y/icon.png",
		"http://x/y/icon.svg":  "http://x/y/icon.svg",
	}
	for in, want := range cases {
		if got := normalizeIcon(in); got != want {
			t.Errorf("normalizeIcon(%q) = %q, want %q", in, got, want)
		}
	}
}

// A configuration of the size people really have: 14 groups, four of them with
// a nested group, 137 services of which eleven live only in Docker. The oracle
// is the file itself — every service with an href must come out, every one
// without must be counted as left out — so the test does not repeat the parser.
func TestALargeHomepageConfigurationLosesNothing(t *testing.T) {
	data := fixture(t, "homepage-large.services.yaml")
	cfg, err := parseHomepageServices(data)
	if err != nil {
		t.Fatal(err)
	}
	withHref := strings.Count(string(data), "href:")
	dockerOnly := strings.Count(string(data), "container:")
	if withHref < 100 || dockerOnly == 0 {
		t.Fatalf("the fixture changed shape: %d hrefs, %d container-only", withHref, dockerOnly)
	}
	items := cfg.Dashboards[0].Items
	if len(items) != withHref {
		t.Errorf("imported %d services, the file has %d with an address", len(items), withHref)
	}
	if cfg.Skipped != dockerOnly {
		t.Errorf("skipped = %d, want %d (the Docker-only ones)", cfg.Skipped, dockerOnly)
	}
	nested := 0
	for _, it := range items {
		if strings.Contains(it.Group, " / ") {
			nested++
		}
		// A full URL is kept as the icon on purpose; anything else must be a slug.
		if !strings.HasPrefix(it.Icon, "https://") && strings.ContainsAny(it.Icon, " /#") {
			t.Errorf("%s kept an icon that is not a slug: %q", it.Title, it.Icon)
		}
	}
	if nested != 12 {
		t.Errorf("nested-group services = %d, want 12 (three in each of four groups)", nested)
	}
}
