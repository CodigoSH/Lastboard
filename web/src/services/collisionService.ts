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
        draggedItem: { x: number; y: number; w: number; h: number; id: number },
        allItems: GridItem[],
        gridWidth: number = 12
    ): DragResult {
        // 1. Boundary Check
        if (draggedItem.x < 1 || draggedItem.x + draggedItem.w - 1 > gridWidth || draggedItem.y < 1) {
            return { valid: false, x: draggedItem.x, y: draggedItem.y };
        }

        // 2. Collision Check
        for (const item of allItems) {
            if (item.id === draggedItem.id) continue;

            const rect1 = { x: draggedItem.x, y: draggedItem.y, w: draggedItem.w, h: draggedItem.h };
            const rect2 = { x: item.x, y: item.y, w: item.w, h: item.h };

            if (this.isOverlap(rect1, rect2)) {
                // If overlap with a Group, it might be valid nesting
                if (item.type === 'group') {
                    // Start checking if fully inside? or just simple overlap for drop?
                    // Use a simple center point check or ensure dragged item is smaller than group?
                    // For now, accept drop if it overlaps significantly with a group
                    return { valid: true, x: draggedItem.x, y: draggedItem.y, targetGroup: item };
                }

                // Overlap with non-group item -> Invalid (Red Zone)
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
        const row = Math.max(1, Math.floor(pixelsY / 120) + 1); // fixed row height
        return { x: col, y: row };
    }
};
