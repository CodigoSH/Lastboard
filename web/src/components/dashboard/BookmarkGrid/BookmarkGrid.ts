import { template, WIDGET_TAGS } from './BookmarkGrid.template';
import { GridItem } from '../../../types';
import { dashboardStore } from '../../../store/dashboardStore';
import { collisionService } from '../../../services/collisionService';
import { statusService } from '../../../services/StatusService';
import { i18n } from '../../../services/i18n';
import { apiService } from '../../../services/apiService';
import { showStatusTip, updateStatusTip, hideStatusTip } from './statusTooltip';
// Widgets
import '../../../widgets/core/ClockWidget';
import '../../../widgets/core/NotepadWidget';
import '../../../widgets/core/TelemetryWidget';
import '../../../widgets/core/WeatherWidget';
import '../../../widgets/core/DockerWidget';
import css from './BookmarkGrid.css' with { type: 'text' };

/**
 * The elements a re-render must not destroy. They are the ones that load
 * something when they mount, so rebuilding one costs a round trip and starts
 * its screen over from empty. Derived from the map the template draws them
 * with, so adding a widget in one place is enough.
 */
const WIDGET_SELECTOR = Object.values(WIDGET_TAGS).join(', ');

class BookmarkGrid extends HTMLElement {
    private bookmarks: GridItem[] = [];
    private allItems: GridItem[] = []; // Store all items for filtering
    private isEditing: boolean = false;
    // Ids selected for a bulk move (mirror of the store's selection).
    private _selectedIds = new Set<number>();
    private _selKey = '';
    private _selectMode = false;
    private _menuTargetId = 0;
    private _menuDismissBound = false;
    private _boundMenuDismiss = () => this._closeKebabMenu();
    private _boundMenuKey = (e: KeyboardEvent) => { if (e.key === 'Escape') this._closeKebabMenu(); };
    private isLoading: boolean = true;
    private searchQuery: string = '';
    private _unsubscribe: (() => void) | undefined;
    private _unsubscribeI18n: (() => void) | undefined;
    private _resizeObserver: ResizeObserver | undefined;
    private _resizeDebounce: any = null;

    // Drag State
    private dragTargetId: number | null = null;
    private ghostEl: HTMLElement | null = null;
    private dragOffsetX: number = 0;
    private dragOffsetY: number = 0;

    // Resize State
    private isResizing: boolean = false;
    private resizeTargetId: number | null = null;
    private initialResizeX: number = 0;
    private initialResizeY: number = 0;
    private initialResizeW: number = 0;
    private initialResizeH: number = 0;
    private currentColWidth: number = 0;
    private currentGridCols: number = 12;

    // Responsive State
    private isTouchDevice: boolean = false;

    constructor() {
        // CRITICAL: Custom Element constructors must NOT modify attributes or
        // children.  Doing so (e.g. classList.add, render) violates the spec
        // and causes Chrome to silently discard the element on mobile/tablet
        // where touch detection triggers those calls.
        // All DOM-touching logic is deferred to connectedCallback().
        super();
        this.attachShadow({ mode: 'open' });
    }



    private _boundActionClick = this.handleActionClick.bind(this);
    // Motion: ids of just-created items to materialize once on the next render.
    private _materializeIds = new Set<number>();
    private _lastDashId: number | null = null;
    // Motion: queue a one-shot staggered entrance on the next render (dashboard
    // load or switch). Consumed in render() like _materializeIds.
    private _entranceQueued = false;
    private _boundMouseMove = this.handleWindowMouseMove.bind(this);
    private _boundMouseUp = this.handleWindowMouseUp.bind(this);
    private _boundUpdateTouchState: () => void = () => { };

    private applyFilters() {
        const isTouch = this.isTouchDevice;
        const isSearching = !!this.searchQuery;

        // search-active CSS class: ONLY for desktop search (grid → auto-flow)
        // Touch mode has its own layout via .touch-mode class
        if (isSearching && !isTouch) {
            this.classList.add('search-active');
        } else {
            this.classList.remove('search-active');
        }

        if (isTouch || isSearching) {
            this.bookmarks = this.allItems.filter(item => {
                let content: any = item.content;
                if (typeof item.content === 'string') {
                    try { content = JSON.parse(item.content); } catch {
                        return false;
                    }
                }

                // Touch mode: only show bookmarks (widgets/sections are excluded)
                // Nested bookmarks (parent_id set) have type 'bookmark' so they pass
                if (isTouch && item.type !== 'bookmark') return false;

                // Touch visibility: visibleTouch flag (defaults to true if undefined)
                if (isTouch && content.visibleTouch === false) return false;

                // Search filter (applies on both desktop and touch)
                if (isSearching) {
                    const searchText = (content.label || '').toLowerCase();
                    return searchText.includes(this.searchQuery);
                }

                return true;
            });

            // In touch mode sort by mobile_order (nulls last, then fallback to y/x)
            if (isTouch) {
                this.bookmarks.sort((a, b) => {
                    const aHas = a.mobile_order != null;
                    const bHas = b.mobile_order != null;
                    if (aHas && bHas) return a.mobile_order! - b.mobile_order!;
                    if (aHas) return -1;
                    if (bHas) return 1;
                    return a.y !== b.y ? a.y - b.y : a.x - b.x;
                });
            }
        } else {
            // Desktop Mode (Non-Touch, Non-Search) -> Show All (Grid)
            this.bookmarks = this.allItems;
        }
    }

