import { describe, expect, test } from 'bun:test';
import { onSavingDataChange, pausedLabel, savingData, whenRefreshing } from './refreshClock';

const t = (key: string, params?: Record<string, string>) => `[${key}${params ? ':' + Object.values(params).join(',') : ''}]`;

describe('what the page says about its refresh', () => {
    test('nothing while it runs: the page does not say how old its data is', () => {
        expect(pausedLabel(false, t)).toBe('');
    });
    test('that it is paused while the data saver has it so', () => {
        expect(pausedLabel(true, t)).toBe('[infra.refresh_paused]');
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
