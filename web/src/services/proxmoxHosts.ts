import type { PxHost } from './proxmoxApi';

/*
 * What the page does with the hosts of a round that arrives host by host, and the
 * query for the fleet's curve. Kept apart from the calls that fetch them so it can be
 * read, and tested, without the network.
 */

/** A hypervisor as the page lists it before it has been read. */
export interface PxHostRef { id: string; name: string }

/** A host that could not be read, in the place of its answer: the others still draw. */
export function hostError(ref: PxHostRef, error: string): PxHost {
    return { id: ref.id, name: ref.name, error, cluster: false, caps: { read: false, power: false }, nodes: [], guests: [], stores: [] };
}

/**
 * The hosts in the order they were saved: each as it answered this round, or as it
 * was last read while it has not answered yet. One no longer switched on is gone.
 */
export function mergeHosts(refs: PxHostRef[], held: PxHost[], fresh: Map<string, PxHost>): PxHost[] {
    const old = new Map(held.map(h => [h.id, h]));
    const out: PxHost[] = [];
    for (const r of refs) {
        const h = fresh.get(r.id) ?? old.get(r.id);
        if (h) out.push(h);
    }
    return out;
}

/** The most nodes one request for the fleet's curve names. */
export const CURVE_MAX_NODES = 64;

/** The query that names the nodes whose history the fleet's curve is made of. */
export function curveQuery(range: string, nodes: { hostId: string; name: string }[]): string {
    const list = nodes.slice(0, CURVE_MAX_NODES).map(n => `${encodeURIComponent(n.hostId)}/${encodeURIComponent(n.name)}`).join(',');
    return `range=${encodeURIComponent(range)}&nodes=${list}`;
}
