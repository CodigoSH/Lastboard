import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { install, StandIns } from '../testing/standIns';

// A section owns what is inside it, and the server removes those with it. The list the
// page keeps has to agree, or the bookmarks of a section that is gone are still counted,
// searched and checked until the next reload.

let browser: StandIns;
beforeAll(() => { browser = install(); });
afterAll(() => { browser.restore(); });

const item = (id: number, type: string, parent_id: number | null) => ({ id, type, parent_id, x: id, y: 1, w: 1, h: 1, content: '{}' });

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
});
