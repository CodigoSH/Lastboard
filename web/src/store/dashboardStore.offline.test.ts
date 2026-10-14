import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

// What the page shows when the server cannot be reached and nothing was cached:
// nothing of its own. A made-up tile would be saved as the cache, and edited or
// deleted — offline, so unnoticed — it would point at an id that is some other
// item of the account.

const g = globalThis as any;
const saved: Record<string, any> = {};
const had: Record<string, boolean> = {};
const memory = new Map<string, string>();

beforeAll(() => {
    for (const k of ['window', 'document', 'localStorage', 'fetch', 'WebSocket']) {
        had[k] = k in g;
        saved[k] = g[k];
    }
    g.window = g;
    g.LASTBOARD_CONFIG = { demo_mode: false };
    g.location = { protocol: 'http:', host: 'localhost' };
    g.document = { cookie: '', querySelector: () => null, addEventListener() {}, removeEventListener() {} };
    g.localStorage = {
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => { memory.set(k, v); },
        removeItem: (k: string) => { memory.delete(k); },
        key: (i: number) => [...memory.keys()][i] ?? null,
        get length() { return memory.size; },
        clear: () => memory.clear(),
    };
    g.fetch = async () => { throw new TypeError('network down'); };
    g.WebSocket = class { addEventListener() {} close() {} send() {} };
});

afterAll(() => {
    for (const k of Object.keys(had)) {
        if (had[k]) g[k] = saved[k]; else delete g[k];
    }
    delete g.LASTBOARD_CONFIG;
    delete g.location;
});

describe('dashboardStore when the server is unreachable', () => {
    test('with no cache it shows an empty board, offline, and caches nothing', async () => {
        const { dashboardStore } = await import('./dashboardStore');
        dashboardStore.setUserId(7);
        await dashboardStore.fetchItems();

        // The store starts its socket in the background; let that settle while
        // the stand-ins are still in place.
        await new Promise(r => setTimeout(r, 100));

        const state = dashboardStore.getState();
        expect(state.isOffline).toBe(true);
        expect(state.items).toEqual([]);
        expect([...memory.keys()].filter(k => k.startsWith('lastboard-items'))).toEqual([]);
    });
});
