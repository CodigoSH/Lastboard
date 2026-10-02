package api_test

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
	"gopkg.in/yaml.v3"
)

/*
The export is somebody's backup.

Which is why it is tested at all: a backup that quietly loses a board, drops
the bookmarks of a section, or carries another account's links is discovered
when it is restored — that is, far too late to do anything about it. Every test
here is one way it could go wrong in silence.
*/

func setupExportServer(t *testing.T) (*httptest.Server, *database.DB, func()) {
	t.Helper()

	tmp, err := os.CreateTemp("", "lastboard_export_test_*.db")
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
	mux.Handle("POST /api/login", http.HandlerFunc(api.NewAuthHandler(db.DB, testSecret).Login))
	mux.Handle("GET /api/export/native", protect(http.HandlerFunc(api.NewImportExportHandler(db.DB).ExportNative)))

	server := httptest.NewServer(mux)
	cleanup := func() {
		server.Close()
		db.Close()
		os.Remove(tmp.Name())
	}
	return server, db, cleanup
}

func userID(t *testing.T, db *sql.DB, username string) int {
	t.Helper()
	var id int
	if err := db.QueryRow(`SELECT id FROM users WHERE username = ?`, username).Scan(&id); err != nil {
		t.Fatalf("user %s: %v", username, err)
	}
	return id
}

func addBoard(t *testing.T, db *sql.DB, uid int, name string, position int) int {
	t.Helper()
	res, err := db.Exec(`INSERT INTO dashboards (user_id, name, position) VALUES (?, ?, ?)`, uid, name, position)
	if err != nil {
		t.Fatalf("insert dashboard: %v", err)
	}
	id, _ := res.LastInsertId()
	return int(id)
}

// addItem inserts one item. parent is 0 for an item that sits on the grid.
func addItem(t *testing.T, db *sql.DB, uid, board, parent int, itemType, content string) int {
	t.Helper()
	var p any
	if parent > 0 {
		p = parent
	}
	res, err := db.Exec(
		`INSERT INTO items (user_id, dashboard_id, parent_id, type, x, y, w, h, content) VALUES (?, ?, ?, ?, 1, 1, 1, 1, ?)`,
		uid, board, p, itemType, content)
	if err != nil {
		t.Fatalf("insert item: %v", err)
	}
	id, _ := res.LastInsertId()
	return int(id)
}

func bookmarkJSON(label, url string) string {
	return `{"label":"` + label + `","url":"` + url + `","icon":"https://icons/x.webp","description":"d","statusCheck":true}`
}

// exportAs downloads the export and returns the parsed configuration plus the
// raw response, so a test can look at the headers too.
func exportAs(t *testing.T, serverURL string, s *userSession) (api.NativeConfig, *http.Response, []byte) {
	t.Helper()
	req, _ := http.NewRequest("GET", serverURL+"/api/export/native", nil)
	s.attach(req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("export: %v", err)
	}
	defer resp.Body.Close()
	blob := make([]byte, 0, 4096)
	buf := make([]byte, 1024)
	for {
		n, rerr := resp.Body.Read(buf)
		blob = append(blob, buf[:n]...)
		if rerr != nil {
			break
		}
	}
	var cfg api.NativeConfig
	if err := yaml.Unmarshal(blob, &cfg); err != nil {
		t.Fatalf("the export is not readable YAML: %v\n%s", err, blob)
	}
	return cfg, resp, blob
}

func titles(items []api.NativeItem) []string {
	out := make([]string, len(items))
	for i, it := range items {
		out[i] = it.Title
	}
	return out
}

// ── What the export contains ──────────────────────────────────────────────────

func TestAnExportCarriesEveryBookmarkOfMineAndNoneOfYours(t *testing.T) {
	server, db, cleanup := setupExportServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	createUser(t, db.DB, "bob", "password", "user")
	alice, bob := userID(t, db.DB, "alice"), userID(t, db.DB, "bob")

	aBoard := addBoard(t, db.DB, alice, "Home", 0)
	addItem(t, db.DB, alice, aBoard, 0, "bookmark", bookmarkJSON("Plex", "https://plex.tv"))
	addItem(t, db.DB, alice, aBoard, 0, "bookmark", bookmarkJSON("Immich", "https://immich.app"))

	bBoard := addBoard(t, db.DB, bob, "Bob's", 0)
	addItem(t, db.DB, bob, bBoard, 0, "bookmark", bookmarkJSON("Secret", "https://bob.example"))

	cfg, _, blob := exportAs(t, server.URL, doLogin(t, server.URL, "alice", "password"))

	if len(cfg.Dashboards) != 1 {
		t.Fatalf("dashboards = %d, want 1", len(cfg.Dashboards))
	}
	got := titles(cfg.Dashboards[0].Items)
	if len(got) != 2 {
		t.Fatalf("items = %v, want both of Alice's bookmarks", got)
	}
	if strings.Contains(string(blob), "bob.example") {
		t.Fatal("another account's bookmark is inside this backup")
	}
}

