import { apiService } from './apiService';
import { dashboardStore } from '../store/dashboardStore';
import { bookmarkKeys, buildNameIndex, guessByName } from './proxmoxMatch';

/**
 * Which bookmark each machine backs, across every board.
 *
 * The page and the widget used to read `dashboardStore`, which holds the board
 * that happens to be open. That made the whole feature depend on where the
 * visitor was standing: a bookmark linked on "Media" was invisible while
 * "Servers" was open, so the same stopped container was flagged on one board
 * and unremarkable on the other — and the sentence the page exists to write
 * ("this stops responding: Plex") appeared or not by accident.
 *
 * A machine is backed by a bookmark or it is not; the open board has nothing to
 * do with it. So the index is built from every board, once, and cached: boards
 * are a handful, the request is the same one the board itself makes, and the
 * answer only changes when somebody edits a bookmark.
 *
 * Two indexes come out of that pass: what the owner said (by VMID) and what the
 * names say (see proxmoxMatch). The first always wins; the second is what makes
 * the feature work for somebody who has just updated and told it nothing.
 */

export interface PxLink {
    label: string;
    url: string;
    /** Icon URL or icon name, exactly as the bookmark stores it. */
    icon: string;
    node: string;
    vmid: number;
}

/** Both halves of the answer: what was declared, and what can be inferred. */
interface PxIndex {
    /** Bookmarks tied to a machine by hand, by VMID. */
    explicit: Map<number, PxLink>;
    /** Every other bookmark, by name — null where two of them would fit. */
    byName: Map<string, PxLink | null>;
}

/** Boards to read. A ceiling, not an expectation: nobody has twenty. */
const MAX_BOARDS = 20;

/** How long a built index is reused before it is built again. */
const TTL_MS = 60_000;

let cache: PxIndex | null = null;
let cachedAt = 0;
let inFlight: Promise<PxIndex> | null = null;

/** One bookmark, as both halves of the index need it. */
interface Candidate { link: PxLink; keys: string[] }

/** Reads one board's bookmarks into the two piles. */
function collect(items: any[], explicit: Map<number, PxLink>, guessable: Candidate[]): void {
    for (const item of items) {
        if (!item || item.type !== 'bookmark' || !item.content) continue;
        try {
            const c = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
            const label = c.label || '';
            const icon = c.icon || c.iconName || '';
            const px = c?.proxmox;
            const vmid = Number(px?.vmid);

            if (px && Number.isFinite(vmid) && vmid > 0) {
                // First board wins: two bookmarks on the same machine is a thing
                // people do (one per board), and either answer is right.
                if (!explicit.has(vmid)) {
                    explicit.set(vmid, {
                        label, url: c.url || '', icon,
                        node: typeof px.node === 'string' ? px.node : '',
                        vmid,
                    });
                }
                // A bookmark already spoken for is not offered to a second
                // machine by name.
                continue;
            }

            guessable.push({
                link: { label, url: c.url || '', icon, node: '', vmid: 0 },
                keys: bookmarkKeys(label, c.iconName || '', c.icon || ''),
            });
        } catch { /* a bookmark with unreadable content is simply not linked */ }
    }
}

async function build(): Promise<PxIndex> {
    const explicit = new Map<number, PxLink>();
    const guessable: Candidate[] = [];

    // The open board is already in memory, so it costs nothing and it is the
    // one most likely to hold the bookmark being looked at.
    collect(dashboardStore.getState().items || [], explicit, guessable);

    let boards: { id: number }[] = [];
    try {
        boards = await apiService.get<{ id: number }[]>('/api/dashboards') || [];
    } catch {
        // One board's worth is better than none.
        return { explicit, byName: buildNameIndex(guessable.map(c => ({ keys: c.keys, value: c.link }))) };
    }

    const current = dashboardStore.getState().currentDashboardId;
    for (const b of boards.slice(0, MAX_BOARDS)) {
        if (!b || typeof b.id !== 'number' || b.id === current) continue;
        try {
            const items = await apiService.get<any[]>(`/api/dashboard?dashboard_id=${b.id}`);
            collect(Array.isArray(items) ? items : [], explicit, guessable);
        } catch { /* a board that cannot be read links nothing */ }
    }
    return { explicit, byName: buildNameIndex(guessable.map(c => ({ keys: c.keys, value: c.link }))) };
}

/**
 * The index, from cache when it is fresh. Concurrent callers share one build:
 * the page and its widget open together and would otherwise ask twice.
 */
export function loadProxmoxLinks(): Promise<PxIndex> {
    if (cache && Date.now() - cachedAt < TTL_MS) return Promise.resolve(cache);
    if (inFlight) return inFlight;
    inFlight = build().then((m) => {
        cache = m;
        cachedAt = Date.now();
        inFlight = null;
        return m;
    }).catch((e) => {
        inFlight = null;
        throw e;
    });
    return inFlight;
}

/**
 * The bookmark a machine serves: what its owner said, or failing that what its
 * name says. Nothing until the first build lands.
 *
 * `node` is only checked on a hand-made link, which names one. A guess is made
 * on the name alone, and a name is not per-node.
 */
export function linkFor(guest: { vmid: number; node: string; name: string }): PxLink | null {
    if (!cache) return null;
    const declared = cache.explicit.get(guest.vmid);
    if (declared) return declared.node && declared.node !== guest.node ? null : declared;
    return guessByName(cache.byName, guest.name);
}

/** Called when a bookmark changes, so the next reader rebuilds the index. */
export function clearProxmoxLinks(): void {
    cache = null;
    cachedAt = 0;
}
