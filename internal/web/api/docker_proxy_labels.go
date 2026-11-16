package api

import (
	"regexp"
	"sort"
	"strings"
)

// The address a reverse proxy puts a container on, read from the labels the two
// proxies that configure themselves from Docker use: Traefik's router rules and
// caddy-docker-proxy's `caddy` label.
//
// This is a guess at where a person reaches the container, nothing more — the
// proxy may not be the one in front of Lastboard, and a rule can be richer than
// the host it names. It feeds the service detector, which shows the address in a
// box the person can change, and never an href that nobody has looked at.

var (
	traefikRule = regexp.MustCompile("Host\\(`([^`]+)`\\)")
	// A host name, optionally with a port: letters, digits, dots and hyphens.
	// No wildcard, no placeholder, no path — whatever else a rule can hold is
	// not an address to open.
	hostName = regexp.MustCompile(`^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(:[0-9]{1,5})?$`)
)

const maxProxyHostLen = 253

func validProxyHost(h string) bool {
	return h != "" && len(h) <= maxProxyHostLen && hostName.MatchString(h)
}

// proxyUrlFromLabels returns https://<host> for the first host a Traefik router
// or a Caddy site names, or "" when there is none it can use.
func proxyUrlFromLabels(labels map[string]string) string {
	keys := make([]string, 0, len(labels))
	for k := range labels {
		keys = append(keys, k)
	}
	sort.Strings(keys) // the same container always gives the same answer

	for _, k := range keys {
		if !strings.HasPrefix(k, "traefik.http.routers.") || !strings.HasSuffix(k, ".rule") {
			continue
		}
		if m := traefikRule.FindStringSubmatch(labels[k]); m != nil && validProxyHost(m[1]) {
			return "https://" + m[1]
		}
	}

	for _, k := range keys {
		if k != "caddy" && !isNumberedCaddy(k) {
			continue
		}
		// A value can list several addresses, separated by spaces or commas.
		for _, addr := range strings.FieldsFunc(labels[k], func(r rune) bool { return r == ' ' || r == ',' }) {
			scheme, host := "https://", addr
			switch {
			case strings.HasPrefix(addr, "https://"):
				host = strings.TrimPrefix(addr, "https://")
			case strings.HasPrefix(addr, "http://"):
				scheme, host = "http://", strings.TrimPrefix(addr, "http://")
			}
			if validProxyHost(host) {
				return scheme + host
			}
		}
	}
	return ""
}

// isNumberedCaddy matches caddy_0, caddy_1 …: how caddy-docker-proxy tells apart
// several site blocks on one container.
func isNumberedCaddy(k string) bool {
	rest, ok := strings.CutPrefix(k, "caddy_")
	if !ok || rest == "" {
		return false
	}
	for _, r := range rest {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
