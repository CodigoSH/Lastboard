package api

import "time"

// ProxmoxBudgetsForTest shortens how long a host and a node of it are given, so a
// test of a host that never answers does not wait six seconds. It returns what puts
// them back.
func ProxmoxBudgetsForTest(host, node time.Duration) (restore func()) {
	oldHost, oldNode := proxmoxHostBudget, proxmoxNodeBudget
	proxmoxHostBudget, proxmoxNodeBudget = host, node
	return func() { proxmoxHostBudget, proxmoxNodeBudget = oldHost, oldNode }
}

// ForgetProxmoxCapsForTest empties what is kept of what tokens may do, so a test starts from nothing.
func ForgetProxmoxCapsForTest() {
	proxmoxCapsMu.Lock()
	proxmoxCapsCache = map[string]cachedCapsEntry{}
	proxmoxCapsMu.Unlock()
}
