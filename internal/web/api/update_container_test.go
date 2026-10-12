package api

import (
	"encoding/json"
	"errors"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"git.codigosh.com/CodigoSH/Lastboard/internal/version"
)

// TestEveryEngineIsRecognised.
//
// Inside a container the update button must not be offered: the image comes
// back on the next restart and undoes it. Each engine is told apart by the mark
// it leaves, and the one that was missed was Podman's.
func TestEveryEngineIsRecognised(t *testing.T) {
	for _, tc := range []struct {
		name  string
		files map[string]string
		want  bool
	}{
		{"docker", map[string]string{".dockerenv": ""}, true},
		{"podman", map[string]string{"run/.containerenv": ""}, true},
		{"cgroup v1 naming docker", map[string]string{"proc/1/cgroup": "12:pids:/docker/abc\n"}, true},
		{"a machine of its own, cgroup v2", map[string]string{"proc/1/cgroup": "0::/init.scope\n"}, false},
		{"nothing to go on", nil, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			for name, body := range tc.files {
				path := filepath.Join(root, name)
				if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
					t.Fatal(err)
				}
				if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
					t.Fatal(err)
				}
			}
			if got := inContainerUnder(root); got != tc.want {
				t.Errorf("inContainerUnder = %v, want %v", got, tc.want)
			}
		})
	}
}

// A container cannot install an update, but it must still be told there is one.
// The check used to be skipped inside a container, so a Docker install never saw
// the dot, the menu mark or the line on the About page, however many releases
// went by.
func TestAContainerIsToldAboutANewerRelease(t *testing.T) {
	ask := func(docker bool, latest string) UpdateResponse {
		h := &UpdateHandler{
			docker: func() bool { return docker },
			latest: func(bool) (string, string, error) { return latest, "notes", nil },
		}
		rec := httptest.NewRecorder()
		h.CheckUpdate(rec, httptest.NewRequest("GET", "/api/system/update/check?beta=false", nil))
		var r UpdateResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &r); err != nil {
			t.Fatal(err)
		}
		return r
	}

	r := ask(true, "v99.0.0")
	if !r.Available || !r.IsDocker || r.LatestVersion != "v99.0.0" {
		t.Errorf("a container was not told: %+v", r)
	}
	if r.AssetUrl != "" {
		t.Errorf("a container was offered a binary to download: %q", r.AssetUrl)
	}
	if r := ask(true, version.Current); r.Available || !r.IsDocker {
		t.Errorf("a container on the latest version was told of an update: %+v", r)
	}
	// An install of its own is unchanged: told, with the binary to fetch.
	if r := ask(false, "v99.0.0"); !r.Available || r.IsDocker || r.AssetUrl == "" {
		t.Errorf("a native install: %+v", r)
	}
}

// A check that cannot be made is a warning in a container too, never "up to date".
func TestAContainerWhoseCheckFailsIsToldSo(t *testing.T) {
	h := &UpdateHandler{
		docker: func() bool { return true },
		latest: func(bool) (string, string, error) { return "", "", errors.New("no route") },
	}
	rec := httptest.NewRecorder()
	h.CheckUpdate(rec, httptest.NewRequest("GET", "/api/system/update/check?beta=false", nil))
	var r UpdateResponse
	json.Unmarshal(rec.Body.Bytes(), &r)
	if r.Available || r.CheckError == "" || !r.IsDocker {
		t.Errorf("%+v", r)
	}
}
