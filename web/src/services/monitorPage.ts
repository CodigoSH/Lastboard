/**
 * What the status page decides that is a rule and not a drawing: what state a
 * service is in, which of them need looking at and why, the totals of the four
 * indicators, how the inventory is filtered, ordered and grouped, and how the
 * checks of one service are folded into a chart.
 *
 * Pure on purpose — no DOM, no network, no stores — so every rule can be read
 * and tested, and so the cards, the list and the panel cannot disagree about
 * whether a service is "slow".
 */

export interface Beat { status: string; at: string }

/** One service as GET /api/monitor/overview lists it. */
export interface ServiceRow {
    item_id: number;
    name: string;
    status: 'up' | 'down' | 'none';
    uptime_pct: number;
    latency_ms: number | null;
    heartbeat: Beat[];
    url: string;
    board: string;
    icon: string;
    status_code: number;
    checked_at: string | null;
    down_since: string | null;
    uptime_7d: number;
    uptime_30d: number;
    avg_ms_24h: number | null;
}

/** One outage, as GET /api/monitor/incidents (or one service's history) lists it. */
export interface Outage {
    item_id?: number;
    name?: string;
    start: string;
    end: string | null;
    duration_sec: number;
    status_code: number;
}

/** One bucket of the fleet's response, as GET /api/monitor/trend lists it. */
export interface TrendPoint { at: string; mean_ms: number | null; max_ms: number | null; uptime_pct: number | null }

/** One recorded check, as one service's history lists them. */
export interface Check { checked_at: string; up: boolean; latency_ms: number | null; status_code: number }

const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * A row as the page uses it. A server from before the status page returns only
 * six of these fields: the rest take the value that says "not known" instead of
 * breaking the page.
 */
export function readRow(raw: Partial<ServiceRow> & { item_id: number }): ServiceRow {
    const status = raw.status === 'up' || raw.status === 'down' ? raw.status : 'none';
    return {
        item_id: raw.item_id,
        name: str(raw.name),
        status,
        uptime_pct: num(raw.uptime_pct, -1),
        latency_ms: typeof raw.latency_ms === 'number' ? raw.latency_ms : null,
        heartbeat: Array.isArray(raw.heartbeat) ? raw.heartbeat : [],
        url: str(raw.url),
        board: str(raw.board),
        icon: str(raw.icon),
        status_code: num(raw.status_code, 0),
        checked_at: typeof raw.checked_at === 'string' ? raw.checked_at : null,
        down_since: typeof raw.down_since === 'string' ? raw.down_since : null,
        uptime_7d: num(raw.uptime_7d, -1),
        uptime_30d: num(raw.uptime_30d, -1),
        avg_ms_24h: typeof raw.avg_ms_24h === 'number' ? raw.avg_ms_24h : null,
    };
}

// ── State ──────────────────────────────────────────────────────────────────

export type ServiceState = 'up' | 'slow' | 'down' | 'none';

/** How many times its usual response a service may take before it is called slow. */
export const SLOW_FACTOR = 2.5;
/** …and by at least this much, so a service that goes from 20 ms to 60 ms is not "slow". */
export const SLOW_MARGIN_MS = 300;

/** Answering, but far slower than it usually does. */
export function isSlow(r: ServiceRow): boolean {
    if (r.status !== 'up' || r.latency_ms === null || !r.avg_ms_24h || r.avg_ms_24h <= 0) return false;
    return r.latency_ms > r.avg_ms_24h * SLOW_FACTOR && r.latency_ms - r.avg_ms_24h >= SLOW_MARGIN_MS;
}

export function stateOf(r: ServiceRow): ServiceState {
    if (r.status === 'down') return 'down';
    if (r.status === 'none') return 'none';
    return isSlow(r) ? 'slow' : 'up';
}

// ── Totals ─────────────────────────────────────────────────────────────────

