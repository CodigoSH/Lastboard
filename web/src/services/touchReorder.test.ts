import { describe, expect, test } from 'bun:test';
import { nearestRow } from './touchReorder';

describe('which row a finger is over', () => {
    const mids = [20, 60, 100, 140];

    test('the row whose middle is nearest', () => {
        expect(nearestRow(mids, 0)).toBe(0);
        expect(nearestRow(mids, 55)).toBe(1);
        expect(nearestRow(mids, 119)).toBe(2);
        expect(nearestRow(mids, 500)).toBe(3);
    });

    test('halfway between two, the earlier one wins', () => {
        expect(nearestRow(mids, 40)).toBe(0);
        expect(nearestRow(mids, 80)).toBe(1);
    });

    test('above the first and below the last stay on those', () => {
        expect(nearestRow(mids, -300)).toBe(0);
        expect(nearestRow(mids, 99999)).toBe(3);
    });

    test('no rows is no answer', () => {
        expect(nearestRow([], 10)).toBe(-1);
    });
});
