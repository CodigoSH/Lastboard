package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
	"gopkg.in/yaml.v3"
)

// NativeConfig is Lastboard's open, documented export format (v1). It is the
// hub the importer normalizes competitor files into, and the shape the native
// export emits — config-as-code with no lock-in.
type NativeConfig struct {
	Version    int               `yaml:"version" json:"version"`
	Dashboards []NativeDashboard `yaml:"dashboards" json:"dashboards"`

	// Skipped counts entries a competitor file listed that Lastboard cannot
	// make a bookmark of — no address to open, or one that is still a template
	// placeholder. Only the import preview carries it, so the person is told
	// how many were left out instead of finding out by counting.
	Skipped int `yaml:"-" json:"skipped,omitempty"`
}

type NativeDashboard struct {
	Name  string       `yaml:"name" json:"name"`
	Items []NativeItem `yaml:"items" json:"items"`
}

// NativeItem is a mid-level bookmark/app (not raw x/y/w/h): the importer
// auto-places it. Group maps to a Lastboard section.
type NativeItem struct {
	Type        string `yaml:"type" json:"type"`
	Title       string `yaml:"title" json:"title"`
	URL         string `yaml:"url" json:"url"`
	Icon        string `yaml:"icon,omitempty" json:"icon,omitempty"`
	Group       string `yaml:"group,omitempty" json:"group,omitempty"`
	Description string `yaml:"description,omitempty" json:"description,omitempty"`
	StatusCheck bool   `yaml:"status_check,omitempty" json:"status_check,omitempty"`
}

// itemContent mirrors the bookmark/section content JSON blob.
type itemContent struct {
	// Title is what a section is called; Label is what a bookmark is. The two
	// live in the same JSON blob under different names, and reading the wrong
	// one lost every group on export.
	Title       string `json:"title"`
	Label       string `json:"label"`
	URL         string `json:"url"`
	Icon        string `json:"icon"`
	Description string `json:"description"`
	StatusCheck bool   `json:"statusCheck"`
}

// ImportExportHandler serves native export and competitor import.
type ImportExportHandler struct {
	DB *sql.DB
}

func NewImportExportHandler(db *sql.DB) *ImportExportHandler {
	return &ImportExportHandler{DB: db}
}

// ExportNative writes the caller's dashboards as a NativeConfig YAML download.
func (h *ImportExportHandler) ExportNative(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r)

	// Dashboards, in order.
	dashRows, err := h.DB.QueryContext(r.Context(), `SELECT id, name FROM dashboards WHERE user_id = ? ORDER BY position, id`, userID)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	type dash struct {
		id   int
		name string
	}
	var dashboards []dash
	dashIndex := map[int]int{} // dashboard id -> slice index
	for dashRows.Next() {
		var d dash
		if err := dashRows.Scan(&d.id, &d.name); err != nil {
			dashRows.Close()
			http.Error(w, "general.internal_error", http.StatusInternalServerError)
			return
		}
		dashIndex[d.id] = len(dashboards)
		dashboards = append(dashboards, d)
	}
	dashRows.Close()

	// Items: resolve section titles first, then emit bookmarks with their group.
	itemRows, err := h.DB.QueryContext(r.Context(),
		`SELECT id, COALESCE(dashboard_id, 0), parent_id, type, content FROM items WHERE user_id = ?`, userID)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	type raw struct {
		id, dashboardID int
		parentID        sql.NullInt64
		itemType        string
		content         sql.NullString
	}
	var items []raw
	sectionTitle := map[int]string{}
	for itemRows.Next() {
		var it raw
		if err := itemRows.Scan(&it.id, &it.dashboardID, &it.parentID, &it.itemType, &it.content); err != nil {
			itemRows.Close()
			http.Error(w, "general.internal_error", http.StatusInternalServerError)
			return
		}
		if it.itemType == "section" && it.content.Valid {
			var c itemContent
			if json.Unmarshal([]byte(it.content.String), &c) == nil {
				sectionTitle[it.id] = c.Title
				if c.Title == "" {
					sectionTitle[it.id] = c.Label
				}
			}
		}
		items = append(items, it)
	}
	itemRows.Close()

	out := NativeConfig{Version: 1}
	nd := make([]NativeDashboard, len(dashboards))
	for i, d := range dashboards {
		nd[i] = NativeDashboard{Name: d.name}
	}
	for _, it := range items {
		if it.itemType != "bookmark" || !it.content.Valid {
			continue
		}
		var c itemContent
		if json.Unmarshal([]byte(it.content.String), &c) != nil {
			continue
		}
		idx, ok := dashIndex[it.dashboardID]
		if !ok {
			continue
		}
		group := ""
		if it.parentID.Valid {
			group = sectionTitle[int(it.parentID.Int64)]
		}
		nd[idx].Items = append(nd[idx].Items, NativeItem{
			Type: "bookmark", Title: c.Label, URL: c.URL, Icon: c.Icon,
			Group: group, Description: c.Description, StatusCheck: c.StatusCheck,
		})
	}
	out.Dashboards = nd

	blob, err := yaml.Marshal(out)
	if err != nil {
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/x-yaml")
	w.Header().Set("Content-Disposition", fmt.Sprintf(
		"attachment; filename=\"lastboard-%s.yaml\"", time.Now().Format("2006-01-02-1504")))
	w.Write(blob)
}

