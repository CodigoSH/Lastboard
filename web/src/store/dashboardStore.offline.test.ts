import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { install, StandIns } from '../testing/standIns';

// What the page shows when the server cannot be reached and nothing was cached:
// nothing of its own. A made-up tile would be saved as the cache, and edited or
// deleted — offline, so unnoticed — it would point at an id that is some other
// item of the account.

let browser: StandIns;
beforeAll(() => { browser = install(); });
afterAll(() => { browser.restore(); });

describe('dashboardStore when the server is unreachable', () => {
    test('with no cache it shows an empty board, offline, and caches nothing', async () => {
        const { dashboardStore } = await import('./dashboardStore');
        dashboardStore.setUserId(7);
        await dashboardStore.fetchItems();
        await browser.settle();
        // The store also schedules an update check two seconds after it starts. It has
        // to run here, while the stand-ins are in place: run later it would import
        // userStore with no browser around, and that failure stays cached for every
        // test that imports it after.
        await new Promise(r => setTimeout(r, 2100));

        const state = dashboardStore.getState();
        expect(state.isOffline).toBe(true);
        expect(state.items).toEqual([]);
        expect([...browser.memory.keys()].filter(k => k.startsWith('lastboard-items'))).toEqual([]);
    });
});
