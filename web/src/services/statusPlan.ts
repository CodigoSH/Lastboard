/**
 * Deciding what a status check does, apart from doing it.
 *
 * The dots used to flash back to yellow, one after another, on a board whose
 * services were all up. Every check began by marking every dot "checking" —
 * including the ones already green — and then waited for one request that
 * answers only when the slowest service has (a dead host costs five seconds, ten
 * at a time). Checks were started by three things at once, so they overlapped.
 *
 * What is decided here, with no browser and no network:
 *   - which dots go yellow: only the ones with nothing known yet;
 *   - which bookmarks are asked about: all of them on the timer, only the
 *     unknown ones when the board's contents changed;
 *   - how the question is split, so that fast answers are shown at once;
 *   - that one check runs at a time, and a request made meanwhile runs once after.
 */

export type Scope = 'all' | 'unknown';
export type Known = 'up' | 'down' | 'pending';

export interface CheckableItem {
    id: number;
    type: string;
    content: unknown;
    status?: Known;
}

export interface StatusPlan {
    /** Dots to turn yellow: those with no answer to show yet. */
    pending: number[];
    /** Bookmarks with no usable address: down at once, nothing to ask. */
    invalid: number[];
    /** Address -> the bookmarks pointing at it, so each address is asked once. */
    byUrl: Map<string, number[]>;
    /** The addresses, in groups the server probes together. */
    chunks: string[][];
}

/** What the server probes at once (healthBatchConcurrency): a group this size answers as one. */
export const CHUNK_SIZE = 10;

function parse(content: unknown): { url?: string; statusCheck?: boolean } | null {
    if (typeof content === 'string') {
        try { return JSON.parse(content); } catch { return null; }
    }
    return (content as { url?: string; statusCheck?: boolean }) ?? null;
}

export function planStatusCheck(items: CheckableItem[], scope: Scope, chunkSize = CHUNK_SIZE): StatusPlan {
    const plan: StatusPlan = { pending: [], invalid: [], byUrl: new Map(), chunks: [] };

    for (const item of items) {
        if (item.type !== 'bookmark') continue;
        const content = parse(item.content);
        if (!content || content.statusCheck !== true) continue;

        // 'pending' left over from a check that never finished is as unknown as nothing.
        const unknown = item.status === undefined || item.status === 'pending';
        if (scope === 'unknown' && !unknown) continue;
        if (item.status === undefined) plan.pending.push(item.id);

        const url = content.url;
        if (!url || url === '#' || url.startsWith('javascript:')) {
            plan.invalid.push(item.id);
            continue;
        }
        const ids = plan.byUrl.get(url) ?? [];
        ids.push(item.id);
        plan.byUrl.set(url, ids);
    }

    const urls = [...plan.byUrl.keys()];
    for (let i = 0; i < urls.length; i += chunkSize) plan.chunks.push(urls.slice(i, i + chunkSize));
    return plan;
}

/** 'all' wins over 'unknown': a request for everything includes the rest. */
export function mergeScope(a: Scope | null, b: Scope): Scope {
    return a === 'all' || b === 'all' ? 'all' : 'unknown';
}

/**
 * Runs one check at a time. A request that arrives while one is running does
 * not start another beside it (the older answer could land after the newer);
 * it is remembered, merged with any others, and runs once when the first is done.
 */
export class OneAtATime {
    private running = false;
    private queued: Scope | null = null;

    constructor(private readonly exec: (scope: Scope) => Promise<void>) {}

    get busy(): boolean { return this.running; }

    async request(scope: Scope): Promise<void> {
        if (this.running) {
            this.queued = mergeScope(this.queued, scope);
            return;
        }
        this.running = true;
        try {
            await this.exec(scope);
        } finally {
            this.running = false;
        }
        const next = this.queued;
        this.queued = null;
        if (next) await this.request(next);
    }
}
