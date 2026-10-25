package access

import "testing"

var allCaps = []Cap{
	BoardEdit, BoardMultiple, BoardTransfer, IconsInternet, WidgetAPI, WidgetRemoteStats,
	DockerView, DockerControl, ProxmoxView, ProxmoxControl,
	WatchStatus, WatchMonitor, WatchAlerts, ServerTelemetry,
}

// What each profile allows, written out in full so a change to a profile is a
// change to this table that somebody has to read.
func TestWhatEachProfileAllows(t *testing.T) {
	want := map[string]map[Cap]bool{
		ProfileViewer: {ServerTelemetry: true},
		ProfileStandard: {
			BoardEdit: true, BoardMultiple: true, BoardTransfer: true, IconsInternet: true,
			WidgetAPI: true, WatchStatus: true, ServerTelemetry: true,
		},
		ProfileHomelab: {
			BoardEdit: true, BoardMultiple: true, BoardTransfer: true, IconsInternet: true,
			WidgetAPI: true, WidgetRemoteStats: true,
			DockerView: true, DockerControl: true, ProxmoxView: true, ProxmoxControl: true,
			WatchStatus: true, WatchMonitor: true, WatchAlerts: true, ServerTelemetry: true,
		},
	}
	for name, allowed := range want {
		g, ok := Named(name)
		if !ok {
			t.Fatalf("%s is not a profile", name)
		}
		for _, c := range allCaps {
			if got := g.Allows(c); got != allowed[c] {
				t.Errorf("%s: Allows(%s) = %v, want %v", name, c, got, allowed[c])
			}
		}
	}
	if Viewer().NetworkLocal || Standard().NetworkLocal || !Homelab().NetworkLocal {
		t.Error("only Homelab reaches the local network")
	}
}

// The administrator's own capability is not something a member can be given,
// whatever its grants say.
func TestNoGrantsAllowWhatOnlyTheAdministratorMayDo(t *testing.T) {
	everything := Homelab()
	if everything.Allows(Admin) {
		t.Error("a member was allowed Admin")
	}
	if everything.Allows(Cap("something_new")) {
		t.Error("a capability the catalogue does not know must be refused, not allowed")
	}
}

func TestDependentPermissions(t *testing.T) {
	g := Grants{BoardMultiple: true, WatchAlerts: true}
	if g.Allows(BoardMultiple) {
		t.Error("more boards without editing boards")
	}
	if g.Allows(WatchAlerts) {
		t.Error("alerts without monitoring")
	}
	g.BoardEdit, g.WatchMonitor = true, true
	if !g.Allows(BoardMultiple) || !g.Allows(WatchAlerts) {
		t.Error("with what they depend on, both are allowed")
	}
}

func TestLevels(t *testing.T) {
	view := Grants{Docker: View, Proxmox: View}
	if !view.Allows(DockerView) || view.Allows(DockerControl) || !view.Allows(ProxmoxView) || view.Allows(ProxmoxControl) {
		t.Error("View reads and does not control")
	}
	none := Grants{}
	if none.Allows(DockerView) || none.Allows(ProxmoxView) {
		t.Error("None offers nothing")
	}
}

func TestProfileOf(t *testing.T) {
	for _, name := range []string{ProfileViewer, ProfileStandard, ProfileHomelab} {
		g, _ := Named(name)
		if got := ProfileOf(g); got != name {
			t.Errorf("ProfileOf(%s) = %s", name, got)
		}
	}
	g := Standard()
	g.NetworkLocal = true
	if ProfileOf(g) != ProfileCustom {
		t.Error("a profile with one switch changed is custom")
	}
	if _, ok := Named(ProfileCustom); ok {
		t.Error("custom is not a profile one can start from")
	}
}

// Accounts that existed before permissions keep what they could do.
func TestExistingAccountsKeepWhatTheyHad(t *testing.T) {
	if Existing() != Homelab() {
		t.Error("an existing member must keep everything it could do before the update")
	}
}

func TestDecode(t *testing.T) {
	// A round trip keeps everything.
	g := Homelab()
	g.Docker = View
	if Decode(Encode(g)) != g {
		t.Error("Encode then Decode changed the grants")
	}
	// A permission the stored text predates takes the Standard value, never more.
	old := Decode(`{"board_edit":false}`)
	if old.BoardEdit {
		t.Error("a field that is stored keeps its stored value")
	}
	if old.NetworkLocal || old.Docker != None || !old.WidgetAPI {
		t.Errorf("fields the text does not have take Standard's values, got %+v", old)
	}
	// Unreadable text reaches nothing.
	if Decode("not json") != Viewer() {
		t.Error("unreadable grants must fall back to Viewer")
	}
	// Levels outside the scale are clamped.
	if c := Decode(`{"docker":7,"proxmox":-3}`); c.Docker != Control || c.Proxmox != None {
		t.Errorf("levels must be clamped, got docker=%d proxmox=%d", c.Docker, c.Proxmox)
	}
}
