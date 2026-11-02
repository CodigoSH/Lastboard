import { describe, expect, test } from 'bun:test';
import { onSavingDataChange, savingData, updatedLabel, whenRefreshing } from './refreshClock';

const t = (key: string, params?: Record<string, string>) => `[${key}${params ? ':' + Object.values(params).join(',') : ''}]`;
const span = (from: number, now: number) => { const m = Math.round((now - from) / 60000); return m < 1 ? null : `${m} min`; };

describe('what the page says about its last reading', () => {
    const now = 10_000_000;
    test('nothing before the first reading', () => {
        expect(updatedLabel(0, now, false, t, span)).toBe('');
    });
    test('under a minute is just now, and then the minutes', () => {
        expect(updatedLabel(now - 20_000, now, false, t, span)).toBe('[infra.updated_now]');
        expect(updatedLabel(now - 5 * 60_000, now, false, t, span)).toBe('[infra.updated:5 min]');
    });
    test('while the data saver has the refresh paused it says so, after how old the data is', () => {
        expect(updatedLabel(now - 5 * 60_000, now, true, t, span)).toBe('[infra.updated:5 min] · [infra.refresh_paused]');
        expect(updatedLabel(0, now, true, t, span)).toBe('[infra.refresh_paused]');
    });
});

describe('the data saver', () => {
    test('is on only when the browser says it is', () => {
        expect(savingData({ connection: { saveData: true } })).toBe(true);
        expect(savingData({ connection: { saveData: false } })).toBe(false);
        expect(savingData({})).toBe(false);
        expect(savingData({ connection: {} })).toBe(false);
    });
    test('a refresh does not run while it is on, and runs when it is off', () => {
        let ran = 0;
        whenRefreshing(() => { ran++; }, () => true, () => false)();
        expect(ran).toBe(0);
        whenRefreshing(() => { ran++; }, () => false, () => false)();
        expect(ran).toBe(1);
        // And a hidden page does not either, saver or not.
        whenRefreshing(() => { ran++; }, () => false, () => true)();
        expect(ran).toBe(1);
    });
    test('listening for a change can be undone, and a browser without the API is not an error', () => {
        const box: { fn: (() => void) | null } = { fn: null };
        const nav = { connection: { addEventListener: (_: string, fn: () => void) => { box.fn = fn; }, removeEventListener: (_: string, fn: () => void) => { if (box.fn === fn) box.fn = null; } } };
        let n = 0;
        const off = onSavingDataChange(() => { n++; }, nav);
        box.fn?.();
        expect(n).toBe(1);
        off();
        expect(box.fn).toBeNull();
        expect(() => onSavingDataChange(() => { }, {})()).not.toThrow();
    });
});
