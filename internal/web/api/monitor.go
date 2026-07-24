package api

import (
	"database/sql"
	"fmt"
	"time"
)

// MonitorCheck is one recorded probe of a monitored bookmark. LatencyMs is nil
// when the check failed (the service was down), and StatusCode is 0 when no HTTP
// response came back.
type MonitorCheck struct {
	ItemID     int       `json:"item_id"`
	CheckedAt  time.Time `json:"checked_at"`
	Up         bool      `json:"up"`
	LatencyMs  *int      `json:"latency_ms"`
	StatusCode int       `json:"status_code"`
}

// MonitorStore is the data-access layer for the append-only monitor_checks
// history. The monitor IS the bookmark (item_id), so the table's FK cascade
// prunes an item's history when the bookmark is deleted.
type MonitorStore struct {
	DB *sql.DB
}

// NewMonitorStore wraps a database handle for monitoring history access.
func NewMonitorStore(db *sql.DB) *MonitorStore {
	return &MonitorStore{DB: db}
}

// Record appends one check result. latencyMs must be nil when up is false.
func (s *MonitorStore) Record(itemID int, up bool, latencyMs *int, statusCode int) error {
	_, err := s.DB.Exec(
		`INSERT INTO monitor_checks (item_id, up, latency_ms, status_code) VALUES (?, ?, ?, ?)`,
		itemID, up, latencyMs, statusCode,
	)
	return err
}

// Prune deletes checks older than the retention window and returns how many
// rows were removed. Meant to run on a daily tick.
func (s *MonitorStore) Prune(days int) (int64, error) {
	res, err := s.DB.Exec(
		`DELETE FROM monitor_checks WHERE checked_at < datetime('now', ?)`,
		fmt.Sprintf("-%d days", days),
	)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// Recent returns up to limit checks for one item, newest first. It backs the
// history view (F4) and seeds the alert state machine (F5) on startup.
func (s *MonitorStore) Recent(itemID, limit int) ([]MonitorCheck, error) {
	rows, err := s.DB.Query(
		`SELECT item_id, checked_at, up, latency_ms, status_code
		 FROM monitor_checks
		 WHERE item_id = ?
		 ORDER BY checked_at DESC, id DESC
		 LIMIT ?`,
		itemID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []MonitorCheck
	for rows.Next() {
		var c MonitorCheck
		var up int
		var latency sql.NullInt64
		if err := rows.Scan(&c.ItemID, &c.CheckedAt, &up, &latency, &c.StatusCode); err != nil {
			return nil, err
		}
		c.Up = up != 0
		if latency.Valid {
			v := int(latency.Int64)
			c.LatencyMs = &v
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
