package api

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

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

	// Icons carries the images this server stores for the bookmarks, keyed by the
	// address a bookmark names them with (/api/icons/<hash>), as data: URIs. An
	// icon kept on this server is only an address on this server; without the
	// bytes, a file moved to another Lastboard names pictures it cannot find.
	Icons map[string]string `yaml:"icons,omitempty" json:"icons,omitempty"`
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
	out.Icons = h.exportIcons(r, nd)

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

// storedIconPrefix is how a bookmark names an image kept on this server.
const storedIconPrefix = "/api/icons/"

// exportIcons reads the stored images the exported bookmarks use, so the file
// can be opened somewhere that has none of them. A reference whose image is
// gone is left out and simply names nothing there either.
func (h *ImportExportHandler) exportIcons(r *http.Request, dashboards []NativeDashboard) map[string]string {
	out := map[string]string{}
	for _, d := range dashboards {
		for _, it := range d.Items {
			if !strings.HasPrefix(it.Icon, storedIconPrefix) || out[it.Icon] != "" {
				continue
			}
			var mime string
			var data []byte
			err := h.DB.QueryRowContext(r.Context(),
				`SELECT mime, data FROM icons WHERE hash = ?`, strings.TrimPrefix(it.Icon, storedIconPrefix)).Scan(&mime, &data)
			if err != nil {
				continue
			}
			out[it.Icon] = "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(data)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// ImportParse parses an uploaded competitor/native file into a NativeConfig and
// returns it as JSON. The frontend then materializes it (auto-placing items).
func (h *ImportExportHandler) ImportParse(w http.ResponseWriter, r *http.Request) {
	// ParseMultipartForm's argument bounds what is kept in memory, not the
	// upload: anything above it is spilled to disk, so on its own it is no limit
	// at all. A Homepage or Dashy configuration is a text file, far under this.
	// The ceiling is for a native export, which carries its icons inside it as
	// data: URIs: a hundred of them run past what a text file ever needs.
	r.Body = http.MaxBytesReader(w, r.Body, maxImportBytes+1<<20)
	if err := r.ParseMultipartForm(2 << 20); err != nil { // 2 MiB in memory
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
	data, ferr := io.ReadAll(io.LimitReader(file, maxImportBytes+1))
	if ferr != nil || len(data) > maxImportBytes {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	cfg, err := parseAs(format, data)
	if err == errUnknownFormat {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	if err != nil {
		// The wrong format picked for a file is the commonest way to fail, and
		// "couldn't be read" is no help to somebody who picked the one next to it.
		// If the file plainly is another format, read it as that one.
		if alt := detectFormat(data); alt != "" && formatFamily(alt) != formatFamily(format) {
			cfg, err = parseAs(alt, data)
		}
	}
	if err != nil {
		http.Error(w, "import.parse_failed", http.StatusUnprocessableEntity)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cfg)
}

// maxImportBytes bounds the file read for an import.
const maxImportBytes = 32 << 20

var errUnknownFormat = fmt.Errorf("unknown import format")

// parseAs reads a file as the named format. "auto" is whichever one the file
// looks like.
func parseAs(format string, data []byte) (*NativeConfig, error) {
	if format == "auto" {
		if format = detectFormat(data); format == "" {
			return nil, fmt.Errorf("unrecognised file")
		}
	}
	switch format {
	case "native":
		return parseNative(data)
	case "dashy":
		return parseDashy(data)
	case "homepage-services":
		return parseHomepageServices(data)
	case "homepage-bookmarks":
		return parseHomepageBookmarks(data)
	}
	return nil, errUnknownFormat
}

// formatFamily groups the two Homepage files: one reader serves both, so
// switching between them would only run the same parse again.
func formatFamily(format string) string {
	if strings.HasPrefix(format, "homepage") {
		return "homepage"
	}
	return format
}

// detectFormat says which format a file is, from its shape alone: a native
// export is a map with "dashboards", Dashy's is a map with "sections", and
// Homepage's is a list of groups.
func detectFormat(data []byte) string {
	var doc yaml.Node
	if yaml.Unmarshal(data, &doc) != nil {
		return ""
	}
	top := yamlResolved(&doc)
	if top != nil && top.Kind == yaml.DocumentNode && len(top.Content) > 0 {
		top = yamlResolved(top.Content[0])
	}
	if top == nil {
		return ""
	}
	switch top.Kind {
	case yaml.SequenceNode:
		return "homepage-services"
	case yaml.MappingNode:
		for _, kv := range yamlPairs(top) {
			switch yamlText(kv[0]) {
			case "dashboards":
				return "native"
			case "sections":
				return "dashy"
			}
		}
	}
	return ""
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

// slugPattern is what an icon name looks like in every icon library people use.
var slugPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]*$`)

// normalizeIcon turns an icon reference from another tool into one of the three
// things Lastboard can show: an image address, a short piece of text (an emoji),
// or a bare name for the browser to look up in the icon libraries — and into
// nothing when it is none of them.
//
// A bookmark's icon is drawn as an image only when it is an address; anything
// else is printed as text. So a name left in the field shows up on the board as
// the word "plex" instead of the logo, which is what importing used to do to
// every Homepage icon. The browser turns names into addresses (it holds the
// same indexes the icon picker uses) and then this server stores the images.
//
// What other tools put here: Homepage's "plex.png", "sh-plex" and
// "mdi-home-#ff0000" (a colour after the name), "/images/unifi.png" (a file in
// their own folder, which this server does not have); Dashy's "hl-plex",
// "fas fa-rocket" (a CSS class), "favicon", "generative" and plain emoji.
func normalizeIcon(icon string) string {
	icon = strings.TrimSpace(icon)
	if icon == "" {
		return ""
	}
	if strings.HasPrefix(icon, "http://") || strings.HasPrefix(icon, "https://") || strings.HasPrefix(icon, "data:") {
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
	lower := strings.ToLower(icon)
	// Glyph sets drawn in one colour by the other tool (Material Design, Font
	// Awesome). Lastboard has no copy of them, and a bare "server" would be
	// looked up among brand logos and could match the wrong thing.
	for _, p := range []string{"mdi-", "fa-", "fas-", "far-", "fab-", "fal-"} {
		if strings.HasPrefix(lower, p) {
			return ""
		}
	}
	// Brand-logo sets whose names are the brand's: look the name up.
	for _, p := range []string{"sh-", "si-", "hl-"} {
		if strings.HasPrefix(lower, p) {
			icon = icon[len(p):]
			break
		}
	}
	for _, ext := range []string{".png", ".svg", ".webp"} {
		if strings.HasSuffix(strings.ToLower(icon), ext) {
			icon = icon[:len(icon)-len(ext)]
			break
		}
	}
	if slugPattern.MatchString(icon) {
		return icon
	}
	// Not a name: an emoji is the one thing worth keeping, since the interface
	// prints it as it is. Short, and made of symbols rather than letters.
	if utf8.RuneCountInString(icon) <= 8 && !strings.ContainsAny(icon, "/:") {
		symbols := false
		for _, r := range icon {
			if r > unicode.MaxASCII && !unicode.IsLetter(r) {
				symbols = true
			}
			if unicode.IsLetter(r) || unicode.IsDigit(r) {
				return ""
			}
		}
		if symbols {
			return icon
		}
	}
	return ""
}
