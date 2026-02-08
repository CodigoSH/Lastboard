import { template } from './BookmarkGrid.template';
import { GridItem } from '../../../types';
import { dashboardStore } from '../../../store/dashboardStore';
import { collisionService } from '../../../services/collisionService';
import { statusService } from '../../../services/StatusService';
import { i18n } from '../../../services/i18n';
// Widgets
import '../../../widgets/core/ClockWidget';
import '../../../widgets/core/NotepadWidget';
import '../../../widgets/core/TelemetryWidget';
// @ts-ignore
import css from './BookmarkGrid.css' with { type: 'text' };

class BookmarkGrid extends HTMLElement {
    private bookmarks: GridItem[] = [];
    private allItems: GridItem[] = []; // Store all items for filtering
    private isEditing: boolean = false;
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
        super();
        this.attachShadow({ mode: 'open' });

        // Initial Check
        this.checkMobileMode();

        // Listener for changes (e.g. docking/undocking on hybrids)
        window.matchMedia('(pointer: coarse)').addEventListener('change', () => {
            this.checkMobileMode();
        });

        // Listener for width changes (Responsive)
        window.addEventListener('resize', () => {
            this.checkMobileMode();
        });
    }

    private checkMobileMode() {
        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        const isSmall = window.innerWidth < 768;

        const newState = isTouch || isSmall;

        if (this.isTouchDevice !== newState) {
            console.log('[BookmarkGrid] Mobile Mode Changed:', newState, { isTouch, isSmall, width: window.innerWidth });
            this.isTouchDevice = newState;
            this.updateTouchMode();
            this.applyFilters();
            this.render();
        }
    }

    private updateTouchMode() {
        if (this.isTouchDevice) {
            this.classList.add('touch-mode');
        } else {
            this.classList.remove('touch-mode');
        }
    }

    private _widgetModal: any; // widget-config-modal
    private _boundActionClick = this.handleActionClick.bind(this);
    private _boundMouseMove = this.handleWindowMouseMove.bind(this);
    private _boundMouseUp = this.handleWindowMouseUp.bind(this);

    private applyFilters() {
        const isTouch = this.isTouchDevice;

        // DEBUG: Log filter state
        console.log('[BookmarkGrid] applyFilters() called', {
            isTouch,
            searchQuery: this.searchQuery,
            totalItems: this.allItems.length,
            bookmarkCount: this.allItems.filter(i => i.type === 'bookmark').length
        });

        if (this.searchQuery || isTouch) {
            this.classList.add('search-active');

            this.bookmarks = this.allItems.filter(item => {
                // Only Bookmarks in Touch/Search Mode
                if (item.type !== 'bookmark') return false;

                let content: any = item.content;
                if (typeof item.content === 'string') {
                    try { content = JSON.parse(item.content); } catch { return false; }
                }

                // Touch Visibility Check with Legacy Fallback
                if (isTouch) {
                    const hasVisibleTouch = content.hasOwnProperty('visibleTouch');
                    const visibleTouchValue = content.visibleTouch;
                    const visibleMobileValue = content.visibleMobile;
                    const visibleTabletValue = content.visibleTablet;
                    const width = window.innerWidth;
                    const isMobileWidth = width < 768;

                    // DEBUG: Log visibility flags for each bookmark
                    console.log(`[BookmarkGrid] Bookmark "${content.label}"`, {
                        hasVisibleTouch,
                        visibleTouch: visibleTouchValue,
                        visibleMobile: visibleMobileValue,
                        visibleTablet: visibleTabletValue,
                        width,
                        isMobileWidth
                    });

                    if (hasVisibleTouch) {
                        // Use new unified flag
                        if (visibleTouchValue === false) {
                            console.log(`[BookmarkGrid] FILTERED OUT "${content.label}" - visibleTouch === false`);
                            return false;
                        }
                    } else {
                        // LEGACY FALLBACK: Check old mobile/tablet flags
                        if (isMobileWidth && visibleMobileValue === false) {
                            console.log(`[BookmarkGrid] FILTERED OUT "${content.label}" - legacy visibleMobile === false`);
                            return false;
                        }
                        if (!isMobileWidth && visibleTabletValue === false) {
                            console.log(`[BookmarkGrid] FILTERED OUT "${content.label}" - legacy visibleTablet === false`);
                            return false;
                        }
                    }
                }

                // Search Filter
                if (this.searchQuery) {
                    const searchText = (content.label || '').toLowerCase();
                    return searchText.includes(this.searchQuery);
                }

                return true;
            });

            console.log('[BookmarkGrid] After filtering:', this.bookmarks.length, 'bookmarks visible');
        } else {
            // Desktop Mode (Non-Touch) -> Show All (Grid)
            this.classList.remove('search-active');
            this.bookmarks = this.allItems;
        }
    }

    connectedCallback() {
        // Apply filters BEFORE first render to ensure correct visibility
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

            if (this.searchQuery !== state.searchQuery) {
                this.searchQuery = state.searchQuery;
                shouldRerender = true;
            }

            const newAllItems = Array.isArray(state.items) ? state.items : [];

            // Deep compare items to avoid re-rendering on reference change (e.g. stats update)
            // This prevents the grid from flickering when telemetry data arrives every second
            const itemsChanged = JSON.stringify(this.allItems) !== JSON.stringify(newAllItems);

            if (itemsChanged || shouldRerender) {
                this.allItems = newAllItems;
                this.applyFilters();
                shouldRerender = true;
            }

            if (shouldRerender) {
                this.render();
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

    private _unsubscribeUser: (() => void) | null = null;

    setupActionListeners() {
        const root = this.shadowRoot!;

        // Ensure we don't double-attach by using a bound method reference
        root.removeEventListener('click', this._boundActionClick);
        root.addEventListener('click', this._boundActionClick);
    }

    private async handleActionClick(e: Event) {
        if (!this.isEditing) return;

        const target = e.target as HTMLElement;
        if (!target) return;

        const deleteBtn = target.closest('.btn-delete');
        const editBtn = target.closest('.btn-edit');

        // Requested: stop propagation and prevent default for buttons
        if (deleteBtn || editBtn) {
            e.preventDefault();
            e.stopPropagation();
        } else {
            // Still stop navigation for anchors in Edit Mode
            const anchor = target.closest('a');
            if (anchor) {
                e.preventDefault();
            }
        }

        // Delete Button Logic
        if (deleteBtn) {
            // Find container (card, group, or section)
            const container = deleteBtn.closest('.bookmark-grid__card, .bookmark-grid__group, .bookmark-grid__section') as HTMLElement;
            if (!container) return;

            const id = parseInt(container.dataset.id || '0');
            const item = (this as any).allItems.find((b: any) => b.id === id);
            if (!item) return;

            const typeLabel = item.type === 'section'
                ? i18n.t('type.section')
                : (item.type === 'widget' ? i18n.t('type.widget') : i18n.t('type.bookmark'));

            // Dispatch Event via EventBus
            const { eventBus, EVENTS } = await import('../../../services/EventBus');
            eventBus.emit(EVENTS.SHOW_CONFIRMATION, {
                title: `${i18n.t('general.delete')} ${typeLabel}`,
                message: i18n.t('bookmark.delete_confirm_message'),
                onConfirm: () => {
                    dashboardStore.deleteItem(id);
                }
            });
            return;
        }

        // Edit Button Logic
        if (editBtn) {
            const container = editBtn.closest('.bookmark-grid__card, .bookmark-grid__group, .bookmark-grid__section') as HTMLElement;
            if (!container) return;

            const id = parseInt(container.dataset.id || '0');
            const item = (this as any).allItems.find((b: any) => b.id === id);

            if (item) {
                const { eventBus, EVENTS } = await import('../../../services/EventBus');
                if (item.type === 'widget') {
                    eventBus.emit(EVENTS.SHOW_WIDGET_CONFIG, { item, type: 'widget' });
                } else if (item.type === 'section') {
                    eventBus.emit(EVENTS.SHOW_WIDGET_CONFIG, { item, type: 'section' }); // Re-use widget config for now
                } else {
                    eventBus.emit(EVENTS.SHOW_WIDGET_CONFIG, { item, type: 'bookmark' });
                }
            }
            return;
        }
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
        if (this._unsubscribeI18n) this._unsubscribeI18n();
        if (this._unsubscribeUser) this._unsubscribeUser();
        if (this._resizeObserver) this._resizeObserver.disconnect();
        if (this._resizeDebounce) clearTimeout(this._resizeDebounce);
        if (this._updateGhostTimeout) clearTimeout(this._updateGhostTimeout);
        window.removeEventListener('mousemove', this._boundMouseMove);
        window.removeEventListener('mouseup', this._boundMouseUp);
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
                // Fixed 2x1
                return { w: 2, h: 1 };
            } else if (widgetId === 'telemetry') {
                // Fixed 2x1
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
                const capacity = newW * newH;
                const children = this.bookmarks.filter(b => b.parent_id === item.id);
                // Keep top-left items, eject bottom-right ones
                children.sort((a, b) => (a.y - b.y) || (a.x - b.x));

                if (children.length > capacity) {

                    const toEject = children.slice(capacity);

                    // Create a simulation of grid state to prevent stacking ejected items
                    // We start with current bookmarks
                    const simulatedItems = [...this.bookmarks];

                    // Calculate all slots FIRST before any updates (prevents race condition)
                    const ejections = toEject.map(child => {
                        const slot = collisionService.findFirstAvailableSlot(child.w, child.h, simulatedItems, this.currentGridCols);

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
            if (!this.isEditing) {
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

    processDragOver(e: DragEvent, host: HTMLElement) {
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

        const gridRect = host.getBoundingClientRect();
        // Use dynamically calculated instance property
        const gridCols = this.currentGridCols || 12;

        const totalWidth = gridRect.width;
        const gap = 16;
        const colWidth = (totalWidth - ((gridCols - 1) * gap)) / gridCols;

        // TOP-LEFT BASED LOGIC (More intuitive for large items)
        const draggedItem = this.bookmarks.find(b => b.id === this.dragTargetId);
        if (!draggedItem) return;

        // Mouse is at e.clientX/Y.
        // TopLeft of floating card = Mouse - Offset.
        const cardTopLeftX = e.clientX - this.dragOffsetX;
        const cardTopLeftY = e.clientY - this.dragOffsetY;

        // Calculate grid position from top-left corner (more intuitive)
        const relativeTopLeftX = cardTopLeftX - gridRect.left;
        const relativeTopLeftY = cardTopLeftY - gridRect.top;

        // STRICT SNAP: Calculate precise cell under the top-left corner
        const cellX = Math.floor(relativeTopLeftX / (colWidth + gap));
        const cellY = Math.floor(relativeTopLeftY / (colWidth + gap));

        // Convert to 1-based grid coords with proper boundary constraints
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

        // COLLISION CHECK (NO PUSH)
        // Check valid drops (boundaries)
        const check = collisionService.calculateDropValidity(potentialRect, this.bookmarks, gridCols);

        // Additional Check: Is the spot OCCUPIED by another item (that isn't self)?
        // collisionService.calculateDropValidity usually handles this but might try to "find" a spot.
        // We want STRICT: If occupied -> Invalid (Red).

        // We can manually check occupation if calculateDropValidity is too smart.
        // Assuming calculateDropValidity returns 'valid: false' if overlaps and it can't move? 
        // Actually, existing logic often tries to "fit".
        // Let's rely on `check.valid`. If strictly occupied, it hopefully returns invalid or a different position.
        // BUT user said: "If a spot is occupied, show the red box or swap positions".
        // Let's implement RED BOX for now.

        // We need to know if it overlaps ANY item (excluding self).
        const hasOverlap = this.bookmarks.some(b => {
            if (b.id === draggedItem.id) return false;
            // Ignore items in other sections if we are root, etc?
            // Simplified global check for now (or section specific).
            // Actually, bookmarks have parent_id.
            if (b.parent_id !== draggedItem.parent_id && !check.targetGroup) return false; // Different scope?

            // Check overlap
            const bX = b.x || 1; const bY = b.y || 1;
            const bW = b.w || 1; const bH = b.h || 1;

            // Allow nesting target
            if (check.targetGroup && b.id === check.targetGroup.id) return false;

            return (
                gridX < bX + bW &&
                gridX + draggedItem.w > bX &&
                gridY < bY + bH &&
                gridY + draggedItem.h > bY
            );
        });

        const isValid = !hasOverlap && check.valid;

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
        if (!this.isEditing || !this.dragTargetId) return;
        e.preventDefault();

        const draggedItem = this.bookmarks.find(b => b.id === this.dragTargetId);
        if (!draggedItem) return;

        // Use same calculation as processDragOver for consistency
        const gridRect = host.getBoundingClientRect();
        const gridCols = this.currentGridCols || 12;
        const totalWidth = gridRect.width;
        const gap = 16;
        const colWidth = (totalWidth - ((gridCols - 1) * gap)) / gridCols;

        // Top-left of the floating card (same as processDragOver)
        const cardTopLeftX = e.clientX - this.dragOffsetX;
        const cardTopLeftY = e.clientY - this.dragOffsetY;

        // Calculate grid position from top-left corner (more intuitive)
        const relativeTopLeftX = cardTopLeftX - gridRect.left;
        const relativeTopLeftY = cardTopLeftY - gridRect.top;

        // STRICT SNAP: Calculate precise cell under the top-left corner
        const cellX = Math.floor(relativeTopLeftX / (colWidth + gap));
        const cellY = Math.floor(relativeTopLeftY / (colWidth + gap));

        // Convert to 1-based grid coords with proper boundary constraints
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

        // Check for overlaps manually (STRICT mode)
        const hasOverlap = this.bookmarks.some(b => {
            if (b.id === draggedItem.id) return false;
            // Check scope (parent_id)
            if (b.parent_id !== draggedItem.parent_id && !check.targetGroup) return false;

            const bX = b.x || 1; const bY = b.y || 1;
            const bW = b.w || 1; const bH = b.h || 1;

            if (check.targetGroup && b.id === check.targetGroup.id) return false;

            return (
                gridX < bX + bW &&
                gridX + draggedItem.w > bX &&
                gridY < bY + bH &&
                gridY + draggedItem.h > bY
            );
        });

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

        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({
            bookmarks: this.bookmarks,
            isEditing: this.isEditing,
            isSearching: !!this.searchQuery,
            isTouchDevice: this.isTouchDevice,
            maxCols: this.currentGridCols
        })}
        `;

        // RE-ATTACH LISTENERS after content replacement
        this.setupActionListeners();

        // Re-acquire ghost ref after render
        this.ghostEl = this.shadowRoot!.getElementById('ghost-element');
    }
}

if (!customElements.get('bookmark-grid')) {
    customElements.define('bookmark-grid', BookmarkGrid);
}