export interface FleetTotals {
    total: number;
    up: number;
    slow: number;
    down: number;
    none: number;
    /** Mean availability over 24 h, 7 d and 30 d of the services that have data; -1 when none has. */
    avail24: number;
    avail7: number;
    avail30: number;
    /** Mean of what the answering services take right now, and of their own 24 h means; null with none. */
    latencyNow: number | null;
    latencyAvg: number | null;
    /** The slowest of those answering now. */
    slowest: ServiceRow | null;
}

const meanOf = (values: number[]): number => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : -1);

export function fleetTotals(rows: ServiceRow[]): FleetTotals {
    const t: FleetTotals = { total: rows.length, up: 0, slow: 0, down: 0, none: 0, avail24: -1, avail7: -1, avail30: -1, latencyNow: null, latencyAvg: null, slowest: null };
    for (const r of rows) {
        const s = stateOf(r);
        if (s === 'down') t.down++;
        else if (s === 'none') t.none++;
        else { t.up++; if (s === 'slow') t.slow++; }
    }
    t.avail24 = meanOf(rows.filter(r => r.uptime_pct >= 0).map(r => r.uptime_pct));
    t.avail7 = meanOf(rows.filter(r => r.uptime_7d >= 0).map(r => r.uptime_7d));
    t.avail30 = meanOf(rows.filter(r => r.uptime_30d >= 0).map(r => r.uptime_30d));
    const answering = rows.filter(r => r.status === 'up' && r.latency_ms !== null);
    if (answering.length) {
        t.latencyNow = answering.reduce((a, r) => a + (r.latency_ms as number), 0) / answering.length;
        t.slowest = [...answering].sort((a, b) => (b.latency_ms as number) - (a.latency_ms as number))[0];
    }
    const avgs = rows.filter(r => r.avg_ms_24h !== null).map(r => r.avg_ms_24h as number);
    if (avgs.length) t.latencyAvg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
    return t;
}

// ── Attention ──────────────────────────────────────────────────────────────

export type AttentionKind = 'off' | 'down' | 'slow' | 'unstable' | 'none';

/** A service that answers now but was down inside the last day: its 24-hour availability under this is a warning. */
export const UNSTABLE_BELOW = 99;

export interface AttentionItem {
    kind: AttentionKind;
    /** The service it is about; absent for what concerns the page itself. */
    id?: number;
    name?: string;
}

const ATTENTION_RANK: Record<AttentionKind, number> = { down: 0, off: 1, slow: 2, unstable: 3, none: 4 };

/**
 * What needs a look, the worst first: services that do not answer, then the
 * fact that nothing is being recorded (when 24/7 is off), then the slow ones,
 * then those that have never been checked.
 */
export function attentionList(rows: ServiceRow[], mode: string): AttentionItem[] {
    const out: AttentionItem[] = [];
    if (mode !== 'background') out.push({ kind: 'off' });
    for (const r of rows) {
        const s = stateOf(r);
        if (s === 'down' || s === 'slow' || s === 'none') out.push({ kind: s, id: r.item_id, name: r.name });
        // It answers and is not slow, yet it failed inside the day: the outage is over, and still worth a look.
        else if (r.uptime_pct >= 0 && r.uptime_pct < UNSTABLE_BELOW) out.push({ kind: 'unstable', id: r.item_id, name: r.name });
    }
    return out.sort((a, b) => ATTENTION_RANK[a.kind] - ATTENTION_RANK[b.kind] || (a.name ?? '').localeCompare(b.name ?? ''));
}

/** How many of them are a warning rather than a note: the number the tab and the box carry. */
export const attentionCount = (list: AttentionItem[]): number => list.filter(a => a.kind !== 'none').length;

// ── The inventory ──────────────────────────────────────────────────────────

export type StateFilter = 'all' | 'up' | 'down' | 'none';
export type SortKey = 'state' | 'name' | 'uptime' | 'response';
export const STATE_FILTERS: readonly StateFilter[] = ['all', 'up', 'down', 'none'];
export const SORT_KEYS: readonly SortKey[] = ['state', 'name', 'uptime', 'response'];

