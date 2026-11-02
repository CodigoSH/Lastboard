package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

/*
How much disk Docker uses.

Docker cannot say how much disk the host has — that is the operating system's —
only how much of it Docker itself holds: its images, what the containers wrote,
its volumes and the build cache, and how much of each nothing uses any more.
That last figure is the useful one: it is what a prune would give back.

The answer is Docker's /system/df. On a host with a lot of data it takes
seconds, so it is asked for rarely, and with a longer patience than the lists.
*/

// DockerUsage is one kind of thing Docker keeps on disk.
type DockerUsage struct {
	Count       int   `json:"count"`
	Size        int64 `json:"size"`
	Reclaimable int64 `json:"reclaimable"`
}

// DockerDisk is what Docker holds on a host. Available is false for a Lastboard
// Agent from before the call existed: the figures are an extra, not an error.
type DockerDisk struct {
	Available   bool        `json:"available"`
	Images      DockerUsage `json:"images"`
	Containers  DockerUsage `json:"containers"`
	Volumes     DockerUsage `json:"volumes"`
	Cache       DockerUsage `json:"cache"`
	Total       int64       `json:"total"`
	Reclaimable int64       `json:"reclaimable"`
}

// dockerDiskWait is how long the daemon is given to measure what it holds.
const dockerDiskWait = 60 * time.Second

// dockerDF is the part of /system/df that is read. Sizes of -1 mean the daemon
// did not measure that one.
type dockerDF struct {
	LayersSize int64 `json:"LayersSize"`
	Images     []struct {
		Size       int64 `json:"Size"`
		SharedSize int64 `json:"SharedSize"`
		Containers int64 `json:"Containers"`
	} `json:"Images"`
	Containers []struct {
		SizeRw int64  `json:"SizeRw"`
		State  string `json:"State"`
	} `json:"Containers"`
	Volumes []struct {
		UsageData *struct {
			Size     int64 `json:"Size"`
			RefCount int64 `json:"RefCount"`
		} `json:"UsageData"`
	} `json:"Volumes"`
	BuildCache []struct {
		Size  int64 `json:"Size"`
		InUse bool  `json:"InUse"`
	} `json:"BuildCache"`
}

func atLeastZero(n int64) int64 {
	if n < 0 {
		return 0
	}
	return n
}

// summariseDisk turns the daemon's account into the totals the page shows.
//
// What is reclaimable follows what a prune would remove: images no container
// uses (without the layers other images share), what stopped containers wrote,
// volumes nothing refers to, and cache records not in use.
func summariseDisk(df dockerDF) DockerDisk {
	d := DockerDisk{Available: true}

	d.Images.Count = len(df.Images)
	var imagesSum int64
	for _, im := range df.Images {
		imagesSum += atLeastZero(im.Size)
		if im.Containers == 0 {
			d.Images.Reclaimable += atLeastZero(im.Size) - atLeastZero(im.SharedSize)
		}
	}
	// The layers are counted once however many images share them; the sum of the
	// images counts a shared layer for each.
	d.Images.Size = atLeastZero(df.LayersSize)
	if d.Images.Size == 0 {
		d.Images.Size = imagesSum
	}
	if d.Images.Reclaimable < 0 {
		d.Images.Reclaimable = 0
	}
	if d.Images.Reclaimable > d.Images.Size {
		d.Images.Reclaimable = d.Images.Size
	}

	d.Containers.Count = len(df.Containers)
	for _, c := range df.Containers {
		d.Containers.Size += atLeastZero(c.SizeRw)
		if c.State != "running" && c.State != "restarting" && c.State != "paused" {
			d.Containers.Reclaimable += atLeastZero(c.SizeRw)
		}
	}

	d.Volumes.Count = len(df.Volumes)
	for _, v := range df.Volumes {
		if v.UsageData == nil {
			continue
		}
		d.Volumes.Size += atLeastZero(v.UsageData.Size)
		if v.UsageData.RefCount == 0 {
			d.Volumes.Reclaimable += atLeastZero(v.UsageData.Size)
		}
	}

	d.Cache.Count = len(df.BuildCache)
	for _, b := range df.BuildCache {
		d.Cache.Size += atLeastZero(b.Size)
		if !b.InUse {
			d.Cache.Reclaimable += atLeastZero(b.Size)
		}
	}

	for _, u := range []DockerUsage{d.Images, d.Containers, d.Volumes, d.Cache} {
		d.Total += u.Size
		d.Reclaimable += u.Reclaimable
	}
	return d
}

// DiskUsage reads how much disk the host at hostURL's Docker uses.
func DiskUsage(hostURL string) (DockerDisk, error) {
	client, base, err := newDockerClient(hostURL)
	if err != nil {
		return DockerDisk{}, fmt.Errorf("docker: build client: %w", err)
	}
	// A copy of the client, not the shared one: only this call is given the
	// time to measure a large host.
	slow := *client
	slow.Timeout = dockerDiskWait
	resp, err := slow.Get(base + "/system/df")
	if err != nil {
		return DockerDisk{}, fmt.Errorf("docker: GET system/df: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return DockerDisk{}, readError(hostURL, "system/df", resp)
	}
	var raw dockerDF
	if err := decodeLimited(resp.Body, dockerMaxAnswer, &raw); err != nil {
		return DockerDisk{}, fmt.Errorf("docker: decode system/df: %w", err)
	}
	return summariseDisk(raw), nil
}

// POST /api/docker/disk-usage — Body: { "host_id": string }
//
// What Docker holds on that host. An agent from before the call is answered
// with available:false and no figures, never with an error the page would have
// to explain.
func (h *DockerHandler) DiskUsage(w http.ResponseWriter, r *http.Request) {
	q, ok := readDockerQuery(w, r)
	if !ok {
		return
	}
	e, ok := h.hostOf(w, r, q.HostID)
	if !ok {
		return
	}
	d, err := DiskUsage(e.address())
	if errors.Is(err, errAgentTooOld) {
		d, err = DockerDisk{}, nil
	}
	if err != nil {
		writeReadError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(d)
}
