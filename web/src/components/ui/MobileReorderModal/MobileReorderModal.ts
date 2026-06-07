import { dashboardStore } from '../../../store/dashboardStore';
import { GridItem } from '../../../types';
import { mobileReorderTemplate } from './MobileReorderModal.template';
import css from './MobileReorderModal.css' with { type: 'text' };

export class MobileReorderModal extends HTMLElement {
    private _items: GridItem[] = [];
    private _dragSrcIndex: number = -1;
    private _dragAbortController: AbortController | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const state = dashboardStore.getState();
        // Get all visible touch bookmarks sorted by current mobile_order
        this._items = state.items
            .filter(item => {
                if (item.type !== 'bookmark') return false;
                let content: any = item.content;
                if (typeof content === 'string') {
                    try { content = JSON.parse(content); } catch { return false; }
                }
                return content?.visibleTouch !== false;
            })
            .sort((a, b) => {
                const aHas = a.mobile_order != null;
                const bHas = b.mobile_order != null;
                if (aHas && bHas) return a.mobile_order! - b.mobile_order!;
                if (aHas) return -1;
                if (bHas) return 1;
                return a.y !== b.y ? a.y - b.y : a.x - b.x;
            });

        this.render();
        this.bindEvents();
    }

    private render() {
        const itemsHtml = this._items.map((item, i) => this._renderItem(item, i)).join('');
        this.shadowRoot!.innerHTML = mobileReorderTemplate(itemsHtml, css);
    }

    private _renderItem(item: GridItem, index: number): string {
        let content: any = item.content;
        if (typeof content === 'string') {
            try { content = JSON.parse(content); } catch { content = {}; }
        }
        const label = content.label || `Item ${item.id}`;
        const icon = content.icon || '';
        const iconHtml = icon
            ? `<img class="item-icon" src="${icon}" alt="" draggable="false">`
            : `<div class="item-icon-placeholder">${label.charAt(0).toUpperCase()}</div>`;

        return `
            <div class="item" draggable="true" data-index="${index}">
                ${iconHtml}
                <span class="item-label">${label}</span>
                <svg class="drag-handle" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="6" r="1.5" fill="currentColor"/>
                    <circle cx="15" cy="6" r="1.5" fill="currentColor"/>
                    <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="9" cy="18" r="1.5" fill="currentColor"/>
                    <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
                </svg>
            </div>
        `;
    }

    private bindEvents() {
        const sr = this.shadowRoot!;

        sr.getElementById('btn-close')!.addEventListener('click', () => this._close());
        sr.getElementById('overlay')!.addEventListener('click', (e) => {
            if (e.target === sr.getElementById('overlay')) this._close();
        });

        sr.getElementById('btn-save')!.addEventListener('click', () => this._save());
        sr.getElementById('btn-reset')!.addEventListener('click', () => this._reset());

        this._bindDrag();
    }

    private _bindDrag() {
        // Abort any previous listeners to prevent stacking after re-renders
        if (this._dragAbortController) {
            this._dragAbortController.abort();
        }
        this._dragAbortController = new AbortController();
        const signal = this._dragAbortController.signal;

        const list = this.shadowRoot!.getElementById('list')!;

        list.addEventListener('dragstart', (e) => {
            // Only allow drag when initiated from the drag handle
            const handle = (e.target as HTMLElement).closest('.drag-handle');
            if (!handle) { e.preventDefault(); return; }
            const el = handle.closest('[data-index]') as HTMLElement | null;
            if (!el) return;
            this._dragSrcIndex = parseInt(el.dataset.index!);
            el.classList.add('dragging');
            e.dataTransfer!.effectAllowed = 'move';
        }, { signal });

        list.addEventListener('dragend', (e) => {
            const el = (e.target as HTMLElement).closest('[data-index]') as HTMLElement | null;
            if (el) el.classList.remove('dragging');
            list.querySelectorAll('.item').forEach(i => i.classList.remove('drag-over'));
        }, { signal });

        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'move';
            const el = (e.target as HTMLElement).closest('[data-index]') as HTMLElement | null;
            if (!el) return;
            list.querySelectorAll('.item').forEach(i => i.classList.remove('drag-over'));
            el.classList.add('drag-over');
        }, { signal });

        list.addEventListener('drop', (e) => {
            e.preventDefault();
            const el = (e.target as HTMLElement).closest('[data-index]') as HTMLElement | null;
            if (!el) return;
            const destIndex = parseInt(el.dataset.index!);
            if (this._dragSrcIndex === destIndex) return;

            const moved = this._items.splice(this._dragSrcIndex, 1)[0];
            this._items.splice(destIndex, 0, moved);

            list.innerHTML = this._items.map((item, i) => this._renderItem(item, i)).join('');
            this._bindDrag();
        }, { signal });

        // Touch support (uses same AbortController signal)
        this._bindTouchDrag(list, signal);
    }

    private _bindTouchDrag(list: HTMLElement, signal: AbortSignal) {
        let touchSrcIndex = -1;
        let ghost: HTMLElement | null = null;
        let startY = 0;
        // Position of the list's top edge at drag start (viewport coords)
        let listTopAtStart = 0;
        // Pre-cached item midpoints relative to the list's scrollable content.
        // Using offsetTop (relative to list, which has position:relative) avoids
        // getBoundingClientRect() drift that occurs inside fixed-position shadow DOM
        // overlays on mobile browsers.
        interface CachedItem { el: HTMLElement; midY: number; }
        let cachedItems: CachedItem[] = [];

        list.addEventListener('touchstart', (e) => {
            // Only start drag when the finger lands on the drag handle
            const handle = (e.target as HTMLElement).closest('.drag-handle');
            if (!handle) return; // Allow normal scroll on the rest of the row
            const el = handle.closest('[data-index]') as HTMLElement | null;
            if (!el) return;
            e.preventDefault();
            touchSrcIndex = parseInt(el.dataset.index!);
            startY = e.touches[0].clientY;

            // Snapshot list top and item positions once at drag start.
            // These don't change during the drag since items don't reflow.
            listTopAtStart = list.getBoundingClientRect().top;
            cachedItems = Array.from(list.querySelectorAll<HTMLElement>('.item')).map(item => ({
                el: item,
                midY: item.offsetTop + item.offsetHeight / 2
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
            // Append inside shadow root so CSS variables resolve correctly
            this.shadowRoot!.appendChild(ghost);
            el.classList.add('dragging');
        }, { passive: false, signal });

        list.addEventListener('touchmove', (e) => {
            if (touchSrcIndex === -1 || !ghost) return;
            e.preventDefault();

            const touchY = e.touches[0].clientY;
            ghost.style.transform = `translateY(${touchY - startY}px)`;

            list.querySelectorAll('.item').forEach(el => el.classList.remove('drag-over'));

            // Convert touch viewport Y to a position within the list's scrollable content.
            // This is reliable even when the overlay is position:fixed and scrolled.
            const relY = touchY - listTopAtStart + list.scrollTop;

            let closestEl: HTMLElement | null = null;
            let closestDist = Infinity;
            cachedItems.forEach(({ el, midY }) => {
                const dist = Math.abs(relY - midY);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEl = el;
                }
            });
            if (closestEl) (closestEl as HTMLElement).classList.add('drag-over');
        }, { passive: false, signal });

        list.addEventListener('touchend', () => {
            if (touchSrcIndex === -1) return;

            if (ghost) { ghost.remove(); ghost = null; }

            const overEl = list.querySelector<HTMLElement>('.item.drag-over');
            list.querySelectorAll('.item').forEach(i => {
                i.classList.remove('drag-over');
                i.classList.remove('dragging');
            });

            if (overEl) {
                const destIndex = parseInt(overEl.dataset.index!);
                if (touchSrcIndex !== destIndex) {
                    const moved = this._items.splice(touchSrcIndex, 1)[0];
                    this._items.splice(destIndex, 0, moved);
                    list.innerHTML = this._items.map((item, i) => this._renderItem(item, i)).join('');
                    this._bindDrag();
                }
            }

            touchSrcIndex = -1;
        }, { signal });
    }

    private async _save() {
        // Assign sequential mobile_order values
        const updates = this._items.map((item, i) => ({ id: item.id, mobile_order: i }));
        for (const u of updates) {
            await dashboardStore.updateItem(u);
        }
        this._close();
    }

    private async _reset() {
        // Clear mobile_order for all items (set to null by sending -1 sentinel...
        // actually, backend won't handle null via current PATCH. Use a dedicated clear.)
        // Simplest approach: set mobile_order to very large numbers to push all to "unordered",
        // but actually we need to clear. Let's just re-sort to default y/x and assign fresh.
        // Better: send mobile_order: null — but backend doesn't handle null sentinel yet.
        // For now, sort by y/x and reassign sequential order so users can start fresh.
        this._items.sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
        const updates = this._items.map((item, i) => ({ id: item.id, mobile_order: i }));
        for (const u of updates) {
            await dashboardStore.updateItem(u);
        }
        this._close();
    }

    private _close() {
        this.remove();
    }
}

if (!customElements.get('mobile-reorder-modal')) {
    customElements.define('mobile-reorder-modal', MobileReorderModal);
}