    connectedCallback() {
        // ── Touch Detection (moved from constructor) ──
        // Custom Element spec forbids attribute/child modification in constructor.
        // On touch devices detectTouch()→true caused classList.add + render in
        // constructor, which made Chrome silently discard the element.
        const detectTouch = (): boolean => {
            // Touch mode (horizontal cards) only for narrow screens (phones).
            // Tablets have touch but enough width for the full grid layout.
            const narrowScreen = window.innerWidth < 768;
            const isTouch = window.matchMedia('(pointer: coarse)').matches
                || 'ontouchstart' in window
                || navigator.maxTouchPoints > 0;
            return narrowScreen && isTouch;
        };

        this._boundUpdateTouchState = () => {
            const isMobile = detectTouch();
            if (this.isTouchDevice !== isMobile) {
                this.isTouchDevice = isMobile;
                if (isMobile) {
                    this.classList.add('touch-mode');
                } else {
                    this.classList.remove('touch-mode');
                }
                this.applyFilters();
                this.render();
            }
        };

        window.addEventListener('resize', this._boundUpdateTouchState);
        window.addEventListener('orientationchange', this._boundUpdateTouchState);

        // Initial touch check + first render
        this.isTouchDevice = detectTouch();
        if (this.isTouchDevice) {
            this.classList.add('touch-mode');
        }
        this.applyFilters();
        this.render();
        this.updateGridMetrics();

        this._resizeObserver = new ResizeObserver(() => {
            // Debounce for ~60fps performance (16ms)
            if (this._resizeDebounce) return;

            this._resizeDebounce = setTimeout(() => {
                this._resizeDebounce = null;

                // 1. Update Internal Metrics & CSS
                this.updateGridMetrics();

                // 2. Sync with Store (Source of Truth)
                const rect = this.getBoundingClientRect();
                dashboardStore.setGridMetrics(rect.width, this.currentGridCols);

                // 3. Re-Apply Filters (Width might have changed Mobile <-> Tablet)
                this.applyFilters();

                // 4. FORCE Render to re-calculate "Deep Cascade" layout
                this.render();
            }, 16);
        });
        this._resizeObserver.observe(this);

        this._unsubscribe = dashboardStore.subscribe((state) => {
            // ... (existing subscribe logic) ...
            let shouldRerender = false;

            if (this.isEditing !== state.isEditing) {
                this.isEditing = state.isEditing;
                shouldRerender = true;
            }

            if (this._selectMode !== state.selectMode) {
                this._selectMode = state.selectMode;
                shouldRerender = true;
            }

            const selKey = (state.selectedIds || []).join(',');
            if (selKey !== this._selKey) {
                this._selKey = selKey;
                this._selectedIds = new Set(state.selectedIds || []);
                shouldRerender = true;
            }

            if (this.isLoading !== state.loading) {
                this.isLoading = state.loading;
                shouldRerender = true;
            }

            if (this.searchQuery !== state.searchQuery) {
                this.searchQuery = state.searchQuery;
                shouldRerender = true;
            }

            const newAllItems = Array.isArray(state.items) ? state.items : [];

            // SURGICAL DIFFING LOGIC for PING UPDATES
            // We want to avoid wiping the DOM if ONLY the 'status' property changed (e.g., from Ping system)
            let structuralChange = false;
            let statusOnlyChange = false;

            if (this.allItems.length !== newAllItems.length) {
                structuralChange = true;
            } else {
                for (let i = 0; i < newAllItems.length; i++) {
                    const oldItem = this.allItems[i];
                    const newItem = newAllItems[i];

                    if (oldItem.id !== newItem.id ||
                        oldItem.x !== newItem.x ||
                        oldItem.y !== newItem.y ||
                        oldItem.w !== newItem.w ||
                        oldItem.h !== newItem.h ||
                        oldItem.parent_id !== newItem.parent_id ||
                        oldItem.content !== newItem.content ||
                        oldItem.mobile_order !== newItem.mobile_order) {
                        structuralChange = true;
                        break;
                    }

                    if (oldItem.status !== newItem.status) {
                        statusOnlyChange = true;
                    }
                }
            }

            // Motion: flag freshly-created items to materialize once — but only for
            // small in-place additions, never a dashboard switch or initial load.
            const dashChanged = this._lastDashId !== (state.currentDashboardId ?? null);
            const initialLoad = this.allItems.length === 0 && newAllItems.length > 0;
            this._lastDashId = state.currentDashboardId ?? null;
            if ((dashChanged || initialLoad) && newAllItems.length > 0) {
                // Dashboard opened or switched: play a staggered entrance for the
                // whole board instead of per-item pops.
                this._entranceQueued = true;
                this._materializeIds.clear();
            } else if (structuralChange && this.allItems.length > 0) {
                const oldIds = new Set(this.allItems.map(i => i.id));
                const added = newAllItems.filter(i => !oldIds.has(i.id));
                if (added.length > 0 && added.length <= 3) {
                    for (const it of added) this._materializeIds.add(it.id);
                }
            }

            if (structuralChange || shouldRerender) {
                // Hard layout change: Re-render everything
                this.allItems = newAllItems;
                this.isLoading = state.loading;
                this.applyFilters();
                this.render();
            } else if (statusOnlyChange) {
                // Soft status change: Only update the CSS classes of existing elements
                this.updateStatusIndicators(this.allItems, newAllItems);
                this.allItems = newAllItems; // Keep reference updated
                this.applyFilters(); // Apply filters without forcing a full DOM re-render
            }

        });

        this.setupDragListeners();
        this.setupResizeListeners();
        this.setupActionListeners();

        statusService.start();
        this._unsubscribeI18n = i18n.subscribe(() => this.render());

        // FIX: Subscribe to UserStore to react to Grid Column changes
        // ResizeObserver doesn't fire when CSS variables change, so we need to
        // manually trigger metric updates when preferences change.
        import('../../../store/userStore').then(({ userStore }) => {
            this._unsubscribeUser = userStore.subscribe(() => {
                // Wait for the DOM to update styles from UserStore application
                requestAnimationFrame(() => {
                    this.updateGridMetrics();
                    this.render(); // Re-render to apply new grid positions/sizes if logic depends on cols
                });
            });
        });
    }

    private updateStatusIndicators(oldItems: any[], newItems: any[]) {
        if (!this.shadowRoot) return;

        // Find items that changed status
        for (let i = 0; i < newItems.length; i++) {
            const oldItem = oldItems[i];
            const newItem = newItems[i];

            if (oldItem.id === newItem.id && oldItem.status !== newItem.status) {
                // Find the DOM card for this ID
                const card = this.shadowRoot.querySelector(`[data-id="${newItem.id}"]`);
                if (card) {
                    const indicator = card.querySelector('.status-indicator');
                    if (indicator) {
                        // Strip old status classes and applied the new one
                        indicator.classList.remove('status-up', 'status-down', 'status-pending');
                        if (newItem.status) {
                            indicator.classList.add(`status-${newItem.status}`);
                        }

                        // Update the accessible label (the rich hover info is the custom tooltip).
                        let title = i18n.t('general.pinging');
                        if (newItem.status === 'up') title = i18n.t('status.online');
                        else if (newItem.status === 'down') title = i18n.t('status.unreachable');
                        else if (newItem.status === 'pending') title = i18n.t('status.checking');

                        indicator.setAttribute('aria-label', title);
                        // Invalidate cached history so the tooltip reflects the new status next hover.
                        this._tipCache.delete(newItem.id);
                    }
                }
            }
        }
    }

    private _unsubscribeUser: (() => void) | null = null;

    setupActionListeners() {
        const root = this.shadowRoot!;

        // Ensure we don't double-attach by using a bound method reference
        root.removeEventListener('click', this._boundActionClick);
        root.addEventListener('click', this._boundActionClick);

        root.removeEventListener('mouseover', this._boundStatusOver);
        root.addEventListener('mouseover', this._boundStatusOver);
        root.removeEventListener('mouseout', this._boundStatusOut);
        root.addEventListener('mouseout', this._boundStatusOut);
    }

