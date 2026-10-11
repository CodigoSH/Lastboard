import { describe, expect, test } from 'bun:test';
import { SECRET_MASK } from '../services/secretField';
import { planApiSecrets } from './apiSecrets';

const base = { preset: false, rows: [], keyRaw: '', keySaved: false, previousHeaderNames: [], hadKey: false };

describe('a preset', () => {
    test('typing a key stores it; the dots change nothing; emptying removes it', () => {
        expect(planApiSecrets({ ...base, preset: true, keyRaw: 'tok', keySaved: false }).patch).toEqual({ set: { key: 'tok' }, clear: [] });
        expect(planApiSecrets({ ...base, preset: true, keyRaw: SECRET_MASK, keySaved: true }).patch).toBeNull();
        expect(planApiSecrets({ ...base, preset: true, keyRaw: '', keySaved: true }).patch).toEqual({ set: {}, clear: ['key'] });
    });
    test('headers an advanced widget had are cleared and none are kept', () => {
        const p = planApiSecrets({ ...base, preset: true, keyRaw: SECRET_MASK, keySaved: true, previousHeaderNames: ['X-Api-Key'] });
        expect(p.headerNames).toEqual([]);
        expect(p.patch).toEqual({ set: {}, clear: ['header.x-api-key'] });
    });
});

describe('advanced headers', () => {
    test('names go to the widget and values to the store, by lower-case name', () => {
        const p = planApiSecrets({ ...base, rows: [{ name: 'X-Api-Key', raw: 'abc', saved: false }, { name: '', raw: '', saved: false }] });
        expect(p.headerNames).toEqual(['X-Api-Key']);
        expect(p.patch).toEqual({ set: { 'header.x-api-key': 'abc' }, clear: [] });
    });
    test('a saved value left as dots is not sent', () => {
        const p = planApiSecrets({ ...base, rows: [{ name: 'Authorization', raw: SECRET_MASK, saved: true }], previousHeaderNames: ['Authorization'] });
        expect(p.headerNames).toEqual(['Authorization']);
        expect(p.patch).toBeNull();
    });
    test('emptying a saved value removes it; a removed row takes its value with it', () => {
        const p = planApiSecrets({ ...base, rows: [{ name: 'A', raw: '', saved: true }], previousHeaderNames: ['A', 'B'] });
        expect(p.patch).toEqual({ set: {}, clear: ['header.a', 'header.b'] });
    });
    test('names that are not header names, or repeat, are dropped', () => {
        const p = planApiSecrets({ ...base, rows: [
            { name: 'bad name', raw: 'x', saved: false }, { name: '1abc', raw: 'x', saved: false },
            { name: 'X-A', raw: 'one', saved: false }, { name: 'x-a', raw: 'two', saved: false },
        ] });
        expect(p.headerNames).toEqual(['X-A']);
        expect(p.patch).toEqual({ set: { 'header.x-a': 'one' }, clear: [] });
    });
    test('the preset key a widget had is cleared when it becomes advanced', () => {
        expect(planApiSecrets({ ...base, hadKey: true }).patch).toEqual({ set: {}, clear: ['key'] });
    });
});
