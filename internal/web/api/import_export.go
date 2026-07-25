package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/CodigoSH/Lastboard/internal/web/middleware"
	"gopkg.in/yaml.v3"
)

// NativeConfig is Lastboard's open, documented export format (v1). It is the
// hub the importer normalizes competitor files into, and the shape the native
// export emits — config-as-code with no lock-in.
type NativeConfig struct {
	Version    int               `yaml:"version" json:"version"`
	Dashboards []NativeDashboard `yaml:"dashboards" json:"dashboards"`
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
	dashRows, err := h.DB.Query(`SELECT id, name FROM dashboards WHERE user_id = ? ORDER BY position, id`, userID)
	if err != nil {
		http.Error(w, "error.internal", http.StatusInternalServerError)
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
			http.Error(w, "error.internal", http.StatusInternalServerError)
			return
		}
		dashIndex[d.id] = len(dashboards)
		dashboards = append(dashboards, d)
	}
	dashRows.Close()

	// Items: resolve section titles first, then emit bookmarks with their group.
	itemRows, err := h.DB.Query(
		`SELECT id, COALESCE(dashboard_id, 0), parent_id, type, content FROM items WHERE user_id = ?`, userID)
	if err != nil {
		http.Error(w, "error.internal", http.StatusInternalServerError)
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
			http.Error(w, "error.internal", http.StatusInternalServerError)
			return
		}
		if it.itemType == "section" && it.content.Valid {
			var c itemContent
			if json.Unmarshal([]byte(it.content.String), &c) == nil {
				sectionTitle[it.id] = c.Label
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
		http.Error(w, "error.internal", http.StatusInternalServerError)
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
	if err := r.ParseMultipartForm(2 << 20); err != nil { // 2 MiB
		http.Error(w, "error.invalid_input", http.StatusBadRequest)
		return
	}
	format := r.FormValue("format")
	file, _, ferr := r.FormFile("file")
	if ferr != nil {
		http.Error(w, "error.invalid_input", http.StatusBadRequest)
		return
	}
	defer file.Close()
	data, ferr := io.ReadAll(io.LimitReader(file, 2<<20))
	if ferr != nil {
		http.Error(w, "error.invalid_input", http.StatusBadRequest)
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
		http.Error(w, "error.invalid_input", http.StatusBadRequest)
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
			} `yaml:"items"`
		} `yaml:"sections"`
	}
	if err := yaml.Unmarshal(data, &conf); err != nil {
		return nil, err
	}
	dash := NativeDashboard{Name: "Dashy"}
	for _, s := range conf.Sections {
		for _, it := range s.Items {
			if it.URL == "" && it.Title == "" {
				continue
			}
			dash.Items = append(dash.Items, NativeItem{
				Type: "bookmark", Title: it.Title, URL: it.URL, Icon: normalizeIcon(it.Icon),
				Group: s.Name, Description: it.Description, StatusCheck: it.StatusCheck,
			})
		}
	}
	if len(dash.Items) == 0 {
		return nil, fmt.Errorf("no items")
	}
	return &NativeConfig{Version: 1, Dashboards: []NativeDashboard{dash}}, nil
}

// --- Homepage (services.yaml / bookmarks.yaml) ---
// Both are lists of single-key group maps whose value is a list of single-key
// entry maps. We walk them generically since the keys are dynamic names.

func parseHomepageServices(data []byte) (*NativeConfig, error) {
	var groups []map[string][]map[string]struct {
		Href        string `yaml:"href"`
		Icon        string `yaml:"icon"`
		Description string `yaml:"description"`
		SiteMonitor string `yaml:"siteMonitor"`
		Ping        string `yaml:"ping"`
	}
	if err := yaml.Unmarshal(data, &groups); err != nil {
		return nil, err
	}
	dash := NativeDashboard{Name: "Homepage"}
	for _, group := range groups {
		for groupName, services := range group {
			for _, svc := range services {
				for name, def := range svc {
					if def.Href == "" {
						continue
					}
					dash.Items = append(dash.Items, NativeItem{
						Type: "bookmark", Title: name, URL: def.Href, Icon: normalizeIcon(def.Icon),
						Group: groupName, Description: def.Description,
						StatusCheck: def.SiteMonitor != "" || def.Ping != "",
					})
				}
			}
		}
	}
	if len(dash.Items) == 0 {
		return nil, fmt.Errorf("no services")
	}
	return &NativeConfig{Version: 1, Dashboards: []NativeDashboard{dash}}, nil
}

func parseHomepageBookmarks(data []byte) (*NativeConfig, error) {
	var groups []map[string][]map[string][]struct {
		Href string `yaml:"href"`
		Abbr string `yaml:"abbr"`
		Icon string `yaml:"icon"`
	}
	if err := yaml.Unmarshal(data, &groups); err != nil {
		return nil, err
	}
	dash := NativeDashboard{Name: "Homepage"}
	for _, group := range groups {
		for groupName, entries := range group {
			for _, entry := range entries {
				for name, defs := range entry {
					if len(defs) == 0 || defs[0].Href == "" {
						continue
					}
					dash.Items = append(dash.Items, NativeItem{
						Type: "bookmark", Title: name, URL: defs[0].Href,
						Icon: normalizeIcon(defs[0].Icon), Group: groupName,
					})
				}
			}
		}
	}
	if len(dash.Items) == 0 {
		return nil, fmt.Errorf("no bookmarks")
	}
	return &NativeConfig{Version: 1, Dashboards: []NativeDashboard{dash}}, nil
}

// normalizeIcon maps competitor icon references to something Lastboard can show,
// keeping full URLs as-is and stripping known prefixes to a bare slug; unknown
// forms fall through and the UI's initial-avatar fallback handles them.
func normalizeIcon(icon string) string {
	icon = strings.TrimSpace(icon)
	if icon == "" {
		return ""
	}
	if strings.HasPrefix(icon, "http://") || strings.HasPrefix(icon, "https://") {
		return icon
	}
	for _, p := range []string{"sh-", "si-", "mdi-", "hl-", "fa-"} {
		if strings.HasPrefix(icon, p) {
			return strings.TrimSuffix(strings.TrimPrefix(icon, p), ".svg")
		}
	}
	// dashboard-icons style "plex.png" / "plex" -> "plex"
	return strings.TrimSuffix(strings.TrimSuffix(icon, ".png"), ".svg")
}
