import { describe, expect, it } from 'bun:test';
import { RATE_LIMITED, retryOnRateLimit } from './retryOnRateLimit';

const noWait = { sleep: async () => {} };

describe('retryOnRateLimit', () => {
    it('returns what the request returns, without waiting', async () => {
        const waits: number[] = [];
        const out = await retryOnRateLimit(async () => 42, { sleep: async ms => { waits.push(ms); } });
        expect(out).toBe(42);
        expect(waits).toEqual([]);
    });

    it('tries again when the server says it is being asked too fast', async () => {
        let calls = 0;
        const out = await retryOnRateLimit(async () => {
            if (++calls < 3) throw new Error(RATE_LIMITED);
            return 'ok';
        }, noWait);
        expect(out).toBe('ok');
        expect(calls).toBe(3);
    });

    it('waits longer each time', async () => {
        const waits: number[] = [];
        let calls = 0;
        await retryOnRateLimit(async () => {
            if (++calls < 4) throw new Error(RATE_LIMITED);
        }, { waitMs: 100, sleep: async ms => { waits.push(ms); } });
        expect(waits).toEqual([100, 200, 300]);
    });

    it('lets any other failure through at once', async () => {
        let calls = 0;
        await expect(retryOnRateLimit(async () => {
            calls++;
            throw new Error('general.invalid_input');
        }, noWait)).rejects.toThrow('general.invalid_input');
        expect(calls).toBe(1);
    });

    it('gives up after the attempts it was given', async () => {
        let calls = 0;
        await expect(retryOnRateLimit(async () => {
            calls++;
            throw new Error(RATE_LIMITED);
        }, { attempts: 5, ...noWait })).rejects.toThrow(RATE_LIMITED);
        expect(calls).toBe(5);
    });

    it('matches what the server really sends', () => {
        // Written in the middleware and read here, so this reads the middleware.
        const { readFileSync } = require('fs');
        const { join } = require('path');
        const go = readFileSync(join(import.meta.dir, '../../../internal/web/middleware/ratelimit.go'), 'utf8');
        expect(go).toContain(`"${RATE_LIMITED}"`);
    });
});
