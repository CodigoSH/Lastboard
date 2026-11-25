package api

import (
	"database/sql"
	"net/http/httptest"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// A database that cannot answer is not "the name is free": the caller gets the
// error and the request fails, instead of going ahead on a guess.
func TestAFailedNameCheckIsAnErrorNotAFreeName(t *testing.T) {
	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "x.db"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`CREATE TABLE dashboards (id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT)`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO dashboards (user_id, name) VALUES (1, 'Servers')`); err != nil {
		t.Fatal(err)
	}
	h := NewMultiDashboardHandler(db)
	r := httptest.NewRequest("POST", "/api/dashboards", nil)

	if taken, err := h.nameTaken(r, 1, "servers", 0); err != nil || !taken {
		t.Fatalf("a name in use: taken=%v err=%v, want true and no error", taken, err)
	}
	db.Close()
	if taken, err := h.nameTaken(r, 1, "Servers", 0); err == nil || taken {
		t.Errorf("a closed database: taken=%v err=%v, want an error", taken, err)
	}
}
