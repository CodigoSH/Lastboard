package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/netip"
	"net/url"
	"strings"
	"sync"
	"time"
)

/* ---------------------------------------------------------------------------
 * Where a machine can be reached
 *
 * A bookmark for a machine needs an address, and Proxmox knows it only from the
 * inside: a container's interfaces, or what the guest agent of a virtual machine
 * reports. Both are read here and reduced to the one a person would use.
 * ------------------------------------------------------------------------ */

// pxLXCIface is one interface of a container, as /lxc/{vmid}/interfaces lists it.
type pxLXCIface struct {
	Name string `json:"name"`
	Inet string `json:"inet"` // "192.168.1.106/24"
}

// pxAgentIface is one interface as the guest agent of a virtual machine reports it.
type pxAgentIface struct {
	Name string `json:"name"`
	IPs  []struct {
		IP string `json:"ip-address"`
	} `json:"ip-addresses"`
}

// interfacePrefixes are the names of interfaces that are plumbing, not a place a
// person reaches the machine: loopback, Docker's bridges and virtual pairs, the
// overlay networks of Tailscale, CNI and Flannel, and libvirt's.
var interfacePrefixes = []string{"lo", "docker", "br-", "veth", "tailscale", "cni", "flannel", "virbr"}

func skipInterface(name string) bool {
	n := strings.ToLower(name)
	for _, p := range interfacePrefixes {
		if n == p || (p != "lo" && strings.HasPrefix(n, p)) {
			return true
		}
	}
	return false
}

var carrierGradeNAT = netip.MustParsePrefix("100.64.0.0/10") // Tailscale's range, among others

// usableIPv4 says whether an address is one to offer: not loopback, not
// link-local (169.254/16), not the carrier-grade range, not unspecified.
func usableIPv4(a netip.Addr) bool {
	return a.IsValid() && a.Is4() && !a.IsLoopback() && !a.IsLinkLocalUnicast() &&
		!a.IsUnspecified() && !a.IsMulticast() && !carrierGradeNAT.Contains(a)
}

// chooseAddress takes the candidates in the order the interfaces came and gives
// the first private one — a home or office network — or, with none, the first
// usable one.
func chooseAddress(candidates []netip.Addr) string {
	var first string
	for _, a := range candidates {
		if !usableIPv4(a) {
			continue
		}
		if a.IsPrivate() {
			return a.String()
		}
		if first == "" {
			first = a.String()
		}
	}
	return first
}

func addressFromLXC(ifs []pxLXCIface) string {
	var found []netip.Addr
	for _, i := range ifs {
		if skipInterface(i.Name) || i.Inet == "" {
			continue
		}
		if p, err := netip.ParsePrefix(i.Inet); err == nil {
			found = append(found, p.Addr())
		} else if a, err := netip.ParseAddr(i.Inet); err == nil {
			found = append(found, a)
		}
	}
	return chooseAddress(found)
}

func addressFromAgent(ifs []pxAgentIface) string {
	var found []netip.Addr
	for _, i := range ifs {
		if skipInterface(i.Name) {
			continue
		}
		for _, ip := range i.IPs {
			// IPv6 and anything unparseable fall out here: only an IPv4 is usable.
			if a, err := netip.ParseAddr(ip.IP); err == nil {
				found = append(found, a)
			}
		}
	}
	return chooseAddress(found)
}

// proxmoxAddressPath is where a machine's interfaces are asked for, or an error
// for anything that is not a node name and a kind Lastboard knows.
func proxmoxAddressPath(node, kind string, vmid int) (string, error) {
	if node == "" || vmid <= 0 || strings.ContainsAny(node, "/?#") {
		return "", fmt.Errorf("general.invalid_input")
	}
	switch kind {
	case "lxc":
		return fmt.Sprintf("/nodes/%s/lxc/%d/interfaces", url.PathEscape(node), vmid), nil
	case "qemu":
		return fmt.Sprintf("/nodes/%s/qemu/%d/agent/network-get-interfaces", url.PathEscape(node), vmid), nil
	}
	return "", fmt.Errorf("general.invalid_input")
}

const (
	maxAddressGuests      = 300
	addressConcurrency    = 6
	addressTimeoutOne     = 5 * time.Second
	addressTimeoutAll     = 25 * time.Second
	maxAddressRequestBody = 64 * 1024
)

type addressGuest struct {
	Node string `json:"node"`
	Kind string `json:"kind"`
	VMID int    `json:"vmid"`
}

// Addresses answers, for the machines it is given, the address each can be
// reached at — and says nothing about the ones it cannot read. A machine that is
// off, a virtual machine without a guest agent, a token that may not read the
// agent, a host that is slow: each leaves its machine out of the answer and
// costs the others nothing. The page then offers the machine's console instead.
func (h *ProxmoxHandler) Addresses(w http.ResponseWriter, r *http.Request) {
	u := h.forUser(r)
	r.Body = http.MaxBytesReader(w, r.Body, maxAddressRequestBody)
	var in struct {
		Host   string         `json:"host"`
		Guests []addressGuest `json:"guests"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || len(in.Guests) > maxAddressGuests {
		http.Error(w, "general.invalid_input", http.StatusBadRequest)
		return
	}
	host, ok := u.hostFor(strings.TrimSpace(in.Host))
	if !ok {
		http.Error(w, "proxmox.not_configured", http.StatusPreconditionFailed)
		return
	}
	cfg := configOf(host)

	paths := make([]string, len(in.Guests))
	for i, g := range in.Guests {
		p, err := proxmoxAddressPath(g.Node, g.Kind, g.VMID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		paths[i] = p
	}

	ctx, cancel := context.WithTimeout(r.Context(), addressTimeoutAll)
	defer cancel()
	var (
		mu     sync.Mutex
		wg     sync.WaitGroup
		out    = map[string]string{}
		window = make(chan struct{}, addressConcurrency)
	)
	for i, g := range in.Guests {
		wg.Add(1)
		go func(g addressGuest, path string) {
			defer wg.Done()
			select {
			case window <- struct{}{}:
				defer func() { <-window }()
			case <-ctx.Done():
				return
			}
			one, stop := context.WithTimeout(ctx, addressTimeoutOne)
			defer stop()
			var addr string
			if g.Kind == "lxc" {
				var ifs []pxLXCIface
				if proxmoxDoCtx(one, cfg, http.MethodGet, path, &ifs) == nil {
					addr = addressFromLXC(ifs)
				}
			} else {
				var reply struct {
					Result []pxAgentIface `json:"result"`
				}
				if proxmoxDoCtx(one, cfg, http.MethodGet, path, &reply) == nil {
					addr = addressFromAgent(reply.Result)
				}
			}
			if addr != "" {
				mu.Lock()
				out[fmt.Sprintf("%s|%d", g.Node, g.VMID)] = addr
				mu.Unlock()
			}
		}(g, paths[i])
	}
	wg.Wait()

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"addresses": out})
}
