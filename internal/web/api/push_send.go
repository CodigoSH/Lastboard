package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
	"unicode/utf8"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/webpush"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

// Web Push: telling a browser something while no page of Lastboard is open.
//
// It is the one place that talks to a third party the operator did not type in. A browser, when it
// subscribes, is given an address by its maker's push service, and a message goes there: to Google
// for Chrome and Android, to Apple for Safari and iPhones, to Mozilla for Firefox, to Microsoft for
// Edge. The message is encrypted for the one browser it is for (RFC 8291), so the service carries it
// without reading it, but it does learn that a device was told something and when. That is why it is
// off until an account chooses it, and why docs/security/overview.md says so.
//
// The address comes from the browser, which is to say from whoever is signed in, so it is not
// trusted: only an https address on a push service's own domain is ever sent to, and a redirect is
// followed only within that origin. Without that, a subscription would be a way to make the server request anything.

// ErrNoPushDevices says an account has no browser subscribed.
var ErrNoPushDevices = errors.New("push: no devices subscribed")

// pushHosts are the push services' own domains. An entry starting with a dot matches any host
// under it; one without matches exactly that host.
var pushHosts = []string{
	"fcm.googleapis.com",                // Chrome, Chromium browsers, Samsung Internet, Android
	"updates.push.services.mozilla.com", // Firefox
	".push.services.mozilla.com",        // Firefox, the servers a subscription may live on
	".push.apple.com",                   // Safari, and PWAs added to an iPhone's or iPad's home screen
	".notify.windows.com",               // Edge
}

// pushHostAllowed says whether a host is one of the push services'.
func pushHostAllowed(host string) bool {
	host = strings.ToLower(strings.TrimSuffix(host, "."))
	for _, h := range pushHosts {
		if strings.HasPrefix(h, ".") {
			if strings.HasSuffix(host, h) && len(host) > len(h) {
				return true
			}
		} else if host == h {
			return true
		}
	}
	return false
}

// allowedPushEndpoint says whether an address a browser gave is one to send to: https, on a push
// service's domain, on the usual port, with no credentials in it.
func allowedPushEndpoint(raw string) bool {
	if len(raw) == 0 || len(raw) > 2048 {
		return false
	}
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil {
		return false
	}
	if p := u.Port(); p != "" && p != "443" {
		return false
	}
	return pushHostAllowed(u.Hostname())
}

// pushEndpointOK is the rule for which addresses are sent to. A variable only so a test can point the
// sender at a push service of its own.
var pushEndpointOK = allowedPushEndpoint

// PushMessage is what a notification says.
type PushMessage struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	// Tag makes a new notification replace an older one with the same tag: a recovery takes the
	// place of the outage it ends.
	Tag string `json:"tag,omitempty"`
	// URL is where a tap on the notification goes, inside the instance.
	URL string `json:"url,omitempty"`
	// Up says whether it is good news; the notification of an outage stays until it is dismissed.
	Up bool `json:"up"`
}

// PushResult says what became of one send.
type PushResult struct {
	Sent    int // devices a push service took the message for
	Removed int // subscriptions the push service said are gone, now forgotten
	Failed  int // devices that could not be told this time
}

// PushSender sends to an account's subscribed browsers.
type PushSender struct {
	DB      *sql.DB
	Client  *http.Client
	Subject string

	// allowed and now are what a test replaces.
	allowed func(endpoint string) bool
	now     func() time.Time
}

// pushClient checks certificates, since a push service has a real one, and follows a redirect only
// within the origin it was sent to: the request carries a signed token that is for that service, so
// it must not end up at another one.
var pushClient = &http.Client{
	Timeout:       10 * time.Second,
	CheckRedirect: util.KeepToOrigin,
	Transport: &http.Transport{
		Proxy:               http.ProxyFromEnvironment,
		DialContext:         util.NewDialer(5*time.Second, 30*time.Second).DialContext,
		TLSHandshakeTimeout: 5 * time.Second,
	},
}

// defaultPushSubject is who a push service may write to about the sender. It names the software, not
// the person running it; PUSH_SUBJECT replaces it with an https or mailto address of their own.
const defaultPushSubject = "https://git.codigosh.com/CodigoSH/Lastboard"

func NewPushSender(db *sql.DB) *PushSender {
	subject := strings.TrimSpace(os.Getenv("PUSH_SUBJECT"))
	if !strings.HasPrefix(subject, "https://") && !strings.HasPrefix(subject, "mailto:") {
		subject = defaultPushSubject
	}
	return &PushSender{DB: db, Client: pushClient, Subject: subject, allowed: func(e string) bool { return pushEndpointOK(e) }, now: time.Now}
}

const (
	pushPrivateKey = "push_vapid_private"
	pushPublicKey  = "push_vapid_public"
)

