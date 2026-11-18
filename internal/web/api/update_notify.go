package api

import (
	"context"
	"database/sql"
	"log/slog"
	"sync"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/alerttext"
	"git.codigosh.com/CodigoSH/Lastboard/internal/version"
)

/* ---------------------------------------------------------------------------
 * Telling the administrator that a new version is out
 *
 * Only the administrator can update the server, so only their channels are asked, and only those that chose to
 * carry updates (none does until someone says so). Each version is told once: the one told last is kept, and the
 * check that finds it again says nothing. If it could not be delivered anywhere it is not marked as told, so the
 * next check tries again, and if no channel is listening it is not marked either: one that starts listening later
 * is told of the version that is waiting, which is what it asked for.
 *
 * The administrator's own choice of channel decides what is looked for: a pre-release is told only to an
 * account that receives them.
 * ------------------------------------------------------------------------ */

// keyUpdateNotified is the setting that holds the release the administrator was last told about.
const keyUpdateNotified = "update_notified"

// updateNoticeMu lets one look for a notice run at a time in the process: the hourly check and the one a channel
// switched on asks for would otherwise both find the same release untold and send it twice.
var updateNoticeMu sync.Mutex

// NotifyNow looks for a release the administrator has not been told about and tells them, at once. It is what a
// channel that has just been switched on for updates asks for, so that the version that is waiting is not left to
// the next hourly look.
func (h *UpdateHandler) NotifyNow() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	h.notifyUpdate(ctx)
}

// notifyUpdateTo sends the notice of a new version to each channel of the administrator that carries updates,
// and returns how many took it. cfg is what every channel shares (the language, the catalog, the means of telling
// browsers); each channel adds its own address.
func notifyUpdateTo(ctx context.Context, db *sql.DB, store *UserSettings, admin int, common notifyConfig, latest string) (sent, tried int) {
	notice := common.updateNotice(latest, version.Current)
	for _, ch := range channelsOf(store, admin) {
		if !ch.takesUpdates() {
			continue
		}
		cfg := common
		cfg.Enabled, cfg.Type, cfg.URL, cfg.Token, cfg.Channel = true, ch.Type, ch.URL, ch.Token, ch.ID
		if !cfg.active() {
			continue
		}
		tried++
		err := sendNotice(ctx, cfg, notice)
		recordChannelResult(store, admin, ch.ID, err)
		if err != nil {
			slog.Warn("update notice: a channel did not take it", "channel", ch.ID, "type", ch.Type, "reason", failureReason(err))
			continue
		}
		sent++
	}
	return sent, tried
}

// notifyUpdate looks for a release the administrator has not been told about and tells them through the channels
// that carry updates. It is called by the daily check and does nothing when there is nothing new, nobody to tell,
// or the release was already told.
func (h *UpdateHandler) notifyUpdate(ctx context.Context) {
	updateNoticeMu.Lock()
	defer updateNoticeMu.Unlock()
	var admin int
	var beta bool
	if err := h.DB.QueryRow(`SELECT id, COALESCE(beta_updates, 0) FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1`).Scan(&admin, &beta); err != nil {
		return
	}
	store := NewUserSettings(h.DB)
	hasListener := false
	for _, ch := range channelsOf(store, admin) {
		if ch.takesUpdates() {
			hasListener = true
			break
		}
	}
	if !hasListener {
		return
	}

	fetch := h.fetchLatestRelease
	if h.latest != nil {
		fetch = h.latest
	}
	latest, _, err := fetch(beta)
	if err != nil || latest == "" || !compareVersions(latest, version.Current) {
		return
	}
	if told, _ := store.Get(admin, keyUpdateNotified); told == latest {
		return
	}

	common := notifyConfig{
		UserID:  admin,
		Push:    h.Push,
		Lang:    userLanguage(h.DB, admin),
		Catalog: h.Texts,
		Texts:   alerttext.Templates{},
	}
	sent, tried := notifyUpdateTo(ctx, h.DB, store, admin, common, latest)
	if sent > 0 {
		if err := store.Set(admin, keyUpdateNotified, latest); err != nil {
			slog.Warn("update notice: could not note the release as told", "error", err)
		}
		slog.Info("update notice sent", "version", latest, "channels", sent, "tried", tried)
	}
}
