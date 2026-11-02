package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const sampleDF = `{
  "LayersSize": 5000,
  "Images": [
    {"Size": 3000, "SharedSize": 1000, "Containers": 0},
    {"Size": 4000, "SharedSize": 1000, "Containers": 2},
    {"Size": 800, "SharedSize": -1, "Containers": 0}
  ],
  "Containers": [
    {"SizeRw": 40, "State": "running"},
    {"SizeRw": 60, "State": "exited"},
    {"SizeRw": -1, "State": "exited"}
  ],
  "Volumes": [
    {"UsageData": {"Size": 700, "RefCount": 0}},
    {"UsageData": {"Size": 300, "RefCount": 1}},
    {"UsageData": {"Size": -1, "RefCount": -1}},
    {"UsageData": null}
  ],
  "BuildCache": [
    {"Size": 90, "InUse": false},
    {"Size": 10, "InUse": true}
  ]
}`

func readSample(t *testing.T) dockerDF {
	t.Helper()
	var df dockerDF
	if err := json.Unmarshal([]byte(sampleDF), &df); err != nil {
		t.Fatal(err)
	}
	return df
}

func TestTheDiskIsSummedByWhatDockerHoldsAndWhatNothingUses(t *testing.T) {
	d := summariseDisk(readSample(t))

	// Images: the layers are counted once (5000), not once per image; what can go
	// is the unused images without the layers they share: (3000-1000) + (800-0).
	if d.Images.Count != 3 || d.Images.Size != 5000 || d.Images.Reclaimable != 2800 {
		t.Errorf("images = %+v, want 3 / 5000 / 2800", d.Images)
	}
	// Containers: what each wrote; only the stopped ones give it back, and a
	// size the daemon did not measure is nothing, not a negative.
	if d.Containers.Count != 3 || d.Containers.Size != 100 || d.Containers.Reclaimable != 60 {
		t.Errorf("containers = %+v, want 3 / 100 / 60", d.Containers)
	}
	// Volumes: only those nothing refers to are reclaimable; an unmeasured one counts for nothing.
	if d.Volumes.Count != 4 || d.Volumes.Size != 1000 || d.Volumes.Reclaimable != 700 {
		t.Errorf("volumes = %+v, want 4 / 1000 / 700", d.Volumes)
	}
	if d.Cache.Count != 2 || d.Cache.Size != 100 || d.Cache.Reclaimable != 90 {
		t.Errorf("cache = %+v, want 2 / 100 / 90", d.Cache)
	}
	if !d.Available || d.Total != 5000+100+1000+100 || d.Reclaimable != 2800+60+700+90 {
		t.Errorf("totals = %d / %d, want 6200 / 3650", d.Total, d.Reclaimable)
	}
}

func TestWithoutTheLayersTotalTheImagesAreSummed(t *testing.T) {
	df := readSample(t)
	df.LayersSize = 0
	if got := summariseDisk(df).Images.Size; got != 7800 {
		t.Errorf("images size = %d, want the sum of the images (7800)", got)
	}
}

func TestWhatCanGoNeverExceedsWhatThereIs(t *testing.T) {
	df := readSample(t)
	df.LayersSize = 1000 // the daemon says the layers are far smaller than its images
	if d := summariseDisk(df); d.Images.Reclaimable > d.Images.Size {
		t.Errorf("reclaimable %d is more than the images hold (%d)", d.Images.Reclaimable, d.Images.Size)
	}
}

func TestADockerWithNothingIsZeroes(t *testing.T) {
	d := summariseDisk(dockerDF{})
	if !d.Available || d.Total != 0 || d.Reclaimable != 0 {
		t.Errorf("empty Docker = %+v", d)
	}
}

func TestDiskUsageReadsTheAnswerOfTheHost(t *testing.T) {
	var path string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path = r.URL.Path
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(sampleDF))
	}))
	defer srv.Close()
	d, err := DiskUsage(srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	if path != "/system/df" || d.Total != 6200 {
		t.Errorf("asked %q, total %d; want /system/df and 6200", path, d.Total)
	}
}

func TestAnOldAgentHasNoDiskUsage(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(http.NotFound))
	defer srv.Close()
	if _, err := DiskUsage("agent://" + strings.TrimPrefix(srv.URL, "http://")); !errors.Is(err, errAgentTooOld) {
		t.Errorf("err = %v, want errAgentTooOld", err)
	}
}
