package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// capturedRequest records what a fake notification server received.
type capturedRequest struct {
	method string
	path   string
	query  string
	header http.Header
	body   string
}

// notifyServer spins up a stand-in notification provider returning the given
// status, and captures the single request it receives.
func notifyServer(t *testing.T, status int) (*httptest.Server, *capturedRequest) {
	t.Helper()
	got := &capturedRequest{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		got.method, got.path, got.query = r.Method, r.URL.Path, r.URL.RawQuery
		got.header, got.body = r.Header.Clone(), string(body)
		w.WriteHeader(status)
	}))
	t.Cleanup(srv.Close)
	return srv, got
}

func TestNotifyConfigActive(t *testing.T) {
	tests := []struct {
		name string
		cfg  notifyConfig
		want bool
	}{
		{"fully configured", notifyConfig{Enabled: true, Type: "ntfy", URL: "http://x"}, true},
		{"disabled", notifyConfig{Enabled: false, Type: "ntfy", URL: "http://x"}, false},
		{"no type", notifyConfig{Enabled: true, Type: "", URL: "http://x"}, false},
		{"type none", notifyConfig{Enabled: true, Type: "none", URL: "http://x"}, false},
		{"no url", notifyConfig{Enabled: true, Type: "ntfy", URL: ""}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.cfg.active(); got != tt.want {
				t.Errorf("active() = %v, want %v", got, tt.want)
			}
		})
	}
}

// TestSendNtfyOutage checks the headers ntfy relies on to render an alert, and
// that the outage variant is the loud one.
func TestSendNtfyOutage(t *testing.T) {
	srv, got := notifyServer(t, http.StatusOK)
	cfg := notifyConfig{Type: "ntfy", URL: srv.URL, Token: "tok123"}

	if err := sendNtfy(context.Background(), cfg, "Radarr", "Service is down", false); err != nil {
		t.Fatalf("sendNtfy: %v", err)
	}
	if got.method != http.MethodPost {
		t.Errorf("method = %s, want POST", got.method)
	}
	if got.body != "Service is down" {
		t.Errorf("body = %q", got.body)
	}
	if got.header.Get("Title") != "Radarr" {
		t.Errorf("Title = %q, want Radarr", got.header.Get("Title"))
	}
	if got.header.Get("Tags") != "rotating_light" {
		t.Errorf("Tags = %q, want rotating_light", got.header.Get("Tags"))
	}
	if got.header.Get("Priority") != "high" {
		t.Errorf("Priority = %q, want high for an outage", got.header.Get("Priority"))
	}
	if got.header.Get("Authorization") != "Bearer tok123" {
		t.Errorf("Authorization = %q", got.header.Get("Authorization"))
	}
}

// TestSendNtfyRecovery pins the recovery variant: quieter priority, happy tag.
func TestSendNtfyRecovery(t *testing.T) {
	srv, got := notifyServer(t, http.StatusOK)
	cfg := notifyConfig{Type: "ntfy", URL: srv.URL}

	if err := sendNtfy(context.Background(), cfg, "Radarr", "Service recovered", true); err != nil {
		t.Fatalf("sendNtfy: %v", err)
	}
	if got.header.Get("Tags") != "white_check_mark" {
		t.Errorf("Tags = %q, want white_check_mark", got.header.Get("Tags"))
	}
	if got.header.Get("Priority") != "default" {
		t.Errorf("Priority = %q, want default on recovery", got.header.Get("Priority"))
	}
	if got.header.Get("Authorization") != "" {
		t.Errorf("no token configured, but Authorization was sent: %q", got.header.Get("Authorization"))
	}
}

// TestSendGotify covers the URL rewriting — Gotify needs /message appended and a
// trailing slash must not double up — and where the token travels: in a header,
// not in the URL, where every proxy and server between here and Gotify would
// write it into its log.
func TestSendGotify(t *testing.T) {
	srv, got := notifyServer(t, http.StatusOK)
	cfg := notifyConfig{Type: "gotify", URL: srv.URL + "/", Token: "abc"}

	if err := sendGotify(context.Background(), cfg, "Sonarr", "Service is down"); err != nil {
		t.Fatalf("sendGotify: %v", err)
	}
	if got.path != "/message" {
		t.Errorf("path = %q, want /message (trailing slash should be trimmed)", got.path)
	}
	if got.query != "" {
		t.Errorf("query = %q: the token must not be in the URL", got.query)
	}
	if k := got.header.Get("X-Gotify-Key"); k != "abc" {
		t.Errorf("X-Gotify-Key = %q, want the token", k)
	}
	if ct := got.header.Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q", ct)
	}
	var payload map[string]any
	if err := json.Unmarshal([]byte(got.body), &payload); err != nil {
		t.Fatalf("body is not JSON: %v", err)
	}
	if payload["title"] != "Sonarr" || payload["message"] != "Service is down" {
		t.Errorf("unexpected payload: %v", payload)
	}
}

