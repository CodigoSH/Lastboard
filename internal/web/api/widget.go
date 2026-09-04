package api

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// apiWidgetMaxBody caps the fetched response so a huge or hostile endpoint can't
// exhaust memory.
const apiWidgetMaxBody = 512 * 1024 // 512 KiB

// apiWidgetClient fetches user-configured endpoints for the generic API widget.
// Skipping TLS verification and reaching private IPs is intentional on a
// self-hosted, single-tenant box (see the threat model) — the browser can't do
// this itself because of CORS and network reachability, which is the whole
// reason the fetch runs on the server.
var apiWidgetClient = &http.Client{
	Timeout: 8 * time.Second,
	Transport: &http.Transport{
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:        50,
		MaxIdleConnsPerHost: 5,
		IdleConnTimeout:     60 * time.Second,
		DialContext: (&net.Dialer{
			Timeout:   4 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
	},
}

// WidgetHandler serves the generic API widget's server-side fetch endpoint.
type WidgetHandler struct{}

func NewWidgetHandler() *WidgetHandler {
	return &WidgetHandler{}
}

// ApiFetch fetches a user-configured JSON endpoint server-side and returns the
// values found at the requested dot/bracket paths (e.g. "totals.today",
// "queue.records[0].title"). The response is always 200 with an "ok" flag so
// the widget can render a friendly "unreachable" state without treating a
// down service as a request error.
func (h *WidgetHandler) ApiFetch(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 32*1024)

	var input struct {
		URL     string            `json:"url"`
		Method  string            `json:"method"`
		Headers map[string]string `json:"headers"`
		Paths   []string          `json:"paths"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	target, err := url.Parse(strings.TrimSpace(input.URL))
	if err != nil || (target.Scheme != "http" && target.Scheme != "https") {
		http.Error(w, "error.invalid_url", http.StatusBadRequest)
		return
	}
	// Pointing at your own network is the product; pointing at the instance
	// metadata service is not — see util.IsCloudMetadataHost.
	if util.IsCloudMetadataHost(target.Hostname()) {
		http.Error(w, "error.invalid_url", http.StatusBadRequest)
		return
	}

	method := strings.ToUpper(strings.TrimSpace(input.Method))
	if method == "" {
		method = http.MethodGet
	}
	if method != http.MethodGet && method != http.MethodPost && method != http.MethodHead {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, method, target.String(), nil)
	if err != nil {
		http.Error(w, "error.invalid_url", http.StatusBadRequest)
		return
	}
	// The widget forwards headers so it can carry an API key, which is what it
	// is for. The ones that say who the request is from, rather than what it
	// wants, are dropped: forwarded to a service that trusts this server's
	// place on the network, they let the caller wear somebody else's identity.
	for k, v := range input.Headers {
		if k == "" || util.IsForbiddenOutboundHeader(k) {
			continue
		}
		req.Header.Set(k, v)
	}
	if req.Header.Get("Accept") == "" {
		req.Header.Set("Accept", "application/json")
	}

	resp, err := apiWidgetClient.Do(req)
	if err != nil {
		widgetJSON(w, map[string]any{"ok": false, "error": "unreachable"})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, apiWidgetMaxBody))
	if err != nil {
		widgetJSON(w, map[string]any{"ok": false, "status_code": resp.StatusCode, "error": "read"})
		return
	}

	values := map[string]any{}
	var data any
	if json.Unmarshal(body, &data) == nil {
		for _, p := range input.Paths {
			if p = strings.TrimSpace(p); p != "" {
				values[p] = extractPath(data, p)
			}
		}
	}

	widgetJSON(w, map[string]any{
		"ok":          resp.StatusCode < 400,
		"status_code": resp.StatusCode,
		"values":      values,
	})
}

func widgetJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(v)
}

// extractPath walks a decoded JSON value following a dot/bracket path and
// returns the value found there, or nil if any segment is missing.
func extractPath(data any, path string) any {
	cur := data
	for _, tok := range tokenizePath(path) {
		switch t := tok.(type) {
		case string:
			m, ok := cur.(map[string]any)
			if !ok {
				return nil
			}
			cur = m[t]
		case int:
			a, ok := cur.([]any)
			if !ok || t < 0 || t >= len(a) {
				return nil
			}
			cur = a[t]
		}
	}
	return cur
}

// tokenizePath turns "a.b[0].c" into ["a", "b", 0, "c"]. Object keys are
// strings, array indices are ints.
func tokenizePath(path string) []any {
	var tokens []any
	for _, seg := range strings.Split(path, ".") {
		name := seg
		i := strings.IndexByte(seg, '[')
		if i < 0 {
			if name != "" {
				tokens = append(tokens, name)
			}
			continue
		}
		name = seg[:i]
		if name != "" {
			tokens = append(tokens, name)
		}
		rest := seg[i:]
		for len(rest) > 0 && rest[0] == '[' {
			end := strings.IndexByte(rest, ']')
			if end < 0 {
				break
			}
			if n, err := strconv.Atoi(rest[1:end]); err == nil {
				tokens = append(tokens, n)
			}
			rest = rest[end+1:]
		}
	}
	return tokens
}