export const isStateFilter = (v: unknown): v is StateFilter => typeof v === 'string' && (STATE_FILTERS as readonly string[]).includes(v);
export const isSortKey = (v: unknown): v is SortKey => typeof v === 'string' && (SORT_KEYS as readonly string[]).includes(v);

/** What the search box matches: the name, the address and the board it lives on. */
export const haystack = (r: ServiceRow): string => `${r.name} ${r.url} ${r.board}`.toLowerCase();

/** "Running" counts a slow service too: it answers. */
export function passes(r: ServiceRow, query: string, filter: StateFilter): boolean {
    const q = query.trim().toLowerCase();
    if (q && !haystack(r).includes(q)) return false;
    switch (filter) {
        case 'up': return r.status === 'up';
        case 'down': return r.status === 'down';
        case 'none': return r.status === 'none';
        default: return true;
    }
}

export function countByFilter(rows: ServiceRow[]): Record<StateFilter, number> {
    return {
        all: rows.length,
        up: rows.filter(r => r.status === 'up').length,
        down: rows.filter(r => r.status === 'down').length,
        none: rows.filter(r => r.status === 'none').length,
    };
}

const STATE_RANK: Record<ServiceState, number> = { down: 0, slow: 1, up: 2, none: 3 };

/** A new array, ordered. Ties fall back to the name so the order does not shuffle on a refresh. */
export function sortRows(list: ServiceRow[], key: SortKey): ServiceRow[] {
    const byName = (a: ServiceRow, b: ServiceRow) => a.name.localeCompare(b.name);
    const cmp = key === 'state' ? (a: ServiceRow, b: ServiceRow) => STATE_RANK[stateOf(a)] - STATE_RANK[stateOf(b)] || byName(a, b)
        // Least available first: it is the one to look at. A service with no data goes last.
        : key === 'uptime' ? (a: ServiceRow, b: ServiceRow) => (a.uptime_pct < 0 ? 1 : 0) - (b.uptime_pct < 0 ? 1 : 0) || a.uptime_pct - b.uptime_pct || byName(a, b)
            // Slowest first; a service that did not answer has no time to compare and goes last.
            : key === 'response' ? (a: ServiceRow, b: ServiceRow) => (b.latency_ms ?? -1) - (a.latency_ms ?? -1) || byName(a, b)
                : byName;
    return [...list].sort(cmp);
}

export interface RowGroup { name: string; rows: ServiceRow[] }

/** The boards, in the order their first service appears; services on no board go under an empty name, last. */
export function groupRows(list: ServiceRow[], grouped: boolean): RowGroup[] {
    if (!grouped) return [{ name: '', rows: list }];
    const map = new Map<string, ServiceRow[]>();
    for (const r of list) map.set(r.board, [...(map.get(r.board) ?? []), r]);
    const named = [...map.entries()].filter(([n]) => n !== '').map(([name, rows]) => ({ name, rows }));
    return map.has('') ? [...named, { name: '', rows: map.get('') as ServiceRow[] }] : named;
}

/** The services with the lowest availability over 30 days, the lowest first. Those with no data are not "0 %". */
export function lowestAvailability(rows: ServiceRow[], n = 5): ServiceRow[] {
    return rows.filter(r => r.uptime_30d >= 0).sort((a, b) => a.uptime_30d - b.uptime_30d || a.name.localeCompare(b.name)).slice(0, n);
}

// ── Outages ────────────────────────────────────────────────────────────────

export interface OutageTotals {
    count: number;
    ongoing: number;
    /** Seconds without service, summed over every outage (an ongoing one up to now). */
    downSec: number;
    /** Mean length of the outages that already ended; null when none has. */
    meanRecoverySec: number | null;
    recovered: number;
}

