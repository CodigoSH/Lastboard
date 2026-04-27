import { dashboardStore } from '../../../store/dashboardStore';
import { Dashboard } from '../../../types';
import { i18n } from '../../../services/i18n';

const CSS = `
:host { display: block; }

.overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 9998;
    display: flex;
    align-items: center;
    justify-content: center;
}

.sheet {
    background: var(--panel, #1a1a2e);
    border-radius: 12px;
    width: 100%;
    max-width: 440px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    margin: 16px;
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

.item-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent, #6366f1);
    flex-shrink: 0;
    opacity: 0.5;
}
.item-dot.is-default {
    opacity: 1;
    box-shadow: 0 0 0 2px var(--accent, #6366f1);
}

.item-name {
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

.btn-cancel {
    padding: 12px 16px;
    border: 1px solid var(--border, rgba(255,255,255,0.1));
    border-radius: 10px;
    background: none;
    color: var(--text-dim, rgba(255,255,255,0.5));
    font-size: 15px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
}
.btn-cancel:hover { color: var(--text, #fff); border-color: var(--text-dim, rgba(255,255,255,0.4)); }
`;

export class DashboardManagerModal extends HTMLElement {
    private _dashboards: Dashboard[] = [];
    private _dragSrcIndex: number = -1;
    private _dragAbortController: AbortController | null = null;
    private _dragFromHandle: boolean = false;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const state = dashboardStore.getState();
        this._dashboards = [...state.dashboards].sort((a, b) => a.position - b.position);
        this.render();
        this.bindEvents();
    }

    private render() {
        this.shadowRoot!.innerHTML = `
            <style>${CSS}</style>
            <div class="overlay" id="overlay">
                <div class="sheet">
                    <div class="header">
                        <span class="header-title">${i18n.t('dashboard.manage_order')}</span>
                        <button class="btn-close" id="btn-close" aria-label="Close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="list" id="list">
                        ${this._dashboards.map((d, i) => this._renderItem(d, i)).join('')}
                    </div>
                    <div class="footer">
                        <button class="btn-cancel" id="btn-cancel">${i18n.t('general.cancel')}</button>
                        <button class="btn-save" id="btn-save">${i18n.t('dashboard.save_order')}</button>
                    </div>
                </div>
            </div>
        `;
    }

    private _renderItem(d: Dashboard, index: number): string {
        return `
            <div class="item" draggable="true" data-index="${index}">
                <span class="item-dot ${d.is_default ? 'is-default' : ''}"></span>
                <span class="item-name">${this._escape(d.name)}</span>
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

    private _escape(s: string): string {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    private bindEvents() {
        const sr = this.shadowRoot!;

        sr.getElementById('btn-close')!.addEventListener('click', () => this._close());
        sr.getElementById('btn-cancel')!.addEventListener('click', () => this._close());
        sr.getElementById('overlay')!.addEventListener('click', (e) => {
            if (e.target === sr.getElementById('overlay')) this._close();
        });
        sr.getElementById('btn-save')!.addEventListener('click', () => this._save());

        this._bindDrag();
    }

    private _bindDrag() {
        if (this._dragAbortController) {
            this._dragAbortController.abort();
        }
        this._dragAbortController = new AbortController();
        const signal = this._dragAbortController.signal;
        const list = this.shadowRoot!.getElementById('list')!;

        // Track whether mousedown originated on the drag handle
        list.addEventListener('mousedown', (e) => {
            this._dragFromHandle = !!(e.target as HTMLElement).closest('.drag-handle');
        }, { signal });

        list.addEventListener('dragstart', (e) => {
            if (!this._dragFromHandle) { e.preventDefault(); return; }
            const el = (e.target as HTMLElement).closest('[data-index]') as HTMLElement | null;
            if (!el) { e.preventDefault(); return; }
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

            const moved = this._dashboards.splice(this._dragSrcIndex, 1)[0];
            this._dashboards.splice(destIndex, 0, moved);

            list.innerHTML = this._dashboards.map((d, i) => this._renderItem(d, i)).join('');
            this._bindDrag();
        }, { signal });

        this._bindTouchDrag(list, signal);
    }

    private _bindTouchDrag(list: HTMLElement, signal: AbortSignal) {
        let touchSrcIndex = -1;
        let ghost: HTMLElement | null = null;
        let startY = 0;
        let listTopAtStart = 0;
        interface CachedItem { el: HTMLElement; midY: number; }
        let cachedItems: CachedItem[] = [];

        list.addEventListener('touchstart', (e) => {
            const handle = (e.target as HTMLElement).closest('.drag-handle');
            if (!handle) return;
            const el = handle.closest('[data-index]') as HTMLElement | null;
            if (!el) return;
            e.preventDefault();
            touchSrcIndex = parseInt(el.dataset.index!);
            startY = e.touches[0].clientY;

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
            this.shadowRoot!.appendChild(ghost);
            el.classList.add('dragging');
        }, { passive: false, signal });

        list.addEventListener('touchmove', (e) => {
            if (touchSrcIndex === -1 || !ghost) return;
            e.preventDefault();

            const touchY = e.touches[0].clientY;
            ghost.style.transform = `translateY(${touchY - startY}px)`;

            list.querySelectorAll('.item').forEach(el => el.classList.remove('drag-over'));

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
                    const moved = this._dashboards.splice(touchSrcIndex, 1)[0];
                    this._dashboards.splice(destIndex, 0, moved);
                    list.innerHTML = this._dashboards.map((d, i) => this._renderItem(d, i)).join('');
                    this._bindDrag();
                }
            }

            touchSrcIndex = -1;
        }, { signal });
    }

    private async _save() {
        const ids = this._dashboards.map(d => d.id);
        await dashboardStore.reorderDashboards(ids);
        this._close();
    }

    private _close() {
        this.remove();
    }
}

if (!customElements.get('dashboard-manager-modal')) {
    customElements.define('dashboard-manager-modal', DashboardManagerModal);
}
