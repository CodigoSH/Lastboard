package config

import (
	"net/netip"
	"net/url"
	"strings"
)

// AuthProxy is signing in through a proxy that has already signed the person
// in — Authelia, Authentik, oauth2-proxy and the like — and says who it is in a
// header.
//
// It is off unless the operator turns it on, and it believes the header only
// from the proxy's own addresses: anybody else can send any header they like.
// The address that counts is the one that opened the connection, never
// X-Forwarded-For, which is written by whoever is calling.
type AuthProxy struct {
	// Header names the account, by its user name.
	Header string
	// Trusted are the proxy's addresses or networks.
	Trusted []netip.Prefix
	// LogoutURL is where signing out sends the person, so the proxy forgets
	// them too; without it the proxy signs them straight back in.
	LogoutURL string
}

// Enabled says whether signing in through the proxy is on.
func (p AuthProxy) Enabled() bool { return p.Header != "" && len(p.Trusted) > 0 }

// Trusts says whether a connection from addr comes from the proxy.
func (p AuthProxy) Trusts(addr netip.Addr) bool {
	addr = addr.Unmap()
	for _, prefix := range p.Trusted {
		if prefix.Contains(addr) {
			return true
		}
	}
	return false
}

// validHeaderName is the characters a header name may have (RFC 9110 token).
func validHeaderName(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if !(r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || strings.ContainsRune("!#$%&'*+-.^_`|~", r)) {
			return false
		}
	}
	return true
}

// ReadAuthProxy reads the three settings and reports what cannot be used. A
// setting that cannot be read leaves signing in through the proxy off rather
// than half on.
func ReadAuthProxy(lookup func(string) (string, bool)) (AuthProxy, []Problem) {
	var (
		p        AuthProxy
		problems []Problem
	)
	report := func(variable, value, reason, effect string) {
		problems = append(problems, Problem{variable, value, reason, effect})
	}

	header, _ := lookup("AUTH_PROXY_HEADER")
	header = strings.TrimSpace(header)
	trusted, _ := lookup("AUTH_PROXY_TRUSTED")
	logout, _ := lookup("AUTH_PROXY_LOGOUT_URL")

	if header == "" {
		if strings.TrimSpace(trusted) != "" {
			report("AUTH_PROXY_TRUSTED", trusted, "is set without AUTH_PROXY_HEADER", "signing in through a proxy stays off")
		}
		return AuthProxy{}, problems
	}
	if !validHeaderName(header) {
		report("AUTH_PROXY_HEADER", header, "is not a header name", "signing in through a proxy stays off")
		return AuthProxy{}, problems
	}

	for _, entry := range strings.Split(trusted, ",") {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		if prefix, err := netip.ParsePrefix(entry); err == nil {
			p.Trusted = append(p.Trusted, prefix.Masked())
			continue
		}
		if addr, err := netip.ParseAddr(entry); err == nil {
			addr = addr.Unmap()
			p.Trusted = append(p.Trusted, netip.PrefixFrom(addr, addr.BitLen()))
			continue
		}
		report("AUTH_PROXY_TRUSTED", entry, "is not an address or a network", "it is left out")
	}
	if len(p.Trusted) == 0 {
		report("AUTH_PROXY_HEADER", header, "is set without a usable AUTH_PROXY_TRUSTED", "signing in through a proxy stays off: the header would be believed from anybody")
		return AuthProxy{}, problems
	}
	p.Header = header

	if logout = strings.TrimSpace(logout); logout != "" {
		if u, err := url.Parse(logout); err == nil && (u.Scheme == "https" || u.Scheme == "http") && u.Host != "" {
			p.LogoutURL = logout
		} else {
			report("AUTH_PROXY_LOGOUT_URL", logout, "is not an http or https address", "signing out will not sign out of the proxy")
		}
	}
	return p, problems
}
