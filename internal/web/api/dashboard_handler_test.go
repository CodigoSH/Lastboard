package api_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

func setupDashServer(t *testing.T) (*httptest.Server, *database.DB, func()) {
	t.Helper()

	tmp, err := os.CreateTemp("", "lastboard_dash_test_*.db")
	if err != nil {
		t.Fatalf("temp file: %v", err)
	}
	tmp.Close()

	db, err := database.InitDB(tmp.Name())
	if err != nil {
		t.Fatalf("InitDB: %v", err)
	}

	mux := http.NewServeMux()
	protect := middleware.AuthRequired(db.DB, testSecret)

	authHandler := api.NewAuthHandler(db.DB, testSecret)
	dashHandler := api.NewDashboardHandler(db.DB)

	mux.Handle("POST /api/login", http.HandlerFunc(authHandler.Login))
	mux.Handle("GET /api/dashboard", protect(http.HandlerFunc(dashHandler.GetDashboard)))
	mux.Handle("POST /api/dashboard/item", protect(http.HandlerFunc(dashHandler.CreateItem)))
	mux.Handle("PATCH /api/dashboard/item/{id}/move", protect(http.HandlerFunc(dashHandler.MoveItem)))
	mux.Handle("PATCH /api/dashboard/item/", protect(http.HandlerFunc(dashHandler.UpdateItem)))
	mux.Handle("DELETE /api/dashboard/item/", protect(http.HandlerFunc(dashHandler.DeleteItem)))

	server := httptest.NewServer(mux)
	cleanup := func() {
		server.Close()
		db.Close()
		os.Remove(tmp.Name())
	}
	return server, db, cleanup
}

// ── GetDashboard ──────────────────────────────────────────────────────────────

func TestGetDashboard_EmptyForNewUser(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	req, _ := http.NewRequest("GET", server.URL+"/api/dashboard", nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var items []interface{}
	json.NewDecoder(resp.Body).Decode(&items)
	if len(items) != 0 {
		t.Errorf("expected empty dashboard, got %d items", len(items))
	}
}

func TestGetDashboard_UserIsolation(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	createUser(t, db.DB, "bob", "password", "user")

	var aliceID int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&aliceID)
	db.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'bookmark', 0, 0, 1, 1, '{}')`, aliceID)

	// Bob should see empty dashboard
	s := doLogin(t, server.URL, "bob", "password")
	req, _ := http.NewRequest("GET", server.URL+"/api/dashboard", nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	var items []interface{}
	json.NewDecoder(resp.Body).Decode(&items)
	if len(items) != 0 {
		t.Errorf("bob sees alice's items: got %d items", len(items))
	}
}

// ── CreateItem ────────────────────────────────────────────────────────────────

func TestCreateItem_Bookmark(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	body := `{"type":"bookmark","x":1,"y":1,"w":1,"h":1,"content":"{\"label\":\"Test\"}","url":"https://example.com"}`
	req, _ := http.NewRequest("POST", server.URL+"/api/dashboard/item", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var aliceID int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&aliceID)
	var count int
	db.DB.QueryRow("SELECT COUNT(*) FROM items WHERE user_id=? AND type='bookmark'", aliceID).Scan(&count)
	if count != 1 {
		t.Errorf("expected 1 bookmark in DB, got %d", count)
	}
}

func TestCreateItem_Widget(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	body := `{"type":"widget","x":1,"y":1,"w":2,"h":2,"content":"{\"widgetId\":\"clock\"}"}`
	req, _ := http.NewRequest("POST", server.URL+"/api/dashboard/item", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestCreateItem_ReturnsNewID(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	s := doLogin(t, server.URL, "alice", "password")

	body := `{"type":"bookmark","x":1,"y":1,"w":1,"h":1,"content":"{\"label\":\"X\"}","url":"https://x.com"}`
	req, _ := http.NewRequest("POST", server.URL+"/api/dashboard/item", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	if result["id"] == nil {
		t.Error("response should contain the new item ID")
	}
}

// ── UpdateItem ────────────────────────────────────────────────────────────────

func TestUpdateItem_Position(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	var aliceID int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&aliceID)

	res, _ := db.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'bookmark', 0, 0, 1, 1, '{}')`, aliceID)
	itemID, _ := res.LastInsertId()

	s := doLogin(t, server.URL, "alice", "password")

	body := `{"x":5,"y":5,"w":2,"h":2}`
	req, _ := http.NewRequest("PATCH", fmt.Sprintf("%s/api/dashboard/item/%d", server.URL, itemID), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var x, y int
	db.DB.QueryRow("SELECT x, y FROM items WHERE id=?", itemID).Scan(&x, &y)
	if x != 5 || y != 5 {
		t.Errorf("position not updated: x=%d y=%d, want 5 5", x, y)
	}
}