func TestABookmarkInASectionRemembersWhichSection(t *testing.T) {
	server, db, cleanup := setupExportServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	alice := userID(t, db.DB, "alice")
	board := addBoard(t, db.DB, alice, "Home", 0)

	section := addItem(t, db.DB, alice, board, 0, "section", `{"title":"Media"}`)
	addItem(t, db.DB, alice, board, section, "bookmark", bookmarkJSON("Plex", "https://plex.tv"))
	addItem(t, db.DB, alice, board, 0, "bookmark", bookmarkJSON("Loose", "https://example.com"))

	cfg, _, _ := exportAs(t, server.URL, doLogin(t, server.URL, "alice", "password"))

	byTitle := map[string]api.NativeItem{}
	for _, it := range cfg.Dashboards[0].Items {
		byTitle[it.Title] = it
	}
	if byTitle["Plex"].Group != "Media" {
		// Without this, restoring a tidy board gives back a flat pile of links.
		t.Errorf("group = %q, want Media", byTitle["Plex"].Group)
	}
	if byTitle["Loose"].Group != "" {
		t.Errorf("a bookmark outside every section was given the group %q", byTitle["Loose"].Group)
	}
}

// Sections keep their name under "title" — it is what the interface writes
// and what a section in the starter board carries. This test used to build
// them with "label", which is a bookmark's key, so it passed while every real
// export came out with no groups at all.
func TestASectionKeptUnderLabelStillNamesItsGroup(t *testing.T) {
	server, db, cleanup := setupExportServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	alice := userID(t, db.DB, "alice")
	board := addBoard(t, db.DB, alice, "Home", 0)

	section := addItem(t, db.DB, alice, board, 0, "section", `{"label":"Old"}`)
	addItem(t, db.DB, alice, board, section, "bookmark", bookmarkJSON("Plex", "https://plex.tv"))

	cfg, _, _ := exportAs(t, server.URL, doLogin(t, server.URL, "alice", "password"))
	if g := cfg.Dashboards[0].Items[0].Group; g != "Old" {
		t.Errorf("group = %q, want Old", g)
	}
}

func TestTheBoardsComeOutInTheOrderTheyAreShownIn(t *testing.T) {
	server, db, cleanup := setupExportServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	alice := userID(t, db.DB, "alice")

	// Inserted out of order on purpose: position decides, not the row id.
	third := addBoard(t, db.DB, alice, "Third", 2)
	first := addBoard(t, db.DB, alice, "First", 0)
	second := addBoard(t, db.DB, alice, "Second", 1)
	for _, b := range []int{first, second, third} {
		addItem(t, db.DB, alice, b, 0, "bookmark", bookmarkJSON("X", "https://x.example"))
	}

	cfg, _, _ := exportAs(t, server.URL, doLogin(t, server.URL, "alice", "password"))

	var names []string
	for _, d := range cfg.Dashboards {
		names = append(names, d.Name)
	}
	if strings.Join(names, ",") != "First,Second,Third" {
		t.Errorf("boards = %v, want them in their shown order", names)
	}
}

func TestAnEmptyBoardIsStillPartOfTheBackup(t *testing.T) {
	server, db, cleanup := setupExportServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	alice := userID(t, db.DB, "alice")
	addBoard(t, db.DB, alice, "Full", 0)
	addBoard(t, db.DB, alice, "Empty", 1)
	addItem(t, db.DB, alice, userBoardID(t, db.DB, alice, "Full"), 0, "bookmark", bookmarkJSON("Plex", "https://plex.tv"))

	cfg, _, _ := exportAs(t, server.URL, doLogin(t, server.URL, "alice", "password"))

	if len(cfg.Dashboards) != 2 {
		t.Fatalf("dashboards = %d, want the empty one too: restoring must not lose it", len(cfg.Dashboards))
	}
	if cfg.Dashboards[1].Name != "Empty" || len(cfg.Dashboards[1].Items) != 0 {
		t.Errorf("second board = %+v", cfg.Dashboards[1])
	}
}

func userBoardID(t *testing.T, db *sql.DB, uid int, name string) int {
	t.Helper()
	var id int
	if err := db.QueryRow(`SELECT id FROM dashboards WHERE user_id = ? AND name = ?`, uid, name).Scan(&id); err != nil {
		t.Fatalf("board %s: %v", name, err)
	}
	return id
}

func TestOnlyBookmarksAreExported(t *testing.T) {
	server, db, cleanup := setupExportServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	alice := userID(t, db.DB, "alice")
	board := addBoard(t, db.DB, alice, "Home", 0)

	addItem(t, db.DB, alice, board, 0, "section", `{"title":"Media"}`)
	addItem(t, db.DB, alice, board, 0, "widget", `{"widgetId":"clock","city":"Madrid"}`)
	addItem(t, db.DB, alice, board, 0, "bookmark", bookmarkJSON("Plex", "https://plex.tv"))

	cfg, _, _ := exportAs(t, server.URL, doLogin(t, server.URL, "alice", "password"))

	// A section is a container and a widget is configuration, not a link: the
	// format has one item type and says so.
	if got := titles(cfg.Dashboards[0].Items); len(got) != 1 || got[0] != "Plex" {
		t.Errorf("items = %v, want only the bookmark", got)
	}
}

