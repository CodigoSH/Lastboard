import { dashboardStore } from '../../../store/dashboardStore';
import { i18n } from '../../../services/i18n';
import { GridItem } from '../../../types';
import { mobileReorderTemplate } from './MobileReorderModal.template';
import { escapeHtml, safeImageSrc } from '../../../services/escape';
import css from './MobileReorderModal.css' with { type: 'text' };

/** A row's runtime state inside the sheet. `content` is a parsed, local copy. */
interface RowState {
    item: GridItem;
    content: any;
}

const EYE_OPEN = `<svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF = `<svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
const DRAG_HANDLE = `<svg class="drag-handle" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="6" r="1.5" fill="currentColor"/>
                    <circle cx="15" cy="6" r="1.5" fill="currentColor"/>
                    <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="9" cy="18" r="1.5" fill="currentColor"/>
                    <circle cx="15" cy="18" r="1.5" fill="currentColor"/>
                </svg>`;

export class MobileReorderModal extends HTMLElement {
    // Deferred model: these arrays are edited locally and only committed on Save.
    private _visible: RowState[] = [];
    private _hidden: RowState[] = [];
    // Original visibility per item id, to detect changes on save.
    private _origVisible = new Map<number, boolean>();
    private _dragSrcIndex: number = -1;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const state = dashboardStore.getState();

        // All touch bookmarks (visible AND hidden), so hidden ones can be recovered.
        const rows: RowState[] = state.items
            .filter(item => item.type === 'bookmark')
            .map(item => {
                let content: any = item.content;
                if (typeof content === 'string') {
                    try { content = JSON.parse(content); } catch { content = {}; }
                }
                return { item, content: content || {} };
            });

        const visible = rows.filter(r => r.content.visibleTouch !== false);
        const hidden = rows.filter(r => r.content.visibleTouch === false);

        // Visible: sort by mobile_order (nulls last, then y/x).
        visible.sort((a, b) => {
            const aHas = a.item.mobile_order != null;
            const bHas = b.item.mobile_order != null;
            if (aHas && bHas) return a.item.mobile_order! - b.item.mobile_order!;
            if (aHas) return -1;
            if (bHas) return 1;
            return a.item.y !== b.item.y ? a.item.y - b.item.y : a.item.x - b.item.x;
        });
        // Hidden: sort alphabetically by label so users can find them quickly.
        hidden.sort((a, b) => this._labelOf(a).localeCompare(this._labelOf(b)));

        this._visible = visible;
        this._hidden = hidden;
        rows.forEach(r => this._origVisible.set(r.item.id, r.content.visibleTouch !== false));