func TestUpdateItem_OtherUserCannotUpdate(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	createUser(t, db.DB, "bob", "password", "user")

	var aliceID int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&aliceID)
	res, _ := db.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'bookmark', 0, 0, 1, 1, '{}')`, aliceID)
	itemID, _ := res.LastInsertId()

	s := doLogin(t, server.URL, "bob", "password")

	body := `{"x":9,"y":9,"w":1,"h":1}`
	req, _ := http.NewRequest("PATCH", fmt.Sprintf("%s/api/dashboard/item/%d", server.URL, itemID), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	// Should not find the item (it belongs to alice)
	if resp.StatusCode == http.StatusOK {
		t.Error("bob should not be able to update alice's item")
	}
}

func TestUpdateItem_MoveToOwnDashboard(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	var aliceID int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&aliceID)

	res, _ := db.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'bookmark', 1, 1, 1, 1, '{}')`, aliceID)
	itemID, _ := res.LastInsertId()

	dres, _ := db.DB.Exec(`INSERT INTO dashboards (user_id, name, position, is_default) VALUES (?, 'Media', 1, 0)`, aliceID)
	dashID, _ := dres.LastInsertId()

	s := doLogin(t, server.URL, "alice", "password")

	body := fmt.Sprintf(`{"dashboard_id":%d,"x":1,"y":1}`, dashID)
	req, _ := http.NewRequest("PATCH", fmt.Sprintf("%s/api/dashboard/item/%d", server.URL, itemID), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var got int64
	db.DB.QueryRow("SELECT dashboard_id FROM items WHERE id=?", itemID).Scan(&got)
	if got != dashID {
		t.Errorf("dashboard_id not updated: got %d, want %d", got, dashID)
	}
}

func TestUpdateItem_CannotMoveToOthersDashboard(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	createUser(t, db.DB, "bob", "password", "user")

	var aliceID, bobID int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&aliceID)
	db.DB.QueryRow("SELECT id FROM users WHERE username='bob'").Scan(&bobID)

	res, _ := db.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'bookmark', 1, 1, 1, 1, '{}')`, aliceID)
	itemID, _ := res.LastInsertId()

	// A dashboard that belongs to bob, not alice.
	dres, _ := db.DB.Exec(`INSERT INTO dashboards (user_id, name, position, is_default) VALUES (?, 'Bob', 1, 0)`, bobID)
	bobDashID, _ := dres.LastInsertId()

	s := doLogin(t, server.URL, "alice", "password")

	body := fmt.Sprintf(`{"dashboard_id":%d}`, bobDashID)
	req, _ := http.NewRequest("PATCH", fmt.Sprintf("%s/api/dashboard/item/%d", server.URL, itemID), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		t.Error("alice should not be able to move her item to bob's dashboard")
	}

	// The item must stay on its original board (dashboard_id unchanged / NULL).
	var stillNull int
	db.DB.QueryRow("SELECT COUNT(*) FROM items WHERE id=? AND dashboard_id IS NULL", itemID).Scan(&stillNull)
	if stillNull != 1 {
		t.Errorf("dashboard_id should be unchanged (NULL), COUNT=%d", stillNull)
	}
}

func TestMoveItem_SectionCarriesChildren(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	var aliceID int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&aliceID)

	sres, _ := db.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'section', 1, 1, 4, 4, '{}')`, aliceID)
	sectionID, _ := sres.LastInsertId()
	cres, _ := db.DB.Exec(`INSERT INTO items (user_id, type, parent_id, x, y, w, h, content) VALUES (?, 'bookmark', ?, 1, 1, 1, 1, '{}')`, aliceID, sectionID)
	childID, _ := cres.LastInsertId()

	dres, _ := db.DB.Exec(`INSERT INTO dashboards (user_id, name, position, is_default) VALUES (?, 'Media', 1, 0)`, aliceID)
	dashID, _ := dres.LastInsertId()

	s := doLogin(t, server.URL, "alice", "password")

	body := fmt.Sprintf(`{"dashboard_id":%d,"x":1,"y":1}`, dashID)
	req, _ := http.NewRequest("PATCH", fmt.Sprintf("%s/api/dashboard/item/%d/move", server.URL, sectionID), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var sectionDash, childDash int64
	db.DB.QueryRow("SELECT dashboard_id FROM items WHERE id=?", sectionID).Scan(&sectionDash)
	db.DB.QueryRow("SELECT dashboard_id FROM items WHERE id=?", childID).Scan(&childDash)
	if sectionDash != dashID || childDash != dashID {
		t.Errorf("subtree not fully moved: section=%d child=%d, want %d", sectionDash, childDash, dashID)
	}

	// The child must still belong to its section after the move.
	var childParent int64
	db.DB.QueryRow("SELECT parent_id FROM items WHERE id=?", childID).Scan(&childParent)
	if childParent != sectionID {
		t.Errorf("child detached from section: parent_id=%d, want %d", childParent, sectionID)
	}
}

