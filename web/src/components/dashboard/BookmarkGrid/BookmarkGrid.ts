import { template } from './BookmarkGrid.template';
import { GridItem } from '../../../types';
import { dashboardStore } from '../../../store/dashboardStore';
import { collisionService } from '../../../services/collisionService';
// @ts-ignore
import css from './BookmarkGrid.css' with { type: 'text' };

class BookmarkGrid extends HTMLElement {
    private bookmarks: GridItem[] = [];
    private isEditing: boolean = false;
    private _unsubscribe: (() => void) | undefined;

    // Drag State
    private dragTargetId: number | null = null;
    private ghostEl: HTMLElement | null = null;

    // Resize State
    private isResizing: boolean = false;
    private resizeTargetId: number | null = null;
    private initialResizeX: number = 0;
    private initialResizeY: number = 0;
    private initialResizeW: number = 0;
    private initialResizeH: number = 0;
    private currentColWidth: number = 0;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();

        // Subscribe to dashboard store for all state changes
        this._unsubscribe = dashboardStore.subscribe((state) => {
            let shouldRerender = false;

            if (this.isEditing !== state.isEditing) {
                this.isEditing = state.isEditing;
                shouldRerender = true;
            }

            // Ensure items is always an array
            const newItems = Array.isArray(state.items) ? state.items : [];

            if (this.bookmarks !== newItems) {
                this.bookmarks = newItems;
                shouldRerender = true;
            }

            if (shouldRerender) {
                this.render();
            }
        });

        this.setupDragListeners();
        this.setupResizeListeners();
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
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

                const card = target.closest('.bookmark-grid__card') as HTMLElement;
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

        // Constraints: 1x1, 1x2, 2x1, 2x2
        // Min size 1
        newW = Math.max(1, newW);
        newH = Math.max(1, newH);

        // Max size 2 (per user request)
        newW = Math.min(2, newW);
        newH = Math.min(2, newH);

        // Update Ghost
        const item = this.bookmarks.find(b => b.id === this.resizeTargetId);
        if (item) {
            this.updateGhost({ x: item.x, y: item.y, w: newW, h: newH }, true);
        }
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

        // Constraints
        newW = Math.max(1, Math.min(2, newW));
        newH = Math.max(1, Math.min(2, newH));

        // Commit Update
        const item = this.bookmarks.find(b => b.id === this.resizeTargetId);
        if (item && (item.w !== newW || item.h !== newH)) {
            await dashboardStore.updateItem({
                id: item.id,
                w: newW,
                h: newH
            });
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
            }
        });

        root.addEventListener('dragend', (e) => {
            const target = (e.target as HTMLElement).closest('[draggable="true"]') as HTMLElement;
            if (target) target.style.opacity = '1';
            this.dragTargetId = null;
            if (this.ghostEl) this.ghostEl.style.display = 'none';
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

            const relativeX = e.clientX - gridRect.left;
            const relativeY = e.clientY - gridRect.top;
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
                id: draggedItem.id
            };

            const check = collisionService.calculateDropValidity(potentialRect, this.bookmarks, gridCols);

            this.updateGhost(potentialRect, check.valid);
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

            const relativeX = e.clientX - gridRect.left;
            const relativeY = e.clientY - gridRect.top;
            const snapped = collisionService.snapToGrid(relativeX, relativeY, colWidth, gap);

            const draggedItem = this.bookmarks.find(b => b.id === this.dragTargetId);
            if (!draggedItem) return;

            const potentialRect = {
                x: snapped.x,
                y: snapped.y,
                w: draggedItem.w,
                h: draggedItem.h,
                id: draggedItem.id
            };

            const check = collisionService.calculateDropValidity(potentialRect, this.bookmarks, gridCols);

            if (check.valid) {
                // Update item through store (handles optimistic update + backend sync)
                const updateData: Partial<GridItem> & { id: number } = {
                    id: draggedItem.id,
                    x: check.x,
                    y: check.y
                };

                if (check.targetGroup) {
                    // It's a nesting drop
                    updateData.parent_id = check.targetGroup.id;
                } else {
                    updateData.parent_id = undefined;
                }

                await dashboardStore.updateItem(updateData);
            }

            if (this.ghostEl) this.ghostEl.style.display = 'none';
        });
    }

    updateGhost(rect: { x: number, y: number, w: number, h: number }, isValid: boolean) {
        if (!this.ghostEl) {
            this.ghostEl = this.shadowRoot!.getElementById('ghost-element');
        }
        if (!this.ghostEl) return;

        this.ghostEl.style.display = 'block';
        this.ghostEl.style.setProperty('--x', String(rect.x));
        this.ghostEl.style.setProperty('--y', String(rect.y));
        this.ghostEl.style.setProperty('--w', String(rect.w));
        this.ghostEl.style.setProperty('--h', String(rect.h));

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
