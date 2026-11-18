import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { install, StandIns } from '../testing/standIns';

// Two adds that start together must not read the board at the same moment: the second waits for the first, so it
// sees the item the first one put there and does not land on the same slot. A failed add must not block the next.

let browser: StandIns;
beforeAll(async () => {
    browser = install();
    // Importing the store schedules an update check two seconds on; it has to run while the stand-ins are in place.
    await import('./dashboardStore');
    await new Promise(r => setTimeout(r, 2100));
});
afterEach(async () => {
    const { dashboardStore } = await import('./dashboardStore');
    (dashboardStore as unknown as { state: { items: unknown[] } }).state.items = [];
    for (const k of [...browser.memory.keys()]) if (k.startsWith('lastboard-items')) browser.memory.delete(k);
});
afterAll(() => { browser.restore(); });

type Created = { id: number; type: string; x: number; y: number; w: number; h: number; content: string };
const draft = { type: 'bookmark', w: 1, h: 1, content: '{}' } as never;

async function withCreate(create: (p: Created) => Promise<Created>, run: () => Promise<void>) {
    const { dashboardService } = await import('../services/dashboardService');
    const service = dashboardService as unknown as { createItem: (p: Created) => Promise<Created> };
    const original = service.createItem;
    service.createItem = create;
    try { await run(); } finally { service.createItem = original; }
}

describe('adding to the board', () => {
    test('two adds started together run one after the other, and the second sees the first', async () => {
        const { dashboardStore } = await import('./dashboardStore');
        const events: string[] = [];
        let next = 1;
        await withCreate(async (p) => {
            const id = next++;
            events.push(`start ${id}`);
            await new Promise(r => setTimeout(r, 30));
            events.push(`end ${id}`);
            return { ...p, id };
        }, async () => {
            const [a, b] = await Promise.all([dashboardStore.addItem(draft), dashboardStore.addItem(draft)]);
            expect(events).toEqual(['start 1', 'end 1', 'start 2', 'end 2']);
            expect([a?.id, b?.id]).toEqual([1, 2]);
            // The second add chose its slot after the first was on the board, so they differ.
            expect(`${a?.x},${a?.y}`).not.toBe(`${b?.x},${b?.y}`);
        });
    });

    test('an add that fails does not hold back the next one', async () => {
        const { dashboardStore } = await import('./dashboardStore');
        let calls = 0;
        await withCreate(async (p) => {
            calls++;
            if (calls === 1) throw new Error('error.server');
            return { ...p, id: 7 };
        }, async () => {
            const [a, b] = await Promise.all([dashboardStore.addItem(draft), dashboardStore.addItem(draft)]);
            expect(a).toBeUndefined();
            expect(b?.id).toBe(7);
        });
    });
});