// ImportParse parses an uploaded competitor/native file into a NativeConfig and
// returns it as JSON. The frontend then materializes it (auto-placing items).
func (h *ImportExportHandler) ImportParse(w http.ResponseWriter, r *http.Request) {
	// ParseMultipartForm's argument bounds what is kept in memory, not the
	// upload: anything above it is spilled to disk, so on its own it is no limit
	// at all. A Homepage or Dashy configuration is a text file; 4 MiB is already
	// far more than one.
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024*1024)
	if err := r.ParseMultipartForm(2 << 20); err != nil { // 2 MiB
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	format := r.FormValue("format")
	file, _, ferr := r.FormFile("file")
	if ferr != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	defer file.Close()
	data, ferr := io.ReadAll(io.LimitReader(file, 2<<20))
	if ferr != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	var cfg *NativeConfig
	var err error
	switch format {
	case "native":
		cfg, err = parseNative([]byte(data))
	case "dashy":
		cfg, err = parseDashy([]byte(data))
	case "homepage-services":
		cfg, err = parseHomepageServices([]byte(data))
	case "homepage-bookmarks":
		cfg, err = parseHomepageBookmarks([]byte(data))
	default:
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, "import.parse_failed", http.StatusUnprocessableEntity)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cfg)
}

func parseNative(data []byte) (*NativeConfig, error) {
	var cfg NativeConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	if len(cfg.Dashboards) == 0 {
		return nil, fmt.Errorf("no dashboards")
	}
	return &cfg, nil
}

// --- Dashy (conf.yml) ---

func parseDashy(data []byte) (*NativeConfig, error) {
	var conf struct {
		Sections []struct {
			Name  string `yaml:"name"`
			Items []struct {
				Title       string `yaml:"title"`
				URL         string `yaml:"url"`
				Icon        string `yaml:"icon"`
				Description string `yaml:"description"`
				StatusCheck bool   `yaml:"statusCheck"`
				// SubItems are the links Dashy folds under an item. They are
				// links like any other, so they are imported beside it.
				SubItems []struct {
					Title string `yaml:"title"`
					URL   string `yaml:"url"`
					Icon  string `yaml:"icon"`
				} `yaml:"subItems"`
			} `yaml:"items"`
		} `yaml:"sections"`
	}
	if err := yaml.Unmarshal(data, &conf); err != nil {
		return nil, err
	}
	dash := NativeDashboard{Name: "Dashy"}
	skipped := 0
	for _, s := range conf.Sections {
		for _, it := range s.Items {
			if it.URL == "" && it.Title == "" {
				continue
			}
			if strings.TrimSpace(it.URL) == "" || unresolved(it.URL) {
				skipped++
			} else {
				dash.Items = append(dash.Items, NativeItem{
					Type: "bookmark", Title: it.Title, URL: it.URL, Icon: normalizeIcon(it.Icon),
					Group: s.Name, Description: it.Description, StatusCheck: it.StatusCheck,
				})
			}
			for _, sub := range it.SubItems {
				if strings.TrimSpace(sub.URL) == "" || unresolved(sub.URL) {
					skipped++
					continue
				}
				dash.Items = append(dash.Items, NativeItem{
					Type: "bookmark", Title: sub.Title, URL: sub.URL, Icon: normalizeIcon(sub.Icon), Group: s.Name,
				})
			}
		}
	}
	if len(dash.Items) == 0 {
		return nil, fmt.Errorf("no items")
	}
	return &NativeConfig{Version: 1, Dashboards: []NativeDashboard{dash}, Skipped: skipped}, nil
}

