import { describe, expect, it } from 'bun:test';
import { DEFAULT_TELEMETRY_INTERVAL, TELEMETRY_INTERVALS, telemetryInterval } from './telemetryInterval';

describe('telemetryInterval', () => {
    it('keeps every value on the list as it is', () => {
        for (const v of TELEMETRY_INTERVALS) {
            expect(telemetryInterval(v)).toBe(v);
            expect(telemetryInterval(String(v))).toBe(v);
        }
    });

    // The old selector offered 1s and 2s: those widgets keep working at five.
    it('reads a value that is no longer offered as the nearest one', () => {
        expect(telemetryInterval(1000)).toBe(5000);
        expect(telemetryInterval(2000)).toBe(5000);
        expect(telemetryInterval(7000)).toBe(5000);
        expect(telemetryInterval(8000)).toBe(10000);
        expect(telemetryInterval(25000)).toBe(30000);
        expect(telemetryInterval(600000)).toBe(60000);
    });

    it('falls back to the default for anything that is not a number', () => {
        for (const v of [undefined, null, '', 'abc', NaN, {}, []]) {
            expect(telemetryInterval(v)).toBe(DEFAULT_TELEMETRY_INTERVAL);
        }
    });

    it('offers 5, 10, 30 and 60 seconds and nothing else', () => {
        expect([...TELEMETRY_INTERVALS]).toEqual([5000, 10000, 30000, 60000]);
    });
});
