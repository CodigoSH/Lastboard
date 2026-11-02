import { describe, expect, test } from 'bun:test';
import { sessionsInOrder } from './sessionsOrder';

const s = (id: number, current = false) => ({ id, current });

describe('sessionsInOrder', () => {
    test('this device first, the others as they came', () => {
        expect(sessionsInOrder([s(1), s(2), s(3, true), s(4)]).map(x => x.id)).toEqual([3, 1, 2, 4]);
    });
    test('does not touch what it was given, and survives having no current one', () => {
        const input = [s(1), s(2)];
        expect(sessionsInOrder(input).map(x => x.id)).toEqual([1, 2]);
        expect(input.map(x => x.id)).toEqual([1, 2]);
        expect(sessionsInOrder([])).toEqual([]);
    });
});
