package api

import (
	"database/sql"
	"log/slog"
	"strings"
)

// UserSettings is one account's own configuration: how its monitoring runs and
// where its alerts go, its Proxmox connections. It lives in user_settings, one
// row per key, and an account that never saved a key simply has none.
type UserSettings struct{ DB *sql.DB }

func NewUserSettings(db *sql.DB) *UserSettings { return &UserSettings{DB: db} }

func (s *UserSettings) Get(userID int, key string) (string, bool) {
	var v string
	if err := s.DB.QueryRow(`SELECT value FROM user_settings WHERE user_id = ? AND key = ?`, userID, key).Scan(&v); err != nil {
		return "", false
	}
	return v, true
}

func (s *UserSettings) Set(userID int, key, value string) error {
	_, err := s.DB.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (?, ?, ?)
		ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value`, userID, key, value)
	return err
}

// The monitoring keys, as they have always been named. The mode, the interval
// and the failure threshold are how the app behaves, so an account that has not
// chosen its own starts from what the server was set to; the alert channel is
// somebody's credentials and has no such default.
const (
	keyMonMode      = "monitoring_mode"
	keyMonInterval  = "monitoring_interval_sec"
	keyMonThreshold = "monitoring_fail_threshold"
	keyMonAlerts    = "monitoring_alerts_enabled"
	keyMonType      = "monitoring_notify_type"
	keyMonURL       = "monitoring_notify_url"
	keyMonToken     = "monitoring_notify_token"
)

var monitoringChannelKeys = []string{keyMonAlerts, keyMonType, keyMonURL, keyMonToken}

// MigrateUserSettings moves what an earlier version kept for the whole server
// into the account that configured it: the first administrator. It is safe to
// run at every start and after a restore — an account that already has its own
// value is never touched, and nothing is left behind to be moved twice.
//
//   - the alert channel (where alerts go, with what token) goes to the first
//     administrator, and the server-wide copy is removed: a credential should
//     not be kept twice;
//   - the Proxmox connections and the icons chosen for their machines go the
//     same way;
//   - the mode, the interval and the failure threshold stay where they are as
//     the starting point of every account that has not chosen its own.
func MigrateUserSettings(db *sql.DB) error {
	var admin int
	if err := db.QueryRow(`SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1`).Scan(&admin); err != nil {
		return nil // no administrator yet: nothing was configured by one
	}
	us := NewUserSettings(db)
	legacy := func(key string) string {
		var v sql.NullString
		_ = db.QueryRow(`SELECT value FROM system_settings WHERE key = ?`, key).Scan(&v)
		return v.String
	}

	move := func(keys []string, guard string) error {
		if _, has := us.Get(admin, guard); has {
			return nil
		}
		any := false
		for _, k := range keys {
			if legacy(k) != "" {
				any = true
			}
		}
		if !any {
			return nil
		}
		tx, err := db.Begin()
		if err != nil {
			return err
		}
		for _, k := range keys {
			if v := legacy(k); v != "" {
				if _, err := tx.Exec(`INSERT INTO user_settings (user_id, key, value) VALUES (?, ?, ?)
					ON CONFLICT (user_id, key) DO NOTHING`, admin, k, v); err != nil {
					tx.Rollback()
					return err
				}
			}
			if _, err := tx.Exec(`DELETE FROM system_settings WHERE key = ?`, k); err != nil {
				tx.Rollback()
				return err
			}
		}
		slog.Info("Settings moved to the first administrator", "keys", strings.Join(keys, ","))
		return tx.Commit()
	}
	if err := move(monitoringChannelKeys, keyMonType); err != nil {
		return err
	}
	return move([]string{proxmoxHostsKey, proxmoxIconsKey}, proxmoxHostsKey)
}
