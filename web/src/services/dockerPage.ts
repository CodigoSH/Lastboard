import { dockerPost, hostRef, isDemoMode, containerName, type DockerHost, type DockerContainer } from './dockerShared';

/**
 * What the Docker page needs that is not drawing: the shape of what the server
 * answers for one container, the requests that ask for it, and the rules the
 * page applies to it (grouping, filtering, the log buffer). Kept apart from the
 * component so every rule can be read and tested without a DOM.
 */

// ── Shapes ─────────────────────────────────────────────────────────────────

export interface DockerDetailPort { container: string; host_ip: string; host_port: string }
export interface DockerDetailMount { type: string; name?: string; source: string; destination: string; read_only: boolean }
export interface DockerDetailNetwork { name: string; ipv4?: string }

/** One container as `/api/docker/detail` describes it. The environment is names only. */
export interface DockerDetail {
    id: string;
    name: string;
    image: string;
    created: string;
    status: string;
    state: string;
    started_at?: string;
    finished_at?: string;
    exit_code: number;
    health?: string;
    restart_policy: string;
    restart_count: number;
    ports: DockerDetailPort[];
    mounts: DockerDetailMount[];
    networks: DockerDetailNetwork[];
    env: string[];
    tty: boolean;
}

export interface LogLine {
    /** RFC 3339 UTC with nine fixed fractional digits, so it also sorts as text. */
    t: string;
    /** "out", "err", or "" for a container that has a terminal. */
    stream: string;
    text: string;
}

export interface LogBatch { lines: LogLine[]; truncated: boolean }

export interface ContainerStats { CPUPercent: number; MemPercent: number; MemUsed: number; MemLimit: number }

// ── Errors ─────────────────────────────────────────────────────────────────

/** The answers the server gives as a bare key, and the only ones the page words itself. */
const KNOWN_KEYS = new Set([
    'docker.unauthorized',
    'docker.connection_error',
    'docker.not_found',
    'docker.agent_too_old',
    'docker.admin_only',
    'general.invalid_input',
]);

/** A failed request, with the i18n key the page shows for it. */
export class DockerPageError extends Error {
    readonly key: string;
    readonly status: number;
    constructor(serverKey: string, status = 0) {
        const key = serverKey.trim();
        super(key);
        this.key = dockerErrorKey(key);
        this.status = status;
    }
}

/**
 * The key to show for what the server said. Anything it does not name — a proxy's
 * HTML error page, a dropped connection — is "could not connect", which is the
 * honest thing to say about a host that gave no answer worth reading.
 */
export function dockerErrorKey(serverKey: string): string {
    const k = (serverKey || '').trim();
    return KNOWN_KEYS.has(k) ? k : 'docker.connection_error';
}

/** The key for whatever was thrown. */
export function pageErrorKey(err: unknown): string {
    return err instanceof DockerPageError ? err.key : 'docker.connection_error';
}

// ── Requests ───────────────────────────────────────────────────────────────

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    let res: Response;
    try {
        res = await fetch(path, dockerPost(body));
    } catch {
        throw new DockerPageError('docker.connection_error');
    }
    if (!res.ok) throw new DockerPageError(await res.text().catch(() => ''), res.status);
    return await res.json() as T;
}

/** What the page can read of a container the demo has no daemon for. */
function demoDetail(id: string): DockerDetail {
    return {
        id, name: id.replace(/^demo-/, ''), image: 'example/image:latest', created: '2026-06-01T08:00:00.000000000Z',
        status: 'running', state: 'running', started_at: '2026-06-01T08:00:01.000000000Z', exit_code: 0,
        restart_policy: 'unless-stopped', restart_count: 0,
        ports: [{ container: '8080/tcp', host_ip: '0.0.0.0', host_port: '8080' }],
        mounts: [{ type: 'volume', name: 'data', source: '/var/lib/docker/volumes/data/_data', destination: '/data', read_only: false }],
        networks: [{ name: 'bridge', ipv4: '172.17.0.2' }],
        env: ['TZ', 'LOG_LEVEL'], tty: false,
    };
}

