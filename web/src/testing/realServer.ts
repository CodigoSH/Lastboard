import { mkdtempSync, rmSync } from 'fs';
import { createServer } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { retryOnRateLimit } from '../services/retryOnRateLimit';

/**
 * A real Lastboard server for a test to talk to: the binary, built from this
 * checkout, on a free port with a database of its own and one account signed in.
 *
 * For the tests whose whole point is the junction between the interface and the
 * server — what the interface sends against what the server accepts — which no
 * test that makes up its own answers can see. It needs the Go toolchain and the
 * frontend bundle the server embeds; without Go, `available` is false and the
 * test says so instead of pretending to have run.
 */

const ROOT = join(import.meta.dir, '../../..');
export const HAS_GO = Bun.which('go') !== null;

export interface RealServer {
    base: string;
    /** The request the interface would make: session cookie, CSRF token echoed; waits out the rate limit. */
    call(method: string, path: string, body?: unknown): Promise<Response>;
    /** Like the app's apiService: a failure is an Error carrying the server's text; waits out the rate limit. */
    ok<T>(method: string, path: string, body?: unknown): Promise<T>;
    /** Sends a form (a file upload) the way the interface does; waits out the rate limit. */
    upload(path: string, form: FormData): Promise<Response>;
    /** A second signed-in session on the same server: another device of the same person. */
    anotherDevice(): Promise<Pick<RealServer, 'call' | 'ok' | 'upload'>>;
    stop(): void;
}

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

function session(base: string, cookie: string, csrf: string) {
    // Every request waits out the rate limit, the reads included: the test that
    // follows a long run of writes starts with an empty bucket, and a read that
    // was refused there failed a run that had nothing wrong with it.
    const call = (method: string, path: string, body?: unknown): Promise<Response> =>
        retryOnRateLimit(async () => {
            const res = await fetch(base + path, {
                method,
                headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrf },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
            if (res.status === 429) throw new Error((await res.text()).trim());
            return res;
        });
    const ok = <T>(method: string, path: string, body?: unknown): Promise<T> =>
        retryOnRateLimit(async () => {
            const res = await call(method, path, body);
            const text = (await res.text()).trim();
            if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
            return (text ? JSON.parse(text) : {}) as T;
        });
    const upload = (path: string, form: FormData): Promise<Response> =>
        retryOnRateLimit(async () => {
            const res = await fetch(base + path, { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': csrf }, body: form });
            if (res.status === 429) throw new Error((await res.text()).trim());
            return res;
        });
    return { call, ok, upload };
}

async function signIn(base: string): Promise<{ cookie: string; csrf: string }> {
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
    if (!jar.has('csrf_token')) jar.set('csrf_token', 'test-csrf-token');
    return {
        cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
        csrf: decodeURIComponent(jar.get('csrf_token')!),
    };
}

export async function startRealServer(): Promise<RealServer> {
    const dir = mkdtempSync(join(tmpdir(), 'lastboard-real-'));
    const binary = join(dir, 'lastboard');
    const build = Bun.spawnSync(['go', 'build', '-o', binary, './cmd/lastboard'], { cwd: ROOT, stderr: 'pipe' });
    if (build.exitCode !== 0) throw new Error('go build failed:\n' + build.stderr.toString());

    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const proc = Bun.spawn([binary], {
        cwd: dir,
        env: { ...process.env, PORT: String(port), DB_FILE: join(dir, 'real.db') },
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

    const first = await signIn(base);
    return {
        base,
        ...session(base, first.cookie, first.csrf),
        async anotherDevice() {
            const other = await signIn(base);
            return session(base, other.cookie, other.csrf);
        },
        stop() {
            proc.kill();
            rmSync(dir, { recursive: true, force: true });
        },
    };
}
