package util

import "testing"

// Reaching your own network is the product — a NAS on 192.168.1.x, Pi-hole on
// loopback — so this deliberately blocks nothing but the metadata services.
// Getting that distinction wrong in either direction is expensive: too wide and
// the dashboard stops working, too narrow and an instance hands out its own
// credentials.
func TestIsCloudMetadataHost(t *testing.T) {
	blocked := []string{
		"169.254.169.254",
		"169.254.170.2",
		"100.100.100.200",
		"192.0.0.192",
		"metadata.google.internal",
		"METADATA.GOOGLE.INTERNAL",
		"metadata.google.internal.", // trailing dot resolves the same
		"fd00:ec2::254",
		"[fd00:ec2::254]", // as written in a URL
		"  169.254.169.254  ",
	}
	for _, host := range blocked {
		if !IsCloudMetadataHost(host) {
			t.Errorf("%q reaches the metadata service and was allowed", host)
		}
	}

	allowed := []string{
		"192.168.1.50", "10.0.0.1", "172.16.3.4", "127.0.0.1", "localhost",
		"nas.lan", "::1", "169.254.1.1", // link-local, but not the metadata address
		"grafana.example.com", "100.100.100.201",
	}
	for _, host := range allowed {
		if IsCloudMetadataHost(host) {
			t.Errorf("%q is somebody's own service and was blocked", host)
		}
	}
}

// The API widget forwards headers so it can carry an API key. These are the
// ones that say who the request is from rather than what it wants.
func TestIsForbiddenOutboundHeader(t *testing.T) {
	for _, name := range []string{"Cookie", "cookie", "X-Forwarded-For", "x-forwarded-host", "Host", "Connection", " Set-Cookie "} {
		if !IsForbiddenOutboundHeader(name) {
			t.Errorf("%q would be forwarded", name)
		}
	}
	// Everything the presets and the advanced mode actually need.
	for _, name := range []string{"Authorization", "X-Api-Key", "x-api-key", "X-Emby-Token", "OCS-APIRequest", "Accept", "Content-Type", "X-Plex-Token"} {
		if IsForbiddenOutboundHeader(name) {
			t.Errorf("%q is needed by a preset or by advanced mode and was dropped", name)
		}
	}
}