export async function fetchDetail(host: DockerHost, id: string): Promise<DockerDetail> {
    if (isDemoMode()) return demoDetail(id);
    return post<DockerDetail>('/api/docker/detail', { ...hostRef(host), id });
}

export async function fetchLogs(host: DockerHost, id: string, opts: { tail?: number; after?: string } = {}): Promise<LogBatch> {
    if (isDemoMode()) {
        const now = Date.now();
        const lines = [3, 2, 1].map((n, i) => ({
            t: new Date(now - n * 1000).toISOString().replace('Z', '000000Z'),
            stream: i === 1 ? 'err' : 'out',
            text: i === 1 ? 'warning: slow response' : 'listening on :8080',
        }));
        return { lines: opts.after ? [] : lines, truncated: false };
    }
    const body: Record<string, unknown> = { ...hostRef(host), id };
    if (opts.tail) body.tail = opts.tail;
    if (opts.after) body.after = opts.after;
    const out = await post<Partial<LogBatch>>('/api/docker/logs', body);
    return { lines: Array.isArray(out.lines) ? out.lines : [], truncated: !!out.truncated };
}

/** One batched call per host. A container the daemon would not report on is absent from the map. */
export async function fetchStats(host: DockerHost, ids: string[]): Promise<Record<string, ContainerStats>> {
    if (!ids.length) return {};
    if (isDemoMode()) {
        return Object.fromEntries(ids.map(id => [id, { CPUPercent: 3.2, MemPercent: 14.5, MemUsed: 3e8, MemLimit: 2e9 }]));
    }
    const out = await post<Record<string, ContainerStats>>('/api/docker/stats', { ...hostRef(host), ids });
    return out && typeof out === 'object' ? out : {};
}

export type ContainerAction = 'start' | 'stop' | 'restart';

export async function runAction(host: DockerHost, id: string, action: ContainerAction): Promise<void> {
    if (isDemoMode()) return;
    let res: Response;
    try {
        res = await fetch('/api/docker/action', dockerPost({ ...hostRef(host), id, action }));
    } catch {
        throw new DockerPageError('docker.connection_error');
    }
    if (!res.ok) throw new DockerPageError(await res.text().catch(() => ''), res.status);
}

// ── Rules ──────────────────────────────────────────────────────────────────

export type StateLevel = 'up' | 'warn' | 'off';

/**
 * The colour a state gets: green running, amber while it is restarting or
 * paused, grey for everything that is not running. Never the accent, which is
 * the operator's and can be any colour, red included.
 */
export function stateLevel(state: string): StateLevel {
    const s = (state || '').toLowerCase();
    if (s === 'running') return 'up';
    if (s === 'restarting' || s === 'paused') return 'warn';
    return 'off';
}

/** The i18n key that names a state; anything that is not running or in between reads as stopped. */
export function stateKey(state: string): string {
    const s = (state || '').toLowerCase();
    return s === 'running' ? 'docker.state_running'
        : s === 'restarting' ? 'docker.state_restarting'
            : s === 'paused' ? 'docker.state_paused'
                : 'docker.state_stopped';
}

/**
 * How a reading is coloured: green below 60, amber from 60, red from 90. The same
 * three steps every other meter of the product uses.
 */
export function level(percent: number): 'ok' | 'warn' | 'bad' {
    return percent >= 90 ? 'bad' : percent >= 60 ? 'warn' : 'ok';
}

/** What one host contributed to the list. */
export interface HostRows {
    host: DockerHost;
    containers: DockerContainer[];
    /** The i18n key of why this host has no list, if it has none. */
    error?: string;
    /** False until the first answer, so a host still loading is not shown as empty. */
    loaded: boolean;
}

