import { apiService } from './apiService';
import { dashboardStore } from '../store/dashboardStore';
import { bookmarkKeys, buildNameIndex, guessByName, placeOf } from './proxmoxMatch';

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
    /** Which hypervisor. Empty on a link made before there could be two. */
    host: string;
    node: string;
    vmid: number;
    /** The bookmark itself, on a guess: what is needed to tie it to a service afterwards. */
    itemId?: number;
    /** The board it is on; null when the server did not say. */
    boardId?: number | null;
    /** Its content as the server holds it. */
    content?: string;
}

/** Both halves of the answer: what was declared, and what can be inferred. */
interface PxIndex {
    /** Bookmarks tied to a machine by hand, keyed "host|vmid". */
    explicit: Map<string, PxLink>;
    /** Every other bookmark, by name — null where two of them would fit. */
    byName: Map<string, PxLink | null>;
    /** The same bookmarks by the place their address points at — null where two of them point at one. */
    byPlace: Map<string, PxLink | null>;
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
function collect(items: any[], explicit: Map<string, PxLink>, guessable: Candidate[]): void {
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
                // Keyed by host and vmid together: VMIDs restart at 100 in
                // every cluster, so the number alone named two machines the
                // moment a second hypervisor was connected.
                const host = typeof px.host === 'string' ? px.host : '';
                const key = `${host}|${vmid}`;
                if (!explicit.has(key)) {
                    explicit.set(key, {
                        label, url: c.url || '', icon, host,
                        node: typeof px.node === 'string' ? px.node : '',
                        vmid,
                    });
                }
                // A bookmark already spoken for is not offered to a second
                // machine by name.
                continue;
            }

            guessable.push({
                link: {
                    label, url: c.url || '', icon, host: '', node: '', vmid: 0,
                    itemId: typeof item.id === 'number' ? item.id : undefined,
                    boardId: typeof item.dashboard_id === 'number' ? item.dashboard_id : null,
                    content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content),
                },
                keys: bookmarkKeys(label, c.iconName || '', c.icon || ''),
            });
        } catch { /* a bookmark with unreadable content is simply not linked */ }
    }
}

async function build(): Promise<PxIndex> {
    const explicit = new Map<string, PxLink>();
    const guessable: Candidate[] = [];

    // The open board is already in memory, so it costs nothing and it is the
    // one most likely to hold the bookmark being looked at.
    collect(dashboardStore.getState().items || [], explicit, guessable);

    let boards: { id: number }[] = [];
    try {
        boards = await apiService.get<{ id: number }[]>('/api/dashboards') || [];
    } catch {
        // One board's worth is better than none.
        return indexOf(explicit, guessable);
    }

    const current = dashboardStore.getState().currentDashboardId;
    for (const b of boards.slice(0, MAX_BOARDS)) {
        if (!b || typeof b.id !== 'number' || b.id === current) continue;
        try {
            const items = await apiService.get<any[]>(`/api/dashboard?dashboard_id=${b.id}`);
            collect(Array.isArray(items) ? items : [], explicit, guessable);
        } catch { /* a board that cannot be read links nothing */ }
    }
    return indexOf(explicit, guessable);
}

/** Both lookups over the bookmarks nobody has tied to a machine. */
function indexOf(explicit: Map<string, PxLink>, guessable: Candidate[]): PxIndex {
    return {
        explicit,
        byName: buildNameIndex(guessable.map(c => ({ keys: c.keys, value: c.link }))),
        byPlace: buildNameIndex(guessable.map(c => ({ keys: [placeOf(c.link.url)], value: c.link }))),
    };
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
export function linkFor(guest: { vmid: number; node: string; name: string; host?: string }): PxLink | null {
    if (!cache) return null;
    const host = guest.host || '';
    // A link made before there could be two hypervisors carries no host, so it
    // is still honoured for whichever machine matches — there was only one for
    // it to have meant.
    const declared = cache.explicit.get(`${host}|${guest.vmid}`) ?? cache.explicit.get(`|${guest.vmid}`);
    if (declared) return declared.node && declared.node !== guest.node ? null : declared;
    return guessByName(cache.byName, guest.name);
}

/**
 * The bookmark a name says it is, for anything that is not a machine of ours
 * (a container, say): the same match as above, on the name alone, and nothing
 * when two bookmarks would fit or the index is not built yet.
 */
export function bookmarkNamed(name: string): PxLink | null {
    return cache ? guessByName(cache.byName, name) : null;
}

/**
 * The bookmark whose address is this one's, for a service found at that address: the host and the port, nothing
 * when two bookmarks point there or the index is not built yet.
 */
export function bookmarkAt(url: string): PxLink | null {
    const place = placeOf(url);
    return cache && place ? cache.byPlace.get(place) ?? null : null;
}

/** Called when a bookmark changes, so the next reader rebuilds the index. */
export function clearProxmoxLinks(): void {
    cache = null;
    cachedAt = 0;
}
