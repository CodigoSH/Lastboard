package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"strings"
	"sync"
)

// Bringing icons home on boards that predate local storage.
//
// Icons have been stored in the database since 1.7.0, but only from the moment
// a bookmark is saved. A board built before that keeps pointing at the CDN it
// was created with, so upgrading changed nothing for it: every paint still
// asked a third party for the pictures, which is the exact thing local storage
// exists to stop.
//
// So this runs once at startup and fetches what is still remote. It is written
// as a migration and lives with the rest of the data evolution rather than in
// the browser, because loading a page should not rewrite your data, and
// because doing it here means it happens once for everyone instead of once per
// user per browser — and before the first paint, so that paint no longer
// reports anything either.
//
// There is no "already migrated" marker on purpose: the work list is derived
// from the data itself — bookmarks whose icon is still an http(s) URL — so it
// empties itself, a half-finished run resumes on the next start, and a machine
// that boots without a connection simply tries again later.

// iconMigrationConcurrency bounds how many icons are pulled at once. Measured
// on a 25-bookmark board: four at a time finished in 0.27s. More would only
// open more sockets against providers that answer in milliseconds anyway.
const iconMigrationConcurrency = 4

// pendingIcon is one bookmark that still points somewhere else.
type pendingIcon struct {
	itemID int
	src    string
}

// isRemoteIcon reports whether an icon value still has to be fetched.
//
// Only http(s) qualifies. A `data:` URI is already the user's own bytes, an
// `/api/icons/` path is already stored, and an emoji or a bare letter is not
// an image at all.
func isRemoteIcon(v any) (string, bool) {
	s, ok := v.(string)
	if !ok {
		return "", false
	}
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "http://") || strings.HasPrefix(s, "https://") {
		return s, true
	}
	return "", false
}

