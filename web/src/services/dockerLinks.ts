import { apiService } from './apiService';
import { dashboardStore } from '../store/dashboardStore';
import { collectDockerLinks, dockerLinkKey, type DockerLink } from './dockerLinkIndex';

export { dockerLinkKey, collectDockerLinks, type DockerLink } from './dockerLinkIndex';

/**
 * Which bookmark each container serves, across every board.
 *
 * Only what the owner declared: a bookmark's "served by" names a host and a
 * container (`content.docker`). A container is addressed by host and NAME, never
 * its id, which changes whenever it is recreated.
 *
 * Built from every board, once, and cached — the open board has nothing to do
 * with whether a container backs a service.
 */

const MAX_BOARDS = 20;
const TTL_MS = 60_000;

let cache: Map<string, DockerLink> | null = null;
let cachedAt = 0;
let inFlight: Promise<Map<string, DockerLink>> | null = null;

async function build(): Promise<Map<string, DockerLink>> {
    const index = new Map<string, DockerLink>();
    collectDockerLinks(dashboardStore.getState().items || [], index);

    let boards: { id: number }[] = [];
    try {
        boards = await apiService.get<{ id: number }[]>('/api/dashboards') || [];
    } catch {
        return index;
    }
    const current = dashboardStore.getState().currentDashboardId;
    for (const b of boards.slice(0, MAX_BOARDS)) {
        if (!b || typeof b.id !== 'number' || b.id === current) continue;
        try {
            const items = await apiService.get<any[]>(`/api/dashboard?dashboard_id=${b.id}`);
            collectDockerLinks(Array.isArray(items) ? items : [], index);
        } catch { /* a board that cannot be read links nothing */ }
    }
    return index;
}

/** The index, from cache when fresh. Concurrent callers share one build. */
export function loadDockerLinks(): Promise<Map<string, DockerLink>> {
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

/** The bookmark a container serves. Nothing until the first build lands. */
export function dockerLinkFor(hostId: string, name: string): DockerLink | null {
    return cache?.get(dockerLinkKey(hostId, name)) ?? null;
}

/** Called when a bookmark changes, so the next reader rebuilds the index. */
export function clearDockerLinks(): void {
    cache = null;
    cachedAt = 0;
}
