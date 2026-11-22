package api

import "encoding/json"

// The daemon's account of its disk comes in two shapes.
//
// The old one is flat: LayersSize, Images, Containers, Volumes and BuildCache
// at the top. Engines from the 1.52 API on, and Podman, answer with one object
// per kind instead — ImageUsage, ContainerUsage, VolumeUsage and
// BuildCacheUsage — each holding its records in Items, and leave the old keys
// empty. An engine that is only a release behind still answers the old one, so
// both are read and the page does not care which it got.

// dfItems is one kind in the modern shape. The records are the same as before;
// only where they sit changed.
type dfItems struct {
	TotalSize int64 `json:"TotalSize"`
	Items     []struct {
		Size       int64  `json:"Size"`
		SharedSize int64  `json:"SharedSize"`
		Containers int64  `json:"Containers"`
		SizeRw     int64  `json:"SizeRw"`
		State      string `json:"State"`
		InUse      bool   `json:"InUse"`
		UsageData  *struct {
			Size     int64 `json:"Size"`
			RefCount int64 `json:"RefCount"`
		} `json:"UsageData"`
	} `json:"Items"`
}

// modernDF is the new shape. Both spellings of each key are taken: the
// published schema and the changelog of the release that introduced it do not
// agree on the plural.
type modernDF struct {
	ImageUsage       *dfItems `json:"ImageUsage"`
	ImagesUsage      *dfItems `json:"ImagesUsage"`
	ContainerUsage   *dfItems `json:"ContainerUsage"`
	ContainersUsage  *dfItems `json:"ContainersUsage"`
	VolumeUsage      *dfItems `json:"VolumeUsage"`
	VolumesUsage     *dfItems `json:"VolumesUsage"`
	BuildCacheUsage  *dfItems `json:"BuildCacheUsage"`
	BuildCachesUsage *dfItems `json:"BuildCachesUsage"`
}

func firstKind(a, b *dfItems) *dfItems {
	if a != nil {
		return a
	}
	return b
}

// UnmarshalJSON reads either shape into the old one, which is what the rest of
// the page works from. The old keys win when they hold anything: an engine that
// sends both has copied one into the other.
func (d *dockerDF) UnmarshalJSON(raw []byte) error {
	type flat dockerDF // no methods, so no recursion
	var f flat
	if err := json.Unmarshal(raw, &f); err != nil {
		return err
	}
	*d = dockerDF(f)

	var m modernDF
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil // the flat read stands
	}
	if img := firstKind(m.ImageUsage, m.ImagesUsage); img != nil && len(d.Images) == 0 {
		if d.LayersSize == 0 {
			d.LayersSize = img.TotalSize
		}
		for _, it := range img.Items {
			d.Images = append(d.Images, struct {
				Size       int64 `json:"Size"`
				SharedSize int64 `json:"SharedSize"`
				Containers int64 `json:"Containers"`
			}{it.Size, it.SharedSize, it.Containers})
		}
	}
	if c := firstKind(m.ContainerUsage, m.ContainersUsage); c != nil && len(d.Containers) == 0 {
		for _, it := range c.Items {
			d.Containers = append(d.Containers, struct {
				SizeRw int64  `json:"SizeRw"`
				State  string `json:"State"`
			}{it.SizeRw, it.State})
		}
	}
	if v := firstKind(m.VolumeUsage, m.VolumesUsage); v != nil && len(d.Volumes) == 0 {
		for _, it := range v.Items {
			d.Volumes = append(d.Volumes, struct {
				UsageData *struct {
					Size     int64 `json:"Size"`
					RefCount int64 `json:"RefCount"`
				} `json:"UsageData"`
			}{it.UsageData})
		}
	}
	if b := firstKind(m.BuildCacheUsage, m.BuildCachesUsage); b != nil && len(d.BuildCache) == 0 {
		for _, it := range b.Items {
			d.BuildCache = append(d.BuildCache, struct {
				Size  int64 `json:"Size"`
				InUse bool  `json:"InUse"`
			}{it.Size, it.InUse})
		}
	}
	return nil
}