func TestMoveItem_RejectsForeignDashboard(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	createUser(t, db.DB, "bob", "password", "user")

	var aliceID, bobID int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&aliceID)
	db.DB.QueryRow("SELECT id FROM users WHERE username='bob'").Scan(&bobID)

	res, _ := db.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'section', 1, 1, 2, 2, '{}')`, aliceID)
	itemID, _ := res.LastInsertId()
	dres, _ := db.DB.Exec(`INSERT INTO dashboards (user_id, name, position, is_default) VALUES (?, 'Bob', 1, 0)`, bobID)
	bobDashID, _ := dres.LastInsertId()

	s := doLogin(t, server.URL, "alice", "password")

	body := fmt.Sprintf(`{"dashboard_id":%d,"x":1,"y":1}`, bobDashID)
	req, _ := http.NewRequest("PATCH", fmt.Sprintf("%s/api/dashboard/item/%d/move", server.URL, itemID), strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		t.Error("alice should not move an item to bob's dashboard")
	}
}

// ── DeleteItem ────────────────────────────────────────────────────────────────

func TestDeleteItem_Success(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	var aliceID int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&aliceID)
	res, _ := db.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'bookmark', 0, 0, 1, 1, '{}')`, aliceID)
	itemID, _ := res.LastInsertId()

	s := doLogin(t, server.URL, "alice", "password")

	req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/api/dashboard/item/%d", server.URL, itemID), nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var count int
	db.DB.QueryRow("SELECT COUNT(*) FROM items WHERE id=?", itemID).Scan(&count)
	if count != 0 {
		t.Error("item was not deleted")
	}
}

func TestDeleteItem_OtherUserCannotDelete(t *testing.T) {
	server, db, cleanup := setupDashServer(t)
	defer cleanup()

	createUser(t, db.DB, "alice", "password", "user")
	createUser(t, db.DB, "bob", "password", "user")

	var aliceID int
	db.DB.QueryRow("SELECT id FROM users WHERE username='alice'").Scan(&aliceID)
	res, _ := db.DB.Exec(`INSERT INTO items (user_id, type, x, y, w, h, content) VALUES (?, 'bookmark', 1, 1, 1, 1, '{}')`, aliceID)
	itemID, _ := res.LastInsertId()

	s := doLogin(t, server.URL, "bob", "password")

	req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/api/dashboard/item/%d", server.URL, itemID), nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	// The handler returns 200 even when no row was deleted (user_id mismatch acts as filter).
	// The important invariant is that alice's item survives.
	var count int
	db.DB.QueryRow("SELECT COUNT(*) FROM items WHERE id=?", itemID).Scan(&count)
	if count != 1 {
		t.Error("alice's item was wrongly deleted by bob")
	}
}