// --- Homepage (services.yaml / bookmarks.yaml) ---
//
// Both files are a list of groups. A group is a one-key map whose value is a
// list of entries; an entry is a one-key map whose value is either the
// definition itself (services: a map with href, icon, description…) or a list
// holding it (bookmarks: a list with one map of abbr, href, icon…). Since 2024
// a service list may also hold another group, which is a one-key map whose
// value is again a list of entries.
//
// The walk is over the YAML nodes, not a struct. A struct has to name every
// shape the file may take, and a nested group, a widget block or a key added
// next year made the whole decode fail with "cannot unmarshal" — one entry the
// struct did not expect, and the person was told the file could not be read.
// One walk also serves both files: nothing separates a bookmarks list from a
// services list except the shape of its leaves, and people do choose the wrong
// one of the two.

// yamlResolved follows aliases (*anchor) to the node they stand for.
func yamlResolved(n *yaml.Node) *yaml.Node {
	for n != nil && n.Kind == yaml.AliasNode {
		n = n.Alias
	}
	return n
}

// yamlText is a scalar's text, or "" for anything that is not a scalar.
func yamlText(n *yaml.Node) string {
	if n = yamlResolved(n); n != nil && n.Kind == yaml.ScalarNode {
		return strings.TrimSpace(n.Value)
	}
	return ""
}

// yamlPairs lists a mapping's key/value nodes in file order.
func yamlPairs(n *yaml.Node) [][2]*yaml.Node {
	n = yamlResolved(n)
	if n == nil || n.Kind != yaml.MappingNode {
		return nil
	}
	out := make([][2]*yaml.Node, 0, len(n.Content)/2)
	for i := 0; i+1 < len(n.Content); i += 2 {
		out = append(out, [2]*yaml.Node{n.Content[i], n.Content[i+1]})
	}
	return out
}

// yamlField reads one scalar key of a mapping.
func yamlField(n *yaml.Node, key string) string {
	for _, kv := range yamlPairs(n) {
		if yamlText(kv[0]) == key {
			return yamlText(kv[1])
		}
	}
	return ""
}

// hasLeafKeys says whether a mapping looks like a leaf — a definition with keys
// of its own — rather than a group whose children are entries.
func hasLeafKeys(n *yaml.Node) bool {
	for _, kv := range yamlPairs(n) {
		switch yamlText(kv[0]) {
		case "href", "abbr", "icon", "description", "siteMonitor", "ping":
			return true
		}
	}
	return false
}

// homepageLeaf finds the definition under an entry's value: the map itself for
// a service, or the first map holding a leaf's keys inside a list for a bookmark.
// The second result says the value is a list of entries instead, i.e. a group.
func homepageLeaf(v *yaml.Node) (leaf *yaml.Node, isGroup bool) {
	v = yamlResolved(v)
	if v == nil {
		return nil, false
	}
	switch v.Kind {
	case yaml.MappingNode:
		return v, false
	case yaml.SequenceNode:
		for _, el := range v.Content {
			if el = yamlResolved(el); el != nil && el.Kind == yaml.MappingNode && hasLeafKeys(el) {
				return el, false
			}
		}
		return nil, len(v.Content) > 0
	}
	return nil, false
}

// unresolved says an address is still a template: Homepage fills {{HOMEPAGE_VAR_X}}
// and ${X} in from its environment, and neither is an address anywhere else.
func unresolved(href string) bool {
	return strings.Contains(href, "{{") || strings.Contains(href, "${")
}

type homepageWalk struct {
	items   []NativeItem
	skipped int
}

