import { describe, expect, test } from 'bun:test';
import { savingData, whenRefreshing } from './refreshClock';

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
});
