import { dashboardStore } from '../../../store/dashboardStore';
import { i18n } from '../../../services/i18n';
import { adoptSharedStyles } from '../../../services/sharedStyles';
import { Dashboard } from '../../../types';
import { dashboardManagerTemplate } from './DashboardManagerModal.template';
import { createFocusTrap, FocusTrap } from '../../../services/focusTrap';
import { canDeleteDashboard, syncOrder } from './dashboardOrder';
import { deleteDashboard, renameDashboard } from './dashboardActions';
import css from './DashboardManagerModal.css' with { type: 'text' };

export class DashboardManagerModal extends HTMLElement {
    private _dashboards: Dashboard[] = [];
    private _dragSrcIndex: number = -1;
    private _dragAbortController: AbortController | null = null;
    private _dragFromHandle: boolean = false;
    private _focusTrap: FocusTrap | null = null;
    private _unsubscribe: (() => void) | null = null;

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
        // Renaming or deleting happens at once, in the store; the list being
        // arranged here follows it without losing the order the person made.
        this._unsubscribe = dashboardStore.subscribe((s) => {
            const next = syncOrder(this._dashboards, s.dashboards);
            if (JSON.stringify(next) === JSON.stringify(this._dashboards)) return;
            this._dashboards = next;
            this._renderList();
        });
    }

    disconnectedCallback() {
        this._unsubscribe?.();
        this._unsubscribe = null;
    }

    private _renderList() {
        const list = this.shadowRoot?.getElementById('list');
        if (!list) return;
        list.innerHTML = this._dashboards.map((d, i) => this._renderItem(d, i)).join('');
        this._bindDrag();
    }

    private render() {
        const itemsHtml = this._dashboards.map((d, i) => this._renderItem(d, i)).join('');
        this.shadowRoot!.innerHTML = dashboardManagerTemplate(itemsHtml, css);
    }

    private _renderItem(d: Dashboard, index: number): string {
        const canDelete = canDeleteDashboard(this._dashboards.length);
        const name = this._escape(i18n.t(d.name));
        return `
            <div class="item" draggable="true" data-index="${index}" data-id="${d.id}">
                <span class="item-dot ${d.is_default ? 'is-default' : ''}"></span>
                <span class="item-name">${name}</span>
                <button type="button" class="item-action" data-action="rename" title="${i18n.t('dashboard.rename')}" aria-label="${i18n.t('dashboard.rename')}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button type="button" class="item-action item-action--danger" data-action="delete" title="${i18n.t(canDelete ? 'dashboard.delete' : 'dashboard.cannot_delete_last')}" aria-label="${i18n.t('dashboard.delete')}" ${canDelete ? '' : 'disabled'}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
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

        // Rename and delete sit beside the handle and are only ever pressed on purpose.
        list.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest('.item-action') as HTMLButtonElement | null;
            if (!btn || btn.disabled) return;
            const row = btn.closest('[data-id]') as HTMLElement | null;
            const dash = this._dashboards.find(d => d.id === Number(row?.dataset.id));
            if (!dash) return;
            if (btn.dataset.action === 'rename') renameDashboard(dash.id, dash.name);
            else if (btn.dataset.action === 'delete' && canDeleteDashboard(this._dashboards.length)) deleteDashboard(dash.id);
        }, { signal });

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
