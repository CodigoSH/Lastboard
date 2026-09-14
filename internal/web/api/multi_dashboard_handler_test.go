package api_test

import (
	"database/sql"
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

/*
Boards, and what deleting one takes with it.

The dangerous half of this handler is not the CRUD: it is that deleting a board
deletes rows, promoting a default rewrites a flag every screen reads, and all
of it is addressed by an id that arrives in the URL. Each test below is one way
those could quietly reach somebody else's account or somebody else's items.
*/

func setupBoardsServer(t *testing.T) (*httptest.Server, *database.DB, func()) {
	t.Helper()

	tmp, err := os.CreateTemp("", "lastboard_boards_test_*.db")
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
	h := api.NewMultiDashboardHandler(db.DB)

	mux.Handle("POST /api/login", http.HandlerFunc(api.NewAuthHandler(db.DB, testSecret).Login))
	mux.Handle("GET /api/dashboards", protect(http.HandlerFunc(h.GetDashboards)))
	mux.Handle("POST /api/dashboards", protect(http.HandlerFunc(h.CreateDashboard)))
	mux.Handle("PUT /api/dashboards/reorder", protect(http.HandlerFunc(h.ReorderDashboards)))
	mux.Handle("POST /api/dashboards/{id}/default", protect(http.HandlerFunc(h.SetDefaultDashboard)))
	mux.Handle("PATCH /api/dashboards/{id}", protect(http.HandlerFunc(h.RenameDashboard)))
	mux.Handle("DELETE /api/dashboards/{id}", protect(http.HandlerFunc(h.DeleteDashboard)))

	server := httptest.NewServer(mux)
	cleanup := func() {
		server.Close()
		db.Close()
		os.Remove(tmp.Name())
	}
	return server, db, cleanup
}

type board struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Position  int    `json:"position"`
	IsDefault bool   `json:"is_default"`
}

func boardsOf(t *testing.T, serverURL string, s *userSession) []board {
	t.Helper()
	req, _ := http.NewRequest("GET", serverURL+"/api/dashboards", nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("list boards: %v", err)
	}
	defer resp.Body.Close()
	var out []board
	json.NewDecoder(resp.Body).Decode(&out)
	return out
}

