import { describe, expect, test } from 'bun:test';
import { metricsOn, readMetrics, showsSeeAll, storeMetrics } from './metrics';

const ALL = ['cpu', 'mem', 'disk'] as const;

describe('which readings a widget shows', () => {
    test('a widget saved before this existed shows every reading it can give', () => {
        expect(readMetrics(undefined, ALL)).toEqual({ cpu: true, mem: true, disk: true });
        expect(readMetrics({}, ALL)).toEqual({ cpu: true, mem: true, disk: true });
        expect(readMetrics('garbage', ALL)).toEqual({ cpu: true, mem: true, disk: true });
    });
    test('only a reading turned off is off', () => {
        expect(readMetrics({ mem: false }, ALL)).toEqual({ cpu: true, mem: false, disk: true });
        expect(readMetrics({ mem: 0 }, ALL).mem).toBe(true);
    });
    test('a reading the widget cannot give is never on, whatever is stored', () => {
        expect(readMetrics({}, ['cpu', 'mem'])).toEqual({ cpu: true, mem: true, disk: false });
    });
    test('storing writes only what is off, and nothing when all is on', () => {
        expect(storeMetrics({ cpu: true, mem: true, disk: true }, ALL)).toBeUndefined();
        expect(storeMetrics({ cpu: false, mem: true, disk: false }, ALL)).toEqual({ cpu: false, disk: false });
        // A reading the widget does not have is not written, so a Docker widget never carries a disk mark.
        expect(storeMetrics({ cpu: true, mem: true, disk: false }, ['cpu', 'mem'])).toBeUndefined();
    });
    test('what is stored reads back the same', () => {
        const flags = { cpu: false, mem: true, disk: true };
        expect(readMetrics(storeMetrics(flags, ALL), ALL)).toEqual(flags);
    });
    test('readings come in the order they are drawn', () => {
        expect(metricsOn({ cpu: true, mem: false, disk: true })).toEqual(['cpu', 'disk']);
    });
    test('the link to the page is on unless it was switched off', () => {
        expect(showsSeeAll(undefined)).toBe(true);
        expect(showsSeeAll(true)).toBe(true);
        expect(showsSeeAll(false)).toBe(false);
    });
});
