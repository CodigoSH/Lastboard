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
        // Enforce Numbers for inputs
        const dX = Number(draggedItem.x);
        const dY = Number(draggedItem.y);
        const dW = Number(draggedItem.w);
        const dH = Number(draggedItem.h);

        // 1. Boundary Check
        if (dX < 1 || dX + dW - 1 > gridWidth || dY < 1) {
            return { valid: false, x: dX, y: dY };
        }

        const realDraggedItem = allItems.find(i => i.id === draggedItem.id);
        const isDraggingSection = realDraggedItem?.type === 'section';
        const rect1 = { x: dX, y: dY, w: dW, h: dH };

        // 2. Collision Check
        for (const item of allItems) {
            if (item.id === draggedItem.id) continue;

            // Enforce Numbers for item
            const iX = Number(item.x);
            const iY = Number(item.y);
            const iW = Number(item.w || 1);
            const iH = Number(item.h || 1);

            let rect2 = { x: iX, y: iY, w: iW, h: iH };

            if (item.parent_id) {
                const parent = allItems.find(p => p.id === item.parent_id);
                if (parent) {
                    // Convert local to global
                    rect2.x = Number(parent.x) + iX - 1;
                    rect2.y = Number(parent.y) + iY - 1;
                } else {
                    // Orphaned item - ignore
                    continue;
                }
            }

            // Check Collision in Global Space
            if (this.isOverlap(rect1, rect2)) {

                // SPECIAL CASE: Resizing a Section dealing with its own children
                if (isDraggingSection && item.parent_id === draggedItem.id) {
                    // We are overlapping with our own child. This is expected.
                    // BUT we must ensure the child is still FULLY CONTAINED within the new section bounds.
                    // rect1 = new global section bounds
                    // rect2 = global child bounds

                    const childFits = (
                        rect2.x >= rect1.x &&
                        rect2.y >= rect1.y &&
                        (rect2.x + rect2.w) <= (rect1.x + rect1.w) &&
                        (rect2.y + rect2.h) <= (rect1.y + rect1.h)
                    );

                    if (childFits) {
                        continue; // Valid containment, ignore "collision"
                    } else {
                        return { valid: false, x: dX, y: dY }; // Invalid, child would be clipped
                    }
                }

                // Nesting Scenario: Dragging a NON-Section onto a Section (Nest)
                if (!isDraggingSection && item.type === 'section') {
                    // Calculate Local Coords relative to this section
                    const localX = dX - Number(item.x) + 1;
                    const localY = dY - Number(item.y) + 1;

                    // 1. BOUNDS CHECK: Ensure the item FITS inside the section
                    // If localX < 1 or localX + dW - 1 > item.w, it's sticking out
                    if (localX < 1 || localX + dW - 1 > Number(item.w || 1) ||
                        localY < 1 || localY + dH - 1 > Number(item.h || 1)) {
                        // Item is partially outside the section -> Treat as collision (Invalid)
                        return { valid: false, x: dX, y: dY };
                    }

                    // Check for overlap with EXISTING children of this target section
                    const children = allItems.filter(i => i.parent_id === item.id);
                    let childCollision = false;
                    for (const child of children) {
                        const childRect = {
                            x: Number(child.x),
                            y: Number(child.y),
                            w: Number(child.w || 1),
                            h: Number(child.h || 1)
                        };
                        const draggedLocalRect = { x: localX, y: localY, w: dW, h: dH };

                        if (this.isOverlap(draggedLocalRect, childRect)) {
                            childCollision = true;
                            break;
                        }
                    }

                    if (!childCollision) {
                        return { valid: true, x: dX, y: dY, targetGroup: item };
                    }
                }

                // Any other overlap is invalid
                return { valid: false, x: dX, y: dY };
            }
        }

        return { valid: true, x: dX, y: dY };
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
                    // Collision check with potentially nested items using global coordinates
                    let itemGlobalX = item.x;
                    let itemGlobalY = item.y;
                    let itemW = item.w || 1;
                    let itemH = item.h || 1;

                    if (item.parent_id) {
                        const parent = allItems.find(p => p.id === item.parent_id);
                        if (parent) {
                            itemGlobalX = parent.x + item.x - 1;
                            itemGlobalY = parent.y + item.y - 1;
                        } else {
                            continue; // Orphan
                        }
                    }

                    const itemRect = { x: itemGlobalX, y: itemGlobalY, w: itemW, h: itemH };

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
            // Safety break to prevent infinite loops in weird cases
            if (y > 1000) return { x: 1, y: 1000 };
        }
    },

    /**
     * Finds the first available slot for any item in a container of obstacles.
     * Pure geometry, no parent_id logic.
     */
    findAvailableSlot(w: number, h: number, obstacles: { x: number, y: number, w: number, h: number }[], containerCols: number): { x: number, y: number } {
        let y = 1;
        while (true) {
            for (let x = 1; x <= containerCols - w + 1; x++) {
                const potentialRect = { x, y, w, h };
                let collision = false;

                for (const obstacle of obstacles) {
                    if (this.isOverlap(potentialRect, obstacle)) {
                        collision = true;
                        break;
                    }
                }

                if (!collision) {
                    return { x, y };
                }
            }
            y++;
            if (y > 1000) return { x: 1, y: 1000 };
        }
    }
};