func boardCall(t *testing.T, method, url string, s *userSession, body string) *http.Response {
	t.Helper()
	var r *http.Request
	if body == "" {
		r, _ = http.NewRequest(method, url, nil)
	} else {
		r, _ = http.NewRequest(method, url, strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
	}
	s.attach(r)
	resp, err := http.DefaultClient.Do(r)
	if err != nil {
		t.Fatalf("%s %s: %v", method, url, err)
	}
	return resp
}

func countItems(t *testing.T, db *sql.DB, boardID int) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM items WHERE dashboard_id = ?`, boardID).Scan(&n); err != nil {
		t.Fatalf("count items: %v", err)
	}
	return n
}

// ── The list, and the board a new account gets ────────────────────────────────

func TestAnAccountWithNoBoardsIsGivenOne(t *testing.T) {
	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	s := doLogin(t, server.URL, "alice", "password")

	list := boardsOf(t, server.URL, s)
	if len(list) != 1 {
		t.Fatalf("boards = %d, want the one it creates on the spot", len(list))
	}
	if !list[0].IsDefault {
		t.Error("the board it just made is not the default: nothing would open")
	}
	// Written in English on purpose: this used to be Spanish whatever language
	// the install was in.
	if list[0].Name != "Main dashboard" {
		t.Errorf("name = %q", list[0].Name)
	}
}

func TestItemsFromBeforeBoardsExistedAreAdopted(t *testing.T) {
	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	alice := userID(t, db.DB, "alice")

	// What an upgrade from a version without boards leaves behind.
	if _, err := db.DB.Exec(
		`INSERT INTO items (user_id, dashboard_id, parent_id, type, x, y, w, h, content) VALUES (?, NULL, NULL, 'bookmark', 1, 1, 1, 1, '{"label":"Plex"}')`,
		alice); err != nil {
		t.Fatalf("insert legacy item: %v", err)
	}

	list := boardsOf(t, server.URL, doLogin(t, server.URL, "alice", "password"))

	if n := countItems(t, db.DB, list[0].ID); n != 1 {
		// An orphan item belongs to no board, so no screen ever draws it: the
		// bookmark is still in the database and gone from the product.
		t.Fatalf("adopted items = %d, want the one that was there before", n)
	}
}

func TestOneAccountNeverSeesAnothersBoards(t *testing.T) {
	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	createUser(t, db.DB, "bob", "password", "user")
	addBoard(t, db.DB, userID(t, db.DB, "bob"), "Bob's", 0)

	for _, b := range boardsOf(t, server.URL, doLogin(t, server.URL, "alice", "password")) {
		if b.Name == "Bob's" {
			t.Fatal("another account's board is in this list")
		}
	}
}

// ── Creating and renaming ─────────────────────────────────────────────────────

func TestANewBoardLandsAtTheEnd(t *testing.T) {
	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	s := doLogin(t, server.URL, "alice", "password")
	boardsOf(t, server.URL, s) // the default one

	resp := boardCall(t, "POST", server.URL+"/api/dashboards", s, `{"name":"  Servers  "}`)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("got %d, want 201", resp.StatusCode)
	}
	var created board
	json.NewDecoder(resp.Body).Decode(&created)
	if created.Name != "Servers" {
		t.Errorf("name = %q: the spaces around it were kept", created.Name)
	}
	if created.Position != 1 {
		t.Errorf("position = %d, want it after the board that was there", created.Position)
	}
}

func TestABoardNeedsANameAndAReasonableOne(t *testing.T) {
	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	s := doLogin(t, server.URL, "alice", "password")

	for _, tc := range []struct{ name, body string }{
		{"empty", `{"name":"   "}`},
		{"too long", `{"name":"` + strings.Repeat("x", 51) + `"}`},
	} {
		resp := boardCall(t, "POST", server.URL+"/api/dashboards", s, tc.body)
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("%s: got %d, want 400", tc.name, resp.StatusCode)
		}
		resp.Body.Close()
	}
}

func TestNobodyRenamesABoardThatIsNotTheirs(t *testing.T) {
	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	createUser(t, db.DB, "bob", "password", "user")
	bobBoard := addBoard(t, db.DB, userID(t, db.DB, "bob"), "Bob's", 0)

	alice := doLogin(t, server.URL, "alice", "password")
	resp := boardCall(t, "PATCH", fmt.Sprintf("%s/api/dashboards/%d", server.URL, bobBoard), alice, `{"name":"Mine now"}`)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("got %d, want 404", resp.StatusCode)
	}

	var name string
	db.DB.QueryRow(`SELECT name FROM dashboards WHERE id = ?`, bobBoard).Scan(&name)
	if name != "Bob's" {
		t.Errorf("Bob's board is now called %q", name)
	}
}

// ── Deleting, which takes rows with it ────────────────────────────────────────

func TestDeletingABoardTakesItsOwnItemsAndNobodyElses(t *testing.T) {
	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	createUser(t, db.DB, "bob", "password", "user")
	alice, bob := userID(t, db.DB, "alice"), userID(t, db.DB, "bob")

	keep := addBoard(t, db.DB, alice, "Keep", 0)
	drop := addBoard(t, db.DB, alice, "Drop", 1)
	bobBoard := addBoard(t, db.DB, bob, "Bob's", 0)
	addItem(t, db.DB, alice, keep, 0, "bookmark", bookmarkJSON("Kept", "https://a.example"))
	addItem(t, db.DB, alice, drop, 0, "bookmark", bookmarkJSON("Doomed", "https://b.example"))
	addItem(t, db.DB, bob, bobBoard, 0, "bookmark", bookmarkJSON("Bob", "https://c.example"))

	s := doLogin(t, server.URL, "alice", "password")
	resp := boardCall(t, "DELETE", fmt.Sprintf("%s/api/dashboards/%d", server.URL, drop), s, "")
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("got %d, want 200", resp.StatusCode)
	}

	if n := countItems(t, db.DB, drop); n != 0 {
		t.Errorf("the deleted board left %d items behind, attached to nothing", n)
	}
	if n := countItems(t, db.DB, keep); n != 1 {
		t.Errorf("the other board lost items: %d left", n)
	}
	if n := countItems(t, db.DB, bobBoard); n != 1 {
		t.Errorf("another account lost items: %d left", n)
	}
}

func TestDeletingTheDefaultHandsTheTitleOn(t *testing.T) {
	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	s := doLogin(t, server.URL, "alice", "password")

	first := boardsOf(t, server.URL, s)[0] // the default
	boardCall(t, "POST", server.URL+"/api/dashboards", s, `{"name":"Second"}`).Body.Close()

	resp := boardCall(t, "DELETE", fmt.Sprintf("%s/api/dashboards/%d", server.URL, first.ID), s, "")
	resp.Body.Close()

	list := boardsOf(t, server.URL, s)
	if len(list) != 1 {
		t.Fatalf("boards = %d", len(list))
	}
	if !list[0].IsDefault {
		// With no default, opening the board lands nowhere.
		t.Error("no board is the default any more")
	}
}

func TestTheLastBoardCannotBeDeleted(t *testing.T) {
	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	s := doLogin(t, server.URL, "alice", "password")
	only := boardsOf(t, server.URL, s)[0]

	resp := boardCall(t, "DELETE", fmt.Sprintf("%s/api/dashboards/%d", server.URL, only.ID), s, "")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("got %d, want 400: an account with no boards has no interface", resp.StatusCode)
	}
}

func TestNobodyDeletesABoardThatIsNotTheirs(t *testing.T) {
	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	createUser(t, db.DB, "bob", "password", "user")
	bob := userID(t, db.DB, "bob")
	bobBoard := addBoard(t, db.DB, bob, "Bob's", 0)
	addBoard(t, db.DB, bob, "Bob's other", 1) // so the last-board guard is not what refuses
	addItem(t, db.DB, bob, bobBoard, 0, "bookmark", bookmarkJSON("Bob", "https://c.example"))

	alice := doLogin(t, server.URL, "alice", "password")
	resp := boardCall(t, "DELETE", fmt.Sprintf("%s/api/dashboards/%d", server.URL, bobBoard), alice, "")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("got %d, want 404", resp.StatusCode)
	}
	if n := countItems(t, db.DB, bobBoard); n != 1 {
		t.Fatal("another account's items were deleted")
	}
}

// ── The default flag, and the order ───────────────────────────────────────────

func TestThereIsExactlyOneDefaultAfterChoosingANewOne(t *testing.T) {
	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	s := doLogin(t, server.URL, "alice", "password")
	boardsOf(t, server.URL, s)
	boardCall(t, "POST", server.URL+"/api/dashboards", s, `{"name":"Second"}`).Body.Close()
	boardCall(t, "POST", server.URL+"/api/dashboards", s, `{"name":"Third"}`).Body.Close()

	list := boardsOf(t, server.URL, s)
	resp := boardCall(t, "POST", fmt.Sprintf("%s/api/dashboards/%d/default", server.URL, list[2].ID), s, "")
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("got %d, want 200", resp.StatusCode)
	}

	defaults := []string{}
	for _, b := range boardsOf(t, server.URL, s) {
		if b.IsDefault {
			defaults = append(defaults, b.Name)
		}
	}
	if len(defaults) != 1 || defaults[0] != "Third" {
		t.Errorf("defaults = %v, want only Third", defaults)
	}
}

func TestNobodyMakesSomebodyElsesBoardTheirDefault(t *testing.T) {
	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	createUser(t, db.DB, "bob", "password", "user")
	bobBoard := addBoard(t, db.DB, userID(t, db.DB, "bob"), "Bob's", 0)

	alice := doLogin(t, server.URL, "alice", "password")
	boardsOf(t, server.URL, alice)
	resp := boardCall(t, "POST", fmt.Sprintf("%s/api/dashboards/%d/default", server.URL, bobBoard), alice, "")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("got %d, want 404", resp.StatusCode)
	}
	// And Alice's own default must not have been cleared on the way out.
	any := false
	for _, b := range boardsOf(t, server.URL, alice) {
		any = any || b.IsDefault
	}
	if !any {
		t.Error("the refused request still cleared the caller's default")
	}
}

func TestReorderingWritesTheOrderItWasGiven(t *testing.T) {
	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	s := doLogin(t, server.URL, "alice", "password")
	boardsOf(t, server.URL, s)
	boardCall(t, "POST", server.URL+"/api/dashboards", s, `{"name":"Second"}`).Body.Close()
	boardCall(t, "POST", server.URL+"/api/dashboards", s, `{"name":"Third"}`).Body.Close()

	list := boardsOf(t, server.URL, s)
	body := fmt.Sprintf(`{"ids":[%d,%d,%d]}`, list[2].ID, list[0].ID, list[1].ID)
	resp := boardCall(t, "PUT", server.URL+"/api/dashboards/reorder", s, body)
	resp.Body.Close()

	var names []string
	for _, b := range boardsOf(t, server.URL, s) {
		names = append(names, b.Name)
	}
	if strings.Join(names, ",") != "Third,Main dashboard,Second" {
		t.Errorf("order = %v", names)
	}
}

func TestARefusedReorderLeavesTheBoardsWhereTheyWere(t *testing.T) {
	server, db, cleanup := setupBoardsServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	createUser(t, db.DB, "bob", "password", "user")
	bobBoard := addBoard(t, db.DB, userID(t, db.DB, "bob"), "Bob's", 0)

	s := doLogin(t, server.URL, "alice", "password")
	boardsOf(t, server.URL, s)
	boardCall(t, "POST", server.URL+"/api/dashboards", s, `{"name":"Second"}`).Body.Close()
	before := boardsOf(t, server.URL, s)

	// The caller's own boards first, somebody else's last: the refusal arrives
	// after the writes that came before it, so this is where a half-applied
	// order would show.
	body := fmt.Sprintf(`{"ids":[%d,%d,%d]}`, before[1].ID, before[0].ID, bobBoard)
	resp := boardCall(t, "PUT", server.URL+"/api/dashboards/reorder", s, body)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("got %d, want 404", resp.StatusCode)
	}

	after := boardsOf(t, server.URL, s)
	for i := range before {
		if before[i].ID != after[i].ID {
			t.Fatalf("the refused reorder moved the boards anyway: %v then %v", before, after)
		}
	}
}
