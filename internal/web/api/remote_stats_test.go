package api

import (
	"os"
	"path/filepath"
	"testing"
)

func telemetryFixture(t *testing.T, name string) []byte {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("testdata", "telemetry", name))
	if err != nil {
		t.Fatal(err)
	}
	return b
}

func near(t *testing.T, what string, got *float64, want float64) {
	t.Helper()
	if got == nil {
		t.Fatalf("%s: got nil, want %v", what, want)
	}
	if *got < want-0.051 || *got > want+0.051 {
		t.Fatalf("%s: got %v, want %v", what, *got, want)
	}
}

func TestGlancesQuicklookReadsBothMajorVersions(t *testing.T) {
	for _, f := range []string{"glances4_quicklook.json", "glances3_quicklook.json"} {
		cpu, mem, ok := parseGlancesQuicklook(telemetryFixture(t, f))
		if !ok || cpu == nil {
			t.Fatalf("%s: not read", f)
		}
		near(t, f+" mem", mem, 23.0)
	}
	if _, _, ok := parseGlancesQuicklook([]byte(`{"cpu": 3}`)); ok {
		t.Fatal("a quicklook without memory must not read as complete")
	}
	if _, _, ok := parseGlancesQuicklook([]byte(`<html>`)); ok {
		t.Fatal("garbage read as stats")
	}
}

// The fixture is a real host with an NVMe "Composite" at 44 and cores at
// 44–48. The disk must not stand for the processor, and the batteries listed in
// the same endpoint must not be read as temperatures.
func TestGlancesSensorsPickTheProcessorNotTheDisk(t *testing.T) {
	near(t, "glances 4", parseGlancesSensors(telemetryFixture(t, "glances4_sensors.json")), 51)
	near(t, "glances 3", parseGlancesSensors(telemetryFixture(t, "glances3_sensors.json")), 51)
}

func TestGlancesSensorsEdgeCases(t *testing.T) {
	if parseGlancesSensors([]byte(`[{"label":"BAT0","unit":"%","value":80,"type":"battery"}]`)) != nil {
		t.Fatal("a battery was read as a temperature")
	}
	if parseGlancesSensors([]byte(`[{"label":"Core 0","unit":"C","value":null,"type":"temperature_core"},{"label":"Core 1","unit":"C","value":"n/a","type":"temperature_core"}]`)) != nil {
		t.Fatal("unreadable sensors were read as numbers")
	}
	near(t, "fahrenheit", parseGlancesSensors([]byte(`[{"label":"Package id 0","unit":"F","value":122,"type":"temperature_core"}]`)), 50)
	near(t, "package beats a hotter core", parseGlancesSensors([]byte(`[{"label":"Core 0","unit":"C","value":80,"type":"temperature_core"},{"label":"Package id 0","unit":"C","value":60,"type":"temperature_core"}]`)), 60)
	near(t, "amd tctl", parseGlancesSensors([]byte(`[{"label":"Tctl","unit":"C","value":55,"type":"temperature_core"},{"label":"Composite","unit":"C","value":70,"type":"temperature_core"}]`)), 55)
	near(t, "raspberry pi", parseGlancesSensors([]byte(`[{"label":"cpu_thermal 0","unit":"C","value":51,"type":"temperature_core"}]`)), 51)
	if parseGlancesSensors([]byte(`[{"label":"Composite","unit":"C","value":44,"type":"temperature_core"}]`)) != nil {
		t.Fatal("a lone disk sensor stood for the processor")
	}
}

func TestNetdataBothMajorVersions(t *testing.T) {
	v2, ok := parseNetdataAllmetrics(telemetryFixture(t, "netdata2_allmetrics.json"))
	if !ok {
		t.Fatal("netdata 2 not read")
	}
	near(t, "v2 cpu", v2.CPU, 6.96) // 100 - idle(93.04)
	near(t, "v2 ram", v2.RAM, 22.0) // used / (free+used+cached+buffers)
	near(t, "v2 temp", v2.Temp, 51) // Package id, not the hottest core, not the disk

	v1, ok := parseNetdataAllmetrics(telemetryFixture(t, "netdata1_allmetrics.json"))
	if !ok {
		t.Fatal("netdata 1 not read")
	}
	near(t, "v1 cpu", v1.CPU, 4.87)
	if v1.Temp != nil {
		t.Fatal("a host without sensors reported a temperature")
	}
}

func TestNetdataNotNetdata(t *testing.T) {
	if _, ok := parseNetdataAllmetrics([]byte(`{"foo": {}}`)); ok {
		t.Fatal("a JSON without the system charts read as Netdata")
	}
}
