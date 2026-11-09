/**
 * What takes the screen from the board — the three full-screen pages and the settings drawer — and how
 * the top bar moves between them.
 *
 * One at a time: pressing the icon of another one closes the one that is up and opens that, and pressing
 * the icon of the one that is up goes back to the board. Nothing here is drawn and nothing here knows what
 * a page is; each surface hands in two calls, and the rest is the order they happen in.
 *
 * The order is the point. A surface that closes takes its entries off the browser's history with a jump
 * back (`history.go(-n)`), and the browser performs that jump a moment later and announces it with a
 * popstate. A surface that opened in between would push its own entry and then be carried back by the
 * pending jump, landing on the board with a Back button that goes nowhere. So a switch waits for the jump
 * to land before it opens the next one.
 */

export type SurfaceName = 'monitor' | 'proxmox' | 'docker' | 'drawer';

export interface Surface {
    open(): void;
    /** Closes it and takes its history entries off. Returns how many, so a switch knows whether to wait. */
    close(): number;
}

export class Surfaces {
    private active: SurfaceName | null = null;
    /** Where a switch in flight is going; the last icon pressed meanwhile wins. */
    private wanted: SurfaceName | null = null;
    private switching = false;

    /**
     * `settled` resolves when the browser has finished the jump back that closing a surface asked for.
     */
    constructor(
        private readonly views: Record<SurfaceName, Surface>,
        private readonly settled: () => Promise<void>,
    ) { }

    /** Which one is up, or null for the board. */
    get current(): SurfaceName | null { return this.active; }

    /**
     * A surface says it opened or closed. Each can close on its own — its X, Escape, the browser's Back — and
     * the next press has to know it is the board that is showing.
     */
    note(name: SurfaceName, open: boolean): void {
        if (open) this.active = name;
        else if (this.active === name) this.active = null;
    }

    /** An icon was pressed. */
    async toggle(name: SurfaceName): Promise<void> {
        if (this.switching) { this.wanted = name; return; }

        const from = this.active;
        if (from === name) { this.closeActive(); return; }
        if (from === null) { this.views[name].open(); this.active = name; return; }

        this.switching = true;
        this.wanted = name;
        try {
            const steps = this.views[from].close();
            this.active = null;
            if (steps > 0) await this.settled();
            const to = this.wanted;
            if (to) { this.views[to].open(); this.active = to; }
        } finally {
            this.switching = false;
            this.wanted = null;
        }
    }

    /** Back to the board: from the pencil, from choosing another board. */
    closeActive(): void {
        if (this.switching) { this.wanted = null; return; }
        if (!this.active) return;
        const was = this.active;
        this.active = null;
        this.views[was].close();
    }
}

/**
 * Resolves on the next popstate, or after `limit` ms if the browser never sends one — a jump that could
 * not move (it was already at the start) announces nothing, and a switch must not wait for that forever.
 */
export function nextPopstate(target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window, limit = 400): Promise<void> {
    return new Promise(resolve => {
        const done = () => { clearTimeout(timer); target.removeEventListener('popstate', done); resolve(); };
        const timer = setTimeout(done, limit);
        target.addEventListener('popstate', done);
    });
}
