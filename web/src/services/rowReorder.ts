/**
 * Lets the rows of a list be arranged by their handles.
 *
 * The order is whatever the rows are in when the form is saved, so moving a row is
 * just moving it in the DOM. Mouse and touch both work, and so do the arrow keys on a
 * focused handle for anybody not using a pointer. A row only moves among its own
 * siblings: Docker keeps the order of each host apart.
 *
 * The rows carry the classes `dragging`, `drag-over-top` and `drag-over-bottom` while
 * a move is under way; the sheet draws them.
 */
export function bindRowReorder(
    box: HTMLElement,
    root: Document | ShadowRoot,
    opts: { row: string; handle: string },
): void {
    // The list is redrawn when it is filled again; the listeners sit on the box.
    if (box.dataset.reorder === '1') return;
    box.dataset.reorder = '1';

    const rowOf = (el: EventTarget | null) => (el as HTMLElement | null)?.closest<HTMLElement>(opts.row) ?? null;
    const clear = () => box.querySelectorAll('.drag-over-top, .drag-over-bottom, .dragging')
        .forEach(n => n.classList.remove('drag-over-top', 'drag-over-bottom', 'dragging'));
    // Above or below the middle of the row it is over.
    const below = (row: HTMLElement, y: number) => {
        const r = row.getBoundingClientRect();
        return y > r.top + r.height / 2;
    };
    const mark = (row: HTMLElement, y: number) => {
        box.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(n => n.classList.remove('drag-over-top', 'drag-over-bottom'));
        row.classList.add(below(row, y) ? 'drag-over-bottom' : 'drag-over-top');
    };
    const drop = (from: HTMLElement | null, onto: HTMLElement | null, y: number) => {
        if (!from || !onto || from === onto || from.parentElement !== onto.parentElement) return;
        if (below(onto, y)) onto.after(from); else onto.before(from);
    };

    // Mouse. The row is only draggable while the handle is held: a draggable
    // row would take the text selection away from the fields inside it.
    let dragging: HTMLElement | null = null;
    box.addEventListener('mousedown', (e) => {
        const handle = (e.target as HTMLElement).closest(opts.handle);
        if (handle) rowOf(handle)!.draggable = true;
    });
    box.addEventListener('dragstart', (e) => {
        const row = rowOf(e.target);
        if (!row || !row.draggable) { e.preventDefault(); return; }
        dragging = row;
        row.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/plain', row.dataset.name || '');
    });
    box.addEventListener('dragover', (e) => {
        const row = rowOf(e.target);
        if (!dragging || !row || row.parentElement !== dragging.parentElement) return;
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        mark(row, e.clientY);
    });
    box.addEventListener('drop', (e) => {
        e.preventDefault();
        drop(dragging, rowOf(e.target), e.clientY);
    });
    box.addEventListener('dragend', () => {
        if (dragging) dragging.draggable = false;
        dragging = null;
        clear();
    });

    // Touch: the handle starts it, and whichever row is under the finger is the target.
    let touching: HTMLElement | null = null;
    let lastY = 0;
    box.addEventListener('touchstart', (e) => {
        const handle = (e.target as HTMLElement).closest(opts.handle);
        if (!handle) return;
        touching = rowOf(handle);
        touching?.classList.add('dragging');
        e.preventDefault();
    }, { passive: false });
    box.addEventListener('touchmove', (e) => {
        if (!touching) return;
        e.preventDefault();
        const t = e.touches[0];
        lastY = t.clientY;
        const over = rowOf(root.elementFromPoint(t.clientX, t.clientY) ?? null);
        if (over && over !== touching && over.parentElement === touching.parentElement) mark(over, t.clientY);
    }, { passive: false });
    const endTouch = () => {
        if (!touching) return;
        const target = box.querySelector<HTMLElement>('.drag-over-top, .drag-over-bottom');
        drop(touching, target, lastY);
        touching = null;
        clear();
    };
    box.addEventListener('touchend', endTouch);
    box.addEventListener('touchcancel', () => { touching = null; clear(); });

    // Keyboard: arrows on a focused handle move its row past the next one shown.
    box.addEventListener('keydown', (e) => {
        const handle = (e.target as HTMLElement).closest(opts.handle);
        if (!handle || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
        e.preventDefault();
        const row = rowOf(handle)!;
        const up = e.key === 'ArrowUp';
        let next = (up ? row.previousElementSibling : row.nextElementSibling) as HTMLElement | null;
        // A row the filters hide is not a place the person can see to move past.
        while (next && next.style.display === 'none') {
            next = (up ? next.previousElementSibling : next.nextElementSibling) as HTMLElement | null;
        }
        if (!next) return;
        if (up) next.before(row); else next.after(row);
        row.querySelector<HTMLElement>(opts.handle)?.focus();
    });
}
