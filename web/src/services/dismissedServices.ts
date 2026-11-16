import type { ServiceLink } from './discoverServices';

/**
 * What an account chose to ignore: services of a host it never wants proposed. It is the person's own
 * choice, made on a row and nowhere else — leaving a row unticked is not one — and it is kept so the
 * window does not propose it again and the pages do not count it as left to add.
 */

/** How a service is filed: its kind, its host and its own name, as the server expects. */
export function dismissKey(link: ServiceLink): string {
    return 'docker' in link
        ? `d:${link.docker.host}/${link.docker.name}`
        : `p:${link.proxmox.host}/${link.proxmox.node}|${link.proxmox.vmid}`;
}

/** How many proposals are still worth telling the person about: no bookmark serves them and they were not ignored. */
export function countPending(proposals: { link: ServiceLink; linkedTo: string }[], dismissed: Set<string>): number {
    let n = 0;
    for (const p of proposals) if (!p.linkedTo && !dismissed.has(dismissKey(p.link))) n++;
    return n;
}

/** The service is taken in when it is used, so the pure parts above load without a browser. */
const api = async () => (await import('./apiService')).apiService;

/** The keys dismissed so far; none when they cannot be read. */
export async function fetchDismissed(): Promise<Set<string>> {
    try {
        const r = await (await api()).get<{ keys?: string[] }>('/api/detect/dismissed');
        return new Set(r?.keys ?? []);
    } catch {
        return new Set();
    }
}

/** Tells the server what changed. A failure leaves it as it was: it will be proposed again, which is the safe side. */
export async function saveDismissals(changes: { add: string[]; remove: string[] }): Promise<void> {
    if (changes.add.length === 0 && changes.remove.length === 0) return;
    try { await (await api()).post('/api/detect/dismissed', changes); } catch { /* it stays as it was */ }
}
