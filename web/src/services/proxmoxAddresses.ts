import { apiService } from './apiService';

/**
 * Where each of a hypervisor's machines can be reached, and the hypervisors an
 * account has, for the window that adds machines to the board.
 */

/** The server takes at most this many machines in one request. */
const BATCH = 200;

export interface MachineAddresses { addresses: Record<string, string>; urls: Record<string, string> }

export interface MachineRef { node: string; kind: 'lxc' | 'qemu'; vmid: number }

/**
 * The address each machine reports and the one its notes give (a `lastboard.url:`
 * line), both keyed `node|vmid`. A machine the server could
 * not read is not in the answer, and neither is one whose request failed: the
 * window then offers its console, which is a good answer too.
 */
export async function fetchAddresses(hostId: string, machines: MachineRef[]): Promise<MachineAddresses> {
    const out: Record<string, string> = {};
    const urls: Record<string, string> = {};
    for (let i = 0; i < machines.length; i += BATCH) {
        try {
            const r = await apiService.post<{ addresses?: Record<string, string>; urls?: Record<string, string> }>('/api/proxmox/addresses', {
                host: hostId,
                guests: machines.slice(i, i + BATCH),
            });
            Object.assign(out, r?.addresses ?? {});
            Object.assign(urls, r?.urls ?? {});
        } catch { /* this batch has no addresses; the others may */ }
    }
    return { addresses: out, urls };
}

export interface ProxmoxHostRef { id: string; name: string; url: string }

/** The hypervisors the account has switched on, with the address of each one's own interface. */
export async function fetchProxmoxHosts(): Promise<ProxmoxHostRef[]> {
    const r = await apiService.get<{ hosts?: { id: string; name: string; url: string; enabled: boolean }[] }>('/api/proxmox/settings');
    return (r?.hosts ?? []).filter(h => h.enabled).map(h => ({ id: h.id, name: h.name, url: h.url || '' }));
}
