import { describe, expect, test } from 'bun:test';
import { isOutside } from './dialogBackdrop';

const box = { left: 100, right: 500, top: 50, bottom: 400 };

describe('isOutside', () => {
    test('the gap between two fields is inside the dialog', () => {
        expect(isOutside(box, 300, 200)).toBe(false);
    });
    test('the padding at the very edge is inside', () => {
        expect(isOutside(box, 100, 50)).toBe(false);
        expect(isOutside(box, 500, 400)).toBe(false);
    });
    test('each side of the backdrop is outside', () => {
        expect(isOutside(box, 99, 200)).toBe(true);
        expect(isOutside(box, 501, 200)).toBe(true);
        expect(isOutside(box, 300, 49)).toBe(true);
        expect(isOutside(box, 300, 401)).toBe(true);
    });
});