func TestSendGotifyWithoutToken(t *testing.T) {
	srv, got := notifyServer(t, http.StatusOK)
	cfg := notifyConfig{Type: "gotify", URL: srv.URL}

	if err := sendGotify(context.Background(), cfg, "Sonarr", "down"); err != nil {
		t.Fatalf("sendGotify: %v", err)
	}
	if got.query != "" {
		t.Errorf("no token configured, but query was %q", got.query)
	}
	if k := got.header.Get("X-Gotify-Key"); k != "" {
		t.Errorf("no token configured, but X-Gotify-Key was %q", k)
	}
}

// TestSendWebhookStatusField pins the contract a user's own automation reads:
// status must be "down" on an outage and "up" on recovery.
func TestSendWebhookStatusField(t *testing.T) {
	for _, tc := range []struct {
		up   bool
		want string
	}{{false, "down"}, {true, "up"}} {
		srv, got := notifyServer(t, http.StatusOK)
		cfg := notifyConfig{Type: "webhook", URL: srv.URL, Token: "s3cret"}

		if err := sendWebhook(context.Background(), cfg, "Plex", "msg", tc.up); err != nil {
			t.Fatalf("sendWebhook: %v", err)
		}
		var payload map[string]any
		if err := json.Unmarshal([]byte(got.body), &payload); err != nil {
			t.Fatalf("body is not JSON: %v", err)
		}
		if payload["status"] != tc.want {
			t.Errorf("status = %v, want %q", payload["status"], tc.want)
		}
		if payload["service"] != "Plex" {
			t.Errorf("service = %v", payload["service"])
		}
		if payload["timestamp"] == "" || payload["timestamp"] == nil {
			t.Error("timestamp missing")
		}
		if got.header.Get("Authorization") != "Bearer s3cret" {
			t.Errorf("Authorization = %q", got.header.Get("Authorization"))
		}
	}
}

// TestSendNotificationDispatch verifies each provider is reachable through the
// single entry point the scheduler actually calls.
func TestSendNotificationDispatch(t *testing.T) {
	for _, typ := range []string{"ntfy", "gotify", "webhook"} {
		t.Run(typ, func(t *testing.T) {
			srv, got := notifyServer(t, http.StatusOK)
			cfg := notifyConfig{Type: typ, URL: srv.URL}
			if err := sendNotification(context.Background(), cfg, "svc", "message", false); err != nil {
				t.Fatalf("sendNotification(context.Background(), %s): %v", typ, err)
			}
			if got.method != http.MethodPost {
				t.Errorf("%s: method = %s", typ, got.method)
			}
		})
	}
}

func TestSendNotificationUnknownType(t *testing.T) {
	err := sendNotification(context.Background(), notifyConfig{Type: "carrier-pigeon", URL: "http://x"}, "svc", "msg", false)
	if err == nil {
		t.Fatal("expected an error for an unknown notify type")
	}
	if !strings.Contains(err.Error(), "carrier-pigeon") {
		t.Errorf("error should name the offending type, got %v", err)
	}
}

// TestDoNotifyRejectsErrorStatus is the one that matters most: a provider that
// answers 4xx/5xx must surface as an error, otherwise a misconfigured token
// would look like a delivered alert.
func TestDoNotifyRejectsErrorStatus(t *testing.T) {
	for _, status := range []int{http.StatusUnauthorized, http.StatusNotFound, http.StatusInternalServerError} {
		srv, _ := notifyServer(t, status)
		err := sendNotification(context.Background(), notifyConfig{Type: "webhook", URL: srv.URL}, "svc", "msg", false)
		if err == nil {
			t.Errorf("HTTP %d should have produced an error", status)
			continue
		}
		if !strings.Contains(err.Error(), "notify failed") {
			t.Errorf("HTTP %d: unexpected error %v", status, err)
		}
	}
}

func TestDoNotifyAcceptsSuccessStatuses(t *testing.T) {
	for _, status := range []int{http.StatusOK, http.StatusCreated, http.StatusAccepted, http.StatusNoContent} {
		srv, _ := notifyServer(t, status)
		if err := sendNotification(context.Background(), notifyConfig{Type: "webhook", URL: srv.URL}, "svc", "msg", false); err != nil {
			t.Errorf("HTTP %d should have been accepted, got %v", status, err)
		}
	}
}

// TestDoNotifyUnreachableProvider covers the offline-provider path: the server
// is closed before the call, so the transport fails.
func TestDoNotifyUnreachableProvider(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	url := srv.URL
	srv.Close()

	if err := sendNotification(context.Background(), notifyConfig{Type: "webhook", URL: url}, "svc", "msg", false); err == nil {
		t.Fatal("expected an error when the provider is unreachable")
	}
}

func TestSendNotificationInvalidURL(t *testing.T) {
	if err := sendNotification(context.Background(), notifyConfig{Type: "ntfy", URL: "://not a url"}, "svc", "msg", false); err == nil {
		t.Fatal("expected an error for a malformed URL")
	}
}
