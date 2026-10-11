package api

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"git.codigosh.com/CodigoSH/Lastboard/internal/web/util"
)

// The three ways a Server Health widget can read another server.
const (
	remoteGlances = "glances"
	remoteNetdata = "netdata"
	remoteCustom  = "custom"
)

// remoteConfig is the part of a Server Health widget's content that says where
// its numbers come from. The credentials are not in it: they live in the
// widget's secret store, under "password" (Glances) and "header_value"
// (custom).
type remoteConfig struct {
	Source   string `json:"source"`
	URL      string `json:"url"`
	Username string `json:"username"`

	// Custom source: where each number sits in the JSON the server returns.
	HeaderName string `json:"header_name"`
	CPUPath    string `json:"cpu_path"`
	RAMPath    string `json:"ram_path"`
	RAMUsed    string `json:"ram_used_path"`
	RAMTotal   string `json:"ram_total_path"`
	TempPath   string `json:"temp_path"`
}

// Why a read failed, in terms the widget can explain.
var (
	errRemoteUnreachable  = errors.New("unreachable")
	errRemoteAuthRequired = errors.New("auth_required")
	errRemoteAuthRejected = errors.New("auth_rejected")
	errRemoteUnsupported  = errors.New("unsupported")
	errRemoteBadURL       = errors.New("invalid_url")
)

const remoteMaxBody = 2 * 1024 * 1024

// A reading is kept for a few seconds per server and credential, so a board
// open in three tabs, or two widgets on one server, ask it once.
const remoteCacheTTL = 3 * time.Second

type remoteCacheEntry struct {
	at    time.Time
	stats RemoteStats
	err   error
}

var (
	remoteCacheMu sync.Mutex
	remoteCache   = map[string]remoteCacheEntry{}
)

func remoteCacheKey(c remoteConfig, secret string) string {
	sum := sha256.Sum256([]byte(secret))
	b, _ := json.Marshal(c)
	return hex.EncodeToString(sum[:8]) + "|" + string(b)
}

// readRemote returns the numbers for one configured server. secret is the
// widget's stored password (Glances) or header value (custom).
func readRemote(ctx context.Context, c remoteConfig, secret string) (RemoteStats, error) {
	base, err := remoteBase(c.URL)
	if err != nil {
		return RemoteStats{}, err
	}
	key := remoteCacheKey(c, secret)
	remoteCacheMu.Lock()
	if e, ok := remoteCache[key]; ok && time.Since(e.at) < remoteCacheTTL {
		remoteCacheMu.Unlock()
		return e.stats, e.err
	}
	remoteCacheMu.Unlock()

	var stats RemoteStats
	switch c.Source {
	case remoteGlances:
		stats, err = readGlances(ctx, base, c.Username, secret)
	case remoteNetdata:
		stats, err = readNetdata(ctx, base)
	case remoteCustom:
		stats, err = readCustom(ctx, base, c, secret)
	default:
		err = errRemoteUnsupported
	}

	remoteCacheMu.Lock()
	if len(remoteCache) > 256 {
		remoteCache = map[string]remoteCacheEntry{}
	}
	remoteCache[key] = remoteCacheEntry{at: time.Now(), stats: stats, err: err}
	remoteCacheMu.Unlock()
	return stats, err
}

// remoteBase validates the address. Pointing at your own network is the
// product; the instance metadata service is not — see util.IsCloudMetadataHost.
func remoteBase(raw string) (string, error) {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Hostname() == "" {
		return "", errRemoteBadURL
	}
	if util.IsCloudMetadataHost(u.Hostname()) {
		return "", errRemoteBadURL
	}
	u.RawQuery, u.Fragment = "", ""
	return strings.TrimRight(u.String(), "/"), nil
}

type remoteReply struct {
	status int
	body   []byte
}

func remoteGet(ctx context.Context, target string, setup func(*http.Request)) (remoteReply, error) {
	ctx, cancel := context.WithTimeout(ctx, 6*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return remoteReply{}, errRemoteBadURL
	}
	req.Header.Set("Accept", "application/json")
	if setup != nil {
		setup(req)
	}
	resp, err := apiWidgetClient.Do(req)
	if err != nil {
		return remoteReply{}, errRemoteUnreachable
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, remoteMaxBody))
	if err != nil {
		return remoteReply{}, errRemoteUnreachable
	}
	return remoteReply{status: resp.StatusCode, body: body}, nil
}

