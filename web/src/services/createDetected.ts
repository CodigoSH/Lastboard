import { retryOnRateLimit } from './retryOnRateLimit';
import { planPlacement, type BoardItem, type SectionToPlace } from './placeServices';

/**
 * Puts the services a person ticked on a board.
 *
 * It creates what it can and says what it could not: a failure on one bookmark
 * does not stop the rest, and nothing already made is taken back. The one thing
 * that does stop the run is the account's limit of items: every bookmark after
 * it would be refused too.
 */

export interface NewBookmark {
    /** The content, already written. */
    content: string;
}

/** What the run needs of the server; the real one is the dashboard service. */
export interface ItemApi {
    createItem(body: Record<string, unknown>): Promise<{ id: number }>;
    updateItem(body: { id: number; h: number }): Promise<unknown>;
}

export interface CreateResult {
    created: number;
    /** Refused for a reason that was not the limit. */
    failed: number;
    /** Left undone because the account reached its limit of items. */
    notFit: number;
}

export const ITEM_LIMIT = 'error.item_limit_reached';

// The real service needs a browser, so it is loaded when a run starts and not
// when this file does: the logic here can then be tested with a stand-in.
const realApi: ItemApi = {
    createItem: async body => (await import('./dashboardService')).dashboardService.createItem(body as never),
    updateItem: async body => (await import('./dashboardService')).dashboardService.updateItem(body as never),
};

export interface CreateOptions {
    boardId: number;
    gridCols: number;
    sections: SectionToPlace<NewBookmark>[];
    /** What is on the board now. */
    board: BoardItem[];
    api?: ItemApi;
    /** Retries a request the server refused for being asked too fast. */
    retry?: <T>(run: () => Promise<T>) => Promise<T>;
}

export async function createDetected(opts: CreateOptions): Promise<CreateResult> {
    const api = opts.api ?? realApi;
    const retry = opts.retry ?? (run => retryOnRateLimit(run));
    let created = 0;
    let failed = 0;
    let notFit = 0;
    let limited = false;

    const placements = planPlacement(opts.sections, opts.board, opts.gridCols);

    for (const p of placements) {
        if (limited) { notFit += p.items.length; continue; }

        let sectionId: number;
        try {
            if (p.kind === 'new') {
                const made = await retry(() => api.createItem({
                    dashboard_id: opts.boardId, type: 'section', x: p.x, y: p.y, w: p.w, h: p.h,
                    content: JSON.stringify({ title: p.title }),
                }));
                sectionId = made.id;
            } else {
                sectionId = p.sectionId;
                if (p.newH != null) {
                    await retry(() => api.updateItem({ id: p.sectionId, h: p.newH! }));
                }
            }
        } catch (err) {
            if ((err as Error)?.message === ITEM_LIMIT) { limited = true; notFit += p.items.length; } else { failed += p.items.length; }
            continue;
        }

        for (let k = 0; k < p.items.length; k++) {
            if (limited) { notFit++; continue; }
            const it = p.items[k];
            try {
                await retry(() => api.createItem({
                    dashboard_id: opts.boardId, parent_id: sectionId, type: 'bookmark', x: it.x, y: it.y, w: 1, h: 1,
                    content: it.item.content,
                }));
                created++;
            } catch (err) {
                if ((err as Error)?.message === ITEM_LIMIT) { limited = true; notFit++; } else { failed++; }
            }
        }
    }
    return { created, failed, notFit };
}
