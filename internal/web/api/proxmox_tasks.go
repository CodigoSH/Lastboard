package api

import (
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
)

/* ---------------------------------------------------------------------------
 * Tasks
 *
 * What a hypervisor has been doing: every backup, migration, start and stop
 * leaves a task with a log. Both are read with Sys.Audit on the node, which the
 * role the guide recommends already has, so nothing new is asked of anyone's
 * token. Read-only, against the account's own hypervisors only.
 * ------------------------------------------------------------------------ */

const (
	// proxmoxTaskLimit is how many tasks are listed: the recent ones, which is
	// what anybody opens this for.
	proxmoxTaskLimit = 50
	// proxmoxTaskLogLines is how many lines of one task's log are read.
	proxmoxTaskLogLines = 1000
	// maxUPID bounds a task id: a node name, a type and a user, never more.
	maxUPID = 256
)

// pxTask is one row of /nodes/{node}/tasks.
type pxTask struct {
	UPID      string `json:"upid"`
	Type      string `json:"type"`
	ID        string `json:"id"`
	User      string `json:"user"`
	Status    string `json:"status"` // "OK", "WARNINGS: n", an error text, or absent while running
	StartTime int64  `json:"starttime"`
	EndTime   int64  `json:"endtime"`
}

// proxmoxTask is a task as the page shows it.
type proxmoxTask struct {
	UPID    string `json:"upid"`
	Type    string `json:"type"`
	ID      string `json:"id"`
	User    string `json:"user"`
	State   string `json:"state"` // running | ok | warning | error
	Message string `json:"message,omitempty"`
	Start   int64  `json:"start"`
	End     int64  `json:"end,omitempty"`
}

// taskState reads Proxmox's one status string, which is several things at once.
func taskState(status string, end int64) (state, message string) {
	switch {
	case status == "" && end == 0:
		return "running", ""
	case status == "OK":
		return "ok", ""
	case strings.HasPrefix(status, "WARNINGS"):
		return "warning", cleanLogText(status)
	default:
		return "error", cleanLogText(status)
	}
}

// unsafeInPath is what a node name or a task id may never carry: it would turn
// one segment of the path into another path, a query, or an escape. A backslash
// may stay: Proxmox writes a colon inside an id as \x3a, and the segment is
// escaped on the way out anyway.
func unsafeInPath(s string) bool {
	return strings.ContainsAny(s, "/?#% ") || strings.IndexFunc(s, func(r rune) bool { return r < 0x20 || r == 0x7f }) >= 0
}

// validNode is a node name as it goes into a path.
func validNode(node string) bool {
	return node != "" && len(node) <= 64 && !unsafeInPath(node)
}

// validUPID is a task id that names a task of that node and can be nothing
// else in a path: "UPID:node:pid:pstart:starttime:type:id:user:".
func validUPID(upid, node string) bool {
	return len(upid) <= maxUPID &&
		strings.HasPrefix(upid, "UPID:"+node+":") &&
		strings.HasSuffix(upid, ":") &&
		strings.Count(upid, ":") == 8 &&
		!unsafeInPath(upid)
}

