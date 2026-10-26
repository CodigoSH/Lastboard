package api

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
)

// SessionHandler lets an account see where it is signed in and end any of it.
// Every account sees and closes only its own sessions.
type SessionHandler struct {
	DB *sql.DB
}

type sessionView struct {
	ID        int64     `json:"id"`
	Current   bool      `json:"current"`
	CreatedAt time.Time `json:"created_at"`
	LastSeen  time.Time `json:"last_seen"`
	ExpiresAt time.Time `json:"expires_at"`
	Remember  bool      `json:"remember"`
	UserAgent string    `json:"user_agent"`
	IP        string    `json:"ip"`
}

// List answers with the account's open sessions, saying which one is asking.
func (h *SessionHandler) List(w http.ResponseWriter, r *http.Request) {
	list, err := middleware.ListSessions(r.Context(), h.DB, middleware.GetUserIDFromContext(r))
	if err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	current := middleware.GetSessionIDFromContext(r)
	out := make([]sessionView, 0, len(list))
	for _, s := range list {
		out = append(out, sessionView{
			ID: s.ID, Current: s.ID == current, CreatedAt: s.CreatedAt, LastSeen: s.LastSeen,
			ExpiresAt: s.ExpiresAt, Remember: s.Remember, UserAgent: s.UserAgent, IP: s.IP,
		})
	}
	writeJSON(w, out)
}

// Close ends one session of the account. Closing the one making the request
// signs this browser out, as signing out does.
func (h *SessionHandler) Close(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	err = middleware.RevokeSession(r.Context(), h.DB, middleware.GetUserIDFromContext(r), id)
	switch {
	case errors.Is(err, middleware.ErrSessionNotFound):
		http.Error(w, "error.not_found", http.StatusNotFound)
		return
	case err != nil:
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	if id == middleware.GetSessionIDFromContext(r) {
		invalidateSession(w, r)
	}
	w.WriteHeader(http.StatusNoContent)
}

// CloseOthers ends every session of the account but this one.
func (h *SessionHandler) CloseOthers(w http.ResponseWriter, r *http.Request) {
	current := middleware.GetSessionIDFromContext(r)
	if current == 0 {
		// Only a cookie that could not be converted has no session; there is
		// nothing to keep open, so nothing is closed by guess.
		http.Error(w, "general.internal_error", http.StatusInternalServerError)
		return
	}
	if err := middleware.RevokeOtherSessions(r.Context(), h.DB, middleware.GetUserIDFromContext(r), current); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
