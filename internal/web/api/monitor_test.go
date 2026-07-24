package api

import (
	"testing"
)

// seedItem creates a user and a bookmark item, returning the item id. The
// monitor_checks FK targets items(id), which in turn targets users(id).
func seedItem(t *testing.T, store *MonitorStore) int {
	t.Helper()
	res, err := store.DB.Exec(`INSERT INTO users (username, password) VALUES ('u', 'p')`)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}
	uid, _ := res.LastInsertId()
	res, err = store.DB.Exec(
		`INSERT INTO items (user_id, type, x, y, w, h) VALUES (?, 'bookmark', 0, 0, 1, 1)`, uid)
	if err != nil {
		t.Fatalf("seed item: %v", err)
	}
	itemID, _ := res.LastInsertId()
	return int(itemID)
}

func TestMonitorStoreRecordAndRecent(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1) // pin one in-memory connection for the test
	store := NewMonitorStore(db)
	itemID := seedItem(t, store)

	lat := 42
	if err := store.Record(itemID, true, &lat, 200); err != nil {
		t.Fatalf("record up: %v", err)
	}
	if err := store.Record(itemID, false, nil, 0); err != nil {
		t.Fatalf("record down: %v", err)
	}

	recent, err := store.Recent(itemID, 10)
	if err != nil {
		t.Fatalf("recent: %v", err)
	}
	if len(recent) != 2 {
		t.Fatalf("expected 2 checks, got %d", len(recent))
	}

	// Newest first: the "down" check was recorded last.
	if recent[0].Up {
		t.Errorf("newest check should be down, got up")
	}
	if recent[0].LatencyMs != nil {
		t.Errorf("down check must have nil latency, got %v", *recent[0].LatencyMs)
	}
	if recent[0].StatusCode != 0 {
		t.Errorf("down check status should be 0, got %d", recent[0].StatusCode)
	}

	if !recent[1].Up {
		t.Errorf("oldest check should be up")
	}
	if recent[1].LatencyMs == nil || *recent[1].LatencyMs != 42 {
		t.Errorf("up check latency should be 42, got %v", recent[1].LatencyMs)
	}
	if recent[1].StatusCode != 200 {
		t.Errorf("up check status should be 200, got %d", recent[1].StatusCode)
	}
}

func TestMonitorStorePrune(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := NewMonitorStore(db)
	itemID := seedItem(t, store)

	// A fresh check plus an old one 40 days back.
	if err := store.Record(itemID, true, intPtr(10), 200); err != nil {
		t.Fatalf("record fresh: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO monitor_checks (item_id, checked_at, up, status_code)
		 VALUES (?, datetime('now', '-40 days'), 1, 200)`, itemID); err != nil {
		t.Fatalf("insert old: %v", err)
	}

	removed, err := store.Prune(30)
	if err != nil {
		t.Fatalf("prune: %v", err)
	}
	if removed != 1 {
		t.Fatalf("expected 1 pruned row, got %d", removed)
	}

	recent, _ := store.Recent(itemID, 10)
	if len(recent) != 1 {
		t.Fatalf("expected 1 remaining check after prune, got %d", len(recent))
	}
}

func TestMonitorStoreCascadeOnItemDelete(t *testing.T) {
	db, _ := setupTestDB(t)
	db.SetMaxOpenConns(1)
	store := NewMonitorStore(db)
	itemID := seedItem(t, store)

	if err := store.Record(itemID, true, intPtr(5), 200); err != nil {
		t.Fatalf("record: %v", err)
	}
	if _, err := db.Exec(`DELETE FROM items WHERE id = ?`, itemID); err != nil {
		t.Fatalf("delete item: %v", err)
	}

	recent, err := store.Recent(itemID, 10)
	if err != nil {
		t.Fatalf("recent after delete: %v", err)
	}
	if len(recent) != 0 {
		t.Fatalf("history should cascade-delete with the item, got %d rows", len(recent))
	}
}

func intPtr(v int) *int { return &v }
