import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { HAS_GO, startRealServer, type RealServer } from '../testing/realServer';
import { bookmarkRequest, planImport, sectionRequest } from './importPlan';

/**
 * The whole way an imported file travels, against a real server.
 *
 * File -> the server's parser -> the planner -> the requests the interface sends
 * -> the server that has to accept them. The import was broken for everybody for
 * two months with every test passing, because each stage was tested with data it
 * made up for itself and nothing ever sent one stage's output to the next. Here
 * the output of each is the input of the next, and the last one is the real
 * binary: a position the server refuses, a body it cannot read or a rate limit
 * it enforces fails this, not a user.
 *
 * It builds and starts the server (see testing/realServer.ts), so it needs the
 * Go toolchain and the frontend bundle the server embeds. Without Go it says so
 * and does not pretend to have run; a machine that cannot build the server is
 * not one that releases.
 */

const FIXTURES = join(import.meta.dir, '../../../internal/web/api/testdata/import');

let server: RealServer;

beforeAll(async () => {
    if (!HAS_GO) {
        console.warn('importPipeline: no Go toolchain here, so the real server is not started and this did not run');
        return;
    }
    server = await startRealServer();
}, 180_000);

afterAll(() => server?.stop());

/** Sends a file to the server's parser exactly as the settings panel does. */
async function parse(name: string, format: string) {
    const form = new FormData();
    form.append('file', new File([readFileSync(join(FIXTURES, name))], name));
    form.append('format', format);
    const res = await server.upload('/api/import/parse', form);
    return { status: res.status, cfg: res.ok ? await res.json() : null };
}

/** What `materialize` does, request for request, with the shared builders. */
async function build(cfg: { dashboards: { name: string; items: never[] }[] }) {
    const made: { dashboard: number; sections: number; bookmarks: number }[] = [];
    for (const plan of planImport(cfg.dashboards as never, 12, 'Ungrouped')) {
        const dash = await server.ok<{ id: number }>('POST', '/api/dashboards', { name: plan.name });
        let bookmarks = 0;
        for (const sec of plan.sections) {
            const section = await server.ok<{ id: number }>('POST', '/api/dashboard/item', sectionRequest(dash.id, sec));
            for (const it of sec.items) {
                await server.ok('POST', '/api/dashboard/item', bookmarkRequest(dash.id, section.id, it));
                bookmarks++;
            }
        }
        made.push({ dashboard: dash.id, sections: plan.sections.length, bookmarks });
    }
    return made;
}

const files = readdirSync(FIXTURES).filter(f => /\.(ya?ml)$/.test(f));

describe('an imported file, from the file to the real server', () => {
    it('has files to import', () => {
        // Finding none would mean this is reading the wrong folder, not that all is well.
        expect(files.length).toBeGreaterThanOrEqual(5);
    });

    for (const file of files) {
        it(`${file}: every item the parser returns is accepted by the server`, async () => {
            if (!HAS_GO) return;
            const { status, cfg } = await parse(file, 'auto');
            expect(status).toBe(200);
            const expected = cfg.dashboards.reduce((n: number, d: { items: unknown[] }) => n + d.items.length, 0);
            expect(expected).toBeGreaterThan(0);

            const made = await build(cfg);
            expect(made.reduce((n, m) => n + m.bookmarks, 0)).toBe(expected);

            // And what the server now holds is what was planned.
            for (const m of made) {
                const items = await server.ok<{ type: string; x: number; y: number }[]>('GET', `/api/dashboard?dashboard_id=${m.dashboard}`);
                expect(items.filter(i => i.type === 'bookmark')).toHaveLength(m.bookmarks);
                expect(items.filter(i => i.type === 'section')).toHaveLength(m.sections);
            }
        }, 120_000);
    }

    it('keeps the groups of a native export when it is read back', async () => {
        if (!HAS_GO) return;
        // Its own board, made here: it used to rely on what the tests before it had
        // imported, and failed with a 422 (an export with nothing in it) whenever the
        // order put it first.
        const dash = await server.ok<{ id: number }>('POST', '/api/dashboards', { name: 'Round trip' });
        const section = await server.ok<{ id: number }>('POST', '/api/dashboard/item',
            sectionRequest(dash.id, { title: 'Media', x: 1, y: 1, w: 4, h: 3, items: [] }));
        await server.ok('POST', '/api/dashboard/item',
            bookmarkRequest(dash.id, section.id, { title: 'Player', url: 'http://player.lan', x: 1, y: 1 }));
        const exported = await (await server.call('GET', '/api/export/native')).text();
        const form = new FormData();
        form.append('file', new File([exported], 'export.yaml'));
        form.append('format', 'auto');
        const res = await server.upload('/api/import/parse', form);
        expect(res.status).toBe(200);
        const cfg = await res.json();
        const groups = new Set(cfg.dashboards.flatMap((d: { items: { group?: string }[] }) => d.items.map(i => i.group || '')));
        // The board above has a named section; losing it is the bug.
        expect([...groups].some(g => g !== '')).toBe(true);
    }, 60_000);
});
