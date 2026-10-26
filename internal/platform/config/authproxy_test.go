package config

import (
	"net/netip"
	"strings"
	"testing"
)

func TestSigningInThroughAProxyIsOffUnlessItIsFullySet(t *testing.T) {
	for name, vars := range map[string]map[string]string{
		"nothing set":              {},
		"no header":                {"AUTH_PROXY_TRUSTED": "10.0.0.2"},
		"no trusted addresses":     {"AUTH_PROXY_HEADER": "Remote-User"},
		"only unusable trusted":    {"AUTH_PROXY_HEADER": "Remote-User", "AUTH_PROXY_TRUSTED": "proxy.lan, 10.0.0.300"},
		"a header that is not one": {"AUTH_PROXY_HEADER": "Remote User", "AUTH_PROXY_TRUSTED": "10.0.0.2"},
	} {
		p, _ := ReadAuthProxy(env(vars))
		if p.Enabled() {
			t.Errorf("%s: signing in through a proxy is on", name)
		}
	}
	// Whatever was set and unusable is reported, so it does not look set.
	_, problems := ReadAuthProxy(env(map[string]string{"AUTH_PROXY_HEADER": "Remote-User"}))
	if len(problems) == 0 || !strings.Contains(problems[0].Effect, "stays off") {
		t.Errorf("a header with no trusted proxy was not reported: %v", problems)
	}
}

func TestOnlyTheProxysAddressesAreTrusted(t *testing.T) {
	p, problems := ReadAuthProxy(env(map[string]string{
		"AUTH_PROXY_HEADER":     "Remote-User",
		"AUTH_PROXY_TRUSTED":    "10.0.0.2, 172.18.0.0/16, fd00::5, nonsense",
		"AUTH_PROXY_LOGOUT_URL": "https://auth.example.lan/logout",
	}))
	if !p.Enabled() || p.LogoutURL != "https://auth.example.lan/logout" {
		t.Fatalf("read as %+v", p)
	}
	if len(problems) != 1 || problems[0].Value != "nonsense" {
		t.Errorf("the unusable entry was not the one reported: %v", problems)
	}
	for addr, want := range map[string]bool{
		"10.0.0.2": true, "10.0.0.3": false,
		"172.18.4.9": true, "172.19.0.1": false,
		"fd00::5": true, "fd00::6": false,
		"::ffff:10.0.0.2": true, // the same address, as an IPv6 socket reports it
		"127.0.0.1":       false,
	} {
		if got := p.Trusts(netip.MustParseAddr(addr)); got != want {
			t.Errorf("Trusts(%s) = %v, want %v", addr, got, want)
		}
	}
}

func TestALogoutAddressMustBeOne(t *testing.T) {
	for _, bad := range []string{"javascript:alert(1)", "/logout", "auth.example.lan/logout"} {
		p, problems := ReadAuthProxy(env(map[string]string{
			"AUTH_PROXY_HEADER": "Remote-User", "AUTH_PROXY_TRUSTED": "10.0.0.2", "AUTH_PROXY_LOGOUT_URL": bad,
		}))
		if p.LogoutURL != "" || len(problems) != 1 {
			t.Errorf("%q: kept as %q, problems %v", bad, p.LogoutURL, problems)
		}
	}
}

// A header alone is never on, however the setting was built: the header would
// be believed from anybody.
func TestAHeaderWithoutTrustedAddressesIsNeverOn(t *testing.T) {
	if (AuthProxy{Header: "Remote-User"}).Enabled() {
		t.Error("a header with no trusted addresses is on")
	}
}
