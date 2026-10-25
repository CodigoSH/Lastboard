package util

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"
)

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

// The block on cloud metadata used to read the host out of the URL. A URL can
// say anything: a redirect, or a name that resolves to the address, gets past a
// check on the text. The check that cannot be argued with is the one made on the
// address actually being connected to, which is what the dialer does.
func TestTheDialerRefusesCloudMetadataAddressesWhateverGotItThere(t *testing.T) {
	d := NewDialer(500*time.Millisecond, 0)
	for _, addr := range []string{
		"169.254.169.254:80",
		"169.254.170.2:80",
		"[::ffff:169.254.169.254]:80", // the same address written as IPv6
		"[fd00:ec2::254]:80",
		"100.100.100.200:80",
	} {
		start := time.Now()
		_, err := d.DialContext(context.Background(), "tcp", addr)
		if !errors.Is(err, ErrMetadataAddress) {
			t.Errorf("%s: err = %v, want the metadata refusal", addr, err)
		}
		// The control: a dial that was merely attempted would sit out the timeout.
		if time.Since(start) > 400*time.Millisecond {
			t.Errorf("%s: took %v, so it was attempted, not refused", addr, time.Since(start))
		}
	}
}

// Everything else is still reachable: pointing a dashboard at the machine next
// to it is the product.
func TestTheDialerStillReachesTheLocalNetwork(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer srv.Close()
	conn, err := NewDialer(time.Second, 0).DialContext(context.Background(), "tcp", srv.Listener.Addr().String())
	if err != nil {
		t.Fatalf("loopback refused: %v", err)
	}
	conn.Close()

	sock := filepath.Join(t.TempDir(), "d.sock")
	ln, err := net.Listen("unix", sock)
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	c2, err := NewDialer(time.Second, 0).DialContext(context.Background(), "unix", sock)
	if err != nil {
		t.Fatalf("a unix socket was refused: %v", err)
	}
	c2.Close()
}

// A redirect is the way in that a check on the text never sees: the address in
// the URL is innocent and the answer points somewhere else.
func TestARedirectToCloudMetadataIsNotFollowed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "http://169.254.169.254/latest/meta-data/", http.StatusFound)
	}))
	defer srv.Close()

	client := &http.Client{Timeout: 3 * time.Second, Transport: &http.Transport{DialContext: NewDialer(time.Second, 0).DialContext}}
	start := time.Now()
	_, err := client.Get(srv.URL)
	if !errors.Is(err, ErrMetadataAddress) {
		t.Fatalf("err = %v, want the metadata refusal", err)
	}
	if time.Since(start) > time.Second {
		t.Fatalf("took %v: the redirect was followed to a connection attempt", time.Since(start))
	}
}

func TestIsLocalAddress(t *testing.T) {
	cases := map[string]bool{
		"127.0.0.1": true, "::1": true, "10.1.2.3": true, "172.16.0.9": true, "192.168.1.20": true,
		"169.254.10.1": true, "fe80::1": true, "fd12:3456::1": true, "100.64.0.1": true, "100.127.255.254": true,
		"0.0.0.0": true, "::": true,
		"1.1.1.1": false, "8.8.8.8": false, "100.128.0.1": false, "2606:4700:4700::1111": false, "172.32.0.1": false,
	}
	for addr, want := range cases {
		if got := IsLocalAddress(net.ParseIP(addr)); got != want {
			t.Errorf("IsLocalAddress(%s) = %v, want %v", addr, got, want)
		}
	}
	if !IsLocalAddress(nil) {
		t.Error("an address that does not parse is treated as local, not let through")
	}
}

// The mark on the context is enforced by the dialer itself, on the address it is
// about to connect to: measured against a real listener, not a parsed URL.
func TestAnInternetOnlyConnectionCannotReachTheLocalNetwork(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			c.Close()
		}
	}()

	d := NewDialer(2*time.Second, 0)
	if c, err := d.DialContext(context.Background(), "tcp", ln.Addr().String()); err != nil {
		t.Fatalf("an account with the local network should connect, got %v", err)
	} else {
		c.Close()
	}
	_, err = d.DialContext(InternetOnly(context.Background()), "tcp", ln.Addr().String())
	if !errors.Is(err, ErrLocalAddress) {
		t.Fatalf("an internet-only connection to 127.0.0.1 must be refused with ErrLocalAddress, got %v", err)
	}
	// A name is resolved before the check, so "localhost" is refused the same way.
	_, port, _ := net.SplitHostPort(ln.Addr().String())
	if _, err := d.DialContext(InternetOnly(context.Background()), "tcp", net.JoinHostPort("localhost", port)); !errors.Is(err, ErrLocalAddress) {
		t.Fatalf("a name that resolves to the local network must be refused too, got %v", err)
	}
}

func TestAnInternetOnlyConnectionCannotReachAUnixSocket(t *testing.T) {
	err := control(InternetOnly(context.Background()), "unix", "/var/run/docker.sock", nil)
	if !errors.Is(err, ErrLocalAddress) {
		t.Errorf("a unix socket is this machine, got %v", err)
	}
	if err := control(context.Background(), "unix", "/var/run/docker.sock", nil); err != nil {
		t.Errorf("without the mark a unix socket is allowed, got %v", err)
	}
}
