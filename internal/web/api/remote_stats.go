package api

import (
	"encoding/json"
	"math"
	"strings"
)

// RemoteStats is what the Server Health widget shows for a server other than
// the one Lastboard runs on. A metric the source does not provide is nil, which
// the widget draws as a grey ring: "no temperature sensor" is not "0 degrees".
type RemoteStats struct {
	CPU     *float64 `json:"cpu,omitempty"`
	RAM     *float64 `json:"ram,omitempty"`
	Temp    *float64 `json:"temp,omitempty"`
	Source  string   `json:"source,omitempty"`
	Version string   `json:"version,omitempty"`
}

func pct(v float64) *float64 {
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return nil
	}
	v = math.Max(0, math.Min(100, v))
	v = math.Round(v*10) / 10
	return &v
}

func round1(v float64) *float64 {
	v = math.Round(v*10) / 10
	return &v
}

// tempCandidate is one temperature reading and the name its source gives it.
type tempCandidate struct {
	name  string
	value float64
}

// pickCPUTemperature chooses the reading that stands for "the processor".
//
// A host reports many sensors: package and core temperatures, but also the NVMe
// drive, the ACPI zone, the Wi-Fi card and the battery. Taking the first or the
// hottest would label a disk as the CPU. The package reading is the one
// everybody means; failing that the hottest core; failing that the hottest
// reading that is not obviously something else. Nothing plausible is nil.
func pickCPUTemperature(c []tempCandidate) *float64 {
	var pkg, core, other *float64
	bump := func(dst **float64, v float64) {
		if *dst == nil || v > **dst {
			x := v
			*dst = &x
		}
	}
	for _, t := range c {
		if math.IsNaN(t.value) || math.IsInf(t.value, 0) || t.value <= 0 || t.value > 150 {
			continue
		}
		n := strings.ToLower(t.name)
		switch {
		case containsAny(n, "nvme", "composite", "acpitz", "acpi", "wifi", "iwlwifi", "battery", "bat ", "gpu", "amdgpu", "nouveau", "drivetemp", "sensor 1", "sensor 2"):
			continue
		case containsAny(n, "package", "tctl", "tdie", "cpu_thermal", "cpu-thermal", "cpu thermal", "x86_pkg_temp", "soc_thermal"):
			bump(&pkg, t.value)
		case strings.Contains(n, "core"), strings.Contains(n, "cpu"):
			bump(&core, t.value)
		default:
			bump(&other, t.value)
		}
	}
	switch {
	case pkg != nil:
		return round1(*pkg)
	case core != nil:
		return round1(*core)
	case other != nil:
		return round1(*other)
	}
	return nil
}

func containsAny(s string, subs ...string) bool {
	for _, x := range subs {
		if strings.Contains(s, x) {
			return true
		}
	}
	return false
}

// glancesQuicklook reads CPU and memory from /api/N/quicklook, which both
// Glances 3 and 4 serve with the same two fields.
func parseGlancesQuicklook(body []byte) (cpu, mem *float64, ok bool) {
	var q struct {
		CPU *float64 `json:"cpu"`
		Mem *float64 `json:"mem"`
	}
	if json.Unmarshal(body, &q) != nil || q.CPU == nil || q.Mem == nil {
		return nil, nil, false
	}
	return pct(*q.CPU), pct(*q.Mem), true
}

// parseGlancesSensors turns /api/N/sensors into the processor temperature. Only
// temperature entries count (the same list carries batteries, as percentages),
// and a reading that is not a number — Glances sends null or a string for a
// sensor it cannot read — is skipped rather than read as zero.
func parseGlancesSensors(body []byte) *float64 {
	var raw []struct {
		Label string `json:"label"`
		Unit  string `json:"unit"`
		Value any    `json:"value"`
		Type  string `json:"type"`
	}
	if json.Unmarshal(body, &raw) != nil {
		return nil
	}
	var cands []tempCandidate
	for _, s := range raw {
		if !strings.HasPrefix(s.Type, "temperature") {
			continue
		}
		v, ok := s.Value.(float64)
		if !ok {
			continue
		}
		if strings.EqualFold(s.Unit, "F") {
			v = (v - 32) * 5 / 9
		}
		cands = append(cands, tempCandidate{name: s.Label, value: v})
	}
	return pickCPUTemperature(cands)
}

// parseNetdataAllmetrics reads Netdata's /api/v1/allmetrics?format=json, which
// Netdata 1.x and 2.x both serve. CPU is 100 minus idle: the chart's
// dimensions are the *shares* of each mode, so summing them all (what a first
// reading suggests) counts idle time as load. RAM is used over used + free +
// cached + buffers, which is how Netdata itself draws the chart.
func parseNetdataAllmetrics(body []byte) (RemoteStats, bool) {
	var all map[string]struct {
		Dimensions map[string]struct {
			Value *float64 `json:"value"`
		} `json:"dimensions"`
	}
	if json.Unmarshal(body, &all) != nil {
		return RemoteStats{}, false
	}
	var out RemoteStats
	found := false

	if cpu, ok := all["system.cpu"]; ok {
		if idle := cpu.Dimensions["idle"].Value; idle != nil {
			out.CPU = pct(100 - *idle)
			found = true
		}
	}
	if ram, ok := all["system.ram"]; ok {
		used, free, cached, buffers := ram.Dimensions["used"].Value, ram.Dimensions["free"].Value, ram.Dimensions["cached"].Value, ram.Dimensions["buffers"].Value
		if used != nil && free != nil {
			total := *used + *free
			if cached != nil {
				total += *cached
			}
			if buffers != nil {
				total += *buffers
			}
			if total > 0 {
				out.RAM = pct(*used / total * 100)
				found = true
			}
		}
	}

	var cands []tempCandidate
	for key, chart := range all {
		if !strings.HasPrefix(key, "sensors.temperature_") {
			continue
		}
		if v := chart.Dimensions["input"].Value; v != nil {
			cands = append(cands, tempCandidate{name: strings.TrimPrefix(key, "sensors.temperature_"), value: *v})
		}
	}
	out.Temp = pickCPUTemperature(cands)
	return out, found
}
