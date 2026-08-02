import { dashboardStore } from '../../../store/dashboardStore';
import { adoptSharedStyles } from '../../../services/sharedStyles';
import { Dashboard } from '../../../types';
import { dashboardManagerTemplate } from './DashboardManagerModal.template';
import { createFocusTrap, FocusTrap } from '../../../services/focusTrap';
import css from './DashboardManagerModal.css' with { type: 'text' };

export class DashboardManagerModal extends HTMLElement {
    private _dashboards: Dashboard[] = [];
    private _dragSrcIndex: number = -1;
    private _dragAbortController: AbortController | null = null;
    private _dragFromHandle: boolean = false;
    private _focusTrap: FocusTrap | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
    }

    connectedCallback() {
        const state = dashboardStore.getState();
        this._dashboards = [...state.dashboards].sort((a, b) => a.position - b.position);
        this.render();
        this.bindEvents();
    }

    private render() {
        const itemsHtml = this._dashboards.map((d, i) => this._renderItem(d, i)).join('');
        this.shadowRoot!.innerHTML = dashboardManagerTemplate(itemsHtml, css);
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

        const sheet = sr.querySelector<HTMLElement>('.sheet');
        if (sheet) {
            this._focusTrap = createFocusTrap(sheet, { onEscape: () => this._close() });
        }

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
        this._focusTrap?.release();
        this._focusTrap = null;
        this.remove();
    }
}

if (!customElements.get('dashboard-manager-modal')) {
    customElements.define('dashboard-manager-modal', DashboardManagerModal);
}