// VAPIDKeys returns the pair this instance signs with, making it the first time anybody asks. It is
// the instance's own: browsers subscribe to its public half, so changing it would strand every
// device. Stored in the clear with the other secrets, as the rest of them are.
func (s *PushSender) VAPIDKeys() (private, public string, err error) {
	read := func() (string, string, bool) {
		var priv, pub sql.NullString
		_ = s.DB.QueryRow(`SELECT value FROM system_settings WHERE key = ?`, pushPrivateKey).Scan(&priv)
		_ = s.DB.QueryRow(`SELECT value FROM system_settings WHERE key = ?`, pushPublicKey).Scan(&pub)
		return priv.String, pub.String, priv.Valid && pub.Valid && priv.String != "" && pub.String != ""
	}
	if priv, pub, ok := read(); ok {
		return priv, pub, nil
	}
	priv, pub, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		return "", "", err
	}
	// Both rows or neither, and the first writer wins: two requests asking at once end up with the
	// same pair, which is read back below.
	tx, err := s.DB.Begin()
	if err != nil {
		return "", "", err
	}
	defer tx.Rollback()
	for k, v := range map[string]string{pushPrivateKey: priv, pushPublicKey: pub} {
		if _, err := tx.Exec(`INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)`, k, v); err != nil {
			return "", "", err
		}
	}
	if err := tx.Commit(); err != nil {
		return "", "", err
	}
	if priv, pub, ok := read(); ok {
		return priv, pub, nil
	}
	return "", "", errors.New("push: the signing keys could not be stored")
}

// clip cuts s to at most n characters, on a character boundary.
func clip(s string, n int) string {
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	return string([]rune(s)[:n]) + "…"
}

type pushSubscription struct {
	ID       int
	Endpoint string
	P256dh   string
	Auth     string
}

// SendToUser sends a message to every browser the account subscribed. A subscription the push
// service says is gone (404 or 410) is deleted, so a device that uninstalled the app stops costing a
// request every alert.
func (s *PushSender) SendToUser(ctx context.Context, userID int, m PushMessage) (PushResult, error) {
	var res PushResult
	rows, err := s.DB.QueryContext(ctx, `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ? ORDER BY id`, userID)
	if err != nil {
		return res, err
	}
	var subs []pushSubscription
	for rows.Next() {
		var sub pushSubscription
		if err := rows.Scan(&sub.ID, &sub.Endpoint, &sub.P256dh, &sub.Auth); err != nil {
			rows.Close()
			return res, err
		}
		subs = append(subs, sub)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return res, err
	}
	if len(subs) == 0 {
		return res, ErrNoPushDevices
	}

	priv, _, err := s.VAPIDKeys()
	if err != nil {
		return res, err
	}
	m.Title, m.Body = clip(m.Title, 120), clip(m.Body, 300)
	if m.URL == "" || !strings.HasPrefix(m.URL, "/") || strings.HasPrefix(m.URL, "//") {
		m.URL = "/"
	}
	payload, err := json.Marshal(m)
	if err != nil {
		return res, err
	}

	for _, sub := range subs {
		switch s.sendOne(ctx, sub, payload, priv, m.Up) {
		case pushSent:
			res.Sent++
		case pushGone:
			res.Removed++
		default:
			res.Failed++
		}
	}
	return res, nil
}

type pushOutcome int

const (
	pushSent pushOutcome = iota
	pushGone
	pushFailed
)

func (s *PushSender) sendOne(ctx context.Context, sub pushSubscription, payload []byte, private string, up bool) pushOutcome {
	if !s.allowed(sub.Endpoint) {
		// Stored before this check existed, or written by hand: never sent to, and said so.
		slog.Warn("push: a subscription is not on a push service's domain; skipped", "subscription", sub.ID)
		return pushFailed
	}
	body, err := webpush.Encrypt(payload, sub.P256dh, sub.Auth)
	if err != nil {
		slog.Warn("push: could not encrypt for a subscription", "subscription", sub.ID, "error", err)
		return pushFailed
	}
	auth, err := webpush.Authorization(sub.Endpoint, s.Subject, private, s.now())
	if err != nil {
		slog.Error("push: could not sign", "error", err)
		return pushFailed
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, sub.Endpoint, bytes.NewReader(body))
	if err != nil {
		return pushFailed
	}
	req.Header.Set("Authorization", auth)
	req.Header.Set("Content-Encoding", "aes128gcm")
	req.Header.Set("Content-Type", "application/octet-stream")
	// Twelve hours: an outage reported to a phone that is switched off is still news when it is
	// switched on, and a day-old one is not.
	req.Header.Set("TTL", "43200")
	if up {
		req.Header.Set("Urgency", "normal")
	} else {
		req.Header.Set("Urgency", "high")
	}

	resp, err := s.Client.Do(req)
	if err != nil {
		slog.Warn("push: a push service could not be reached", "subscription", sub.ID, "error", err)
		return pushFailed
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))

	switch {
	case resp.StatusCode >= 200 && resp.StatusCode < 300:
		_, _ = s.DB.ExecContext(ctx, `UPDATE push_subscriptions SET last_ok_at = ? WHERE id = ?`, s.now().Unix(), sub.ID)
		return pushSent
	case resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone:
		if _, err := s.DB.ExecContext(ctx, `DELETE FROM push_subscriptions WHERE id = ?`, sub.ID); err != nil {
			slog.Warn("push: could not forget a subscription that is gone", "subscription", sub.ID, "error", err)
		}
		return pushGone
	default:
		slog.Warn("push: a push service refused a message", "subscription", sub.ID, "status", fmt.Sprint(resp.StatusCode))
		return pushFailed
	}
}
