/**
 * Records the one thing a screenshot cannot show: the grid rearranging itself.
 *
 *   bun scripts/docs-motion.ts        # writes docs/assets/grid.webp
 *
 * A still frame of a resize explains nothing — you cannot tell what was
 * grabbed, that the tile grows in steps of one grid cell, or that everything
 * around it moves out of the way. So this drags the corner of a real widget on
 * a real board and records the frames the browser paints.
 *
 * It is a resize rather than a tile-to-tile drag on purpose: moving a tile uses
 * the browser's own drag and drop, and a headless browser paints no drag image
 * for it, so the recording showed a board where nothing ever moved. Resizing is
 * the app's own pointer handling, which records exactly as a person sees it.
 *
 * It reuses the same disposable instance as scripts/docs-shots.ts, seeded the
 * same way, so the board in the animation is the board in the screenshots.
 */
import { existsSync, mkdirSync, rmSync, readdirSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const OUT = 'docs/assets/grid.webp';
const PORT = Number(process.env.PORT || 8096);
const CDP_PORT = Number(process.env.CDP_PORT || 9227);
const APP = `http://localhost:${PORT}/`;
const WORK = join(tmpdir(), 'lastboard-docs-motion');
const BIN = './bin/lastboard';

const W = 1280, H = 720;   // the animation's own frame, kept small on purpose
const FPS = 20;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let id = 0;
const pending = new Map<number, (v: any) => void>();
let ws: WebSocket;
const frames: string[] = [];
/** Resolved with the payload Chrome builds when a drag starts. */
let pendingDrag: ((data: any) => void) | null = null;

function cdp(method: string, params: any = {}): Promise<any> {
    const myId = ++id;
    return new Promise((resolve) => { pending.set(myId, resolve); ws.send(JSON.stringify({ id: myId, method, params })); });
}
async function evaluate(expression: string) {
    const r = await cdp('Runtime.evaluate', {
        expression: `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); ${expression} })()`,
        awaitPromise: true, returnByValue: true,
    });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'evaluate failed');
    return r.result?.result?.value;
}
async function waitFor(url: string, tries = 60) {
    for (let i = 0; i < tries; i++) {
        try { const r = await fetch(url); if (r.ok || r.status === 303 || r.status === 404) return; } catch { }
        await sleep(250);
    }
    throw new Error(`timed out waiting for ${url}`);
}