/** The containers of a host that match what was typed: by name, image or id. */
export function matches(c: DockerContainer, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return containerName(c).toLowerCase().includes(q)
        || (c.Image || '').toLowerCase().includes(q)
        || (c.ID || '').toLowerCase().startsWith(q);
}

/** Running first, then by name: the ones that need looking at are the ones that are up. */
export function sortContainers(list: DockerContainer[]): DockerContainer[] {
    return [...list].sort((a, b) => {
        const ra = stateLevel(a.State || a.Status) === 'off' ? 1 : 0;
        const rb = stateLevel(b.State || b.Status) === 'off' ? 1 : 0;
        return ra - rb || containerName(a).localeCompare(containerName(b));
    });
}

/** The groups the list draws: each host with the containers that pass the filter. */
export function visibleGroups(all: HostRows[], query: string): HostRows[] {
    return all.map(h => ({ ...h, containers: sortContainers(h.containers.filter(c => matches(c, query))) }));
}

/** How many containers are up and how many there are, across every host that answered. */
export function tally(all: HostRows[]): { running: number; total: number; stopped: number } {
    let running = 0;
    let total = 0;
    for (const h of all) {
        for (const c of h.containers) {
            total++;
            if (stateLevel(c.State || c.Status) === 'up') running++;
        }
    }
    return { running, total, stopped: total - running };
}

/**
 * Which container a selection points at now. A container is chosen by host and
 * name, not by id: updating one recreates it under a new id, and a page that held
 * the id would lose what the person was reading at every update.
 */
export function findSelected(all: HostRows[], sel: { hostId: string; name: string } | null): { host: DockerHost; container: DockerContainer } | null {
    if (!sel) return null;
    const h = all.find(x => x.host.id === sel.hostId);
    const c = h?.containers.find(x => containerName(x) === sel.name);
    return h && c ? { host: h.host, container: c } : null;
}

// ── The log buffer ─────────────────────────────────────────────────────────

/** How many lines the page keeps. The browser draws each one, so this is the budget. */
export const MAX_LOG_LINES = 2000;

/**
 * The lines after a poll: what was there, plus what is newer than its last line,
 * and no more than `max` — the oldest are the ones dropped.
 *
 * The server only sends lines after the one it was given, so this is a guard and
 * not the de-duplication: a slow answer that arrives after a faster one must not
 * put older lines back behind newer ones.
 */
export function mergeLogLines(existing: LogLine[], incoming: LogLine[], max = MAX_LOG_LINES): LogLine[] {
    const last = existing.length ? existing[existing.length - 1].t : '';
    const fresh = last ? incoming.filter(l => l.t > last) : incoming;
    const all = fresh.length ? existing.concat(fresh) : existing;
    return all.length > max ? all.slice(all.length - max) : all;
}

/** How many lines fall off the front when `added` more arrive on top of `have`. */
export function overflow(have: number, added: number, max = MAX_LOG_LINES): number {
    return Math.max(0, have + added - max);
}

/**
 * Whether a scroller is at its end, within a few pixels. Following a log means
 * moving the view only when the person has not scrolled away to read something:
 * pulling the text out from under them is the one thing a live log must not do.
 */
export function atBottom(scrollTop: number, clientHeight: number, scrollHeight: number, slack = 24): boolean {
    return scrollHeight - (scrollTop + clientHeight) <= slack;
}

/** The log as plain text, for the clipboard. `stamp` formats a line's time; null leaves times out. */
export function logsToText(lines: LogLine[], stamp: ((t: string) => string) | null): string {
    return lines.map(l => (stamp ? `${stamp(l.t)} ${l.text}` : l.text)).join('\n');
}

/** A log timestamp as a Date, or null when it does not parse. */
export function logDate(t: string): Date | null {
    // Nine fractional digits are more than Date reads; milliseconds are enough to show.
    const d = new Date(t.replace(/(\.\d{3})\d*Z$/, '$1Z'));
    return isNaN(d.getTime()) ? null : d;
}
