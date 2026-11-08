package api

import (
	"bytes"
	"context"
	"crypto/tls"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"git.codigosh.com/CodigoSH/Lastboard/internal/core/alerttext"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
	"mime"
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
	Transport: util.ByReach(func() *http.Transport {
		return &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, // #nosec G402 — self-hosted, private targets by design
			DialContext:     util.NewDialer(5*time.Second, 30*time.Second).DialContext,
		}
	}),
}

// notifyConfig is one account's alerting channel, from its own settings.
type notifyConfig struct {
	Enabled       bool
	Type          string // ntfy | gotify | webhook | push | none
	URL           string
	Token         string
	FailThreshold int

	// UserID and Push are what the "push" type needs and the others do not: whose browsers to tell,
	// and the means to tell them. A channel that goes to a URL has neither.
	UserID int
	Push   *PushSender

	// Lang, Texts and Catalog are where the wording of an alert comes from: the language of the
	// account, any text it wrote for itself, and the translations. A config without them says
	// everything in English, which is how a channel that has never heard of them behaves.
	Lang    string
	Texts   alerttext.Templates
	Catalog *alerttext.Catalog
}

// userLanguage is the language an account reads the product in, which is the one its alerts are
// written in. A value that is not a language code reads as English.
func userLanguage(db *sql.DB, userID int) string {
	var lang sql.NullString
	if err := db.QueryRow(`SELECT language FROM users WHERE id = ?`, userID).Scan(&lang); err != nil || lang.String == "" {
		return "en"
	}
	return lang.String
}

// alertTemplates are the texts an account wrote for its alerts.
func alertTemplates(db *sql.DB, userID int) alerttext.Templates {
	return alerttext.Templates{
		DownTitle: monitorSetting(db, userID, keyMonTextDownTitle),
		DownBody:  monitorSetting(db, userID, keyMonTextDownBody),
		UpTitle:   monitorSetting(db, userID, keyMonTextUpTitle),
		UpBody:    monitorSetting(db, userID, keyMonTextUpBody),
	}
}

// Notice is one alert as it is sent: the service it is about, a title and a body already written in
// the account's language, and whether it is good news.
type Notice struct {
	Service string
	Title   string
	Body    string
	Up      bool
}

// outageNotice and recoveryNotice write an alert for an account. count is how many checks in a row
// failed, code what the failing one got back (0 when nothing answered) and down how long the outage
// lasted (0 when that is not known).
func (c notifyConfig) outageNotice(service string, count, code int) Notice {
	title, body := c.Catalog.Down(c.Lang, alerttext.Values{Service: service, Count: count, Code: code}, c.Texts)
	return Notice{Service: service, Title: title, Body: body}
}

func (c notifyConfig) recoveryNotice(service string, down time.Duration) Notice {
	title, body := c.Catalog.Up(c.Lang, alerttext.Values{Service: service, Down: down}, c.Texts)
	return Notice{Service: service, Title: title, Body: body, Up: true}
}

// testNotice is what the test button sends: an outage of an example service, in the account's own
// wording, with the word Test in front so it cannot be mistaken for a real one.
func (c notifyConfig) testNotice() Notice {
	n := c.outageNotice("Lastboard", 1, 0)
	n.Title = c.Catalog.TestLabel(c.Lang) + " · " + n.Title
	n.Up = true // a test must not ring like an alarm
	return n
}

func (c notifyConfig) active() bool {
	if c.Type == "push" {
		// Its destination is the account's subscribed browsers, not an address.
		return c.Enabled && c.Push != nil && c.UserID > 0
	}
	return c.Enabled && c.Type != "" && c.Type != "none" && c.URL != ""
}

// sendNotification dispatches one alert to the configured provider. up reports
// whether the alert is a recovery (true) or an outage (false).
func sendNotification(ctx context.Context, cfg notifyConfig, service, message string, up bool) error {
	return sendNotice(ctx, cfg, Notice{Service: service, Title: service, Body: message, Up: up})
}

// sendNotice dispatches one written alert to the configured provider.
func sendNotice(ctx context.Context, cfg notifyConfig, n Notice) error {
	switch cfg.Type {
	case "ntfy":
		return sendNtfy(ctx, cfg, n)
	case "gotify":
		return sendGotify(ctx, cfg, n)
	case "webhook":
		return sendWebhook(ctx, cfg, n)
	case "push":
		return sendPush(ctx, cfg, n)
	default:
		return fmt.Errorf("unknown notify type %q", cfg.Type)
	}
}

// sendPush tells the account's subscribed browsers. A tag per service makes a recovery replace the
// notification of the outage it ends; the tap opens the status page.
func sendPush(ctx context.Context, cfg notifyConfig, n Notice) error {
	if cfg.Push == nil {
		return errors.New("push is not available")
	}
	res, err := cfg.Push.SendToUser(ctx, cfg.UserID, PushMessage{
		Title: n.Title, Body: n.Body, Tag: "service:" + n.Service, URL: "/?view=monitor", Up: n.Up,
	})
	if err != nil {
		return err
	}
	if res.Sent == 0 {
		return fmt.Errorf("push: no device could be told (%d failed, %d forgotten)", res.Failed, res.Removed)
	}
	return nil
}

// headerText makes a title fit in an HTTP header: ntfy reads RFC 2047 words, which is how text that
// is not ASCII (a Japanese title, an emoji) gets through without being mangled on the way. Line
// breaks are removed, since a header is one line.
func headerText(s string) string {
	s = strings.NewReplacer("\r", " ", "\n", " ").Replace(s)
	for _, r := range s {
		if r > 126 || r < 32 {
			return mime.QEncoding.Encode("UTF-8", s)
		}
	}
	return s
}

func sendNtfy(ctx context.Context, cfg notifyConfig, n Notice) error {
	req, err := http.NewRequestWithContext(ctx, "POST", cfg.URL, strings.NewReader(n.Body))
	if err != nil {
		return err
	}
	req.Header.Set("Title", headerText(n.Title))
	if n.Up {
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

func sendGotify(ctx context.Context, cfg notifyConfig, n Notice) error {
	url := strings.TrimRight(cfg.URL, "/") + "/message"
	body, _ := json.Marshal(map[string]any{"title": n.Title, "message": n.Body, "priority": 5})
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
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

// sendWebhook posts JSON. "service" and "status" are the fields another system can rely on and stay
// as they were; "title" and "message" are text for people, in the language of the account.
func sendWebhook(ctx context.Context, cfg notifyConfig, n Notice) error {
	status := "down"
	if n.Up {
		status = "up"
	}
	body, _ := json.Marshal(map[string]any{
		"service": n.Service, "status": status, "title": n.Title, "message": n.Body,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
	req, err := http.NewRequestWithContext(ctx, "POST", cfg.URL, bytes.NewReader(body))
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