export function outageTotals(list: Outage[]): OutageTotals {
    const closed = list.filter(o => o.end !== null);
    return {
        count: list.length,
        ongoing: list.length - closed.length,
        downSec: list.reduce((a, o) => a + Math.max(0, o.duration_sec), 0),
        meanRecoverySec: closed.length ? closed.reduce((a, o) => a + o.duration_sec, 0) / closed.length : null,
        recovered: closed.length,
    };
}

export type OutageFilter = 'all' | 'ongoing' | 'recovered';
export const isOutageFilter = (v: unknown): v is OutageFilter => v === 'all' || v === 'ongoing' || v === 'recovered';

/** The most pressing first: what is down now, then the rest from the newest to the oldest. Never changes the list it is given. */
export function sortOutages<T extends { start: string; end: string | null }>(list: T[]): T[] {
    const at = (o: T) => { const n = Date.parse(o.start); return Number.isFinite(n) ? n : 0; };
    return [...list].sort((x, y) => (x.end === null ? 0 : 1) - (y.end === null ? 0 : 1) || at(y) - at(x));
}

export function filterOutages(list: Outage[], filter: OutageFilter): Outage[] {
    return filter === 'ongoing' ? list.filter(o => o.end === null) : filter === 'recovered' ? list.filter(o => o.end !== null) : list;
}

// ── Series ─────────────────────────────────────────────────────────────────

/**
 * The fleet's response as numbers a chart can draw. A bucket where nothing
 * answered has no latency; drawing it as 0 would read as "instant", so it takes
 * the nearest reading before it (or after it, at the start). With nothing
 * anywhere there is nothing to draw: an empty list.
 */
export function fillGaps(values: (number | null)[]): number[] {
    const first = values.find(v => v !== null);
    if (first === undefined || first === null) return [];
    let last = first;
    return values.map(v => { if (v !== null) last = v; return last; });
}

/** The two lines of the fleet's chart, from the buckets the server returns. */
export function trendSeries(points: TrendPoint[]): { mean: number[]; max: number[]; at: number[] } {
    const mean = fillGaps(points.map(p => p.mean_ms));
    const max = fillGaps(points.map(p => p.max_ms));
    if (!mean.length || !max.length) return { mean: [], max: [], at: [] };
    return { mean, max, at: points.map(p => Date.parse(p.at)) };
}

/**
 * One service's response over a range as `n` buckets of the checks that answered,
 * oldest first. Folding them here keeps the chart the same size whether it spans
 * a day or a month; a bucket with no answer repeats the one before it.
 */
export function bucketLatency(checks: Check[], sinceMs: number, nowMs: number, n = 60): { values: number[]; at: number[] } {
    if (n <= 0 || nowMs <= sinceMs) return { values: [], at: [] };
    const width = (nowMs - sinceMs) / n;
    const sum = new Array<number>(n).fill(0);
    const count = new Array<number>(n).fill(0);
    for (const c of checks) {
        if (!c.up || c.latency_ms === null) continue;
        const i = Math.min(n - 1, Math.floor((Date.parse(c.checked_at) - sinceMs) / width));
        if (i < 0) continue;
        sum[i] += c.latency_ms;
        count[i]++;
    }
    const values = fillGaps(sum.map((s, i) => (count[i] ? s / count[i] : null)));
    return { values, at: values.length ? Array.from({ length: n }, (_, i) => sinceMs + i * width) : [] };
}

/** What the server calls a range, from the label the person picked. */
export type RangeLabel = '24 h' | '7 d' | '30 d';
export const RANGES: readonly RangeLabel[] = ['24 h', '7 d', '30 d'];
export const rangeParam = (r: RangeLabel): '24h' | '7d' | '30d' => (r === '24 h' ? '24h' : r === '7 d' ? '7d' : '30d');
export const rangeMs = (r: RangeLabel): number => (r === '24 h' ? 1 : r === '7 d' ? 7 : 30) * 86400000;
export const isRange = (v: unknown): v is RangeLabel => typeof v === 'string' && (RANGES as readonly string[]).includes(v);