        this.render();
        this.bindEvents();
    }

    private render() {
        this.shadowRoot!.innerHTML = mobileReorderTemplate(this._renderBody(), css);
    }

    /** Rebuilds only the scrollable body (both sections). Listeners live on the
     *  stable #list container, so they survive innerHTML swaps of its children. */
    private _updateBody() {
        const list = this.shadowRoot!.getElementById('list');
        if (list) list.innerHTML = this._renderBody();
    }

    private _renderBody(): string {
        const visibleRows = this._visible.map((r, i) => this._renderRow(r, i, true)).join('');
        const visibleSection = `
            <div class="section">
                <div class="section-title">${i18n.t('mobile_reorder.visible_section') || 'Visible'}</div>
                ${this._visible.length
                    ? `<div class="rows" id="visible-list">${visibleRows}</div>`
                    : `<div class="empty-hint">${i18n.t('mobile_reorder.empty_visible') || 'No bookmarks visible on mobile'}</div>`}
            </div>`;

        if (!this._hidden.length) return visibleSection;

        const hiddenRows = this._hidden.map(r => this._renderRow(r, -1, false)).join('');
        const hiddenSection = `
            <div class="section">
                <div class="section-title">${i18n.t('mobile_reorder.hidden_section') || 'Hidden'}</div>
                <div class="rows" id="hidden-list">${hiddenRows}</div>
            </div>`;

        return visibleSection + hiddenSection;
    }

    private _labelOf(r: RowState): string {
        return (r.content.label || `Item ${r.item.id}`).toString();
    }

    private _renderRow(r: RowState, index: number, isVisible: boolean): string {
        const label = r.content.label || `Item ${r.item.id}`;
        const icon = r.content.icon || '';
        const iconHtml = icon
            ? `<img class="item-icon" src="${safeImageSrc(icon)}" alt="" draggable="false">`
            : `<div class="item-icon-placeholder">${escapeHtml(label.charAt(0).toUpperCase())}</div>`;

        const eyeLabel = isVisible
            ? (i18n.t('mobile_reorder.hide') || 'Hide')
            : (i18n.t('mobile_reorder.show') || 'Show');

        const dragAttrs = isVisible ? `draggable="true" data-index="${index}"` : '';

        return `
            <div class="item ${isVisible ? '' : 'is-hidden'}" data-id="${r.item.id}" ${dragAttrs}>
                ${iconHtml}
                <span class="item-label">${escapeHtml(label)}</span>
                <button class="eye-btn" data-id="${r.item.id}" aria-label="${eyeLabel}" aria-pressed="${isVisible}" title="${eyeLabel}">
                    ${isVisible ? EYE_OPEN : EYE_OFF}
                </button>
                ${isVisible ? DRAG_HANDLE : ''}
            </div>
        `;
    }

    private bindEvents() {
        const sr = this.shadowRoot!;

        sr.getElementById('btn-close')!.addEventListener('click', () => this._close());
        sr.getElementById('btn-cancel')!.addEventListener('click', () => this._close());
        sr.getElementById('overlay')!.addEventListener('click', (e) => {
            if (e.target === sr.getElementById('overlay')) this._close();
        });
        sr.getElementById('btn-save')!.addEventListener('click', () => this._save());

        const list = sr.getElementById('list')!;

        // Eye toggle (delegated on the stable #list container).
        list.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest('.eye-btn') as HTMLElement | null;
            if (!btn) return;
            e.stopPropagation();
            this._toggleVisibility(parseInt(btn.dataset.id!));
        });

        this._bindDrag(list);
        this._bindTouchDrag(list);
    }

    /** Moves an item between the visible/hidden sections with a slide animation
     *  (down when hiding, up when showing). Deferred: nothing persists until Save. */
    private _toggleVisibility(id: number) {
        const vIdx = this._visible.findIndex(r => r.item.id === id);
        let direction: 'down' | 'up';

        if (vIdx >= 0) {
            const [moved] = this._visible.splice(vIdx, 1);
            moved.content.visibleTouch = false;
            // Insert alphabetically so the hidden list stays sorted.
            const label = this._labelOf(moved);
            let at = this._hidden.findIndex(r => this._labelOf(r).localeCompare(label) > 0);
            if (at < 0) at = this._hidden.length;
            this._hidden.splice(at, 0, moved);
            direction = 'down';
        } else {
            const hIdx = this._hidden.findIndex(r => r.item.id === id);
            if (hIdx < 0) return;
            const [moved] = this._hidden.splice(hIdx, 1);
            moved.content.visibleTouch = true;
            this._visible.push(moved); // reappears at the end of the visible list
            direction = 'up';
        }

        this._animateMove(id, direction);
    }

    private _animateMove(id: number, direction: 'down' | 'up') {
        const node = this.shadowRoot!.querySelector<HTMLElement>(`.item[data-id="${id}"]`);
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        if (!node || reduceMotion) {
            this._updateBody();
            return;
        }

        // Clear any leftover animation class so the new one always plays. Without
        // this, a lingering `entering-*` class wins the CSS `animation` property
        // over the freshly-added `leaving-*` one, so no animation (and no
        // animationend) fires and the toggle silently does nothing.
        node.classList.remove('entering-top', 'entering-bottom', 'leaving-down', 'leaving-up');
        void node.offsetWidth; // reflow so re-adding an animation restarts it

        node.classList.add(direction === 'down' ? 'leaving-down' : 'leaving-up');
        node.addEventListener('animationend', () => {
            this._updateBody();
            const moved = this.shadowRoot!.querySelector<HTMLElement>(`.item[data-id="${id}"]`);
            if (moved) {
                const enterClass = direction === 'down' ? 'entering-top' : 'entering-bottom';
                moved.classList.add(enterClass);
                // Drop the class once it finishes so it can't block a later toggle.
                moved.addEventListener('animationend', () => moved.classList.remove(enterClass), { once: true });
            }
        }, { once: true });
    }

    private _bindDrag(list: HTMLElement) {
        list.addEventListener('dragstart', (e) => {
            const handle = (e.target as HTMLElement).closest('.drag-handle');
            if (!handle) { e.preventDefault(); return; }
            const el = handle.closest('[data-index]') as HTMLElement | null;
            if (!el) return;
            this._dragSrcIndex = parseInt(el.dataset.index!);
            el.classList.add('dragging');
            e.dataTransfer!.effectAllowed = 'move';
        });

        list.addEventListener('dragend', (e) => {
            const el = (e.target as HTMLElement).closest('[data-index]') as HTMLElement | null;
            if (el) el.classList.remove('dragging');
            list.querySelectorAll('[data-index]').forEach(i => i.classList.remove('drag-over'));
        });

        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'move';
            const el = (e.target as HTMLElement).closest('[data-index]') as HTMLElement | null;
            if (!el) return;
            list.querySelectorAll('[data-index]').forEach(i => i.classList.remove('drag-over'));
            el.classList.add('drag-over');
        });

        list.addEventListener('drop', (e) => {
            e.preventDefault();
            const el = (e.target as HTMLElement).closest('[data-index]') as HTMLElement | null;
            if (!el) return;
            const destIndex = parseInt(el.dataset.index!);
            if (this._dragSrcIndex === destIndex || this._dragSrcIndex < 0) return;

            const moved = this._visible.splice(this._dragSrcIndex, 1)[0];
            this._visible.splice(destIndex, 0, moved);
            this._dragSrcIndex = -1;
            this._updateBody();
        });
    }

    private _bindTouchDrag(list: HTMLElement) {
        let touchSrcIndex = -1;
        let ghost: HTMLElement | null = null;
        let startY = 0;
        let listTopAtStart = 0;
        interface CachedItem { el: HTMLElement; midY: number; }
        let cachedItems: CachedItem[] = [];

        list.addEventListener('touchstart', (e) => {
            const handle = (e.target as HTMLElement).closest('.drag-handle');
            if (!handle) return; // Allow normal scroll / eye taps elsewhere
            const el = handle.closest('[data-index]') as HTMLElement | null;
            if (!el) return;
            e.preventDefault();
            touchSrcIndex = parseInt(el.dataset.index!);
            startY = e.touches[0].clientY;

            listTopAtStart = list.getBoundingClientRect().top;
            // Only visible rows ([data-index]) are valid drop targets.
            cachedItems = Array.from(list.querySelectorAll<HTMLElement>('[data-index]')).map(item => ({
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
        }, { passive: false });

        list.addEventListener('touchmove', (e) => {
            if (touchSrcIndex === -1 || !ghost) return;
            e.preventDefault();

            const touchY = e.touches[0].clientY;
            ghost.style.transform = `translateY(${touchY - startY}px)`;

            list.querySelectorAll('[data-index]').forEach(el => el.classList.remove('drag-over'));

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
        }, { passive: false });

        list.addEventListener('touchend', () => {
            if (touchSrcIndex === -1) return;

            if (ghost) { ghost.remove(); ghost = null; }

            const overEl = list.querySelector<HTMLElement>('[data-index].drag-over');
            list.querySelectorAll('[data-index]').forEach(i => {
                i.classList.remove('drag-over');
                i.classList.remove('dragging');
            });

            if (overEl) {
                const destIndex = parseInt(overEl.dataset.index!);
                if (touchSrcIndex !== destIndex) {
                    const moved = this._visible.splice(touchSrcIndex, 1)[0];
                    this._visible.splice(destIndex, 0, moved);
                    this._updateBody();
                }
            }

            touchSrcIndex = -1;
        });
    }

    /** Commits both the visibility toggles and the mobile order in one pass. */
    private async _save() {
        const ops: (Partial<GridItem> & { id: number })[] = [];

        this._visible.forEach((r, i) => {
            const orderChanged = r.item.mobile_order !== i;
            const visChanged = this._origVisible.get(r.item.id) !== true;
            if (!orderChanged && !visChanged) return;
            const op: Partial<GridItem> & { id: number } = { id: r.item.id, mobile_order: i };
            if (visChanged) op.content = JSON.stringify(r.content);
            ops.push(op);
        });

        this._hidden.forEach(r => {
            const visChanged = this._origVisible.get(r.item.id) !== false;
            if (!visChanged) return;
            ops.push({ id: r.item.id, content: JSON.stringify(r.content) });
        });

        for (const op of ops) {
            await dashboardStore.updateItem(op);
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
