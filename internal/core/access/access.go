// Package access is what an account may do: the catalogue of permissions, the
// profiles an administrator starts from, and the one question every route asks —
// may this account do this?
//
// It is pure on purpose. The server stores a Grants per member and asks Allows;
// nothing here knows about HTTP or the database, so the rules can be read and
// tested in one place.
//
// The administrator is not in this catalogue. There is exactly one, it may do
// everything, and some things only it may ever do (accounts, backups, restoring,
// resetting, updating, the server's own Docker). Those are not permissions a
// member can be given; see Admin.
package access

import "encoding/json"

// Level is how far a permission over a piece of infrastructure goes.
type Level int

const (
	// None: the integration is not offered.
	None Level = 0
	// View: reading what is there.
	View Level = 1
	// Control: reading, and starting and stopping.
	Control Level = 2
)

// Grants is what one member may do. The JSON names are what is stored, so they
// are not to be renamed; a new permission is a new field.
type Grants struct {
	// The board.
	BoardEdit     bool `json:"board_edit"`     // false: sees the board prepared for it, changes nothing
	BoardMultiple bool `json:"board_multiple"` // more than one board
	BoardTransfer bool `json:"board_transfer"` // importing and exporting boards
	IconsInternet bool `json:"icons_internet"` // fetching a new icon from the internet

	// Widgets that make the server fetch something. The ones that do not —
	// clock, weather, notes, markdown — are always allowed.
	WidgetAPI         bool `json:"widget_api"`
	WidgetRemoteStats bool `json:"widget_remote_stats"` // Server Health from other machines

	// Whether what this account points the server at may be on the local
	// network. Off, the server only reaches the internet on its behalf.
	NetworkLocal bool `json:"network_local"`

	// Infrastructure the member brings with its own credentials.
	Docker  Level `json:"docker"`  // its own agents only; the server's Docker is never a member's
	Proxmox Level `json:"proxmox"` // further limited by what its token allows

	// Watching.
	WatchStatus  bool `json:"watch_status"`  // the up/down dot on bookmarks
	WatchMonitor bool `json:"watch_monitor"` // round-the-clock monitoring, and its widget
	WatchAlerts  bool `json:"watch_alerts"`  // sending alerts to its own channel

	// The machine Lastboard runs on: its CPU, memory and temperature.
	ServerTelemetry bool `json:"server_telemetry"`
}

// Cap is one thing a route may need.
type Cap string

const (
	BoardEdit         Cap = "board_edit"
	BoardMultiple     Cap = "board_multiple"
	BoardTransfer     Cap = "board_transfer"
	IconsInternet     Cap = "icons_internet"
	WidgetAPI         Cap = "widget_api"
	WidgetRemoteStats Cap = "widget_remote_stats"
	DockerView        Cap = "docker_view"
	DockerControl     Cap = "docker_control"
	ProxmoxView       Cap = "proxmox_view"
	ProxmoxControl    Cap = "proxmox_control"
	WatchStatus       Cap = "watch_status"
	WatchMonitor      Cap = "watch_monitor"
	WatchAlerts       Cap = "watch_alerts"
	ServerTelemetry   Cap = "server_telemetry"
	// Admin is what only the administrator may do. No Grants allows it.
	Admin Cap = "admin"
)

// Allows reports whether these grants let a member do what a route needs.
// A capability it does not know is refused: a new route that names a new
// capability before this file learns it fails closed.
func (g Grants) Allows(c Cap) bool {
	switch c {
	case BoardEdit:
		return g.BoardEdit
	case BoardMultiple:
		// More boards are edited boards.
		return g.BoardEdit && g.BoardMultiple
	case BoardTransfer:
		return g.BoardTransfer
	case IconsInternet:
		return g.IconsInternet
	case WidgetAPI:
		return g.WidgetAPI
	case WidgetRemoteStats:
		return g.WidgetRemoteStats
	case DockerView:
		return g.Docker >= View
	case DockerControl:
		return g.Docker >= Control
	case ProxmoxView:
		return g.Proxmox >= View
	case ProxmoxControl:
		return g.Proxmox >= Control
	case WatchStatus:
		return g.WatchStatus
	case WatchMonitor:
		return g.WatchMonitor
	case WatchAlerts:
		// An alert is about something being monitored.
		return g.WatchMonitor && g.WatchAlerts
	case ServerTelemetry:
		return g.ServerTelemetry
	}
	return false
}

/* ---------------------------------------------------------------------------
 * Profiles
 *
 * A profile is where an administrator starts when creating an account: one
 * click instead of a form. It is a template, not a link — choosing one copies
 * its values onto the account, so changing what a profile includes in a later
 * version never adds or removes anything from an account in silence.
 * ------------------------------------------------------------------------ */

// Profile names, as stored nowhere and sent to the browser.
const (
	ProfileViewer   = "viewer"
	ProfileStandard = "standard"
	ProfileHomelab  = "homelab"
	ProfileCustom   = "custom"
)

// Viewer is a wall screen, a guest, a child: it sees the board it was given and
// makes the server reach nothing on its behalf.
func Viewer() Grants {
	return Grants{ServerTelemetry: true}
}

// Standard is the household member: a board of its own, widgets that talk to
// internet services, the dot on its bookmarks — and nothing on the local
// network, and no infrastructure.
func Standard() Grants {
	return Grants{
		BoardEdit: true, BoardMultiple: true, BoardTransfer: true, IconsInternet: true,
		WidgetAPI:       true,
		WatchStatus:     true,
		ServerTelemetry: true,
	}
}

// Homelab is somebody trusted with equipment of their own: everything a member
// can be given.
func Homelab() Grants {
	return Grants{
		BoardEdit: true, BoardMultiple: true, BoardTransfer: true, IconsInternet: true,
		WidgetAPI: true, WidgetRemoteStats: true,
		NetworkLocal: true,
		Docker:       Control, Proxmox: Control,
		WatchStatus: true, WatchMonitor: true, WatchAlerts: true,
		ServerTelemetry: true,
	}
}

// Existing is what an account that existed before permissions does after the
// update: everything it could do until now. The server's own Docker, the one
// thing it loses, is not a grant — it is refused to members by the host type.
func Existing() Grants { return Homelab() }

// Named returns a profile's grants, and false for a name that is not one.
func Named(name string) (Grants, bool) {
	switch name {
	case ProfileViewer:
		return Viewer(), true
	case ProfileStandard:
		return Standard(), true
	case ProfileHomelab:
		return Homelab(), true
	}
	return Grants{}, false
}

// ProfileOf says which profile a set of grants is exactly, or custom.
func ProfileOf(g Grants) string {
	for _, name := range []string{ProfileViewer, ProfileStandard, ProfileHomelab} {
		if p, _ := Named(name); p == g {
			return name
		}
	}
	return ProfileCustom
}

/* ---------------------------------------------------------------------------
 * Storage
 * ------------------------------------------------------------------------ */

// Decode reads stored grants. A field the stored text does not have — a
// permission added after it was written — takes the Standard value, never more.
// A level outside the scale is clamped. Unreadable text is Viewer: nothing that
// reaches anywhere, rather than everything.
func Decode(raw string) Grants {
	g := Standard()
	if err := json.Unmarshal([]byte(raw), &g); err != nil {
		return Viewer()
	}
	g.Docker = clamp(g.Docker)
	g.Proxmox = clamp(g.Proxmox)
	return g
}

// Encode is the text that is stored.
func Encode(g Grants) string {
	b, _ := json.Marshal(g)
	return string(b)
}

func clamp(l Level) Level {
	switch {
	case l < None:
		return None
	case l > Control:
		return Control
	}
	return l
}