async function main() {
    if (!existsSync(BIN)) { console.error(`${BIN} is missing — run \`make build\` first.`); process.exit(1); }
    rmSync(WORK, { recursive: true, force: true });
    mkdirSync(join(WORK, 'frames'), { recursive: true });

    const procs: ChildProcess[] = [];
    process.on('exit', () => procs.forEach((p) => { try { p.kill(); } catch { } }));

    console.log('▶ starting a disposable instance…');
    procs.push(spawn(BIN, [], { env: { ...process.env, DB_FILE: join(WORK, 'motion.db'), PORT: String(PORT) }, stdio: 'ignore' }));
    await waitFor(APP);
    await fetch(`${APP}api/setup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo', password: 'Lastboard123!', language: 'en', theme: 'dark', accent_color: '#e8520e' }),
    });
    const login = await fetch(`${APP}api/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo', password: 'Lastboard123!' }),
    });
    const cookies = Object.fromEntries((login.headers.getSetCookie?.() || [])
        .map((c) => { const [k, v] = c.split(';')[0].split('='); return [k, v]; }));

    console.log('▶ starting the browser…');
    procs.push(spawn('google-chrome', [
        '--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${join(WORK, 'profile')}`,
        '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', '--lang=en-US', 'about:blank',
    ], { stdio: 'ignore' }));
    await waitFor(`http://127.0.0.1:${CDP_PORT}/json/version`);
    const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    ws = new WebSocket(list.find((t: any) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = () => r(null); });
    ws.onmessage = (e) => {
        const m = JSON.parse(e.data as string);
        if (m.id && pending.has(m.id)) { pending.get(m.id)!(m); pending.delete(m.id); return; }
        if (m.method === 'Input.dragIntercepted' && pendingDrag) {
            const resolve = pendingDrag; pendingDrag = null;
            resolve(m.params.data);
            return;
        }
        if (m.method === 'Page.screencastFrame') {
            frames.push(m.params.data);
            cdp('Page.screencastFrameAck', { sessionId: m.params.sessionId });
        }
    };
    await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
    // Motion is the subject here, so nothing is suppressed.
    await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    for (const [name, value] of Object.entries(cookies)) {
        await cdp('Network.setCookie', { name, value, domain: 'localhost', path: '/' });
    }
    await cdp('Page.navigate', { url: APP });
    await sleep(2000);
    // Nothing is recorded until every tile has its content: a widget still
    // showing "Just a sec…" in the clip makes the whole board look broken.
    for (let i = 0; i < 40; i++) {
        const left = await evaluate(`
            const walk = (root, out = []) => {
                root.querySelectorAll('img').forEach((x) => out.push(x));
                root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot, out); });
                return out;
            };
            const pending = walk(document).filter((x) => !(x.complete && x.naturalWidth > 0)).length;
            const loading = document.querySelector('bookmark-grid').shadowRoot.textContent.includes('Just a sec');
            return pending + (loading ? 1 : 0);`);
        if (left === 0) break;
        await sleep(400);
    }
    await sleep(800);

    // Edit mode, then the corner of a widget worth growing.
    await evaluate(`document.querySelector('app-topbar').shadowRoot.querySelector('#edit-toggle').click(); await sleep(1200);`);
    const spot = await evaluate(`
        const grid = document.querySelector('bookmark-grid').shadowRoot;
        const card = grid.querySelector('widget-markdown').closest('.bookmark-grid__card');
        const handle = card.querySelector('.resize-handle');
        if (!handle) throw new Error('that tile has no resize handle');
        const h = handle.getBoundingClientRect();
        return { x: h.left + h.width / 2, y: h.top + h.height / 2 };`);

    console.log('▶ recording…');
    await cdp('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
    await sleep(600);

    const from = spot;
    const to = { x: from.x + 300, y: from.y + 150 };
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x, y: from.y, button: 'none' });
    await sleep(400);
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', clickCount: 1 });
    await sleep(250);
    const steps = 34;
    for (let i = 1; i <= steps; i++) {
        // Ease in and out, so it reads as a hand and not as a teleport.
        const t = i / steps;
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        await cdp('Input.dispatchMouseEvent', {
            type: 'mouseMoved', button: 'left', buttons: 1,
            x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e,
        });
        await sleep(30);
    }
    await sleep(500);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1 });
    await sleep(900);
    await cdp('Page.stopScreencast');
    console.log(`  ${frames.length} frames`);

    // Assemble. WebP rather than GIF: a quarter of the weight at this size and
    // no 256-colour banding across a dark interface.
    frames.forEach((data, i) => writeFileSync(join(WORK, 'frames', `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(data, 'base64')));
    const n = readdirSync(join(WORK, 'frames')).length;
    if (!n) { console.error('✗ nothing was recorded'); process.exit(1); }

    const ff = spawnSync('ffmpeg', [
        '-y', '-framerate', String(FPS), '-i', join(WORK, 'frames', 'f%04d.jpg'),
        '-vf', `scale=${W}:-1:flags=lanczos`, '-loop', '0', '-lossless', '0', '-q:v', '62',
        '-preset', 'picture', '-an', OUT,
    ], { encoding: 'utf8' });
    if (ff.status !== 0) { console.error('✗ ffmpeg:', (ff.stderr || '').trim().split('\n').pop()); process.exit(1); }

    const size = spawnSync('bash', ['-c', `du -h ${OUT} | cut -f1`], { encoding: 'utf8' }).stdout.trim();
    console.log(`✓ ${OUT} — ${n} frames, ${size}`);
    process.exit(0);
}

main().catch((err) => { console.error('✗', err.message); process.exit(1); });
