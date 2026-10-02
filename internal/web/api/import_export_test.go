package api

import "testing"

func TestParseDashy(t *testing.T) {
	yml := `
sections:
  - name: Media
    items:
      - title: Plex
        url: https://plex.tv
        icon: plex
        statusCheck: true
      - title: Jellyfin
        url: https://jellyfin.org
  - name: Infra
    items:
      - title: Proxmox
        url: https://prox:8006
`
	cfg, err := parseDashy([]byte(yml))
	if err != nil {
		t.Fatalf("parseDashy: %v", err)
	}
	items := cfg.Dashboards[0].Items
	if len(items) != 3 {
		t.Fatalf("expected 3 items, got %d", len(items))
	}
	if items[0].Title != "Plex" || items[0].Group != "Media" || !items[0].StatusCheck {
		t.Errorf("bad first item: %+v", items[0])
	}
	if items[2].Group != "Infra" {
		t.Errorf("expected Proxmox in Infra, got %q", items[2].Group)
	}
}

func TestParseHomepageServices(t *testing.T) {
	yml := `
- Media:
    - Plex:
        href: https://plex.tv
        icon: plex.png
        siteMonitor: https://plex.tv
- Infra:
    - Proxmox:
        href: https://prox:8006
        icon: mdi-server
`
	cfg, err := parseHomepageServices([]byte(yml))
	if err != nil {
		t.Fatalf("parseHomepageServices: %v", err)
	}
	items := cfg.Dashboards[0].Items
	if len(items) != 2 {
		t.Fatalf("expected 2 services, got %d", len(items))
	}
	byName := map[string]NativeItem{}
	for _, it := range items {
		byName[it.Title] = it
	}
	if p, ok := byName["Plex"]; !ok || p.URL != "https://plex.tv" || p.Icon != "plex" || !p.StatusCheck {
		t.Errorf("bad Plex: %+v", byName["Plex"])
	}
	if px, ok := byName["Proxmox"]; !ok || px.Icon != "" || px.Group != "Infra" {
		t.Errorf("bad Proxmox: %+v", byName["Proxmox"])
	}
}

func TestParseHomepageBookmarks(t *testing.T) {
	yml := `
- Developer:
    - Github:
        - abbr: GH
          href: https://github.com
          icon: github
`
	cfg, err := parseHomepageBookmarks([]byte(yml))
	if err != nil {
		t.Fatalf("parseHomepageBookmarks: %v", err)
	}
	items := cfg.Dashboards[0].Items
	if len(items) != 1 || items[0].Title != "Github" || items[0].URL != "https://github.com" || items[0].Group != "Developer" {
		t.Fatalf("bad bookmark: %+v", items)
	}
}

func TestParseNative(t *testing.T) {
	yml := `
version: 1
dashboards:
  - name: Home
    items:
      - type: bookmark
        title: Plex
        url: https://plex.tv
        group: Media
`
	cfg, err := parseNative([]byte(yml))
	if err != nil {
		t.Fatalf("parseNative: %v", err)
	}
	if len(cfg.Dashboards) != 1 || cfg.Dashboards[0].Items[0].Title != "Plex" {
		t.Fatalf("bad native parse: %+v", cfg)
	}
}

func TestNormalizeIcon(t *testing.T) {
	cases := map[string]string{
		"https://x/i.png": "https://x/i.png",
		"plex.png":        "plex",
		"mdi-server":      "", // a one-colour glyph set: no copy here, and "server" would match a logo
		"si-github":       "github",
		"sh-jellyfin.svg": "jellyfin",
		"":                "",
	}
	for in, want := range cases {
		if got := normalizeIcon(in); got != want {
			t.Errorf("normalizeIcon(%q)=%q want %q", in, got, want)
		}
	}
}