func TestOneUnreadableBookmarkDoesNotTakeTheBackupDownWithIt(t *testing.T) {
	server, db, cleanup := setupExportServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	alice := userID(t, db.DB, "alice")
	board := addBoard(t, db.DB, alice, "Home", 0)

	addItem(t, db.DB, alice, board, 0, "bookmark", `{"label":"Broken"`) // truncated JSON
	addItem(t, db.DB, alice, board, 0, "bookmark", bookmarkJSON("Plex", "https://plex.tv"))

	cfg, resp, _ := exportAs(t, server.URL, doLogin(t, server.URL, "alice", "password"))
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d: one bad row must not cost the whole backup", resp.StatusCode)
	}
	if got := titles(cfg.Dashboards[0].Items); len(got) != 1 || got[0] != "Plex" {
		t.Errorf("items = %v, want the readable one", got)
	}
}

func TestTheDownloadArrivesAsAFileAndNotAsAPage(t *testing.T) {
	server, db, cleanup := setupExportServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	alice := userID(t, db.DB, "alice")
	addItem(t, db.DB, alice, addBoard(t, db.DB, alice, "Home", 0), 0, "bookmark", bookmarkJSON("Plex", "https://plex.tv"))

	_, resp, _ := exportAs(t, server.URL, doLogin(t, server.URL, "alice", "password"))
	if ct := resp.Header.Get("Content-Type"); ct != "application/x-yaml" {
		t.Errorf("Content-Type = %q", ct)
	}
	cd := resp.Header.Get("Content-Disposition")
	if !strings.HasPrefix(cd, "attachment; filename=\"lastboard-") || !strings.HasSuffix(cd, ".yaml\"") {
		t.Errorf("Content-Disposition = %q", cd)
	}
}

func TestAnExportNeedsASession(t *testing.T) {
	server, _, cleanup := setupExportServer(t)
	defer cleanup()

	resp, err := http.Get(server.URL + "/api/export/native")
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		t.Fatal("the whole board was handed out without logging in")
	}
}

// ── What goes out has to come back ────────────────────────────────────────────

func TestWhatComesOutIsWhatTheImporterExpectsToGoBackIn(t *testing.T) {
	server, db, cleanup := setupExportServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	alice := userID(t, db.DB, "alice")
	board := addBoard(t, db.DB, alice, "Home", 0)
	section := addItem(t, db.DB, alice, board, 0, "section", `{"title":"Media"}`)
	addItem(t, db.DB, alice, board, section, "bookmark", bookmarkJSON("Plex", "https://plex.tv"))

	cfg, _, _ := exportAs(t, server.URL, doLogin(t, server.URL, "alice", "password"))

	if cfg.Version != 1 {
		t.Errorf("version = %d, want the one the importer reads", cfg.Version)
	}
	it := cfg.Dashboards[0].Items[0]
	if it.Type != "bookmark" || it.Title != "Plex" || it.URL != "https://plex.tv" {
		t.Fatalf("item = %+v", it)
	}
	if it.Icon == "" || it.Description == "" || !it.StatusCheck {
		// Everything the format carries has to survive the trip, or restoring
		// hands back a board that has quietly forgotten half of itself.
		t.Errorf("item lost fields on the way out: %+v", it)
	}
}

func TestAwkwardTextSurvivesTheTripIntact(t *testing.T) {
	server, db, cleanup := setupExportServer(t)
	defer cleanup()
	createUser(t, db.DB, "alice", "password", "admin")
	alice := userID(t, db.DB, "alice")
	board := addBoard(t, db.DB, alice, "Casa: la principal", 0)

	// A colon and a hash are YAML syntax, and an emoji and Arabic are what a
	// board actually holds. All four go through the marshaller untouched or
	// the file is not a backup of anything.
	label := `Plex: \"películas\" #1 🎬 مرحبا`
	addItem(t, db.DB, alice, board, 0, "bookmark", `{"label":"`+label+`","url":"https://plex.tv/a?b=1&c=2"}`)

	cfg, _, _ := exportAs(t, server.URL, doLogin(t, server.URL, "alice", "password"))

	if cfg.Dashboards[0].Name != "Casa: la principal" {
		t.Errorf("board name = %q", cfg.Dashboards[0].Name)
	}
	it := cfg.Dashboards[0].Items[0]
	if it.Title != `Plex: "películas" #1 🎬 مرحبا` {
		t.Errorf("title = %q", it.Title)
	}
	if it.URL != "https://plex.tv/a?b=1&c=2" {
		t.Errorf("url = %q", it.URL)
	}
}
