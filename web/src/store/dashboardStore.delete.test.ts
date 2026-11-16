import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { install, StandIns } from '../testing/standIns';

// A section owns what is inside it, and the server removes those with it. The list the
// page keeps has to agree, or the bookmarks of a section that is gone are still counted,
// searched and checked until the next reload.

let browser: StandIns;
beforeAll(async () => {
    browser = install();
    // Importing the store schedules an update check two seconds on. It has to run while the stand-ins are in
    // place: run later it would import the user store with no browser around, and that failure stays cached
    // for every test that imports it after.
    await import('./dashboardStore');
    await new Promise(r => setTimeout(r, 2100));
});
// The store is one object for the whole run: what these tests put in it, and in the cache it writes, is taken out
// again, or the next file that expects an empty board finds this one's.
afterEach(async () => {
    const { dashboardStore } = await import('./dashboardStore');
    (dashboardStore as unknown as { state: { items: unknown[] } }).state.items = [];
    for (const k of [...browser.memory.keys()]) if (k.startsWith('lastboard-items')) browser.memory.delete(k);
});
afterAll(() => { browser.restore(); });

const item = (id: number, type: string, parent_id: number | null, x = id, y = 1) => ({ id, type, parent_id, x, y, w: 1, h: 1, content: '{}' });

async function seeded() {
    const { dashboardStore } = await import('./dashboardStore');
    const { dashboardService } = await import('../services/dashboardService');
    const store = dashboardStore as unknown as { state: { items: unknown[] } };
    store.state.items = [item(1, 'section', null), item(2, 'bookmark', 1), item(3, 'bookmark', 1), item(4, 'section', null), item(5, 'bookmark', 4), item(6, 'bookmark', null)];
    return { dashboardStore, dashboardService: dashboardService as unknown as { deleteItem: (id: number) => Promise<unknown> } };
}
const ids = (s: { getState(): { items: { id: number }[] } }) => s.getState().items.map(i => i.id);

describe('deleting from the board', () => {
    test('a section takes its bookmarks with it, and nothing outside it', async () => {
        const { dashboardStore, dashboardService } = await seeded();
        const original = dashboardService.deleteItem;
        dashboardService.deleteItem = async () => ({});
        try {
            await dashboardStore.deleteItem(1);
            expect(ids(dashboardStore)).toEqual([4, 5, 6]);
        } finally { dashboardService.deleteItem = original; }
    });
    test('a bookmark alone leaves the rest as it was', async () => {
        const { dashboardStore, dashboardService } = await seeded();
        const original = dashboardService.deleteItem;
        dashboardService.deleteItem = async () => ({});
        try {
            await dashboardStore.deleteItem(2);
            expect(ids(dashboardStore).sort()).toEqual([1, 3, 4, 5, 6]);
        } finally { dashboardService.deleteItem = original; }
    });
    test('when the server refuses, the section comes back with everything that was inside it', async () => {
        const { dashboardStore, dashboardService } = await seeded();
        const original = dashboardService.deleteItem;
        dashboardService.deleteItem = async () => { throw new Error('error.server'); };
        try {
            await dashboardStore.deleteItem(1);
            expect(ids(dashboardStore).sort()).toEqual([1, 2, 3, 4, 5, 6]);
        } finally { dashboardService.deleteItem = original; }
    });

    test('"only the section" leaves its bookmarks on the board in the cells they were drawn on, without a section', async () => {
        const { dashboardStore, dashboardService } = await seeded();
        const store = dashboardStore as unknown as { state: { items: unknown[] } };
        // A section at (3,4) with three bookmarks at its own (1,1), (2,1) and (1,2).
        store.state.items = [{ ...item(1, 'section', null, 3, 4), w: 4, h: 2 }, item(2, 'bookmark', 1, 1, 1), item(3, 'bookmark', 1, 2, 1), item(4, 'bookmark', 1, 1, 2), item(5, 'bookmark', null, 9, 9)];
        const original = dashboardService.deleteItem;
        const asked: unknown[] = [];
        (dashboardService as unknown as { deleteItem: (id: number, o?: unknown) => Promise<unknown> }).deleteItem = async (id, o) => { asked.push([id, o]); return {}; };
        try {
            await dashboardStore.deleteItem(1, { keepChildren: true });
            const items = dashboardStore.getState().items as unknown as { id: number; parent_id?: number | null; x: number; y: number }[];
            expect(items.map(i => i.id).sort()).toEqual([2, 3, 4, 5]);
            const at = (id: number) => { const i = items.find(it => it.id === id)!; return [i.parent_id ?? null, i.x, i.y]; };
            expect(at(2)).toEqual([null, 3, 4]);
            expect(at(3)).toEqual([null, 4, 4]);
            expect(at(4)).toEqual([null, 3, 5]);
            expect(at(5)).toEqual([null, 9, 9]);
            expect(asked).toEqual([[1, { keepChildren: true }]]);
        } finally { dashboardService.deleteItem = original; }
    });
    test('when the server refuses "only the section", the section and its bookmarks come back as they were', async () => {
        const { dashboardStore, dashboardService } = await seeded();
        const store = dashboardStore as unknown as { state: { items: unknown[] } };
        store.state.items = [{ ...item(1, 'section', null, 3, 4), w: 4, h: 2 }, item(2, 'bookmark', 1, 1, 1)];
        const original = dashboardService.deleteItem;
        dashboardService.deleteItem = async () => { throw new Error('error.server'); };
        try {
            await dashboardStore.deleteItem(1, { keepChildren: true });
            const items = dashboardStore.getState().items as unknown as { id: number; parent_id?: number | null; x: number; y: number }[];
            expect(items.map(i => i.id).sort()).toEqual([1, 2]);
            const child = items.find(i => i.id === 2)!;
            expect([child.parent_id, child.x, child.y]).toEqual([1, 1, 1]);
        } finally { dashboardService.deleteItem = original; }
    });
});
