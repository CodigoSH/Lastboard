import { template } from './BookmarkGrid.template';
import { GridItem } from '../../../types';
import { dashboardStore } from '../../../store/dashboardStore';
import { collisionService } from '../../../services/collisionService';
import { statusService } from '../../../services/StatusService';
// @ts-ignore
import css from './BookmarkGrid.css' with { type: 'text' };

class BookmarkGrid extends HTMLElement {
    private bookmarks: GridItem[] = [];
    private allItems: GridItem[] = []; // Store all items for filtering
    private isEditing: boolean = false;
    private searchQuery: string = '';
    private _unsubscribe: (() => void) | undefined;
    private _resizeObserver: ResizeObserver | undefined;

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

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.updateGridMetrics();

        // Use ResizeObserver to keep metrics in sync
        this._resizeObserver = new ResizeObserver(() => {
            this.updateGridMetrics();
        });
        this._resizeObserver.observe(this);

        // Subscribe to dashboard store for all state changes
        this._unsubscribe = dashboardStore.subscribe((state) => {
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

            if (this.allItems !== newAllItems || shouldRerender) {
                this.allItems = newAllItems;

                // Filter items based on search query
                if (this.searchQuery) {
                    this.classList.add('search-active');
                    this.bookmarks = this.allItems.filter(item => {
                        // Only show bookmarks during search for a cleaner result grid
                        if (item.type !== 'bookmark') return false;

                        const content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
                        const searchText = (content.label || '').toLowerCase();
                        return searchText.includes(this.searchQuery);
                    });
                } else {
                    this.classList.remove('search-active');
                    this.bookmarks = this.allItems;
                }

                shouldRerender = true;
            }

            if (shouldRerender) {
                this.render();
            }
        });

        this.setupDragListeners();
        this.setupResizeListeners();
        this.setupActionListeners();