// GetTasks lists a node's recent tasks, newest first, optionally of one guest.
//
// GET /api/proxmox/tasks?host=h&node=kprox[&vmid=106]
func (h *ProxmoxHandler) GetTasks(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	host, ok := h.forUser(r).hostFor(strings.TrimSpace(q.Get("host")))
	if !ok {
		http.Error(w, "proxmox.not_configured", http.StatusPreconditionFailed)
		return
	}
	node := q.Get("node")
	if !validNode(node) {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	params := url.Values{}
	params.Set("limit", strconv.Itoa(proxmoxTaskLimit))
	if v := q.Get("vmid"); v != "" {
		vmid, err := strconv.Atoi(v)
		if err != nil || vmid <= 0 {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		params.Set("vmid", strconv.Itoa(vmid))
	}

	var raw []pxTask
	if err := proxmoxDo(configOf(host), http.MethodGet, "/nodes/"+url.PathEscape(node)+"/tasks?"+params.Encode(), &raw); err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	tasks := make([]proxmoxTask, 0, len(raw))
	for _, t := range raw {
		// A task whose id this server would refuse to read the log of is not
		// listed: the page could only offer a link that fails.
		if !validUPID(t.UPID, node) {
			continue
		}
		state, message := taskState(t.Status, t.EndTime)
		tasks = append(tasks, proxmoxTask{
			UPID: t.UPID, Type: cleanLogText(t.Type), ID: cleanLogText(t.ID), User: cleanLogText(t.User),
			State: state, Message: message, Start: t.StartTime, End: t.EndTime,
		})
	}
	sort.SliceStable(tasks, func(i, j int) bool { return tasks[i].Start > tasks[j].Start })
	writeJSON(w, map[string]any{"tasks": tasks})
}

// pxLogLine is one line of a task's log.
type pxLogLine struct {
	N int    `json:"n"`
	T string `json:"t"`
}

// GetTaskLog reads one task's log, and whether the task is still running.
//
// GET /api/proxmox/task-log?host=h&node=kprox&upid=UPID:...
func (h *ProxmoxHandler) GetTaskLog(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	host, ok := h.forUser(r).hostFor(strings.TrimSpace(q.Get("host")))
	if !ok {
		http.Error(w, "proxmox.not_configured", http.StatusPreconditionFailed)
		return
	}
	node, upid := q.Get("node"), q.Get("upid")
	if !validNode(node) || !validUPID(upid, node) {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	cfg := configOf(host)
	base := "/nodes/" + url.PathEscape(node) + "/tasks/" + url.PathEscape(upid)

	var raw []pxLogLine
	if err := proxmoxDo(cfg, http.MethodGet, base+"/log?start=0&limit="+strconv.Itoa(proxmoxTaskLogLines), &raw); err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	lines := make([]string, 0, len(raw))
	for _, l := range raw {
		text := cleanLogText(l.T)
		if len(text) > maxLogLine {
			text = strings.ToValidUTF8(text[:maxLogLine], "") + "…"
		}
		lines = append(lines, text)
	}

	// The status says whether to keep asking. A task whose status cannot be
	// read counts as finished, so the page stops rather than polls forever.
	var status struct {
		Status string `json:"status"` // running | stopped
	}
	running := proxmoxDo(cfg, http.MethodGet, base+"/status", &status) == nil && status.Status == "running"

	writeJSON(w, map[string]any{
		"lines":     lines,
		"running":   running,
		"truncated": len(raw) >= proxmoxTaskLogLines,
	})
}

/* ---------------------------------------------------------------------------
 * The node's system log
 *
 * Optional, on purpose: it needs Sys.Syslog on the node, which the role the
 * guide recommends does not carry. A token without it is told so by name
 * instead of failing as if the host were down.
 * ------------------------------------------------------------------------ */

const (
	defaultJournalLines = 200
	maxJournalLines     = 1000
)

// GetNodeJournal reads the last lines of a node's system log.
//
// GET /api/proxmox/journal?host=h&node=kprox[&lines=200]
func (h *ProxmoxHandler) GetNodeJournal(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	host, ok := h.forUser(r).hostFor(strings.TrimSpace(q.Get("host")))
	if !ok {
		http.Error(w, "proxmox.not_configured", http.StatusPreconditionFailed)
		return
	}
	node := q.Get("node")
	if !validNode(node) {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	n := defaultJournalLines
	if v := q.Get("lines"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed <= 0 {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		n = min(parsed, maxJournalLines)
	}

	var raw []string
	err := proxmoxDo(configOf(host), http.MethodGet, "/nodes/"+url.PathEscape(node)+"/journal?lastentries="+strconv.Itoa(n), &raw)
	if err != nil {
		if err.Error() == "proxmox.forbidden" {
			http.Error(w, "proxmox.no_syslog_permission", http.StatusForbidden)
			return
		}
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	lines := make([]string, 0, len(raw))
	for _, l := range raw {
		// The journal brackets its answer with the cursors it read between;
		// they are for paging, not for reading.
		if strings.HasPrefix(l, "-- cursor:") {
			continue
		}
		text := cleanLogText(l)
		if len(text) > maxLogLine {
			text = strings.ToValidUTF8(text[:maxLogLine], "") + "…"
		}
		lines = append(lines, text)
	}
	writeJSON(w, map[string]any{"lines": lines})
}
