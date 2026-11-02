/**
 * When a full-screen page last had its data, said where the person looks for it, and
 * the pause of its own refresh while the browser asks to save data.
 *
 * The pages refresh on their own, and a page that has been open an hour on a phone
 * whose signal dropped looks exactly like one that has been reading all along: the
 * label under the header says how old what is on screen is, and a refresh that is not
 * running says so.
 */

type Connection = { connection?: { saveData?: boolean; addEventListener?: (type: string, fn: () => void) => void; removeEventListener?: (type: string, fn: () => void) => void } };

/** Whether the browser asks to save data: Data Saver, or a connection the person marked as limited. */
export const savingData = (nav: Connection = navigator as unknown as Connection): boolean => nav?.connection?.saveData === true;

/** Calls back when that changes, and returns what stops listening. */
export function onSavingDataChange(cb: () => void, nav: Connection = navigator as unknown as Connection): () => void {
    const c = nav?.connection;
    if (!c?.addEventListener) return () => { };
    c.addEventListener('change', cb);
    return () => c.removeEventListener?.('change', cb);
}

/**
 * The tick of a refresh nobody asked for: it does nothing while the page is hidden
 * (as whenVisible) and while the browser asks to save data. The button, and opening
 * the page, still read.
 */
export const whenRefreshing = (
    tick: () => unknown,
    saving: () => boolean = savingData,
    hidden: () => boolean = () => typeof document !== 'undefined' && document.hidden,
) => (): void => {
    if (!hidden() && !saving()) void tick();
};

type T = (key: string, params?: Record<string, string>) => string;

/** How a span since `fromMs` is named, or null under a minute (i18n.formatSpan). */
export type SpanOf = (fromMs: number, nowMs: number) => string | null;

/**
 * "Updated 3 min ago", "Updated just now", or nothing before the first reading; with
 * the refresh paused by the data saver, that is said after it.
 */
export function updatedLabel(at: number, now: number, saving: boolean, t: T, spanOf: SpanOf): string {
    if (!at) return saving ? t('infra.refresh_paused') : '';
    const span = spanOf(at, now);
    const age = span === null ? t('infra.updated_now') : t('infra.updated', { time: span });
    return saving ? `${age} · ${t('infra.refresh_paused')}` : age;
}

/** How often the words are written again; a minute is the finest thing they say. */
export const CLOCK_MS = 15000;

/** The label of one page: it knows when the last reading arrived and writes it where the page keeps it. */
export class RefreshClock {
    private at = 0;
    private timer: ReturnType<typeof setInterval> | null = null;
    private stopListening: (() => void) | null = null;

    constructor(
        private readonly slot: () => HTMLElement | null,
        private readonly t: T,
        private readonly spanOf: SpanOf,
    ) { }

    /** A reading arrived (or, opening again, the one the page already held). */
    mark(at = Date.now()): void {
        this.at = at;
        this.paint();
    }

    /** Starts keeping the words current while the page is open. */
    start(): void {
        this.stop();
        this.timer = setInterval(() => this.paint(), CLOCK_MS);
        this.stopListening = onSavingDataChange(() => this.paint());
        this.paint();
    }

    stop(): void {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        this.stopListening?.();
        this.stopListening = null;
    }

    /** Forgets the last reading, for a page opened afresh. */
    reset(): void {
        this.at = 0;
        this.paint();
    }

    paint(): void {
        const el = this.slot();
        if (!el) return;
        const saving = savingData();
        const text = updatedLabel(this.at, Date.now(), saving, this.t, this.spanOf);
        if (el.textContent !== text) el.textContent = text;
        el.classList.toggle('upd--paused', saving);
    }
}
