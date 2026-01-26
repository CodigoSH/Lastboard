import { GridItem } from '../types';

export interface DragResult {
    valid: boolean;
    x: number;
    y: number;
    targetGroup?: GridItem; // If dropped into a group
}

/**
 * Collision Service
 * Handles geometry math for the Grid System.
 */
export const collisionService = {
    /**
     * Checks if a rectangle overlaps with another rectangle.
     */
    isOverlap(r1: { x: number; y: number; w: number; h: number }, r2: { x: number; y: number; w: number; h: number }): boolean {
        return (
            r1.x < r2.x + r2.w &&
            r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h &&
            r1.y + r1.h > r2.y
        );
    },

    /**
     * Calculates the validity of a drop operation.
     * @param draggedItem The items being dragged (with potential new X/Y)
     * @param allItems All other items on the grid
     * @param gridWidth Total grid columns (usually 12)
     */
    calculateDropValidity(
        draggedItem: { x: number; y: number; w: number; h: number; id: number; parent_id?: number },
        allItems: GridItem[],
        gridWidth: number = 12
    ): DragResult {
        // 1. Boundary Check
        if (draggedItem.x < 1 || draggedItem.x + draggedItem.w - 1 > gridWidth || draggedItem.y < 1) {
            return { valid: false, x: draggedItem.x, y: draggedItem.y };
        }

        const realDraggedItem = allItems.find(i => i.id === draggedItem.id);
        const isDraggingSection = realDraggedItem?.type === 'section';

        // 2. Collision Check
        for (const item of allItems) {
            if (item.id === draggedItem.id) continue;

            // Only check collisions with items in the same hierarchy level
            // Root items collide with root items, nested collide with nested in same section
            if (item.parent_id !== draggedItem.parent_id) {
                // EXCEPTION: Root bookmarks can overlap sections/groups to nest
                if (!draggedItem.parent_id && !isDraggingSection && item.type === 'section') {
                    const rect1 = { x: draggedItem.x, y: draggedItem.y, w: draggedItem.w, h: draggedItem.h };
                    const rect2 = { x: item.x, y: item.y, w: item.w, h: item.h };
                    if (this.isOverlap(rect1, rect2)) {
                        // Check if it overlaps any EXISTING children of this section
                        const localX = draggedItem.x - item.x + 1;
                        const localY = draggedItem.y - item.y + 1;

                        // Bounds check within section
                        if (localX < 1 || localX + draggedItem.w - 1 > item.w ||
                            localY < 1 || localY + draggedItem.h - 1 > item.h) {
                            // Partially outside section boundary -> technically invalid if we want strict containment
                            // But usually we allow dropping as long as it's over the section.
                            // Let's at least check for overlaps with other children.
                        }

                        const children = allItems.filter(i => i.parent_id === item.id);
                        for (const child of children) {
                            if (this.isOverlap({ x: localX, y: localY, w: draggedItem.w, h: draggedItem.h }, child)) {
                                return { valid: false, x: draggedItem.x, y: draggedItem.y };
                            }
                        }

                        return { valid: true, x: draggedItem.x, y: draggedItem.y, targetGroup: item };
                    }
                }
                continue;
            }

            const rect1 = { x: draggedItem.x, y: draggedItem.y, w: draggedItem.w, h: draggedItem.h };
            const rect2 = { x: item.x, y: item.y, w: item.w, h: item.h };

            if (this.isOverlap(rect1, rect2)) {
                // If we are dragging a bookmark and it overlaps a section AT THE SAME LEVEL
                // (This shouldn't happen usually as sections are usually root and nested are nested,
                // but let's be safe)
                if (item.type === 'section' && !isDraggingSection) {
                    return { valid: true, x: draggedItem.x, y: draggedItem.y, targetGroup: item };
                }

                // Any other overlap is invalid
                return { valid: false, x: draggedItem.x, y: draggedItem.y };
            }
        }

        return { valid: true, x: draggedItem.x, y: draggedItem.y };
    },

    /**
     * Snaps pixel coordinates to grid coordinates.
     */
    snapToGrid(pixelsX: number, pixelsY: number, cellWidth: number, gap: number): { x: number, y: number } {
        // Simple logic: column = floor(px / (width + gap)) + 1
        const totalCellW = cellWidth + gap;
        const col = Math.max(1, Math.floor(pixelsX / totalCellW) + 1);
        // Usar mismo tamaño de celda que columnas para consistencia
        const totalCellH = cellWidth + gap; // Mismo cálculo que para columnas
        const row = Math.max(1, Math.floor(pixelsY / totalCellH) + 1);
        return { x: col, y: row };
    },

    /**
     * Finds the first available slot for an item of given size.
     */
    findFirstAvailableSlot(w: number, h: number, allItems: GridItem[], gridCols: number = 12): { x: number, y: number } {
        let y = 1;
        while (true) {
            for (let x = 1; x <= gridCols - w + 1; x++) {
                const potentialRect = { x, y, w, h };
                let collision = false;

                for (const item of allItems) {
                    // Only check top-level items for collision (parent_id undefined)
                    if (item.parent_id !== undefined) continue;

                    const itemRect = { x: item.x, y: item.y, w: item.w, h: item.h };
                    if (this.isOverlap(potentialRect, itemRect)) {
                        collision = true;
                        break;
                    }
                }

                if (!collision) {
                    return { x, y };
                }
            }
            y++;
            // Safety break to prevent infinite loops in weird cases, though unlikely
            if (y > 100) return { x: 1, y: 100 };
        }
    }
};
