package api

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

// The API widget keeps its credentials in the widget secret store, not in the
// widget's content, which every request for the board carries to the browser.
//
//   - A guided preset keeps the key as the secret "key". Its URL and headers are
//     templates that name it — "Token {{key}}", "Basic {{key|base64}}",
//     "apikey={{key|url}}" — and carry no secret themselves.
//   - Advanced mode keeps each header's VALUE as the secret "header.<name>" and
//     lists the names in the content's "secret_headers".

var keyTemplate = regexp.MustCompile(`\{\{key(?:\|(base64|url))?\}\}`)

// resolveKey puts the preset's key into a template.
func resolveKey(s, key string) string {
	return keyTemplate.ReplaceAllStringFunc(s, func(m string) string {
		switch keyTemplate.FindStringSubmatch(m)[1] {
		case "base64":
			return base64.StdEncoding.EncodeToString([]byte(key))
		case "url":
			return jsEncodeURIComponent(key)
		}
		return key
	})
}

// jsEncodeURIComponent escapes the way the browser's encodeURIComponent does,
// which is how presets have always written a key into a URL.
func jsEncodeURIComponent(s string) string {
	e := strings.ReplaceAll(url.QueryEscape(s), "+", "%20")
	for from, to := range map[string]string{"%21": "!", "%27": "'", "%28": "(", "%29": ")", "%2A": "*"} {
		e = strings.ReplaceAll(e, from, to)
	}
	return e
}

func headerSecretName(header string) string { return "header." + strings.ToLower(header) }

// WidgetAPIHandler runs the API widget's request for a widget the caller owns,
// reading the credentials on this side.
type WidgetAPIHandler struct {
	DB      *sql.DB
	secrets *WidgetSecrets
}

func NewWidgetAPIHandler(db *sql.DB) *WidgetAPIHandler {
	return &WidgetAPIHandler{DB: db, secrets: NewWidgetSecrets(db)}
}

