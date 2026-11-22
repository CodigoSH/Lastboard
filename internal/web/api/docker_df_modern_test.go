package api

import (
	"encoding/json"
	"testing"
)

// What Podman 6.2 answers for /system/df, trimmed to the fields that are read.
const modernDFSample = `{
 "ImageUsage":{"TotalSize":8715193,"Items":[{"Id":"a","Containers":1,"Size":8715193,"SharedSize":0},{"Id":"b","Containers":0,"Size":1000,"SharedSize":200}]},
 "ContainerUsage":{"Items":[{"Id":"c","SizeRw":13654,"State":"running"},{"Id":"d","SizeRw":500,"State":"exited"}]},
 "VolumeUsage":{"Items":[{"UsageData":{"Size":4000,"RefCount":0}},{"UsageData":{"Size":100,"RefCount":2}}]},
 "BuildCacheUsage":{"Items":[{"Size":70,"InUse":false},{"Size":30,"InUse":true}]}
}`

const flatDFSample = `{
 "LayersSize":8715193,
 "Images":[{"Containers":1,"Size":8715193,"SharedSize":0},{"Containers":0,"Size":1000,"SharedSize":200}],
 "Containers":[{"SizeRw":13654,"State":"running"},{"SizeRw":500,"State":"exited"}],
 "Volumes":[{"UsageData":{"Size":4000,"RefCount":0}},{"UsageData":{"Size":100,"RefCount":2}}],
 "BuildCache":[{"Size":70,"InUse":false},{"Size":30,"InUse":true}]
}`

func TestDiskUsageReadsBothShapesAlike(t *testing.T) {
	var modern, flat dockerDF
	if err := json.Unmarshal([]byte(modernDFSample), &modern); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal([]byte(flatDFSample), &flat); err != nil {
		t.Fatal(err)
	}
	got, want := summariseDisk(modern), summariseDisk(flat)
	if got != want {
		t.Fatalf("modern shape read as %+v, flat as %+v", got, want)
	}
	if got.Images.Count != 2 || got.Volumes.Reclaimable != 4000 || got.Cache.Reclaimable != 70 || got.Containers.Reclaimable != 500 {
		t.Fatalf("figures wrong: %+v", got)
	}
}

func TestDiskUsageAcceptsThePluralSpelling(t *testing.T) {
	var d dockerDF
	if err := json.Unmarshal([]byte(`{"ImagesUsage":{"TotalSize":10,"Items":[{"Size":10,"Containers":0}]}}`), &d); err != nil {
		t.Fatal(err)
	}
	if got := summariseDisk(d); got.Images.Count != 1 || got.Images.Size != 10 {
		t.Fatalf("plural spelling not read: %+v", got)
	}
}

func TestDiskUsageKeepsTheOldKeysWhenBothArePresent(t *testing.T) {
	var d dockerDF
	body := `{"LayersSize":5,"Images":[{"Size":5,"Containers":1}],"ImageUsage":{"TotalSize":999,"Items":[{"Size":999},{"Size":999}]}}`
	if err := json.Unmarshal([]byte(body), &d); err != nil {
		t.Fatal(err)
	}
	if got := summariseDisk(d); got.Images.Count != 1 || got.Images.Size != 5 {
		t.Fatalf("the old keys should win: %+v", got)
	}
}
