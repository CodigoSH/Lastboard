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
    });
});
