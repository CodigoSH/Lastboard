package api

import (
	"encoding/json"
	"net/netip"
	"testing"
)

func TestSkipInterface(t *testing.T) {
	for name, want := range map[string]bool{
		"lo": true, "LO": true, "docker0": true, "br-1a2b3c": true, "veth9f": true, "tailscale0": true, "cni0": true,
		"flannel.1": true, "virbr0": true,
		"eth0": false, "ens18": false, "enp3s0": false, "vmbr0": false, "wlan0": false, "local": false, "": false,
	} {
		if got := skipInterface(name); got != want {
			t.Errorf("skipInterface(%q) = %v, want %v", name, got, want)
		}
	}
}

func TestUsableIPv4(t *testing.T) {
	for ip, want := range map[string]bool{
		"192.168.1.5": true, "10.0.0.5": true, "172.16.4.9": true, "203.0.113.7": true,
		"127.0.0.1": false, "169.254.10.1": false, "100.64.0.1": false, "100.127.255.254": false, "0.0.0.0": false,
		"224.0.0.1": false, "fe80::1": false, "2001:db8::1": false,
	} {
		if got := usableIPv4(netip.MustParseAddr(ip)); got != want {
			t.Errorf("usableIPv4(%s) = %v, want %v", ip, got, want)
		}
	}
}

func TestChooseAddressPrefersAPrivateNetwork(t *testing.T) {
	ips := func(s ...string) []netip.Addr {
		var out []netip.Addr
		for _, x := range s {
			out = append(out, netip.MustParseAddr(x))
		}
		return out
	}
	if got := chooseAddress(ips("203.0.113.7", "192.168.1.5")); got != "192.168.1.5" {
		t.Errorf("a private address after a public one = %q", got)
	}
	if got := chooseAddress(ips("203.0.113.7", "198.51.100.2")); got != "203.0.113.7" {
		t.Errorf("with no private address the first public one is %q", got)
	}
	if got := chooseAddress(ips("127.0.0.1", "169.254.1.1", "100.64.0.9")); got != "" {
		t.Errorf("nothing usable gave %q", got)
	}
	if got := chooseAddress(nil); got != "" {
		t.Errorf("no candidates gave %q", got)
	}
}

func TestAddressFromAContainer(t *testing.T) {
	var ifs []pxLXCIface
	// As Proxmox lists them: loopback first, Docker's bridge inside the container, then the real one.
	if err := json.Unmarshal([]byte(`[
		{"name":"lo","hwaddr":"00:00:00:00:00:00","inet":"127.0.0.1/8","inet6":"::1/128"},
		{"name":"docker0","hwaddr":"02:42:00:00:00:01","inet":"172.17.0.1/16"},
		{"name":"eth0","hwaddr":"bc:24:11:00:00:01","inet":"192.168.1.106/24","inet6":"fe80::1/64"}]`), &ifs); err != nil {
		t.Fatal(err)
	}
	if got := addressFromLXC(ifs); got != "192.168.1.106" {
		t.Errorf("addressFromLXC = %q, want 192.168.1.106", got)
	}
	if got := addressFromLXC([]pxLXCIface{{Name: "eth0"}}); got != "" {
		t.Errorf("an interface with no address gave %q", got)
	}
	if got := addressFromLXC([]pxLXCIface{{Name: "eth0", Inet: "10.1.1.1"}}); got != "10.1.1.1" {
		t.Errorf("an address with no prefix = %q", got)
	}
	if got := addressFromLXC([]pxLXCIface{{Name: "eth0", Inet: "nonsense"}}); got != "" {
		t.Errorf("garbage gave %q", got)
	}
}

func TestAddressFromAGuestAgent(t *testing.T) {
	var ifs []pxAgentIface
	if err := json.Unmarshal([]byte(`[
		{"name":"lo","ip-addresses":[{"ip-address":"127.0.0.1","ip-address-type":"ipv4","prefix":8}]},
		{"name":"tailscale0","ip-addresses":[{"ip-address":"100.100.1.1","ip-address-type":"ipv4","prefix":32}]},
		{"name":"br-ab12","ip-addresses":[{"ip-address":"172.18.0.1","ip-address-type":"ipv4","prefix":16}]},
		{"name":"ens18","ip-addresses":[{"ip-address":"fe80::1","ip-address-type":"ipv6","prefix":64},{"ip-address":"10.0.0.107","ip-address-type":"ipv4","prefix":24}]}]`), &ifs); err != nil {
		t.Fatal(err)
	}
	if got := addressFromAgent(ifs); got != "10.0.0.107" {
		t.Errorf("addressFromAgent = %q, want 10.0.0.107", got)
	}
	if got := addressFromAgent(nil); got != "" {
		t.Errorf("an agent that reported nothing gave %q", got)
	}
}

func TestProxmoxAddressPath(t *testing.T) {
	if p, err := proxmoxAddressPath("pve1", "lxc", 106); err != nil || p != "/nodes/pve1/lxc/106/interfaces" {
		t.Errorf("lxc: %q, %v", p, err)
	}
	if p, err := proxmoxAddressPath("pve1", "qemu", 107); err != nil || p != "/nodes/pve1/qemu/107/agent/network-get-interfaces" {
		t.Errorf("qemu: %q, %v", p, err)
	}
	for _, c := range []struct {
		node, kind string
		vmid       int
	}{{"", "lxc", 1}, {"a/b", "lxc", 1}, {"a?b", "lxc", 1}, {"a#b", "lxc", 1}, {"pve", "vm", 1}, {"pve", "lxc", 0}, {"pve", "lxc", -3}} {
		if _, err := proxmoxAddressPath(c.node, c.kind, c.vmid); err == nil {
			t.Errorf("%+v was accepted", c)
		}
	}
}