// group walks the entries of one group. A nested group is named after its
// parent — "Media / Servarr" — because a Lastboard section has one title and
// the two levels would otherwise read as unrelated.
func (w *homepageWalk) group(name string, entries *yaml.Node) {
	entries = yamlResolved(entries)
	if entries == nil || entries.Kind != yaml.SequenceNode {
		return
	}
	for _, entry := range entries.Content {
		for _, kv := range yamlPairs(entry) {
			title := yamlText(kv[0])
			leaf, isGroup := homepageLeaf(kv[1])
			switch {
			case isGroup:
				child := title
				if name != "" {
					child = name + " / " + title
				}
				w.group(child, kv[1])
			case title == "", leaf == nil:
				// A key that is not text cannot be a name, and an entry with
				// nothing under it (a bare "- Name:") has nothing to import and
				// nothing to have been left out.
			case yamlField(leaf, "href") == "", unresolved(yamlField(leaf, "href")):
				w.skipped++
			default:
				w.items = append(w.items, NativeItem{
					Type: "bookmark", Title: title, URL: yamlField(leaf, "href"),
					Icon: normalizeIcon(yamlField(leaf, "icon")), Group: name,
					Description: yamlField(leaf, "description"),
					StatusCheck: yamlField(leaf, "siteMonitor") != "" || yamlField(leaf, "ping") != "",
				})
			}
		}
	}
}

func parseHomepage(data []byte, empty string) (*NativeConfig, error) {
	var doc yaml.Node
	if err := yaml.Unmarshal(data, &doc); err != nil {
		return nil, err
	}
	top := yamlResolved(&doc)
	if top != nil && top.Kind == yaml.DocumentNode && len(top.Content) > 0 {
		top = yamlResolved(top.Content[0])
	}
	if top == nil || top.Kind != yaml.SequenceNode {
		return nil, fmt.Errorf("%s", empty)
	}
	var w homepageWalk
	for _, g := range top.Content {
		for _, kv := range yamlPairs(g) {
			// A one-key map whose value is a list of entries is a group.
			// Anything else at the top is an entry that was never put in one,
			// and is walked as a group of its own with no name.
			if _, isGroup := homepageLeaf(kv[1]); isGroup {
				w.group(yamlText(kv[0]), kv[1])
				continue
			}
			alone := &yaml.Node{Kind: yaml.MappingNode, Content: []*yaml.Node{kv[0], kv[1]}}
			w.group("", &yaml.Node{Kind: yaml.SequenceNode, Content: []*yaml.Node{alone}})
		}
	}
	if len(w.items) == 0 {
		return nil, fmt.Errorf("%s", empty)
	}
	return &NativeConfig{Version: 1, Dashboards: []NativeDashboard{{Name: "Homepage", Items: w.items}}, Skipped: w.skipped}, nil
}

func parseHomepageServices(data []byte) (*NativeConfig, error) {
	return parseHomepage(data, "no services")
}

func parseHomepageBookmarks(data []byte) (*NativeConfig, error) {
	return parseHomepage(data, "no bookmarks")
}

// normalizeIcon maps competitor icon references to something Lastboard can show,
// keeping full URLs as-is and stripping known prefixes to a bare slug; unknown
// forms become empty and the UI's initial-avatar fallback handles them.
//
// What reaches here is whatever people typed into another tool: Homepage's
// "mdi-home-#ff0000" (a colour after the name), "/images/unifi.png" (a file in
// their own Homepage folder, which this server does not have), and Dashy's
// "fas fa-rocket" (a CSS class) or the words "favicon" and "generative". None
// of those is a slug, and passing them through asked the icon CDN for a name
// with a slash or a space in it.
func normalizeIcon(icon string) string {
	icon = strings.TrimSpace(icon)
	if icon == "" {
		return ""
	}
	if strings.HasPrefix(icon, "http://") || strings.HasPrefix(icon, "https://") {
		return icon
	}
	if strings.ContainsAny(icon, " \t") || icon == "favicon" || icon == "generative" {
		return ""
	}
	// A file in the other tool's own folder: its name is the best guess at a slug.
	if strings.Contains(icon, "/") {
		icon = icon[strings.LastIndex(icon, "/")+1:]
	}
	// "-#ff0000" after the name is a colour, not part of it.
	if i := strings.Index(icon, "-#"); i > 0 {
		icon = icon[:i]
	}
	for _, p := range []string{"sh-", "si-", "mdi-", "hl-", "fa-"} {
		if strings.HasPrefix(icon, p) {
			return strings.TrimSuffix(strings.TrimPrefix(icon, p), ".svg")
		}
	}
	// dashboard-icons style "plex.png" / "plex" -> "plex"
	return strings.TrimSuffix(strings.TrimSuffix(strings.TrimSuffix(icon, ".png"), ".svg"), ".webp")
}
