package api

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"unicode"

	"git.codigosh.com/CodigoSH/Lastboard/internal/core/access"
	"git.codigosh.com/CodigoSH/Lastboard/internal/platform/database"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

// Account is who is asking, and what it may do.
type Account struct {
	ID     int
	Admin  bool
	Grants access.Grants
	// Label is the name the administrator gave the account, shown where its
	// role used to be. Empty: the role is shown.
	Label string
}

// Allows reports whether this account may do what a route needs. The
// administrator may do everything; a member, what its grants say — and never
// what only the administrator may do.
func (a Account) Allows(c access.Cap) bool {
	if a.Admin {
		return true
	}
	if c == access.Admin {
		return false
	}
	return a.Grants.Allows(c)
}

// ReachesLocalNetwork reports whether what this account points the server at
// may be on the local network.
func (a Account) ReachesLocalNetwork() bool {
	return a.Admin || a.Grants.NetworkLocal
}

// Context marks ctx with what this account may reach, so the dialer refuses
// the local network to an account that was only given the internet.
func (a Account) Context(ctx context.Context) context.Context {
	if a.ReachesLocalNetwork() {
		return ctx
	}
	return util.InternetOnly(ctx)
}

// LoadAccount reads one account's permissions.
//
// A member with no row is given nothing that reaches anywhere (access.Viewer):
// every member gets a row when it is created and every start writes the missing
// ones, so a member without one is a fault, and a fault must not open anything.
func LoadAccount(ctx context.Context, db *sql.DB, userID int) (Account, error) {
	a := Account{ID: userID, Admin: isFirstAdmin(db, userID)}
	var grants, label string
	err := db.QueryRowContext(ctx, `SELECT grants, label FROM user_access WHERE user_id = ?`, userID).
		Scan(&grants, &label)
	switch {
	case errors.Is(err, sql.ErrNoRows):
		a.Grants = access.Viewer()
	case err != nil:
		return Account{}, err
	default:
		a.Grants = access.Decode(grants)
		a.Label = label
	}
	return a, nil
}

type accountKey struct{}

// accountFrom is the account a route wrapped by Need or AnyAccount resolved.
func accountFrom(r *http.Request) (Account, bool) {
	a, ok := r.Context().Value(accountKey{}).(Account)
	return a, ok
}

// withAccount hands the account to the handler and marks the request with what
// it may reach, so every outbound request built from r.Context() inherits it.
func withAccount(r *http.Request, a Account) *http.Request {
	ctx := context.WithValue(r.Context(), accountKey{}, a)
	return r.WithContext(a.Context(ctx))
}

// Need lets a request through only if its account may do c.
//
// Every route that needs a session is declared with Need or AnyAccount (see
// server.go); a test refuses a route that is declared with neither, so a route
// added tomorrow cannot be open to every account by forgetting.
func Need(db *sql.DB, c access.Cap, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		a, err := LoadAccount(r.Context(), db, middleware.GetUserIDFromContext(r))
		if err != nil {
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
		if !a.Allows(c) {
			http.Error(w, "error.forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, withAccount(r, a))
	})
}

// AnyAccount is a route every signed-in account may use: its own profile, its
// password, reading its own board. It still resolves the account, so whatever
// the handler fetches is limited to what that account may reach.
func AnyAccount(db *sql.DB, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		a, err := LoadAccount(r.Context(), db, middleware.GetUserIDFromContext(r))
		if err != nil {
			http.Error(w, "general.db_error", http.StatusInternalServerError)
			return
		}
		next.ServeHTTP(w, withAccount(r, a))
	})
}

// storeAccess writes an account's permissions and label, replacing any it had.
func storeAccess(ctx context.Context, db *sql.DB, userID int, g access.Grants, label string) error {
	_, err := db.ExecContext(ctx, `INSERT INTO user_access (user_id, grants, label) VALUES (?, ?, ?)
		ON CONFLICT (user_id) DO UPDATE SET grants = excluded.grants, label = excluded.label`,
		userID, access.Encode(g), label)
	return err
}

// undoAccount removes an account that could not be finished.
func undoAccount(ctx context.Context, db *sql.DB, userID int) {
	_, _ = db.ExecContext(ctx, "DELETE FROM users WHERE id = ?", userID)
}

// maxLabel is how long a label may be, in characters: it sits in a small tag
// beside a name, and must fit there in every language, so it is counted in
// characters and not bytes (a Japanese label is three bytes a character).
const maxLabel = 24

// cleanLabel is a label as it is stored: trimmed, without control characters,
// and no longer than maxLabel characters.
func cleanLabel(label string) string {
	label = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, strings.TrimSpace(label))
	if runes := []rune(label); len(runes) > maxLabel {
		label = strings.TrimSpace(string(runes[:maxLabel]))
	}
	return label
}

// accessView is what the browser is told about an account's permissions: the
// profile they match and, capability by capability, what it may do. The
// administrator is told everything is allowed.
func accessView(a Account) map[string]any {
	can := map[string]bool{}
	for _, c := range []access.Cap{
		access.BoardEdit, access.BoardMultiple, access.BoardTransfer, access.IconsInternet,
		access.WidgetAPI, access.WidgetRemoteStats,
		access.DockerView, access.DockerControl, access.ProxmoxView, access.ProxmoxControl,
		access.WatchStatus, access.WatchMonitor, access.WatchAlerts, access.ServerTelemetry,
	} {
		can[string(c)] = a.Allows(c)
	}
	can["network_local"] = a.ReachesLocalNetwork()
	profile := access.ProfileOf(a.Grants)
	if a.Admin {
		profile = "admin"
	}
	return map[string]any{"profile": profile, "can": can}
}

// GiveMembersTheirAccess gives every member without permissions what members
// could do before permissions existed (access.Existing). It runs at every start
// and after a restore; see database.GiveMembersTheirAccess.
func GiveMembersTheirAccess(db *sql.DB) (int, error) {
	return database.GiveMembersTheirAccess(db, access.Encode(access.Existing()))
}
