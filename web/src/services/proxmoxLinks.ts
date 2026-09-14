import { apiService } from './apiService';
import { dashboardStore } from '../store/dashboardStore';

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
 */

export interface PxLink {
    label: string;
    url: string;
    /** Icon URL or icon name, exactly as the bookmark stores it. */
    icon: string;
    node: string;
    vmid: number;
}

/** Boards to read. A ceiling, not an expectation: nobody has twenty. */
const MAX_BOARDS = 20;

/** How long a built index is reused before it is built again. */
const TTL_MS = 60_000;

let cache: Map<number, PxLink> | null = null;
let cachedAt = 0;
let inFlight: Promise<Map<number, PxLink>> | null = null;

/** Reads one board's bookmarks and adds whatever says which machine serves it. */
function collect(items: any[], into: Map<number, PxLink>): void {
    for (const item of items) {
        if (!item || item.type !== 'bookmark' || !item.content) continue;
        try {
            const c = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
            const px = c?.proxmox;
            if (!px) continue;
            const vmid = Number(px.vmid);
            if (!Number.isFinite(vmid) || vmid <= 0) continue;
            // First board wins: two bookmarks on the same machine is a thing
            // people do (one per board), and either answer is right.
            if (into.has(vmid)) continue;
            into.set(vmid, {
                label: c.label || '',
                url: c.url || '',
                icon: c.icon || c.iconName || '',
                node: typeof px.node === 'string' ? px.node : '',
                vmid,
            });
        } catch { /* a bookmark with unreadable content is simply not linked */ }
    }
}

async function build(): Promise<Map<number, PxLink>> {
    const links = new Map<number, PxLink>();

    // The open board is already in memory, so it costs nothing and it is the
    // one most likely to hold the bookmark being looked at.
    collect(dashboardStore.getState().items || [], links);

    let boards: { id: number }[] = [];
    try {
        boards = await apiService.get<{ id: number }[]>('/api/dashboards') || [];
    } catch {
        return links;                     // one board's worth is better than none
    }

    const current = dashboardStore.getState().currentDashboardId;
    for (const b of boards.slice(0, MAX_BOARDS)) {
        if (!b || typeof b.id !== 'number' || b.id === current) continue;
        try {
            const items = await apiService.get<any[]>(`/api/dashboard?dashboard_id=${b.id}`);
            collect(Array.isArray(items) ? items : [], links);
        } catch { /* a board that cannot be read links nothing */ }
    }
    return links;
}

/**
 * The index, from cache when it is fresh. Concurrent callers share one build:
 * the page and its widget open together and would otherwise ask twice.
 */
export function loadProxmoxLinks(): Promise<Map<number, PxLink>> {
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

/** What is known right now, without waiting. Empty until the first build lands. */
export function proxmoxLinks(): Map<number, PxLink> {
    return cache ?? new Map();
}

/** Called when a bookmark changes, so the next reader rebuilds the index. */
export function clearProxmoxLinks(): void {
    cache = null;
    cachedAt = 0;
}
