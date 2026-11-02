import { describe, expect, test } from 'bun:test';
import { ONLINE_WINDOW_MS, sessionIsOnline, sessionsInOrder } from './sessionsOrder';

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

describe('sessionIsOnline', () => {
    const now = Date.parse('2026-11-02T12:00:00Z');
    const seen = (agoMs: number, current = false) => ({ current, last_seen: new Date(now - agoMs).toISOString() });

    test('a session seen a moment ago is connected', () => {
        expect(sessionIsOnline(seen(30_000), now)).toBe(true);
        expect(sessionIsOnline(seen(ONLINE_WINDOW_MS), now)).toBe(true);
    });
    test('one not seen within the window is not', () => {
        expect(sessionIsOnline(seen(ONLINE_WINDOW_MS + 1000), now)).toBe(false);
        expect(sessionIsOnline(seen(3 * 3600_000), now)).toBe(false);
    });
    test('this device always is, whatever its stored time says', () => {
        expect(sessionIsOnline(seen(3 * 3600_000, true), now)).toBe(true);
    });
    test('a time that cannot be read, or lies in the future, is not a connection', () => {
        expect(sessionIsOnline({ current: false, last_seen: 'nonsense' }, now)).toBe(false);
        expect(sessionIsOnline(seen(-60_000), now)).toBe(false);
    });
});
