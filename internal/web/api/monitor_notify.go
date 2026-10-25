package api

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
	"net/http"
	"strings"
	"time"
)

// notifyClient sends outbound alerts. InsecureSkipVerify matches the self-hosted
// threat model (private IPs / self-signed notification servers are expected).
var notifyClient = &http.Client{
	Timeout: 8 * time.Second,
	// A Gotify key travels as X-Gotify-Key, which Go would carry to another host.
	CheckRedirect: util.KeepToOrigin,
	Transport: &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, // #nosec G402 — self-hosted, private targets by design
		DialContext:     util.NewDialer(5*time.Second, 30*time.Second).DialContext,
	},
}

// notifyConfig is one account's alerting channel, from its own settings.
type notifyConfig struct {
	Enabled       bool
	Type          string // ntfy | gotify | webhook | none
	URL           string
	Token         string
	FailThreshold int
}

func (c notifyConfig) active() bool {
	return c.Enabled && c.Type != "" && c.Type != "none" && c.URL != ""
}

// sendNotification dispatches one alert to the configured provider. up reports
// whether the alert is a recovery (true) or an outage (false).
func sendNotification(cfg notifyConfig, service, message string, up bool) error {
	switch cfg.Type {
	case "ntfy":
		return sendNtfy(cfg, service, message, up)
	case "gotify":
		return sendGotify(cfg, service, message)
	case "webhook":
		return sendWebhook(cfg, service, message, up)
	default:
		return fmt.Errorf("unknown notify type %q", cfg.Type)
	}
}

func sendNtfy(cfg notifyConfig, service, message string, up bool) error {
	req, err := http.NewRequest("POST", cfg.URL, strings.NewReader(message))
	if err != nil {
		return err
	}
	req.Header.Set("Title", service)
	if up {
		req.Header.Set("Tags", "white_check_mark")
		req.Header.Set("Priority", "default")
	} else {
		req.Header.Set("Tags", "rotating_light")
		req.Header.Set("Priority", "high")
	}
	if cfg.Token != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.Token)
	}
	return doNotify(req)
}

func sendGotify(cfg notifyConfig, service, message string) error {
	url := strings.TrimRight(cfg.URL, "/") + "/message"
	body, _ := json.Marshal(map[string]any{"title": service, "message": message, "priority": 5})
	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	// The token goes in a header Gotify reads, not in the URL: a URL is written
	// to the access log of every proxy between here and the server.
	if cfg.Token != "" {
		req.Header.Set("X-Gotify-Key", cfg.Token)
	}
	return doNotify(req)
}

func sendWebhook(cfg notifyConfig, service, message string, up bool) error {
	status := "down"
	if up {
		status = "up"
	}
	body, _ := json.Marshal(map[string]any{
		"service": service, "status": status, "message": message,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
	req, err := http.NewRequest("POST", cfg.URL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if cfg.Token != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.Token)
	}
	return doNotify(req)
}

func doNotify(req *http.Request) error {
	resp, err := notifyClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("notify failed: HTTP %d", resp.StatusCode)
	}
	return nil
}
