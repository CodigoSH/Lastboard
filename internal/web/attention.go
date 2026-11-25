package web

import (
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/version"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/api"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/middleware"
	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

// attentionItem is one thing about this server its administrator should know
// and can fix. The page words it from the key, in the reader's language; the
// params are the facts the sentence needs.
type attentionItem struct {
	Key    string         `json:"key"`
	Tone   string         `json:"tone"` // "bad", "warn" or "info"
	Params map[string]any `json:"params,omitempty"`
}

// diskWarn and diskBad are how full the disk under the database may be before
// About says so: the lines a bar turns amber and red at.
const (
	diskWarn = 0.75
	diskBad  = 0.90
)

// diskAttention says whether a disk this full needs the administrator, and how
// badly.
func diskAttention(free, total uint64) (attentionItem, bool) {
	if total == 0 || free > total {
		return attentionItem{}, false
	}
	used := float64(total-free) / float64(total)
	if used < diskWarn {
		return attentionItem{}, false
	}
	tone := "warn"
	if used >= diskBad {
		tone = "bad"
	}
	return attentionItem{Key: "disk", Tone: tone, Params: map[string]any{"free_bytes": free, "total_bytes": total}}, true
}

// dbFile is where the database is, as the server was started with it.
func dbFile() string {
	if f := os.Getenv("DB_FILE"); f != "" {
		return f
	}
	return "./lastboard.db"
}

// installKind says how this server is installed, because what to do about a setting depends on it: a
// container's environment is changed where the container is defined, a native installation's in its service file.
func installKind() string {
	if api.InContainer() {
		return "container"
	}
	return "native"
}

// handleAttention lists what needs the administrator: only what this server
// can see for itself and somebody can act on, a problem and never a
// suggestion.
func (s *Server) handleAttention(w http.ResponseWriter, r *http.Request) {
	out := []attentionItem{}

	if free, total, ok := diskFree(filepath.Dir(dbFile())); ok {
		if item, full := diskAttention(free, total); full {
			out = append(out, item)
		}
	}

	// The administrator's own alert channels whose last alert did not get
	// through: an alert that is not delivered is a monitor that says nothing.
	if failing := api.FailingChannels(s.DB, middleware.GetUserIDFromContext(r)); len(failing) > 0 {
		names := make([]string, 0, len(failing))
		for _, f := range failing {
			names = append(names, f.Name)
		}
		out = append(out, attentionItem{Key: "channels", Tone: "warn", Params: map[string]any{
			"count": len(failing), "names": strings.Join(names, ", "), "reason": failing[0].Reason,
		}})
	}

	// The telemetry socket refused for its origin: the widget then stays at
	// "—". Behind a proxy that changes the address, TRUST_PROXY lets the
	// proxy's own header vouch for it.
	if api.WSOriginRefused() {
		out = append(out, attentionItem{Key: "socket", Tone: "warn", Params: map[string]any{
			"trust_proxy": os.Getenv("TRUST_PROXY") == "true",
			"install":     installKind(),
		}})
	}

	if s.forwardedUnread.Load() {
		out = append(out, attentionItem{Key: "proxy", Tone: "warn", Params: map[string]any{"install": installKind()}})
	}

	// Information rather than a fault: plain HTTP on a home network is a
	// choice, but sessions then ride cookies that are not marked secure, and
	// passkeys only work over HTTPS.
	if s.insecureSeen.Load() {
		out = append(out, attentionItem{Key: "https", Tone: "info"})
	}

	writeJSON(w, map[string]any{"items": out})
}

// handleServerDetails is what About's dialog shows: the machine, the
// installation and how it is set up. Whether things are set up, never their
// secrets.
func (s *Server) handleServerDetails(w http.ResponseWriter, r *http.Request) {
	out := map[string]any{
		"version":        version.Current,
		"go":             runtime.Version(),
		"os":             runtime.GOOS + "/" + runtime.GOARCH,
		"uptime_seconds": int64(time.Since(s.startedAt).Seconds()),
		"started_at":     s.startedAt.Unix(),
	}

	file := dbFile()
	var dbBytes int64
	for _, suffix := range []string{"", "-wal", "-shm"} {
		if info, err := os.Stat(file + suffix); err == nil {
			dbBytes += info.Size()
		}
	}
	if dbBytes > 0 {
		out["database_bytes"] = dbBytes
	}
	var schema int
	if err := s.DB.QueryRow("PRAGMA user_version").Scan(&schema); err == nil {
		out["schema"] = schema
	}
	if free, total, ok := diskFree(filepath.Dir(file)); ok {
		out["disk_free_bytes"] = free
		out["disk_total_bytes"] = total
	}

	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	out["memory_bytes"] = mem.Sys - mem.HeapReleased

	if runtime.GOOS == "linux" {
		h := api.HostStats()
		host := map[string]any{
			"cpu_percent":     h.CPUUsage,
			"cores":           runtime.NumCPU(),
			"mem_total_bytes": h.RAMTotal,
			"mem_used_bytes":  h.RAMUsed,
		}
		if h.Temperature >= 0 {
			host["temperature"] = h.Temperature
		}
		out["host"] = host
	}

	hops, _ := strconv.Atoi(os.Getenv("TRUST_PROXY_HOPS"))
	if hops < 1 {
		hops = 1
	}
	out["config"] = map[string]any{
		"trust_proxy": os.Getenv("TRUST_PROXY") == "true",
		"proxy_hops":  hops,
		"auth_proxy":  s.authProxy.Header != "",
		"https":       util.IsSecureRequest(r),
	}

	writeJSON(w, out)
}

// noticeInsecure remembers that somebody signed in reached this server over
// plain HTTP from another machine. This machine itself does not count: that is
// somebody trying it out, or a proxy on the same host.
//
// A person, not a request: a proxy's health probe, a status check of this very
// server by its own address or the update's restart all arrive without HTTPS
// and are nobody using Lastboard. Counting them told an administrator who was
// on HTTPS that they were not, with nothing to say who was.
func (s *Server) noticeInsecure(r *http.Request) {
	if s.insecureSeen.Load() || util.IsSecureRequest(r) {
		return
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	ip := net.ParseIP(host)
	if ip == nil || ip.IsLoopback() || !s.hasLiveSession(r) {
		return
	}
	if s.insecureSeen.CompareAndSwap(false, true) {
		slog.Info("somebody signed in is using Lastboard over plain HTTP", "from", host, "path", r.URL.Path)
	}
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