// POST /api/widget/{id}/api-fetch — {"paths": [...]}. The address, method and
// headers come from the widget.
func (h *WidgetAPIHandler) Fetch(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		http.Error(w, "error.invalid_id", http.StatusBadRequest)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 32*1024)
	var in struct {
		Paths []string `json:"paths"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	var content sql.NullString
	if h.DB.QueryRowContext(r.Context(),
		`SELECT content FROM items WHERE id = ? AND user_id = ? AND type = 'widget'`,
		id, middleware.GetUserIDFromContext(r)).Scan(&content) != nil {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}
	var c struct {
		WidgetID      string            `json:"widgetId"`
		URL           string            `json:"url"`
		Method        string            `json:"method"`
		Headers       map[string]string `json:"headers"`
		SecretHeaders []string          `json:"secret_headers"`
	}
	if json.Unmarshal([]byte(content.String), &c) != nil || c.WidgetID != "api" {
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	}
	secrets, err := h.secrets.All(id)
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}

	key := secrets["key"]
	headers := map[string]string{}
	for name, value := range c.Headers {
		headers[name] = resolveKey(value, key)
	}
	for _, name := range c.SecretHeaders {
		if v, ok := secrets[headerSecretName(name)]; ok {
			headers[name] = v
		}
	}
	serveAPIFetch(w, r, apiFetchInput{
		URL:     resolveKey(c.URL, key),
		Method:  c.Method,
		Headers: headers,
		Paths:   in.Paths,
	})
}

// MigrateWidgetSecrets moves the credentials of API and Docker widgets saved by an
// earlier version out of their content and into the secret store. It is safe to run on
// every start and after a restore: a widget with nothing left to move is left
// alone.
//
// What is found where, and what becomes of it:
//   - a preset widget has its key in "apiKey", and again inside its headers and
//     URL. The key becomes the secret "key" and each place it was written is
//     replaced by the template that names it; a header with no key in it (a
//     constant the preset sends) stays.
//   - an advanced widget has "headers" of name and value. Every value is treated
//     as a secret: the names stay in the content, the values move.
func MigrateWidgetSecrets(db *sql.DB) (int, error) {
	rows, err := db.Query(`SELECT id, content FROM items WHERE type = 'widget'
		AND (content LIKE '%"api"%' OR content LIKE '%"docker"%')`)
	if err != nil {
		return 0, err
	}
	type row struct {
		id      int
		content string
	}
	var found []row
	for rows.Next() {
		var r row
		var c sql.NullString
		if err := rows.Scan(&r.id, &c); err != nil {
			rows.Close()
			return 0, err
		}
		r.content = c.String
		found = append(found, r)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return 0, err
	}
	rows.Close()

	migrated := 0
	for _, r := range found {
		next, secrets, ok := migrateAPIContent(r.content)
		if !ok {
			next, secrets, ok = migrateDockerContent(r.content)
		}
		if !ok {
			continue
		}
		tx, err := db.Begin()
		if err != nil {
			return migrated, err
		}
		fail := func(err error) (int, error) { tx.Rollback(); return migrated, err }
		for name, value := range secrets {
			if _, err := tx.Exec(`INSERT INTO widget_secrets (item_id, name, value) VALUES (?, ?, ?)
				ON CONFLICT (item_id, name) DO UPDATE SET value = excluded.value`, r.id, name, value); err != nil {
				return fail(err)
			}
		}
		if _, err := tx.Exec(`UPDATE items SET content = ? WHERE id = ?`, next, r.id); err != nil {
			return fail(err)
		}
		if err := tx.Commit(); err != nil {
			return migrated, err
		}
		migrated++
	}
	if migrated > 0 {
		slog.Info("API widget credentials moved to the secret store", "widgets", migrated)
	}
	return migrated, nil
}

// migrateAPIContent is the pure half: the new content and the secrets that come
// out of one widget's old content. ok is false when there is nothing to do.
func migrateAPIContent(content string) (next string, secrets map[string]string, ok bool) {
	var m map[string]any
	if json.Unmarshal([]byte(content), &m) != nil || m["widgetId"] != "api" {
		return "", nil, false
	}
	apiKey, _ := m["apiKey"].(string)
	preset, _ := m["preset"].(string)
	headers, _ := m["headers"].(map[string]any)
	if apiKey == "" && (preset != "" || len(headers) == 0) {
		return "", nil, false
	}
	secrets = map[string]string{}

	if apiKey != "" {
		secrets["key"] = apiKey
		if u, _ := m["url"].(string); u != "" {
			// Only where a preset puts it, as the value of a query parameter.
			enc := jsEncodeURIComponent(apiKey)
			re := regexp.MustCompile(`=` + regexp.QuoteMeta(enc) + `(&|$)`)
			m["url"] = re.ReplaceAllString(u, "={{key|url}}$1")
		}
		delete(m, "apiKey")
	}

	if preset != "" {
		// Constants stay; the key, in any of its forms, becomes a template.
		out := map[string]any{}
		for name, v := range headers {
			s, _ := v.(string)
			if apiKey != "" {
				s = strings.ReplaceAll(s, base64.StdEncoding.EncodeToString([]byte(apiKey)), "{{key|base64}}")
				s = strings.ReplaceAll(s, apiKey, "{{key}}")
			}
			out[name] = s
		}
		if len(out) > 0 {
			m["headers"] = out
		}
	} else if len(headers) > 0 {
		names := []string{}
		existing, _ := m["secret_headers"].([]any)
		seen := map[string]bool{}
		for _, n := range existing {
			if s, _ := n.(string); s != "" && !seen[strings.ToLower(s)] {
				seen[strings.ToLower(s)] = true
				names = append(names, s)
			}
		}
		for name, v := range headers {
			value, _ := v.(string)
			if !secretName.MatchString(headerSecretName(name)) {
				continue // not a header name anything would send
			}
			if value != "" {
				secrets[headerSecretName(name)] = value
			}
			if !seen[strings.ToLower(name)] {
				seen[strings.ToLower(name)] = true
				names = append(names, name)
			}
		}
		sort.Strings(names)
		m["secret_headers"] = names
		delete(m, "headers")
	}

	b, err := json.Marshal(m)
	if err != nil {
		return "", nil, false
	}
	return string(b), secrets, true
}

// dockerSecretName is where a Docker host's agent token is kept: one secret per
// host, named after the host's id (which the widget generates as "h_" and six
// letters or digits).
func dockerSecretName(hostID string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(hostID) {
		if r >= 'a' && r <= 'z' || r >= '0' && r <= '9' || r == '_' || r == '.' || r == '-' {
			b.WriteRune(r)
		} else {
			b.WriteRune('-')
		}
	}
	name := "docker." + b.String()
	if len(name) > 64 {
		name = name[:64]
	}
	return name
}

// migrateDockerContent moves the agent token of each host out of a Docker
// widget's content. Anything else about the hosts stays where it is.
func migrateDockerContent(content string) (next string, secrets map[string]string, ok bool) {
	var m map[string]any
	if json.Unmarshal([]byte(content), &m) != nil || m["widgetId"] != "docker" {
		return "", nil, false
	}
	hosts, _ := m["hosts"].([]any)
	secrets = map[string]string{}
	changed := false
	for _, h := range hosts {
		host, _ := h.(map[string]any)
		if host == nil {
			continue
		}
		if _, has := host["token"]; !has {
			continue
		}
		token, _ := host["token"].(string)
		id, _ := host["id"].(string)
		if token != "" && id != "" {
			secrets[dockerSecretName(id)] = token
		}
		delete(host, "token")
		changed = true
	}
	if !changed {
		return "", nil, false
	}
	b, err := json.Marshal(m)
	if err != nil {
		return "", nil, false
	}
	return string(b), secrets, true
}