    // --- Status dot hover tooltip (quick glance; click opens the full drawer) ---
    private _boundStatusOver = (e: Event) => this._onStatusOver(e);
    private _boundStatusOut = (e: Event) => this._onStatusOut(e);
    private _tipTimer: number | null = null;
    private _tipHoverId = 0;
    private _tipCache = new Map<number, { data: any; ts: number }>();
    private static readonly TIP_TTL = 30000; // ms

    private _onStatusOver(e: Event) {
        const dot = (e.target as HTMLElement)?.closest?.('.status-indicator');
        if (!dot) return;
        const card = dot.closest('[data-id]') as HTMLElement | null;
        const id = parseInt(card?.dataset.id || '0');
        if (!id) return;

        this._tipHoverId = id;
        if (this._tipTimer) clearTimeout(this._tipTimer);
        this._tipTimer = window.setTimeout(() => {
            if (this._tipHoverId !== id) return;
            const status = this._statusOf(id);
            // Show the status instantly; fill uptime/latency once history loads.
            showStatusTip(dot, this._renderTip(status, this._tipCache.get(id)?.data ?? null, true));
            this._loadTipData(id).then(data => {
                if (this._tipHoverId === id) {
                    updateStatusTip(this._renderTip(status, data, false));
                }
            });
        }, 250);
    }

    private _onStatusOut(e: Event) {
        const dot = (e.target as HTMLElement)?.closest?.('.status-indicator');
        if (!dot) return;
        // Ignore moves within the same dot.
        const to = (e as MouseEvent).relatedTarget as Node | null;
        if (to && dot.contains(to)) return;
        this._tipHoverId = 0;
        if (this._tipTimer) { clearTimeout(this._tipTimer); this._tipTimer = null; }
        hideStatusTip();
    }

    private _statusOf(id: number): string {
        const item = this.allItems.find(b => b.id === id) as any;
        return item?.status || 'unknown';
    }

    private async _loadTipData(id: number): Promise<any | null> {
        const cached = this._tipCache.get(id);
        if (cached && Date.now() - cached.ts < BookmarkGrid.TIP_TTL) return cached.data;
        try {
            const data = await apiService.get<any>(`/api/monitor/history?item_id=${id}&range=24h`);
            this._tipCache.set(id, { data, ts: Date.now() });
            return data;
        } catch {
            return null;
        }
    }

    private _renderTip(status: string, data: any | null, loading: boolean): string {
        const cls = status === 'up' ? 'up' : status === 'down' ? 'down' : status === 'pending' ? 'pending' : 'unknown';
        const label = status === 'up' ? i18n.t('status.online')
            : status === 'down' ? i18n.t('status.unreachable')
                : status === 'pending' ? i18n.t('status.checking')
                    : i18n.t('monitor.status_unknown');

        const hasData = data && data.total > 0;
        const dash = loading ? '…' : '—';
        const uptime = hasData && data.uptime_pct >= 0 ? `${data.uptime_pct.toFixed(1)}%` : dash;
        const latency = hasData && data.current?.up && data.current.latency_ms != null
            ? `${data.current.latency_ms} ms` : dash;

        return `
            <div class="status-tooltip__status status-tooltip__status--${cls}">
                <span class="status-tooltip__dot"></span>${label}
            </div>
            <div class="status-tooltip__rows">
                <div class="status-tooltip__row">
                    <span class="status-tooltip__row-label">${i18n.t('monitor.uptime')} (24h)</span>
                    <span class="status-tooltip__row-value">${uptime}</span>
                </div>
                <div class="status-tooltip__row">
                    <span class="status-tooltip__row-label">${i18n.t('monitor.latency')}</span>
                    <span class="status-tooltip__row-value">${latency}</span>
                </div>
            </div>
            <div class="status-tooltip__hint">${i18n.t('monitor.click_for_history')}</div>`;
    }

    private async handleActionClick(e: Event) {
        const target = e.target as HTMLElement;
        if (!target) return;

        // Status dot → open the monitoring history drawer (works in any mode).
        const statusDot = target.closest('.status-indicator');
        if (statusDot) {
            e.preventDefault();
            e.stopPropagation();
            hideStatusTip();
            const card = statusDot.closest('[data-id]') as HTMLElement | null;
            const id = parseInt(card?.dataset.id || '0');
            if (id) {
                const item = this.allItems.find(b => b.id === id);
                let name = '';
                try {
                    const c = typeof item?.content === 'string' ? JSON.parse(item.content) : item?.content;
                    name = c?.label || '';
                } catch { /* ignore */ }
                const { eventBus, EVENTS } = await import('../../../services/EventBus');
                eventBus.emit(EVENTS.SHOW_MONITOR_HISTORY, { itemId: id, name });
            }
            return;
        }

        if (!this.isEditing) return;

        const kebabBtn = target.closest('.kebab-btn');
        const menuEdit = target.closest('.menu-edit');
        const menuMove = target.closest('.menu-move');
        const menuDelete = target.closest('.menu-delete');
        const selectBox = target.closest('.select-box');

        if (kebabBtn || menuEdit || menuMove || menuDelete || selectBox) {
            e.preventDefault();
            e.stopPropagation();
        } else {
            // Still stop navigation for anchors in Edit Mode
            const anchor = target.closest('a');
            if (anchor) e.preventDefault();
        }

        // Kebab button: toggle the per-item actions menu (a second click on the
        // same item's kebab closes it; clicking another item's switches to it).
        if (kebabBtn) {
            const id = parseInt((kebabBtn as HTMLElement).dataset.id || '0');
            if (!id) return;
            const menu = this.shadowRoot!.getElementById('kebab-menu') as HTMLElement | null;
            if (menu && !menu.hidden && this._menuTargetId === id) {
                this._closeKebabMenu();
            } else {
                this._openKebabMenu(id, kebabBtn as HTMLElement);
            }
            return;
        }

        // Kebab menu actions (operate on the item the menu was opened for).
        if (menuEdit) { const id = this._menuTargetId; this._closeKebabMenu(); this._editItem(id); return; }
        if (menuDelete) { const id = this._menuTargetId; this._closeKebabMenu(); this._deleteItem(id); return; }
        if (menuMove) {
            const id = this._menuTargetId;
            this._closeKebabMenu();
            if (id) {
                const { eventBus, EVENTS } = await import('../../../services/EventBus');
                eventBus.emit(EVENTS.SHOW_MOVE_DASHBOARD, { itemId: id, gridCols: this.currentGridCols });
            }
            return;
        }

        // Selection checkbox: toggle this item in the shared selection.
        if (selectBox) {
            const id = parseInt((selectBox as HTMLElement).dataset.id || '0');
            if (id) dashboardStore.toggleSelectedItem(id);
            return;
        }
    }

