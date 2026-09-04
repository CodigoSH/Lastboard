package util

import (
	"net"
	"strings"
)

// IsCloudMetadataHost reports whether a host is a cloud instance's metadata
// service.
//
// Lastboard deliberately lets people point at their own network — a NAS on
// 192.168.1.x, Pi-hole on a loopback port — because that is the product, and
// the operator owns the network an "attacker" would reach. These addresses are
// the exception that costs nothing to close: they are not a service anybody
// self-hosts, they answer only from inside a cloud instance, and what they
// answer with is that instance's credentials.
func IsCloudMetadataHost(host string) bool {
	host = strings.ToLower(strings.TrimSpace(host))
	host = strings.TrimSuffix(host, ".")
	// Strip brackets from an IPv6 literal.
	host = strings.TrimSuffix(strings.TrimPrefix(host, "["), "]")

	switch host {
	case "169.254.169.254", // AWS, Azure, GCP, OpenStack, DigitalOcean
		"169.254.170.2",   // AWS ECS task metadata
		"100.100.100.200", // Alibaba Cloud
		"192.0.0.192",     // Oracle Cloud
		"fd00:ec2::254",   // AWS IMDS over IPv6
		"metadata.google.internal",
		"metadata.goog":
		return true
	}
	// Anything under the Google metadata name, and the IPv6 form of the AWS one
	// however it was written.
	if strings.HasSuffix(host, ".metadata.google.internal") {
		return true
	}
	if ip := net.ParseIP(host); ip != nil {
		for _, known := range []string{"169.254.169.254", "169.254.170.2", "fd00:ec2::254"} {
			if ip.Equal(net.ParseIP(known)) {
				return true
			}
		}
	}
	return false
}

// forbiddenOutboundHeaders are the request headers a user may not put on a
// fetch the server makes on their behalf.
//
// The API widget forwards headers so it can carry an API key, which is the
// whole point of it. These are the ones that say who the request is from
// rather than what it wants: forwarded to a service that trusts the server's
// position on the network, they let the caller wear an identity that is not
// theirs. The hop-by-hop ones are the transport's to decide, not a user's.
var forbiddenOutboundHeaders = map[string]bool{
	"cookie":              true,
	"set-cookie":          true,
	"host":                true,
	"forwarded":           true,
	"x-forwarded-for":     true,
	"x-forwarded-host":    true,
	"x-forwarded-proto":   true,
	"x-real-ip":           true,
	"proxy-authorization": true,
	"proxy-authenticate":  true,
	"connection":          true,
	"keep-alive":          true,
	"upgrade":             true,
	"te":                  true,
	"trailer":             true,
	"transfer-encoding":   true,
	"content-length":      true,
}

// IsForbiddenOutboundHeader reports whether a header must not be copied onto a
// request the server makes for a user.
func IsForbiddenOutboundHeader(name string) bool {
	return forbiddenOutboundHeaders[strings.ToLower(strings.TrimSpace(name))]
}