// findPendingIcons lists the bookmarks whose icon is still fetched from
// elsewhere. An item whose content will not parse is skipped rather than
// treated as broken: it is not this migration's business.
//
// owner limits the search to one person's board; nil covers everyone. The
// startup pass wants everyone, the button in settings wants the board of
// whoever pressed it — same routine, so the two can't drift apart, and nobody
// needs permission to tidy their own bookmarks.
func findPendingIcons(db *sql.DB, owner *int) ([]pendingIcon, error) {
	query := `SELECT id, content FROM items WHERE content LIKE '%"icon"%'`
	args := []any{}
	if owner != nil {
		query += ` AND user_id = ?`
		args = append(args, *owner)
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []pendingIcon
	for rows.Next() {
		var (
			id  int
			raw string
		)
		if err := rows.Scan(&id, &raw); err != nil {
			return nil, err
		}
		var content map[string]any
		if err := json.Unmarshal([]byte(raw), &content); err != nil {
			continue
		}
		src, ok := isRemoteIcon(content["icon"])
		if !ok {
			continue
		}
		out = append(out, pendingIcon{itemID: id, src: src})
	}
	return out, rows.Err()
}

// IconCounts is what settings needs to state the situation plainly: how many
// of your bookmarks are served from here and how many still are not.
//
// Both numbers matter. Reporting only the pending ones meant that a board with
// nothing pending showed nothing at all, and "no icons are outstanding" looked
// exactly like "this feature isn't here" — you could not tell whether your
// dashboard still called out.
type IconCounts struct {
	Pending int `json:"pending"`
	Local   int `json:"local"`
}

// CountPendingIcons reports how many bookmarks still ask an external server for
// their picture, and how many already come from this one.
func CountPendingIcons(db *sql.DB, owner *int) (IconCounts, error) {
	pending, err := findPendingIcons(db, owner)
	if err != nil {
		return IconCounts{}, err
	}

	query := `SELECT COUNT(*) FROM items WHERE content LIKE '%"/api/icons/%'`
	args := []any{}
	if owner != nil {
		query += ` AND user_id = ?`
		args = append(args, *owner)
	}
	var local int
	if err := db.QueryRow(query, args...).Scan(&local); err != nil {
		return IconCounts{}, err
	}

	return IconCounts{Pending: len(pending), Local: local}, nil
}

// LocalizeIcons fetches every icon that is still remote and points its
// bookmark at the stored copy. It returns how many were brought in and how
// many could not be.
//
// The same routine backs the automatic pass at startup and the button in
// settings, so there is one implementation of this and not two that drift.
//
// Failures are counted, never fatal: an icon whose host is gone leaves its
// bookmark exactly as it was, pointing at a URL that may still work for
// someone. Nothing is deleted and no other field is touched.
func LocalizeIcons(ctx context.Context, db *sql.DB, h *IconHandler, owner *int) (done int, failed int) {
	pending, err := findPendingIcons(db, owner)
	if err != nil {
		slog.Error("Icon migration: could not list bookmarks", "error", err)
		return 0, 0
	}
	if len(pending) == 0 {
		return 0, 0
	}

	var (
		mu   sync.Mutex
		wg   sync.WaitGroup
		gate = make(chan struct{}, iconMigrationConcurrency)
	)

	for _, p := range pending {
		// Stop starting new work once we are shutting down. Whatever is already
		// in flight finishes its own write, so no bookmark is left half-stored.
		if ctx.Err() != nil {
			break
		}
		wg.Add(1)
		go func(p pendingIcon) {
			defer wg.Done()
			gate <- struct{}{}
			defer func() { <-gate }()

			mime, data, err := h.fetchIcon(p.src)
			if err != nil {
				slog.Debug("Icon migration: could not fetch", "item", p.itemID, "error", err)
				mu.Lock()
				failed++
				mu.Unlock()
				return
			}
			hash, err := storeIcon(db, mime, data)
			if err != nil {
				slog.Error("Icon migration: could not store", "item", p.itemID, "error", err)
				mu.Lock()
				failed++
				mu.Unlock()
				return
			}

			// One statement replaces the icon and nothing else, and only if the
			// bookmark still has the remote icon that was fetched. Writing back
			// the whole content read before the download would undo anything
			// the person changed while it ran: a rename, a new link, an icon
			// they picked themselves.
			res, err := db.Exec(
				`UPDATE items SET content = json_set(content, '$.icon', ?)
				 WHERE id = ? AND json_extract(content, '$.icon') = ?`,
				"/api/icons/"+hash, p.itemID, p.src)
			if err != nil {
				slog.Error("Icon migration: could not update bookmark", "item", p.itemID, "error", err)
				mu.Lock()
				failed++
				mu.Unlock()
				return
			}
			changed, _ := res.RowsAffected()
			if changed == 0 {
				// Edited or deleted meanwhile. Not a failure: if the icon is
				// still remote it is picked up the next time.
				slog.Debug("Icon migration: bookmark changed while its icon downloaded", "item", p.itemID)
				return
			}
			mu.Lock()
			done++
			mu.Unlock()
		}(p)
	}
	wg.Wait()

	return done, failed
}

// RunIconMigration performs the startup pass and says what it did.
//
// It is meant to be called in its own goroutine once the server is listening:
// the work is network-bound and nobody should wait on a CDN to reach their
// dashboard.
func RunIconMigration(ctx context.Context, db *sql.DB) {
	h := NewIconHandler(db)

	counts, err := CountPendingIcons(db, nil)
	if err != nil || counts.Pending == 0 {
		return
	}

	slog.Info("Storing icons that are still fetched from elsewhere", "bookmarks", counts.Pending)
	done, failed := LocalizeIcons(ctx, db, h, nil)

	switch {
	case failed == 0:
		slog.Info("Icons stored locally", "stored", done)
	default:
		slog.Warn("Some icons could not be stored and will be retried on the next start",
			"stored", done, "failed", failed)
	}
}
