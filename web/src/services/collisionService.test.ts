import { describe, it, expect } from 'bun:test';
import { collisionService } from './collisionService';

describe('Collision Service', () => {
    describe('isOverlap', () => {
        it('two overlapping rectangles should return true', () => {
            const r1 = { x: 1, y: 1, w: 2, h: 2 };
            const r2 = { x: 2, y: 2, w: 2, h: 2 }; // Overlaps at (2,2)
            expect(collisionService.isOverlap(r1, r2)).toBe(true);
        });

        it('two non-overlapping rectangles should return false', () => {
            const r1 = { x: 1, y: 1, w: 2, h: 2 };
            const r2 = { x: 4, y: 4, w: 2, h: 2 }; // Far away
            expect(collisionService.isOverlap(r1, r2)).toBe(false);
        });

        it('two rectangles touching at exact border (adjacent) should return false', () => {
            const r1 = { x: 1, y: 1, w: 2, h: 2 }; // covers x: 1..2, y: 1..2
            const r2 = { x: 3, y: 1, w: 2, h: 2 }; // covers x: 3..4, y: 1..2
            expect(collisionService.isOverlap(r1, r2)).toBe(false);
        });
    });

    describe('findCompactPosition', () => {
        it('empty grid should return { x: 1, y: 1 }', () => {
            const items: any[] = [];
            const result = collisionService.findCompactPosition(1, 1, items, 12);
            expect(result).toEqual({ x: 1, y: 1 });
        });

        it('with one item at { x:1, y:1, w:1, h:1 }, next 1x1 item should be placed at { x: 2, y: 1 }', () => {
            const items = [{ id: 1, x: 1, y: 1, w: 1, h: 1, type: 'bookmark' }];
            const result = collisionService.findCompactPosition(1, 1, items as any, 12);
            expect(result).toEqual({ x: 2, y: 1 });
        });
    });

    describe('calculateDropValidity', () => {
        it('item exceeding right grid boundary should return valid: false', () => {
            // An item that exceeds the gridWidth of 12
            const draggedItem = { id: 99, x: 12, y: 1, w: 2, h: 1 };
            const items: any[] = [];
            const result = collisionService.calculateDropValidity(draggedItem, items, 12);
            expect(result.valid).toBe(false);
        });

        it('free position with no collisions should return valid: true', () => {
            const draggedItem = { id: 99, x: 1, y: 1, w: 1, h: 1 };
            const items: any[] = [];
            const result = collisionService.calculateDropValidity(draggedItem, items, 12);
            expect(result.valid).toBe(true);
        });

        it('y below 1 is out of bounds -> valid: false', () => {
            const draggedItem = { id: 99, x: 1, y: 0, w: 1, h: 1 };
            const result = collisionService.calculateDropValidity(draggedItem, [], 12);
            expect(result.valid).toBe(false);
        });

        it('overlapping a plain item -> valid: false', () => {
            const items = [{ id: 1, x: 1, y: 1, w: 2, h: 2, type: 'bookmark' }];
            const draggedItem = { id: 99, x: 2, y: 2, w: 1, h: 1 };
            const result = collisionService.calculateDropValidity(draggedItem, items as any, 12);
            expect(result.valid).toBe(false);
        });

        it('dropping a non-section fully inside an empty section nests it (targetGroup set)', () => {
            const items = [{ id: 1, x: 1, y: 1, w: 4, h: 4, type: 'section' }];
            const draggedItem = { id: 99, x: 2, y: 2, w: 1, h: 1 };
            const result = collisionService.calculateDropValidity(draggedItem, items as any, 12);
            expect(result.valid).toBe(true);
            expect(result.targetGroup?.id).toBe(1);
        });

        it('dropping a non-section that sticks out of a section -> valid: false', () => {
            const items = [{ id: 1, x: 1, y: 1, w: 2, h: 2, type: 'section' }];
            // Dragged item overlaps the section but extends beyond its right edge.
            const draggedItem = { id: 99, x: 2, y: 1, w: 3, h: 1 };
            const result = collisionService.calculateDropValidity(draggedItem, items as any, 12);
            expect(result.valid).toBe(false);
        });
    });

    describe('snapToGrid', () => {
        it('snaps origin pixels to cell { x: 1, y: 1 }', () => {
            expect(collisionService.snapToGrid(0, 0, 100, 10)).toEqual({ x: 1, y: 1 });
        });

        it('snaps one cell + gap to the next column/row', () => {
            // totalCell = 100 + 10 = 110 -> floor(110/110)+1 = 2
            expect(collisionService.snapToGrid(110, 220, 100, 10)).toEqual({ x: 2, y: 3 });
        });

        it('clamps negative pixels to a minimum of 1', () => {
            expect(collisionService.snapToGrid(-50, -50, 100, 10)).toEqual({ x: 1, y: 1 });
        });
    });

    describe('findAvailableSlot', () => {
        it('returns { x: 1, y: 1 } on an empty container', () => {
            expect(collisionService.findAvailableSlot(1, 1, [], 12)).toEqual({ x: 1, y: 1 });
        });

        it('skips an occupied cell and returns the next free column', () => {
            const obstacles = [{ x: 1, y: 1, w: 1, h: 1 }];
            expect(collisionService.findAvailableSlot(1, 1, obstacles, 12)).toEqual({ x: 2, y: 1 });
        });

        it('wraps to the next row when the first row is full', () => {
            const obstacles = [{ x: 1, y: 1, w: 2, h: 1 }];
            // container of 2 cols, a 2-wide item only fits on row 2
            expect(collisionService.findAvailableSlot(2, 1, obstacles, 2)).toEqual({ x: 1, y: 2 });
        });
    });

    describe('isOverlap (additional cases)', () => {
        it('full containment overlaps', () => {
            const outer = { x: 1, y: 1, w: 4, h: 4 };
            const inner = { x: 2, y: 2, w: 1, h: 1 };
            expect(collisionService.isOverlap(outer, inner)).toBe(true);
        });

        it('vertically adjacent rectangles do not overlap', () => {
            const a = { x: 1, y: 1, w: 2, h: 2 };
            const b = { x: 1, y: 3, w: 2, h: 2 };
            expect(collisionService.isOverlap(a, b)).toBe(false);
        });
    });

    describe('packItems', () => {
        it('empty list returns an empty result', () => {
            expect(collisionService.packItems([], [], 12)).toEqual([]);
        });

        it('packs three 1x1 items left-to-right on an empty grid', () => {
            const items = [{ w: 1, h: 1 }, { w: 1, h: 1 }, { w: 1, h: 1 }];
            const result = collisionService.packItems(items, [], 12);
            expect(result.map(r => ({ x: r.x, y: r.y }))).toEqual([
                { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }
            ]);
        });

        it('places items around an existing obstacle', () => {
            const existing = [{ x: 1, y: 1, w: 1, h: 1 }];
            const result = collisionService.packItems([{ w: 1, h: 1 }], existing, 12);
            expect(result[0]).toMatchObject({ x: 2, y: 1 });
        });

        it('preserves the other fields of each item', () => {
            const items = [{ id: 5, w: 1, h: 1, type: 'bookmark' }];
            const result = collisionService.packItems(items, [], 12);
            expect(result[0]).toMatchObject({ id: 5, type: 'bookmark', x: 1, y: 1 });
        });
    });

    describe('findBlockPosition', () => {
        it('empty block returns a zero offset', () => {
            expect(collisionService.findBlockPosition([], [], 12)).toEqual({ dx: 0, dy: 0 });
        });

        it('a block already at the origin lands with no offset on an empty grid', () => {
            const block = [{ x: 1, y: 1, w: 2, h: 1 }, { x: 1, y: 2, w: 2, h: 1 }];
            expect(collisionService.findBlockPosition(block, [], 12)).toEqual({ dx: 0, dy: 0 });
        });

        it('shifts a block back to the origin, preserving internal offsets', () => {
            // Block bounding box starts at (3,3); on an empty grid it should land at (1,1).
            const block = [{ x: 3, y: 3, w: 1, h: 1 }, { x: 4, y: 3, w: 1, h: 1 }];
            expect(collisionService.findBlockPosition(block, [], 12)).toEqual({ dx: -2, dy: -2 });
        });

        it('moves the whole block below an obstacle that fills the first row', () => {
            const existing = [{ x: 1, y: 1, w: 2, h: 2 }];
            const block = [{ x: 1, y: 1, w: 2, h: 2 }];
            // On a 2-col grid the 2x2 block only fits from row 3 down.
            expect(collisionService.findBlockPosition(block, existing, 2)).toEqual({ dx: 0, dy: 2 });
        });
    });
});