    private async _editItem(id: number) {
        const item = this.allItems.find(b => b.id === id);
        if (!item) return;
        const { eventBus, EVENTS } = await import('../../../services/EventBus');
        if (item.type === 'widget') {
            eventBus.emit(EVENTS.SHOW_WIDGET_CONFIG, { item, type: 'widget' });
        } else if (item.type === 'section') {
            eventBus.emit(EVENTS.SHOW_WIDGET_CONFIG, { item, type: 'section' });
        } else {
            eventBus.emit(EVENTS.SHOW_WIDGET_CONFIG, { item, type: 'bookmark' });
        }
    }

    private async _deleteItem(id: number) {
        const item = this.allItems.find(b => b.id === id);
        if (!item) return;
        const typeLabel = item.type === 'section'
            ? i18n.t('type.section')
            : (item.type === 'widget' ? i18n.t('type.widget') : i18n.t('type.bookmark'));
        const { eventBus, EVENTS } = await import('../../../services/EventBus');
        eventBus.emit(EVENTS.SHOW_CONFIRMATION, {
            title: `${i18n.t('general.delete')} ${typeLabel}`,
            message: i18n.t('bookmark.delete_confirm_message'),
            onConfirm: () => { this._dissolveThenDelete(id); }
        });
    }

    // Dissolve a card (fade + slight scale-down) before removing it, so deletion
    // reads as a deliberate exit rather than a snap. Falls back to an instant
    // delete under reduced-motion or if WAAPI is unavailable.
    private _dissolveThenDelete(id: number) {
        const del = () => dashboardStore.deleteItem(id);
        // The easing strings in this file stay spelled out: element.animate()
        // takes a plain string and cannot read the --ease-* custom properties the
        // stylesheets use. Same curves, different API.
        const el = this.shadowRoot!.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
        if (!el || typeof el.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            del();
            return;
        }
        let done = false;
        const finish = () => { if (done) return; done = true; del(); };
        const anim = el.animate(
            [
                { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' },
                { opacity: 0, transform: 'scale(0.7) translateY(-6px)', filter: 'blur(2px)' },
            ],
            { duration: 280, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
        );
        anim.onfinish = finish;
        setTimeout(finish, 350); // safety net if onfinish never fires
    }

    /** Positions the shared kebab menu next to the clicked button, flipping it
     *  above / right-aligning it so it stays on screen. */
    private _openKebabMenu(id: number, anchor: HTMLElement) {
        const menu = this.shadowRoot!.getElementById('kebab-menu') as HTMLElement | null;
        if (!menu) return;
        this._menuTargetId = id;

        const r = anchor.getBoundingClientRect();
        menu.hidden = false;

        // The menu is position:fixed, but an ancestor (transform / filter /
        // hidden-scrollbar container) can become its containing block, so
        // top/left 0 may NOT be the viewport origin. Measure where 0,0 actually
        // lands and correct for that offset — robust regardless of ancestors.
        menu.style.left = '0px';
        menu.style.top = '0px';
        const origin = menu.getBoundingClientRect();
        const mw = menu.offsetWidth || 180;
        const mh = menu.offsetHeight || 130;

        let desiredLeft = r.right - mw;                        // right-align to the button
        if (desiredLeft < 8) desiredLeft = 8;
        if (desiredLeft + mw > window.innerWidth - 8) desiredLeft = window.innerWidth - 8 - mw;

        let flippedAbove = false;
        let desiredTop = r.bottom + 6;                         // below the button…
        if (desiredTop + mh > window.innerHeight - 8) { desiredTop = r.top - mh - 6; flippedAbove = true; } // …or flip above
        if (desiredTop < 8) desiredTop = 8;

        menu.classList.toggle('kebab-menu--above', flippedAbove);
        menu.style.left = `${desiredLeft - origin.left}px`;
        menu.style.top = `${desiredTop - origin.top}px`;

        // Point the callout arrow at the kebab button's centre (the menu ends up
        // at viewport-left = desiredLeft), clamped clear of the rounded corners
        // (radius 12px + half the arrow) so it sits on the flat edge.
        const buttonCenterX = (r.left + r.right) / 2;
        const arrowX = Math.max(20, Math.min(mw - 20, buttonCenterX - desiredLeft));
        menu.style.setProperty('--arrow-x', `${arrowX}px`);

        this._bindMenuDismiss();
    }

    private _closeKebabMenu() {
        const menu = this.shadowRoot!.getElementById('kebab-menu') as HTMLElement | null;
        if (menu) menu.hidden = true;
        this._menuTargetId = 0;
        this._unbindMenuDismiss();
    }

    private _bindMenuDismiss() {
        if (this._menuDismissBound) return;
        this._menuDismissBound = true;
        // Defer so the click that opened the menu doesn't immediately close it.
        setTimeout(() => {
            if (!this._menuDismissBound) return;
            // Bubble phase: the grid's own click handler (on the shadow root)
            // runs first for menu items, reads the target id and stops the
            // event, so this outside-dismiss never wipes it mid-click.
            document.addEventListener('click', this._boundMenuDismiss, false);
            document.addEventListener('keydown', this._boundMenuKey, true);
            window.addEventListener('scroll', this._boundMenuDismiss, true);
        }, 0);
    }

    private _unbindMenuDismiss() {
        this._menuDismissBound = false;
        document.removeEventListener('click', this._boundMenuDismiss, false);
        document.removeEventListener('keydown', this._boundMenuKey, true);
        window.removeEventListener('scroll', this._boundMenuDismiss, true);
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
        if (this._unsubscribeI18n) this._unsubscribeI18n();
        if (this._unsubscribeUser) this._unsubscribeUser();
        if (this._resizeObserver) this._resizeObserver.disconnect();
        if (this._resizeDebounce) clearTimeout(this._resizeDebounce);
        if (this._updateGhostTimeout) clearTimeout(this._updateGhostTimeout);
        this._unbindMenuDismiss();
        window.removeEventListener('mousemove', this._boundMouseMove);
        window.removeEventListener('mouseup', this._boundMouseUp);
        window.removeEventListener('resize', this._boundUpdateTouchState);
        window.removeEventListener('orientationchange', this._boundUpdateTouchState);
        if (this._tipTimer) clearTimeout(this._tipTimer);
        hideStatusTip();
        statusService.stop();
    }

    updateGridMetrics() {
        const gridRect = this.getBoundingClientRect();
        const gridStyle = getComputedStyle(this);

        // Read fixed columns from CSS variable (set by user preference, default 12)
        const colsStr = gridStyle.getPropertyValue('--grid-cols').trim();
        const cols = parseInt(colsStr) || 12;

        // Read gap
        const gapStr = gridStyle.columnGap || gridStyle.gap || '16px';
        const gap = parseFloat(gapStr) || 16;

        // Fallback for invisible/unmounted grid
        if (gridRect.width <= 0) {
            this.currentGridCols = cols;
            this.currentColWidth = 100; // dummy
            this.style.setProperty('--current-grid-cols', cols.toString());
            this.style.setProperty('--row-height', '100px');
            return;
        }

        // FIXED GRID LOGIC:
        // Width is fixed by container. Columns are fixed by preference.
        // We calculate the exact column width to fill the space.
        // (ContainerWidth - TotalGapWidth) / NumCols
        const totalGapWidth = (cols - 1) * gap;
        let colWidth = (gridRect.width - totalGapWidth) / cols;

        // Safety check to prevent negative width (e.g., if gap > container)
        if (colWidth < 10) colWidth = 10;

        // Update Internal State
        this.currentGridCols = cols;
        this.currentColWidth = colWidth;

        // Sync to CSS variables
        // START CRITICAL: We overwrite --current-grid-cols to match --grid-cols 
        // incase other logic depends on it, though CSS now uses --grid-cols directly.
        this.style.setProperty('--current-grid-cols', String(cols));

        // Sync Row Height to match Column Width (Square Aspect Ratio)
        this.style.setProperty('--row-height', `${colWidth}px`);

        // Ensure grid always has buffer space (prevents flickering during drag)
        this.ensureGridBuffer();
    }

    ensureGridBuffer() {
        // Touch mode uses flex layout - no grid buffer needed
        if (this.isTouchDevice) {
            this.style.minHeight = '';
            return;
        }

        // Find the lowest item (highest y + h value)
        let maxY = 0;
        this.bookmarks.forEach(item => {
            const itemBottom = (item.y || 1) + (item.h || 1);
            if (itemBottom > maxY) maxY = itemBottom;
        });

        // Add 1 extra row as buffer for drag & drop (prevents flickering)
        const bufferRows = 1;
        const totalRows = maxY + bufferRows;

        // Calculate minimum height needed
        const rowHeight = this.currentColWidth || 100;
        const gap = 16;
        const minHeight = totalRows * rowHeight + (totalRows - 1) * gap;

        // Set minimum height to ensure buffer space always exists
        this.style.minHeight = `${minHeight}px`;
    }

    setupResizeListeners() {
        // Global listeners for drag/release outside the component
        window.addEventListener('mousemove', this._boundMouseMove);
        window.addEventListener('mouseup', this._boundMouseUp);

        // Start resize on handle mousedown
        this.shadowRoot!.addEventListener('mousedown', (ev) => {
            const e = ev as MouseEvent;
            if (!this.isEditing) return;
            const target = e.target as HTMLElement;
            if (target.classList.contains('resize-handle')) {
                e.preventDefault(); // Prevent text selection
                e.stopPropagation(); // Prevent dragstart of card to trigger

                const card = target.closest('.bookmark-grid__card, .bookmark-grid__section') as HTMLElement;
                if (!card || !card.dataset.id) return;

                const id = parseInt(card.dataset.id);
                const item = this.bookmarks.find(b => b.id === id);
                if (!item) return;

                this.isResizing = true;
                this.resizeTargetId = id;
                this.initialResizeX = e.clientX;
                this.initialResizeY = e.clientY;
                this.initialResizeW = item.w;
                this.initialResizeH = item.h;

                // Calculate current column width
                const host = this;
                const gridRect = host.getBoundingClientRect();
                const gridStyle = getComputedStyle(host);
                const gridColsStr = gridStyle.getPropertyValue('--current-grid-cols').trim();
                const gridColsRaw = gridColsStr ? parseInt(gridColsStr, 10) : 9;
                const gridCols = isNaN(gridColsRaw) ? 9 : gridColsRaw;
                const gap = 16;
                this.currentColWidth = (gridRect.width - ((gridCols - 1) * gap)) / gridCols;

                // Initial ghost feedback
                this.updateGhost({ x: item.x, y: item.y, w: item.w, h: item.h }, true);
            }
        });
    }

    private _updateGhostTimeout: any = null;

    handleWindowMouseMove(e: MouseEvent) {
        if (!this.isResizing || !this.resizeTargetId) return;

        // Throttle updates (Damping) - Reduced to 16ms (~60fps) for smoother resize
        if (this._updateGhostTimeout) {
            return;
        }

        this._updateGhostTimeout = setTimeout(() => {
            this._updateGhostTimeout = null;
            this.processResizeMove(e);
        }, 16); // 16ms = ~60fps for smooth visual feedback
    }

    processResizeMove(e: MouseEvent) {
        if (!this.isResizing || !this.resizeTargetId) return;

        const deltaX = e.clientX - this.initialResizeX;
        const deltaY = e.clientY - this.initialResizeY;

        // Calculate delta in grid units
        // Add 50% threshold for snapping
        const unitDeltaW = Math.round(deltaX / (this.currentColWidth + 16));
        const unitDeltaH = Math.round(deltaY / (this.currentColWidth + 16)); // Assuming square cells

        let newW = this.initialResizeW + unitDeltaW;
        let newH = this.initialResizeH + unitDeltaH;

        // Apply Constraints based on type
        const item = this.bookmarks.find(b => b.id === this.resizeTargetId);
        if (item) {
            const size = this.applyResizeConstraints(newW, newH, item);

            const potentialRect = {
                x: item.x,
                y: item.y,
                w: size.w,
                h: size.h,
                id: item.id,
                parent_id: item.parent_id
            };

            const check = collisionService.calculateDropValidity(potentialRect, this.bookmarks, this.currentGridCols);

            // Update Ghost
            this.updateGhost(potentialRect, check.valid);
        }
    }

    applyResizeConstraints(w: number, h: number, item: GridItem) {
        let minW = 1;
        let minH = 1;

        if (item.type === 'widget') {
            let data: any = item.content;
            if (typeof item.content === 'string') {
                try { data = JSON.parse(item.content); } catch { return { w: Math.max(1, Math.min(12, w)), h: Math.max(1, Math.min(12, h)) }; }
            }
            const widgetId = (data.widgetId || '').toLowerCase();

            if (widgetId === 'notepad') {
                minW = 2;
                minH = 2;
            } else if (widgetId === 'clock') {
                // Fixed 2x1 (Width 2, Height 1)
                return { w: 2, h: 1 };
            } else if (widgetId === 'telemetry') {
                // Fixed 2x1 (Width 2, Height 1)
                return { w: 2, h: 1 };
            }

            // Widgets: 12x12 Max
            let finalW = Math.max(minW, Math.min(12, w));
            let finalH = Math.max(minH, Math.min(12, h));
            return { w: finalW, h: finalH };

        } else if (item.type === 'section') {
            // Sections: 1x1 to 12x12
            let finalW = Math.max(1, Math.min(12, w));
            let finalH = Math.max(1, Math.min(12, h));
            return { w: finalW, h: finalH };
        } else {
            // Bookmarks: Max 2x2
            let finalW = Math.max(1, Math.min(2, w));
            let finalH = Math.max(1, Math.min(2, h));
            return { w: finalW, h: finalH };
        }
    }

    async handleWindowMouseUp(e: MouseEvent) {
        if (!this.isResizing || !this.resizeTargetId) return;

        // Cancel pending throttled update (prevent stale state)
        if (this._updateGhostTimeout) {
            clearTimeout(this._updateGhostTimeout);
            this._updateGhostTimeout = null;
        }

        // Final calculation
        const deltaX = e.clientX - this.initialResizeX;
        const deltaY = e.clientY - this.initialResizeY;
        const unitDeltaW = Math.round(deltaX / (this.currentColWidth + 16));
        const unitDeltaH = Math.round(deltaY / (this.currentColWidth + 16));

        let newW = this.initialResizeW + unitDeltaW;
        let newH = this.initialResizeH + unitDeltaH;

        // Apply Constraints (Final check)
        const item = this.bookmarks.find(b => b.id === this.resizeTargetId);
        if (!item) return;

        const size = this.applyResizeConstraints(newW, newH, item);
        newW = size.w;
        newH = size.h;

        // Final Collision Check
        const finalRect = {
            x: item.x,
            y: item.y,
            w: newW,
            h: newH,
            id: item.id,
            parent_id: item.parent_id
        };
        const check = collisionService.calculateDropValidity(finalRect, this.bookmarks, this.currentGridCols);

        // Commit Update
        if (check.valid && (item.w !== newW || item.h !== newH)) {
            // Auto-Eject Logic
            if (item.type === 'section') {
                const children = this.bookmarks.filter(b => b.parent_id === item.id);
                // Keep what still fits once reflowed into the new box; the
                // rest leaves the section for the main grid.
                const { eject: toEject } = collisionService.planSectionResize(children, newW, newH);

                if (toEject.length > 0) {

                    // Create a simulation of grid state to prevent stacking ejected items
                    // We start with current bookmarks
                    const simulatedItems = [...this.bookmarks];

                    // Calculate all slots FIRST before any updates (prevents race condition)
                    const ejections = toEject.map(child => {
                        const slot = collisionService.findCompactPosition(child.w, child.h, simulatedItems, this.currentGridCols);

                        // Update simulation so next ejected item finds a different slot
                        simulatedItems.push({
                            ...child,
                            x: slot.x,
                            y: slot.y,
                            parent_id: undefined
                        });

                        return {
                            id: child.id,
                            x: slot.x,
                            y: slot.y,
                            parent_id: undefined
                        };
                    });

                    // Now update all items in parallel (no race condition)
                    await Promise.all(ejections.map(update => dashboardStore.updateItem(update)));
                }
            }

            await dashboardStore.resizeItem(item.id, newW, newH);
        }

        // Reset State
        this.isResizing = false;
        this.resizeTargetId = null;
        if (this.ghostEl) this.ghostEl.style.display = 'none';
    }

    setupDragListeners() {
        const root = this.shadowRoot!;
        const host = this;

        // 1. Drag Start/End must be caught inside Shadow DOM to see the specific card
        root.addEventListener('dragstart', (ev) => {
            const e = ev as DragEvent;
            if (this.isTouchDevice || !this.isEditing) {
                e.preventDefault();
                return;
            }
            const target = (e.target as HTMLElement).closest('[draggable="true"]') as HTMLElement;
            if (target && target.dataset.id) {
                this.dragTargetId = parseInt(target.dataset.id);
                e.dataTransfer!.effectAllowed = 'move';
                target.style.opacity = '0.5';

                // Calculate offset from top-left of the card to the mouse cursor
                const rect = target.getBoundingClientRect();
                this.dragOffsetX = e.clientX - rect.left;
                this.dragOffsetY = e.clientY - rect.top;

                // FORCE Drag Image to be the whole card, not just the icon/text
                if (e.dataTransfer) {
                    e.dataTransfer.setDragImage(target, this.dragOffsetX, this.dragOffsetY);
                }
            }
        });

        root.addEventListener('dragend', (e) => {
            const target = (e.target as HTMLElement).closest('[draggable="true"]') as HTMLElement;
            if (target) target.style.opacity = '1';
            this.dragTargetId = null;
            if (this.ghostEl) this.ghostEl.style.display = 'none';

            // Clear Visual Feedback
            const sections = this.shadowRoot!.querySelectorAll('.bookmark-grid__section');
            sections.forEach(s => s.classList.remove('drop-target'));
        });

        // 2. Drag Over/Drop must be caught on the Host to support empty background areas
        // Throttle variable for dragover
        let dragOverTimeout: any = null;

        host.addEventListener('dragover', (ev) => {
            const e = ev as DragEvent;
            if (!this.isEditing || !this.dragTargetId) return;
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'move';

            // Damping / Throttling - Reduced to 16ms for smoother drag
            if (dragOverTimeout) return;
            dragOverTimeout = setTimeout(() => {
                dragOverTimeout = null;
                this.processDragOver(e, host);
            }, 16);
        });

        host.addEventListener('drop', async (ev) => {
            const e = ev as DragEvent;
            // Ensure we clear any pending throttle to handle immediate drops
            if (dragOverTimeout) {
                clearTimeout(dragOverTimeout);
                dragOverTimeout = null;
            }
            await this.handleDrop(e, host);
        });
    }

    /**
     * Where the dragged tile would land if it were dropped at the pointer: the
     * cell under its top-left corner, whether anything else is already there,
     * and the section it would nest into. The hover preview and the drop share
     * this so they can never disagree.
     */
    private _dropTarget(e: DragEvent, host: HTMLElement) {
        const draggedItem = this.bookmarks.find(b => b.id === this.dragTargetId);
        if (!draggedItem) return null;

        const gridRect = host.getBoundingClientRect();
        const gridCols = this.currentGridCols || 12;
        const gap = 16;
        const colWidth = (gridRect.width - ((gridCols - 1) * gap)) / gridCols;

        // Top-left of the floating card: the pointer minus where it grabbed it.
        const relativeTopLeftX = e.clientX - this.dragOffsetX - gridRect.left;
        const relativeTopLeftY = e.clientY - this.dragOffsetY - gridRect.top;

        // Strict snap to the cell under that corner, 1-based and kept inside the grid.
        const cellX = Math.floor(relativeTopLeftX / (colWidth + gap));
        const cellY = Math.floor(relativeTopLeftY / (colWidth + gap));
        const gridX = Math.max(1, Math.min(gridCols - draggedItem.w + 1, cellX + 1));
        const gridY = Math.max(1, cellY + 1);

        const potentialRect = {
            x: gridX,
            y: gridY,
            w: draggedItem.w,
            h: draggedItem.h,
            id: draggedItem.id,
            parent_id: draggedItem.parent_id
        };
        const check = collisionService.calculateDropValidity(potentialRect, this.bookmarks, gridCols);

        // Strict: landing on any other tile in the same scope is a collision,
        // unless that tile is the section being nested into.
        const hasOverlap = this.bookmarks.some(b => {
            if (b.id === draggedItem.id) return false;
            if (b.parent_id !== draggedItem.parent_id && !check.targetGroup) return false;
            if (check.targetGroup && b.id === check.targetGroup.id) return false;
            const bX = b.x || 1; const bY = b.y || 1;
            const bW = b.w || 1; const bH = b.h || 1;
            return (
                gridX < bX + bW &&
                gridX + draggedItem.w > bX &&
                gridY < bY + bH &&
                gridY + draggedItem.h > bY
            );
        });

        return { draggedItem, gridCols, gridX, gridY, potentialRect, check, hasOverlap };
    }

    processDragOver(e: DragEvent, host: HTMLElement) {
        if (this.isTouchDevice) return; // Mobile reordering is handled by MobileReorderModal only
        // Auto-Scroll Logic
        const SCROLL_THRESHOLD = 100; // px from edge
        const SCROLL_SPEED = 15;

        // Find scroll container (main-content)
        // We cache this or find it dynamically
        const scrollContainer = document.querySelector('.main-content');

        if (scrollContainer) {
            const rect = scrollContainer.getBoundingClientRect();
            const mouseY = e.clientY;

            // Scroll Down
            if (mouseY > rect.bottom - SCROLL_THRESHOLD) {
                scrollContainer.scrollBy(0, SCROLL_SPEED);
            }
            // Scroll Up
            else if (mouseY < rect.top + SCROLL_THRESHOLD) {
                scrollContainer.scrollBy(0, -SCROLL_SPEED);
            }

            // Auto-scroll handles vertical movement
            // No dynamic expansion needed - grid has buffer space by default
        }

        const target = this._dropTarget(e, host);
        if (!target) return;
        const { check, potentialRect } = target;
        const isValid = !target.hasOverlap && check.valid;

        this.updateGhost(potentialRect, isValid);

        // Visual Feedback for Nesting
        const sections = this.shadowRoot!.querySelectorAll('.bookmark-grid__section');
        sections.forEach(s => s.classList.remove('drop-target'));

        if (check.targetGroup && isValid) {
            const targetSection = this.shadowRoot!.querySelector(`.bookmark-grid__section[data-id="${check.targetGroup.id}"]`);
            if (targetSection) targetSection.classList.add('drop-target');
        }
    }

    async handleDrop(e: DragEvent, host: HTMLElement) {
        if (this.isTouchDevice) return; // Mobile reordering is handled by MobileReorderModal only
        if (!this.isEditing || !this.dragTargetId) return;
        e.preventDefault();

        const target = this._dropTarget(e, host);
        if (!target) return;
        const { draggedItem, check, hasOverlap } = target;

        // Block drop if overlapping (unless it's a valid nesting target)
        if (hasOverlap && !check.targetGroup) {
            // Invalid Drop. Cancel.
            // visual feedback will just reset
            if (this.ghostEl) this.ghostEl.style.display = 'none';
            this.shadowRoot!.querySelectorAll('.drop-target').forEach(s => s.classList.remove('drop-target'));
            return;
        }

        if (check.valid) {
            // Update item through store (handles optimistic update + backend sync)
            const updateData: Partial<GridItem> & { id: number } = {
                id: draggedItem.id,
                x: check.x,
                y: check.y
            };

            if (check.targetGroup) {
                // It's a nesting drop (into a new section or staying in current)
                updateData.parent_id = check.targetGroup.id;
                // convert TO local coordinates
                updateData.x = check.x - check.targetGroup.x + 1;
                updateData.y = check.y - check.targetGroup.y + 1;

            } else {
                // It's a root drop
                updateData.parent_id = undefined;
                // check.x/y are already global

            }


            await dashboardStore.updateItem(updateData);
        }

        if (this.ghostEl) this.ghostEl.style.display = 'none';

        // Clear Visual Feedback
        const sections = this.shadowRoot!.querySelectorAll('.bookmark-grid__section');
        sections.forEach(s => s.classList.remove('drop-target'));
    }

    updateGhost(rect: { x: number, y: number, w: number, h: number }, isValid: boolean) {
        if (!this.ghostEl) {
            this.ghostEl = this.shadowRoot!.getElementById('ghost-element');
        }
        if (!this.ghostEl) return;

        // Use CSS Grid positioning variables to align ghost perfectly with grid
        this.ghostEl.style.display = 'block';
        this.ghostEl.style.setProperty('--ghost-x', String(rect.x));
        this.ghostEl.style.setProperty('--ghost-y', String(rect.y));
        this.ghostEl.style.setProperty('--ghost-w', String(rect.w));
        this.ghostEl.style.setProperty('--ghost-h', String(rect.h));

        if (isValid) {
            this.ghostEl.classList.remove('invalid');
        } else {
            this.ghostEl.classList.add('invalid');
        }
    }

    render() {
        if (this.isEditing) {
            this.classList.add('edit-mode');
        } else {
            this.classList.remove('edit-mode');
        }

        // The kebab menu lives in this markup; a re-render recreates it hidden,
        // so drop any stale open-menu listeners.
        if (this._menuDismissBound) this._unbindMenuDismiss();

        this._applyMarkup(`
            <style>${css}</style>
            ${template({
            bookmarks: this.bookmarks,
            isEditing: this.isEditing,
            isLoading: this.isLoading,
            isSearching: !!this.searchQuery,
            isTouchDevice: this.isTouchDevice,
            maxCols: this.currentGridCols,
            selectedIds: this._selectedIds,
            selectMode: this._selectMode
        })}
        `);

        // RE-ATTACH LISTENERS after content replacement
        this.setupActionListeners();

        // Re-acquire ghost ref after render
        this.ghostEl = this.shadowRoot!.getElementById('ghost-element');

        this._runEntrance();
        this._runMaterialize();
        this._runArrival();
    }

    /**
     * Writes freshly rendered markup into the shadow root without destroying
     * the widgets already on it.
     *
     * Replacing innerHTML outright is what this used to do, and it threw away
     * every widget element on the board. A widget that gets rebuilt starts its
     * loading over from nothing: measured on one page load, the Docker widget
     * was constructed four times and three container listings were fetched and
     * discarded before the fourth instance finally painted — about a second of
     * the wait was the board rebuilding itself.
     *
     * Nothing about a re-render requires that. A card's position is a CSS
     * variable, not its place in the document, so a card can stay exactly
     * where it is while its contents are brought up to date. Cards holding a
     * widget are patched in place; everything else is still rewritten, because
     * bookmarks are cheap and stateless.
     */
    private _applyMarkup(html: string) {
        const root = this.shadowRoot!;
        const next = document.createElement('div');
        next.innerHTML = html;
        this._patchChildren(root as unknown as Element, next);
    }

    /**
     * Brings `live`'s children up to date with `next`'s, leaving any subtree
     * that holds a widget attached the whole time.
     *
     * Detaching is the thing to avoid: moving a connected custom element —
     * even within the same parent — fires disconnectedCallback and then
     * connectedCallback, which is exactly the restart we are here to prevent.
     * So kept nodes are never moved, only patched, and new ones are appended.
     * Order is safe to disturb: cards are placed by --x/--y and a card's own
     * controls are absolutely positioned.
     */
    private _patchChildren(live: Element, next: Element) {
        // Keyed by tag as well as id, because an item's id appears on more than
        // one element: the card, the widget inside it and the card's own kebab
        // button all carry the same number. On id alone the kebab would match
        // the widget, survive the sweep meant to remove it, and be appended
        // again on every render.
        const keyOf = (el: Element) => {
            const id = (el as HTMLElement).dataset?.id || el.getAttribute('item-id');
            return id ? `${el.tagName}#${id}` : null;
        };
        const isWidgetHost = (el: Element) =>
            el.matches(WIDGET_SELECTOR) || !!el.querySelector(WIDGET_SELECTOR);

        const keep = new Map<string, Element>();
        for (const child of Array.from(live.children)) {
            const key = keyOf(child);
            if (key && isWidgetHost(child)) keep.set(key, child);
        }

        // Nothing here is worth saving: the blunt path is also the fast one.
        if (keep.size === 0) {
            live.innerHTML = next.innerHTML;
            return;
        }

        const incoming = Array.from(next.children);
        const wanted = new Set(
            incoming.map(keyOf).filter((k): k is string => !!k),
        );

        // Drop what the new markup no longer has, and the throwaway nodes we
        // are about to receive again. The stylesheet is identical every time,
        // so it stays rather than being torn out and put back.
        for (const child of Array.from(live.children)) {
            if (child.tagName === 'STYLE') continue;
            const key = keyOf(child);
            if (key && keep.has(key) && wanted.has(key)) continue;
            child.remove();
        }

        for (const fresh of incoming) {
            if (fresh.tagName === 'STYLE') continue;
            const key = keyOf(fresh);
            const kept = key ? keep.get(key) : undefined;

            // A card whose widget changed type is a different thing wearing
            // the same id; rebuilding it is the correct answer.
            if (kept && wanted.has(key!) && this._sameWidget(kept, fresh)) {
                this._syncAttributes(kept, fresh);
                this._patchChildren(kept, fresh);
            } else {
                live.appendChild(fresh);
            }
        }
    }

    /** Do these two nodes hold the same widget element, by tag? */
    private _sameWidget(a: Element, b: Element): boolean {
        const tag = (el: Element) =>
            (el.matches(WIDGET_SELECTOR) ? el : el.querySelector(WIDGET_SELECTOR))?.tagName || '';
        return tag(a) === tag(b);
    }

    /**
     * Copies `next`'s attributes onto `live`, and only where they differ:
     * setAttribute fires attributeChangedCallback even when the value is
     * unchanged, and a widget listening for its content would take that as
     * news and reload.
     */
    private _syncAttributes(live: Element, next: Element) {
        for (const { name, value } of Array.from(next.attributes)) {
            if (live.getAttribute(name) !== value) live.setAttribute(name, value);
        }
        for (const { name } of Array.from(live.attributes)) {
            if (!next.hasAttribute(name)) live.removeAttribute(name);
        }
    }

    private get _reduceMotion(): boolean {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // Top-level cards/sections in document order (nested cards excluded so a
    // section and its children don't both animate).
    private _topLevelItems(): HTMLElement[] {
        return Array.from(
            this.shadowRoot!.querySelectorAll<HTMLElement>('.bookmark-grid__card, .bookmark-grid__section'),
        ).filter(el => !el.closest('.bookmark-grid__nested-content'));
    }

    // One-shot staggered entrance for the whole board on load / dashboard switch.
    // WAAPI (not a CSS class) so a later full re-render never replays it.
    private _runEntrance() {
        if (!this._entranceQueued) return;
        this._entranceQueued = false;
        if (this._reduceMotion) return;

        const items = this._topLevelItems();
        items.forEach((el, i) => {
            if (typeof el.animate !== 'function') return;
            const delay = Math.min(i * 32, 380);
            el.animate(
                [
                    { opacity: 0, transform: 'translateY(12px) scale(0.96)' },
                    { opacity: 1, transform: 'none' },
                ],
                { duration: 320, delay, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' },
            );
        });
    }

    // Highlight items that just arrived from another dashboard, once, the first
    // time this dashboard shows them (after a move + "Ir" or a manual switch).
    private _runArrival() {
        const arrived = dashboardStore.getArrivedIds();
        if (arrived.length === 0) return;
        if (this._reduceMotion) {
            dashboardStore.consumeArrived(arrived);
            return;
        }
        const rgb = getComputedStyle(this).getPropertyValue('--accent-rgb').trim() || '76,139,245';
        const found: number[] = [];
        for (const id of arrived) {
            const el = this.shadowRoot!.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
            if (!el || typeof el.animate !== 'function') continue;
            found.push(id);
            // A clear "just landed here" cue: a scale pop plus an accent ring pulse.
            el.animate(
                [
                    { transform: 'scale(1)', boxShadow: `0 0 0 0 rgba(${rgb},0)` },
                    { transform: 'scale(1.05)', boxShadow: `0 0 0 5px rgba(${rgb},0.75)`, offset: 0.18 },
                    { transform: 'scale(1)', boxShadow: `0 0 0 3px rgba(${rgb},0.35)`, offset: 0.55 },
                    { transform: 'scale(1)', boxShadow: `0 0 0 0 rgba(${rgb},0)` },
                ],
                { duration: 1500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
            );
        }
        if (found.length) dashboardStore.consumeArrived(found);
    }

    // Play a one-shot pop-in on freshly-created cards. WAAPI (not a CSS class)
    // so a later full re-render never replays it — no ghost animations.
    private _runMaterialize() {
        if (this._materializeIds.size === 0) return;
        const ids = Array.from(this._materializeIds);
        this._materializeIds.clear();
        if (this._reduceMotion) return;

        for (const id of ids) {
            const el = this.shadowRoot!.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
            if (!el || typeof el.animate !== 'function') continue;
            el.animate(
                [
                    { opacity: 0, transform: 'translateY(8px) scale(0.85)' },
                    { opacity: 1, transform: 'translateY(0) scale(1.03)', offset: 0.7 },
                    { opacity: 1, transform: 'none' },
                ],
                { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
            );
        }
    }
}

if (!customElements.get('bookmark-grid')) {
    customElements.define('bookmark-grid', BookmarkGrid);
}
