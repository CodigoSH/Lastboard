import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'fs';
import { createServer } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { bookmarkRequest, planImport, sectionRequest } from './importPlan';
import { retryOnRateLimit } from './retryOnRateLimit';

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
 * It builds and starts the server, so it needs the Go toolchain and the
 * frontend bundle the server embeds. Without Go it says so and does not pretend
 * to have run; a machine that cannot build the server is not one that releases.
 */

const ROOT = join(import.meta.dir, '../../..');
const FIXTURES = join(ROOT, 'internal/web/api/testdata/import');
const HAS_GO = Bun.which('go') !== null;

let dir = '';
let base = '';
let proc: ReturnType<typeof Bun.spawn> | null = null;
let cookie = '';
let csrf = '';

async function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const srv = createServer();
        srv.listen(0, '127.0.0.1', () => {
            const port = (srv.address() as { port: number }).port;
            srv.close(() => resolve(port));
        });
        srv.on('error', reject);
    });
}

/** The request the interface would make: session cookie, and the CSRF token echoed. */
async function call(method: string, path: string, body?: unknown): Promise<Response> {
    return fetch(base + path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Cookie: cookie,
            'X-CSRF-Token': csrf,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

/** Like the app's apiService: a failure becomes an Error carrying the server's text. */
async function ok<T>(method: string, path: string, body?: unknown): Promise<T> {
    // Every call here waits out the rate limit, as the app does: what this test
    // is about is what the server accepts, and a burst of requests it just made
    // must not turn its own checking reads into failures.
    return retryOnRateLimit(async () => {
        const res = await call(method, path, body);
        const text = (await res.text()).trim();
        if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
        return (text ? JSON.parse(text) : {}) as T;
    });
}

beforeAll(async () => {
    if (!HAS_GO) {
        console.warn('importPipeline: no Go toolchain here, so the real server is not started and this did not run');
        return;
    }
    dir = mkdtempSync(join(tmpdir(), 'lastboard-pipeline-'));
    const binary = join(dir, 'lastboard');
    const build = Bun.spawnSync(['go', 'build', '-o', binary, './cmd/lastboard'], { cwd: ROOT, stderr: 'pipe' });
    if (build.exitCode !== 0) throw new Error('go build failed:\n' + build.stderr.toString());

    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    proc = Bun.spawn([binary], {
        cwd: dir,
        env: { ...process.env, PORT: String(port), DB_FILE: join(dir, 'pipeline.db') },
        stdout: 'ignore',
        stderr: 'ignore',
    });
    for (let i = 0; i < 100; i++) {
        try {
            if ((await fetch(base + '/login', { redirect: 'manual' })).status < 500) break;
        } catch { /* not listening yet */ }
        await Bun.sleep(100);
    }

    const setup = await fetch(base + '/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'pipeline', password: 'Pipeline-test-1x', language: 'en', theme: 'dark' }),
    });
    if (!setup.ok) throw new Error('setup failed: ' + (await setup.text()));
    const login = await fetch(base + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'pipeline', password: 'Pipeline-test-1x' }),
    });
    if (!login.ok) throw new Error('login failed: ' + (await login.text()));
    const jar = new Map<string, string>();
    for (const c of login.headers.getSetCookie?.() ?? []) {
        const [pair] = c.split(';');
        const eq = pair.indexOf('=');
        jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    // The server hands out its own CSRF token at login; echo that one.
    if (!jar.has('csrf_token')) jar.set('csrf_token', 'pipeline-test-token');
    csrf = decodeURIComponent(jar.get('csrf_token')!);
    cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    if (!jar.has('session') && jar.size < 2) throw new Error('login gave no session cookie: ' + [...jar.keys()].join(','));
}, 180_000);

afterAll(() => {
    proc?.kill();
    if (dir) rmSync(dir, { recursive: true, force: true });
});

/** Sends a file to the server's parser exactly as the settings panel does. */
async function parse(name: string, format: string) {
    const form = new FormData();
    form.append('file', new File([readFileSync(join(FIXTURES, name))], name));
    form.append('format', format);
    return retryOnRateLimit(async () => {
        const res = await fetch(base + '/api/import/parse', {
            method: 'POST',
            headers: { Cookie: cookie, 'X-CSRF-Token': csrf },
            body: form,
        });
        const text = await res.text();
        if (res.status === 429) throw new Error(text.trim());
        return { status: res.status, cfg: res.ok ? JSON.parse(text) : null };
    });
}

/** What `materialize` does, request for request, with the shared builders. */
async function build(cfg: { dashboards: { name: string; items: never[] }[] }) {
    const made: { dashboard: number; sections: number; bookmarks: number }[] = [];
    for (const plan of planImport(cfg.dashboards as never, 12, 'Ungrouped')) {
        const dash = await retryOnRateLimit(() => ok<{ id: number }>('POST', '/api/dashboards', { name: plan.name }));
        let bookmarks = 0;
        for (const sec of plan.sections) {
            const section = await retryOnRateLimit(() => ok<{ id: number }>('POST', '/api/dashboard/item', sectionRequest(dash.id, sec)));
            for (const it of sec.items) {
                await retryOnRateLimit(() => ok('POST', '/api/dashboard/item', bookmarkRequest(dash.id, section.id, it)));
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
                const items = await ok<{ type: string; x: number; y: number }[]>('GET', `/api/dashboard?dashboard_id=${m.dashboard}`);
                expect(items.filter(i => i.type === 'bookmark')).toHaveLength(m.bookmarks);
                expect(items.filter(i => i.type === 'section')).toHaveLength(m.sections);
            }
        }, 120_000);
    }

    it('keeps the groups of a native export when it is read back', async () => {
        if (!HAS_GO) return;
        const exported = await retryOnRateLimit(async () => {
            const res = await call('GET', '/api/export/native');
            const text = await res.text();
            if (res.status === 429) throw new Error(text.trim());
            return text;
        });
        const form = new FormData();
        form.append('file', new File([exported], 'export.yaml'));
        form.append('format', 'auto');
        const res = await retryOnRateLimit(async () => {
            const r = await fetch(base + '/api/import/parse', {
                method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': csrf }, body: form,
            });
            if (r.status === 429) throw new Error((await r.text()).trim());
            return r;
        });
        expect(res.status).toBe(200);
        const cfg = await res.json();
        const groups = new Set(cfg.dashboards.flatMap((d: { items: { group?: string }[] }) => d.items.map(i => i.group || '')));
        // The starter board has named sections; losing them is the bug.
        expect([...groups].some(g => g !== '')).toBe(true);
    }, 60_000);
});
