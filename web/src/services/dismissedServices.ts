import type { ServiceLink } from './discoverServices';

/**
 * What an account chose not to add to its board from a host, remembered so the
 * window proposes it unticked the next time instead of afresh.
 */

/** How a service is filed: its kind, its host and its own name, as the server expects. */
export function dismissKey(link: ServiceLink): string {
    return 'docker' in link
        ? `d:${link.docker.host}/${link.docker.name}`
        : `p:${link.proxmox.host}/${link.proxmox.node}|${link.proxmox.vmid}`;
}

export interface RowFacts {
    key: string;
    /** It was proposed ticked: nothing had dismissed it and no bookmark served it. */
    proposedTicked: boolean;
    /** It was dismissed when the window opened. */
    dismissed: boolean;
    /** What the person left it as. */
    checked: boolean;
}

/**
 * What the window changes about the list when it adds: a service that was
 * proposed ticked and has been left unticked is dismissed, and one that was
 * dismissed and has been ticked is not any more.
 */
export function dismissalChanges(rows: RowFacts[]): { add: string[]; remove: string[] } {
    const add: string[] = [];
    const remove: string[] = [];
    for (const r of rows) {
        if (r.proposedTicked && !r.checked) add.push(r.key);
        else if (r.dismissed && r.checked) remove.push(r.key);
    }
    return { add, remove };
}

/** How many proposals are still worth telling the person about: no bookmark serves them and they were not left out. */
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

/** Tells the server what changed. Remembering is a courtesy: a failure is not the person's problem. */
export async function saveDismissals(changes: { add: string[]; remove: string[] }): Promise<void> {
    if (changes.add.length === 0 && changes.remove.length === 0) return;
    try { await (await api()).post('/api/detect/dismissed', changes); } catch { /* it will be proposed ticked again */ }
}
