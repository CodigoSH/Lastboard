import { dashboardStore } from '../../../store/dashboardStore';
import { GridItem } from '../../../types';
import { i18n } from '../../../services/i18n';

const CSS = `
:host { display: block; }

.overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 9998;
    display: flex;
    align-items: flex-end;
    justify-content: center;
}

.sheet {
    background: var(--panel, #1a1a2e);
    border-radius: 16px 16px 0 0;
    width: 100%;
    max-width: 600px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.4);
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 12px;
    border-bottom: 1px solid var(--border, rgba(255,255,255,0.1));
    flex-shrink: 0;
}

.header-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text, #fff);
}

.btn-close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-dim, rgba(255,255,255,0.5));
    padding: 4px;
    display: flex;
    align-items: center;
    border-radius: 6px;
    transition: color 0.15s;
}
.btn-close:hover { color: var(--text, #fff); }

.list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    position: relative;
}

.item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    cursor: default;
    user-select: none;
    transition: background 0.15s;
    border-radius: 8px;
    margin: 2px 8px;
}
.item.drag-over {
    background: var(--accent-muted, rgba(99,102,241,0.15));
    outline: 1px dashed var(--accent, #6366f1);
}
.item.dragging {
    opacity: 0.4;
}

.item-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    object-fit: contain;
    flex-shrink: 0;
    background: var(--panel-secondary, rgba(255,255,255,0.05));
}
.item-icon-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--panel-secondary, rgba(255,255,255,0.05));
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim, rgba(255,255,255,0.4));
    font-size: 14px;
    font-weight: 600;
}

.item-label {
    flex: 1;
    font-size: 14px;
    color: var(--text, #fff);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.drag-handle {
    color: var(--text-dim, rgba(255,255,255,0.3));
    flex-shrink: 0;
    cursor: grab;
    touch-action: none;
    padding: 4px;
    margin: -4px;
}
.drag-handle:active { cursor: grabbing; }

.footer {
    padding: 12px 16px;
    border-top: 1px solid var(--border, rgba(255,255,255,0.1));
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}

.btn-save {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 10px;
    background: var(--accent, #6366f1);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
}
.btn-save:hover { opacity: 0.85; }

.btn-reset {
    padding: 12px 16px;
    border: 1px solid var(--border, rgba(255,255,255,0.1));
    border-radius: 10px;
    background: none;
    color: var(--text-dim, rgba(255,255,255,0.5));
    font-size: 15px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
}
.btn-reset:hover { color: var(--text, #fff); border-color: var(--text-dim, rgba(255,255,255,0.4)); }
`;

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
        this.shadowRoot!.innerHTML = `
            <style>${CSS}</style>
            <div class="overlay" id="overlay">
                <div class="sheet">
                    <div class="header">
                        <span class="header-title">${i18n.t('mobile_reorder.title') || 'Reorder for mobile'}</span>
                        <button class="btn-close" id="btn-close" aria-label="Close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="list" id="list">
                        ${this._items.map((item, i) => this._renderItem(item, i)).join('')}
                    </div>
                    <div class="footer">
                        <button class="btn-reset" id="btn-reset">${i18n.t('mobile_reorder.reset') || 'Reset'}</button>
                        <button class="btn-save" id="btn-save">${i18n.t('mobile_reorder.save') || 'Save order'}</button>
                    </div>
                </div>
            </div>
        `;
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