        // Start Status Monitoring
        statusService.start();
    }

    setupActionListeners() {
        const root = this.shadowRoot!;
        root.addEventListener('click', async (e) => {
            if (!this.isEditing) return;

            // Stop ANY default navigation in edit mode
            const anchor = (e.target as HTMLElement).closest('a');
            if (anchor) {
                e.preventDefault();
            }

            const target = e.target as HTMLElement;

            // Delete Button
            const deleteBtn = target.closest('.btn-delete');
            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();

                // Find container (card, group, or section)
                const container = deleteBtn.closest('.bookmark-grid__card, .bookmark-grid__group, .bookmark-grid__section') as HTMLElement;
                if (!container) return;

                const id = parseInt(container.dataset.id || '0');
                const item = this.bookmarks.find(b => b.id == id);
                if (!item) return;

                const typeLabel = item.type === 'group' ? 'Group' : (item.type === 'section' ? 'Section' : 'Bookmark');

                // Try to find the confirmation modal in the main document
                const confirmationModal = document.querySelector('confirmation-modal') as any;

                if (confirmationModal && typeof confirmationModal.confirm === 'function') {
                    const confirmed = await confirmationModal.confirm(
                        `Delete ${typeLabel}`,
                        `Are you sure you want to delete this ${typeLabel}? This action cannot be undone.`
                    );
                    if (confirmed) {
                        await dashboardStore.deleteItem(id);
                    }
                } else {
                    // Fallback to native confirm if modal fails/missing
                    if (confirm(`Are you sure you want to delete this ${typeLabel}?`)) {
                        await dashboardStore.deleteItem(id);
                    }
                }
                return;
            }

            // Edit Button
            const editBtn = target.closest('.btn-edit');
            if (editBtn) {
                e.preventDefault();
                e.stopPropagation();

                const container = editBtn.closest('.bookmark-grid__card, .bookmark-grid__group') as HTMLElement;
                if (!container) return;

                const id = parseInt(container.dataset.id || '0');
                const item = this.bookmarks.find(b => b.id == id);

                if (item) {
                    const modal = document.querySelector('add-bookmark-modal') as any;
                    if (modal && typeof modal.openForEdit === 'function') {
                        modal.openForEdit(item);
                    } else {
                        console.error('[BookmarkGrid] Edit modal not found or invalid', modal);
                    }
                }
                return;
            }
        });
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
        if (this._resizeObserver) this._resizeObserver.disconnect();
        statusService.stop();
    }

    updateGridMetrics() {
        // Calculate and set --row-height
        const gridRect = this.getBoundingClientRect();
        const gridStyle = getComputedStyle(this);
        const gridColsStr = gridStyle.getPropertyValue('--current-grid-cols').trim();
        const gridCols = gridColsStr ? parseInt(gridColsStr, 10) : 12;
        const gapStr = gridStyle.getPropertyValue('--grid-gap').trim();
        const gap = gapStr ? parseInt(gapStr, 10) : 16;

        const colWidth = (gridRect.width - ((gridCols - 1) * gap)) / gridCols;

        // Update Internal State & CSS Variable
        this.currentGridCols = gridCols;
        this.currentColWidth = colWidth;
        this.style.setProperty('--row-height', `${colWidth}px`);
    }

    setupResizeListeners() {
        // Global listeners for drag/release outside the component
        window.addEventListener('mousemove', this.handleWindowMouseMove.bind(this));
        window.addEventListener('mouseup', this.handleWindowMouseUp.bind(this));

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
                const item = this.bookmarks.find(b => b.id == id);
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

    handleWindowMouseMove(e: MouseEvent) {
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
            const size = this.applyResizeConstraints(newW, newH, item.type);

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

    applyResizeConstraints(w: number, h: number, type: string) {
        // Common min size
        let finalW = Math.max(1, w);
        let finalH = Math.max(1, h);

        if (type === 'section') {
            // Sections: 1x1 to 12x12
            finalW = Math.min(12, finalW);
            finalH = Math.min(12, finalH);
        } else {
            // Bookmarks: 1x1, 1x2, 2x1, 2x2 ONLY
            // Means both dims max 2
            finalW = Math.min(2, finalW);
            finalH = Math.min(2, finalH);
        }
        return { w: finalW, h: finalH };
    }

    async handleWindowMouseUp(e: MouseEvent) {
        if (!this.isResizing || !this.resizeTargetId) return;

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

        const size = this.applyResizeConstraints(newW, newH, item.type);
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
                    console.log(`[BookmarkGrid] Resizing section caused overflow. Ejecting ${children.length - capacity} items.`);
                    const toEject = children.slice(capacity);

                    // Create a simulation of grid state to prevent stacking ejected items
                    // We start with current bookmarks
                    const simulatedItems = [...this.bookmarks];

                    for (const child of toEject) {
                        // Find slot in root
                        const slot = collisionService.findFirstAvailableSlot(child.w, child.h, simulatedItems, this.currentGridCols);

                        console.log(`[BookmarkGrid] Ejecting item ${child.id} to ${slot.x}, ${slot.y}`);

                        // Update real store
                        await dashboardStore.updateItem({
                            id: child.id,
                            x: slot.x,
                            y: slot.y,
                            parent_id: undefined
                        });

                        // Update simulation so next ejected item finds a different slot
                        // We add a fake item at this position (or update existing one in copy)
                        simulatedItems.push({
                            ...child,
                            x: slot.x,
                            y: slot.y,
                            parent_id: undefined
                        });
                    }
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
                console.log('[BookmarkGrid] DragStart Offset:', this.dragOffsetX, this.dragOffsetY);
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
        host.addEventListener('dragover', (ev) => {
            const e = ev as DragEvent;
            if (!this.isEditing || !this.dragTargetId) return;
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'move';

            const gridRect = host.getBoundingClientRect();
            // Get dynamic grid columns
            const gridStyle = getComputedStyle(this.shadowRoot!.host);
            const gridColsStr = gridStyle.getPropertyValue('--current-grid-cols').trim();
            const gridColsRaw = gridColsStr ? parseInt(gridColsStr, 10) : 12;
            const gridCols = isNaN(gridColsRaw) ? 12 : gridColsRaw;

            const totalWidth = gridRect.width;
            const gap = 16;
            const colWidth = (totalWidth - ((gridCols - 1) * gap)) / gridCols;

            const relativeX = (e.clientX - this.dragOffsetX) - gridRect.left;
            const relativeY = (e.clientY - this.dragOffsetY) - gridRect.top;
            const snapped = collisionService.snapToGrid(relativeX, relativeY, colWidth, gap);

            // Find current item dimensions
            const draggedItem = this.bookmarks.find(b => b.id === this.dragTargetId);
            if (!draggedItem) return;

            // Check Validity
            const potentialRect = {
                x: snapped.x,
                y: snapped.y,
                w: draggedItem.w,
                h: draggedItem.h,
                id: draggedItem.id,
                parent_id: draggedItem.parent_id
            };

            const check = collisionService.calculateDropValidity(potentialRect, this.bookmarks, gridCols);
            if (check.valid && check.targetGroup) console.log('[BookmarkGrid] DragOver Nesting Candidate:', check.targetGroup.id);

            this.updateGhost(potentialRect, check.valid);

            // Visual Feedback for Nesting
            const sections = this.shadowRoot!.querySelectorAll('.bookmark-grid__section');
            sections.forEach(s => s.classList.remove('drop-target'));

            if (check.targetGroup) {
                const targetSection = this.shadowRoot!.querySelector(`.bookmark-grid__section[data-id="${check.targetGroup.id}"]`);
                if (targetSection) {
                    targetSection.classList.add('drop-target');
                }
            }
        });

        host.addEventListener('drop', async (ev) => {
            const e = ev as DragEvent;
            if (!this.isEditing || !this.dragTargetId) return;
            e.preventDefault();

            // Re-calculate correctness final time (or store from dragover)
            const gridRect = host.getBoundingClientRect();
            // Get dynamic grid columns
            const gridStyle = getComputedStyle(host);
            const gridColsStr = gridStyle.getPropertyValue('--current-grid-cols').trim();
            const gridColsRaw = gridColsStr ? parseInt(gridColsStr, 10) : 12;
            const gridCols = isNaN(gridColsRaw) ? 12 : gridColsRaw;

            const totalWidth = gridRect.width;
            const gap = 16;
            const colWidth = (totalWidth - ((gridCols - 1) * gap)) / gridCols;

            const relativeX = (e.clientX - this.dragOffsetX) - gridRect.left;
            const relativeY = (e.clientY - this.dragOffsetY) - gridRect.top;
            const snapped = collisionService.snapToGrid(relativeX, relativeY, colWidth, gap);

            const draggedItem = this.bookmarks.find(b => b.id === this.dragTargetId);
            if (!draggedItem) return;

            const potentialRect = {
                x: snapped.x,
                y: snapped.y,
                w: draggedItem.w,
                h: draggedItem.h,
                id: draggedItem.id,
                parent_id: draggedItem.parent_id
            };

            const check = collisionService.calculateDropValidity(potentialRect, this.bookmarks, gridCols);
            console.log('[BookmarkGrid] DROP Check:', check, 'PotentialRect:', potentialRect, 'DragOffset:', this.dragOffsetX, this.dragOffsetY);

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
                    console.log('[BookmarkGrid] DROP NESTING: Setting parent_id to', check.targetGroup.id, 'Local X/Y:', updateData.x, updateData.y);
                } else {
                    // It's a root drop
                    updateData.parent_id = undefined;
                    // check.x/y are already global
                    console.log('[BookmarkGrid] DROP: No nesting (parent_id undefined), Global X/Y:', updateData.x, updateData.y);
                }

                console.log('[BookmarkGrid] Sending updateData:', updateData);
                await dashboardStore.updateItem(updateData);
            }

            if (this.ghostEl) this.ghostEl.style.display = 'none';

            // Clear Visual Feedback
            const sections = this.shadowRoot!.querySelectorAll('.bookmark-grid__section');
            sections.forEach(s => s.classList.remove('drop-target'));
        });
    }

    updateGhost(rect: { x: number, y: number, w: number, h: number }, isValid: boolean) {
        if (!this.ghostEl) {
            this.ghostEl = this.shadowRoot!.getElementById('ghost-element');
        }
        if (!this.ghostEl) return;

        // Calculate Pixel Dimensions
        const gridStyle = getComputedStyle(this);
        const gapStr = gridStyle.getPropertyValue('--grid-gap').trim();
        const gap = gapStr ? parseInt(gapStr, 10) : 16;

        const gridRect = this.getBoundingClientRect();
        const gridColsStr = gridStyle.getPropertyValue('--current-grid-cols').trim();
        const gridCols = gridColsStr ? parseInt(gridColsStr, 10) : 12;

        const totalWidth = gridRect.width;
        // Calculation must match snap-logic
        const colWidth = (totalWidth - ((gridCols - 1) * gap)) / gridCols;

        // User reported ghost is too short (rectangular). 
        // We set height = colWidth, creating a square cell logic which usually looks better for icons.
        // This matches the visual expectation of "square" drop zones.
        const ROW_HEIGHT = colWidth;

        const xPx = (rect.x - 1) * (colWidth + gap);
        const yPx = (rect.y - 1) * (ROW_HEIGHT + gap);
        const wPx = (rect.w * colWidth) + ((rect.w - 1) * gap);
        const hPx = (rect.h * ROW_HEIGHT) + ((rect.h - 1) * gap);

        this.ghostEl.style.display = 'block';
        this.ghostEl.style.setProperty('--x-px', String(xPx));
        this.ghostEl.style.setProperty('--y-px', String(yPx));
        this.ghostEl.style.setProperty('--w-px', String(wPx));
        this.ghostEl.style.setProperty('--h-px', String(hPx));

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
            ${template({ bookmarks: this.bookmarks, isEditing: this.isEditing })}
        `;
        // Re-acquire ghost ref after render
        this.ghostEl = this.shadowRoot!.getElementById('ghost-element');
    }
}

if (!customElements.get('bookmark-grid')) {
    customElements.define('bookmark-grid', BookmarkGrid);
}
