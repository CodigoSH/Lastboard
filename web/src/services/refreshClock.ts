/**
 * The pause of a full-screen page's own refresh while the browser asks to save data, said
 * where the person looks for it.
 *
 * The pages refresh on their own, and a refresh that is not running looks exactly like one
 * that is: the label under the header says so while the pause lasts, and says nothing otherwise.
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

/** What the label says: that the refresh is paused while the browser asks to save data, and nothing otherwise. */
export function pausedLabel(saving: boolean, t: T): string {
    return saving ? t('infra.refresh_paused') : '';
}

/** The label of one page: it follows the browser's data saver and writes where the page keeps it. */
export class PauseNotice {
    private stopListening: (() => void) | null = null;

    constructor(
        private readonly slot: () => HTMLElement | null,
        private readonly t: T,
    ) { }

    /** Starts following the data saver while the page is open. */
    start(): void {
        this.stop();
        this.stopListening = onSavingDataChange(() => this.paint());
        this.paint();
    }

    stop(): void {
        this.stopListening?.();
        this.stopListening = null;
    }

    paint(): void {
        const el = this.slot();
        if (!el) return;
        const saving = savingData();
        const text = pausedLabel(saving, this.t);
        if (el.textContent !== text) el.textContent = text;
        el.classList.toggle('upd--paused', saving);
    }
}
