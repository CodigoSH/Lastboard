/**
 * Reordering a list with a finger.
 *
 * A row is picked up by its `.drag-handle` and a lifted copy of it follows the finger; the row it ends over,
 * judged by the middle of each row, is the one it lands on. Anything else on the list keeps its own touch
 * behaviour, so the list still scrolls and its buttons still take taps.
 *
 * Rows are told apart by their `data-index`, which is where in the list they are. The list itself is not
 * changed here: when a row is dropped on another, the caller is told which to which and redraws.
 */

/** Which of the middles `mids` is nearest to `y`; the first one wins a tie, and -1 means there are none. */
export function nearestRow(mids: number[], y: number): number {
    let best = -1;
    let bestDist = Infinity;
    mids.forEach((mid, i) => {
        const dist = Math.abs(y - mid);
        if (dist < bestDist) { bestDist = dist; best = i; }
    });
    return best;
}

export interface TouchReorderOptions {
    /** The rows that can be dropped on, as a selector. */
    rows: string;
    /** Where the lifted copy is drawn: the shadow root the list is in, so the component's styles reach it. */
    host: ParentNode;
    /** A row was dropped on another one: positions are the rows' `data-index`. */
    onMove(from: number, to: number): void;
    /** Takes the listeners off with it, for a list that is drawn again. */
    signal?: AbortSignal;
}

export function bindTouchReorder(list: HTMLElement, { rows, host, onMove, signal }: TouchReorderOptions): void {
    let from = -1;
    let ghost: HTMLElement | null = null;
    let startY = 0;
    let listTopAtStart = 0;
    let cached: { el: HTMLElement; midY: number }[] = [];

    list.addEventListener('touchstart', (e) => {
        const handle = (e.target as HTMLElement).closest('.drag-handle');
        if (!handle) return;
        const el = handle.closest('[data-index]') as HTMLElement | null;
        if (!el) return;
        e.preventDefault();
        from = parseInt(el.dataset.index!);
        startY = e.touches[0].clientY;

        listTopAtStart = list.getBoundingClientRect().top;
        cached = Array.from(list.querySelectorAll<HTMLElement>(rows)).map(item => ({
            el: item,
            midY: item.offsetTop + item.offsetHeight / 2,
        }));

        const rect = el.getBoundingClientRect();
        ghost = el.cloneNode(true) as HTMLElement;
        ghost.style.cssText = `
            position: fixed; left: ${rect.left}px; top: ${rect.top}px;
            width: ${rect.width}px; opacity: 0.85;
            background: var(--panel, #1a1a2e); border-radius: 8px;
            z-index: 99999; pointer-events: none; box-shadow: 0 4px 16px rgba(0,0,0,0.4);
            transition: none;
        `;
        host.appendChild(ghost);
        el.classList.add('dragging');
    }, { passive: false, signal });

    list.addEventListener('touchmove', (e) => {
        if (from === -1 || !ghost) return;
        e.preventDefault();

        const touchY = e.touches[0].clientY;
        ghost.style.transform = `translateY(${touchY - startY}px)`;

        list.querySelectorAll(rows).forEach(el => el.classList.remove('drag-over'));

        const relY = touchY - listTopAtStart + list.scrollTop;
        const nearest = nearestRow(cached.map(c => c.midY), relY);
        if (nearest >= 0) cached[nearest].el.classList.add('drag-over');
    }, { passive: false, signal });

    list.addEventListener('touchend', () => {
        if (from === -1) return;

        if (ghost) { ghost.remove(); ghost = null; }

        const overEl = list.querySelector<HTMLElement>(`${rows}.drag-over`);
        list.querySelectorAll(rows).forEach(row => {
            row.classList.remove('drag-over');
            row.classList.remove('dragging');
        });

        if (overEl) {
            const to = parseInt(overEl.dataset.index!);
            if (from !== to) onMove(from, to);
        }

        from = -1;
    }, { signal });
}