// readGlances tries the current API (4) and falls back to the previous one (3),
// which a server still on Glances 3 answers with a 404 for /api/4. The
// credentials are sent with Basic auth when a password is stored; the user name
// defaults to "glances", which is what Glances itself uses.
func readGlances(ctx context.Context, base, user, password string) (RemoteStats, error) {
	if user == "" {
		user = "glances"
	}
	setup := func(r *http.Request) {
		if password != "" {
			r.SetBasicAuth(user, password)
		}
	}
	for _, version := range []string{"4", "3"} {
		root := fmt.Sprintf("%s/api/%s", base, version)
		quick, err := remoteGet(ctx, root+"/quicklook", setup)
		if err != nil {
			return RemoteStats{}, err
		}
		switch {
		case quick.status == http.StatusNotFound && version == "4":
			continue
		case quick.status == http.StatusUnauthorized && password == "":
			return RemoteStats{}, errRemoteAuthRequired
		case quick.status == http.StatusUnauthorized, quick.status == http.StatusForbidden:
			return RemoteStats{}, errRemoteAuthRejected
		case quick.status != http.StatusOK:
			return RemoteStats{}, errRemoteUnsupported
		}
		cpu, mem, ok := parseGlancesQuicklook(quick.body)
		if !ok {
			return RemoteStats{}, errRemoteUnsupported
		}
		out := RemoteStats{CPU: cpu, RAM: mem, Source: remoteGlances, Version: version}
		// Sensors are optional: a server may not run the plugin, or have none.
		if sensors, err := remoteGet(ctx, root+"/sensors", setup); err == nil && sensors.status == http.StatusOK {
			out.Temp = parseGlancesSensors(sensors.body)
		}
		return out, nil
	}
	return RemoteStats{}, errRemoteUnsupported
}

func readNetdata(ctx context.Context, base string) (RemoteStats, error) {
	r, err := remoteGet(ctx, base+"/api/v1/allmetrics?format=json", nil)
	if err != nil {
		return RemoteStats{}, err
	}
	switch {
	case r.status == http.StatusUnauthorized, r.status == http.StatusForbidden:
		return RemoteStats{}, errRemoteAuthRejected
	case r.status != http.StatusOK:
		return RemoteStats{}, errRemoteUnsupported
	}
	stats, ok := parseNetdataAllmetrics(r.body)
	if !ok {
		return RemoteStats{}, errRemoteUnsupported
	}
	stats.Source = remoteNetdata
	return stats, nil
}

// readCustom reads any JSON endpoint: the user says where each number is. RAM
// is either one percentage, or used and total (in whatever unit, as long as it
// is the same for both).
func readCustom(ctx context.Context, base string, c remoteConfig, secret string) (RemoteStats, error) {
	r, err := remoteGet(ctx, base, func(req *http.Request) {
		if c.HeaderName != "" && secret != "" && !util.IsForbiddenOutboundHeader(c.HeaderName) {
			req.Header.Set(c.HeaderName, secret)
		}
	})
	if err != nil {
		return RemoteStats{}, err
	}
	switch {
	case r.status == http.StatusUnauthorized, r.status == http.StatusForbidden:
		return RemoteStats{}, errRemoteAuthRejected
	case r.status != http.StatusOK:
		return RemoteStats{}, errRemoteUnsupported
	}
	var data any
	if json.Unmarshal(r.body, &data) != nil {
		return RemoteStats{}, errRemoteUnsupported
	}
	num := func(path string) (float64, bool) {
		if strings.TrimSpace(path) == "" {
			return 0, false
		}
		switch v := extractPath(data, strings.TrimSpace(path)).(type) {
		case float64:
			return v, true
		case string:
			var f float64
			if _, err := fmt.Sscanf(strings.TrimSpace(strings.TrimSuffix(v, "%")), "%g", &f); err == nil {
				return f, true
			}
		}
		return 0, false
	}
	out := RemoteStats{Source: remoteCustom}
	if v, ok := num(c.CPUPath); ok {
		out.CPU = pct(v)
	}
	if v, ok := num(c.RAMPath); ok {
		out.RAM = pct(v)
	} else if used, ok := num(c.RAMUsed); ok {
		if total, ok := num(c.RAMTotal); ok && total > 0 {
			out.RAM = pct(used / total * 100)
		}
	}
	if v, ok := num(c.TempPath); ok && v > 0 {
		out.Temp = round1(v)
	}
	if out.CPU == nil && out.RAM == nil && out.Temp == nil {
		return RemoteStats{}, errRemoteUnsupported
	}
	return out, nil
}
