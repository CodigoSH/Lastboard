package util

import (
	"context"
	"errors"
	"net"
	"strings"
	"syscall"
	"time"
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

// ErrMetadataAddress is what a connection to a cloud metadata service fails with.
var ErrMetadataAddress = errors.New("refused: that address is a cloud metadata service")

// refuseMetadata is a net.Dialer's Control: it runs once the name has been
// resolved, with the address about to be connected to, and can still say no.
//
// That is the only place the block holds. A check on the URL's host sees what
// the URL says; a redirect, or a name that resolves to the address, says
// something else. A unix socket has no host, and is let through.
func refuseMetadata(network, address string, _ syscall.RawConn) error {
	host, _, err := net.SplitHostPort(address)
	if err != nil {
		return nil
	}
	if IsCloudMetadataHost(host) {
		return ErrMetadataAddress
	}
	return nil
}

// ErrLocalAddress is what a connection to the local network fails with when the
// account it is made for may only reach the internet.
var ErrLocalAddress = errors.New("refused: that address is on the local network")

type internetOnlyKey struct{}

// InternetOnly marks a context whose outbound connections may not reach the
// local network: the account the request is made for was not given it. The
// mark travels with the request into the dialer, which is where it is enforced,
// after the name has been resolved — so neither a redirect nor a name that
// resolves to a private address gets past it.
func InternetOnly(ctx context.Context) context.Context {
	return context.WithValue(ctx, internetOnlyKey{}, true)
}

// IsInternetOnly reports whether a context carries that mark.
func IsInternetOnly(ctx context.Context) bool {
	v, _ := ctx.Value(internetOnlyKey{}).(bool)
	return v
}

// IsLocalAddress reports whether an address is on this machine or its network
// rather than on the internet: loopback, the private ranges, link-local, the
// unique-local IPv6 range, carrier-grade NAT and the unspecified address.
func IsLocalAddress(ip net.IP) bool {
	if ip == nil {
		return true
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsInterfaceLocalMulticast() || ip.IsUnspecified() {
		return true
	}
	// 100.64.0.0/10: shared address space, which is what a tailnet hands out.
	if v4 := ip.To4(); v4 != nil && v4[0] == 100 && v4[1]&0xc0 == 64 {
		return true
	}
	return false
}

// control decides, with the address about to be connected to, whether this
// connection may be made at all.
func control(ctx context.Context, network, address string, c syscall.RawConn) error {
	if err := refuseMetadata(network, address, c); err != nil {
		return err
	}
	if !IsInternetOnly(ctx) {
		return nil
	}
	// A unix socket is this machine by definition.
	if strings.HasPrefix(network, "unix") {
		return ErrLocalAddress
	}
	host, _, err := net.SplitHostPort(address)
	if err != nil || IsLocalAddress(net.ParseIP(host)) {
		return ErrLocalAddress
	}
	return nil
}

// NewDialer is the one way this program opens an outbound connection. Everything
// else about where it may connect is the administrator's business — the machine
// next door is the point of a dashboard — but the metadata service of the cloud
// it runs on answers with the instance's credentials, and no URL typed into a
// widget has a reason to reach it. Nor may a connection made for an account that
// was only given the internet reach the local network: see InternetOnly. A test
// reads the source to keep it the only way.
func NewDialer(timeout, keepAlive time.Duration) *net.Dialer {
	return &net.Dialer{Timeout: timeout, KeepAlive: keepAlive, ControlContext: control}
}
