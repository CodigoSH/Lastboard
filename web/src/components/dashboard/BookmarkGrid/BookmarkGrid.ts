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
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
    }

    setupDragListeners() {
        const root = this.shadowRoot!;

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
                // Slight delay to adding 'dragging' class or opacity
                target.style.opacity = '0.5';
            }
        });

        root.addEventListener('dragend', (e) => {
            const target = (e.target as HTMLElement).closest('[draggable="true"]') as HTMLElement;
            if (target) target.style.opacity = '1';
            this.dragTargetId = null;
            if (this.ghostEl) this.ghostEl.style.display = 'none';
        });

        root.addEventListener('dragover', (ev) => {
            const e = ev as DragEvent;
            if (!this.isEditing || !this.dragTargetId) return;
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'move';

            const gridRect = this.shadowRoot!.host.getBoundingClientRect();
            // Get dynamic grid columns
            const gridStyle = getComputedStyle(this.shadowRoot!.host);
            const gridCols = parseInt(gridStyle.getPropertyValue('--current-grid-cols').trim()) || 12;

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

        root.addEventListener('drop', async (ev) => {
            const e = ev as DragEvent;
            if (!this.isEditing || !this.dragTargetId) return;
            e.preventDefault();

            // Re-calculate correctness final time (or store from dragover)
            const gridRect = this.shadowRoot!.host.getBoundingClientRect();
            // Get dynamic grid columns
            const gridStyle = getComputedStyle(this.shadowRoot!.host);
            const gridCols = parseInt(gridStyle.getPropertyValue('--current-grid-cols').trim()) || 12;

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
