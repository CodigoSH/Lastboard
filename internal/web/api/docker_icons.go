package api

import (
	"encoding/json"
	"net/http"
	"strings"
)

/*
The face of a container.

Some containers will never have a bookmark — the runners, the tunnel, the one the
dashboard itself runs in — and matching them by name against an icon catalogue
would mean asking a CDN what this household runs, which the board promises it
does not do. So the operator picks, once, and the icon is downloaded and stored
by this instance like any bookmark's.

Per account, like the hosts: each account has hosts of its own, so the faces it
gives their containers are its own too. A container is keyed by its host and its
NAME, never its id: updating a container recreates it under a new id, and an
icon kept by id was lost with every update.
*/

const dockerIconsKey = "docker_icons"

// Bounds on what one setting row may hold: enough for a big host, small enough
// that it cannot be grown into a place to keep arbitrary data.
const (
	dockerMaxIcons   = 500
	dockerMaxIconLen = 512
	dockerMaxNameLen = 128
)

// dockerIconKey addresses one container. A slash cannot be part of a Docker
// name, and host ids have none, so the key is unambiguous.
func dockerIconKey(hostID, name string) string { return hostID + "/" + name }

func (s dockerScope) icons() map[string]string {
	raw, _ := NewUserSettings(s.DB).Get(s.uid, dockerIconsKey)
	out := map[string]string{}
	if raw == "" {
		return out
	}
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		// A setting that cannot be read is a setting nobody set.
		return map[string]string{}
	}
	return out
}

func (s dockerScope) saveIcons(icons map[string]string) error {
	blob, err := json.Marshal(icons)
	if err != nil {
		return err
	}
	return NewUserSettings(s.DB).Set(s.uid, dockerIconsKey, string(blob))
}

// pruneIcons drops the icons of hosts that are no longer in the list: nothing
// can read them, and a full map would refuse the next container.
func (s dockerScope) pruneIcons(keep []dockerHost) {
	icons := s.icons()
	ids := map[string]bool{}
	for _, h := range keep {
		ids[h.ID] = true
	}
	changed := false
	for key := range icons {
		host, _, _ := strings.Cut(key, "/")
		if !ids[host] {
			delete(icons, key)
			changed = true
		}
	}
	if changed {
		_ = s.saveIcons(icons)
	}
}

// POST /api/docker/icon — Body: { "host_id": string, "name": string, "icon": string }
//
// Stores, or with an empty icon clears, the face of one container, in the
// caller's own settings.
func (h *DockerHandler) SetIcon(w http.ResponseWriter, r *http.Request) {
	s := h.forAccount(r)
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)

	var in struct {
		HostID string `json:"host_id"`
		Name   string `json:"name"`
		Icon   string `json:"icon"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(in.Name)
	icon := strings.TrimSpace(in.Icon)
	if name == "" || len(name) > dockerMaxNameLen || strings.Contains(name, "/") || len(icon) > dockerMaxIconLen {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	// The host is resolved rather than believed: an id the caller invented
	// would write an icon nothing will ever read.
	host, rerr := s.resolve(strings.TrimSpace(in.HostID))
	if rerr != nil {
		http.Error(w, rerr.key, rerr.status)
		return
	}

	icons := s.icons()
	key := dockerIconKey(host.ID, name)
	if icon == "" {
		delete(icons, key)
	} else {
		// A full map is not a reason to lose what is already there, so only a
		// container that is not in it yet is refused.
		if _, known := icons[key]; !known && len(icons) >= dockerMaxIcons {
			http.Error(w, "general.invalid_input", http.StatusBadRequest)
			return
		}
		icons[key] = icon
	}
	if err := s.saveIcons(icons); err != nil {
		http.Error(w, "general.db_error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
