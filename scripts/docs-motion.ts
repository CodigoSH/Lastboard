/**
 * Records the two things a screenshot cannot show: moving a tile and resizing one.
 *
 *   bun scripts/docs-motion.ts        # writes docs/assets/grid.webp
 *
 * Needs three system tools and no project dependencies at all:
 *
 *   sudo dnf install -y xorg-x11-server-Xvfb xdotool     # ffmpeg is already here
 *
 * ── Why a real screen ───────────────────────────────────────────────────────
 *
 * A browser with no window paints neither the mouse cursor nor the translucent
 * copy of a tile that Chrome carries under it during a drag, and a synthetic
 * pointer never starts a native drag in the first place. Recordings made that
 * way show a board whose tiles rearrange themselves with nothing touching them.
 *
 * So this runs a real Chrome on a private X display, moves the real pointer with
 * xdotool, and films the screen with ffmpeg. Everything in the clip — the
 * cursor, the tile lifted under it, the drop outline, the reflow, the resize —
 * is the browser and the board doing their own work, filmed rather than staged.
 * The display is a throwaway one, so nothing appears on your desktop.
 *
 * Chrome's debugging port is still used, but only to look: plant the session
 * cookie, wait for the board to finish loading, measure where the tiles are, and
 * check afterwards that the move and the resize really happened. Nothing about
 * the interaction is driven through it.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const OUT = 'docs/assets/grid.webp';
const PORT = Number(process.env.PORT || 8096);
const CDP_PORT = Number(process.env.CDP_PORT || 9227);
const DISPLAY = process.env.MOTION_DISPLAY || ':99';
const APP = `http://localhost:${PORT}/`;
const WORK = join(tmpdir(), 'lastboard-docs-motion');
const BIN = './bin/lastboard';

const W = 1280, H = 800;
const FPS = 30;
/** Milliseconds between pointer moves while a native drag is in flight. */
const DRAG_STEP = 55;

/**
 * The environment for everything that talks to the throwaway display.
 *
 * Fedora's desktop is Wayland, but Xvfb is a private X server of its own and
 * never goes near the session compositor — which is the point: nothing appears
 * on your screen and nothing on your screen is filmed. WAYLAND_DISPLAY has to be
 * cleared all the same, or Chrome sees it and connects to the desktop instead of
 * the display it was given.
 */
const XENV = (() => {
    const e = { ...process.env, DISPLAY };
    delete e.WAYLAND_DISPLAY;
    delete e.XDG_SESSION_TYPE;
    return e;
})();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const log = (m: string) => process.stderr.write(m + '\n');

let id = 0;
let ws: WebSocket;
const pending = new Map<number, (v: any) => void>();

function cdp(method: string, params: any = {}, timeoutMs = 20000): Promise<any> {
    const myId = ++id;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(myId); reject(new Error(`${method} never answered`)); }, timeoutMs);
        pending.set(myId, (v) => { clearTimeout(timer); resolve(v); });
        ws.send(JSON.stringify({ id: myId, method, params }));
    });
}

/** Runs a synchronous expression in the page. Nothing in the page ever waits:
 *  all pacing happens out here, next to the pointer. */
async function evaluate(expression: string) {
    const r = await cdp('Runtime.evaluate', { expression: `(() => { ${expression} })()`, returnByValue: true });
    const ex = r.result?.exceptionDetails;
    if (ex) throw new Error(ex.exception?.description || ex.text || 'evaluate failed');
    return r.result?.result?.value;
}

/** The real pointer, on the throwaway display. */
const mouse = {
    to: (x: number, y: number) => spawnSync('xdotool', ['mousemove', '--sync', String(Math.round(x)), String(Math.round(y))], { env: XENV }),
    down: () => spawnSync('xdotool', ['mousedown', '1'], { env: XENV }),
    up: () => spawnSync('xdotool', ['mouseup', '1'], { env: XENV }),
    key: (k: string) => spawnSync('xdotool', ['key', k], { env: XENV }),
};

/**
 * Glides the pointer from one point to another over `ms`, easing in and out.
 *
 * One xdotool call per step, waited on. Batching the whole path into a single
 * invocation with its own sleeps was faster but lost the drag: Chrome's native
 * drag needs its motion events spaced out, and a chain delivers them in a burst.
 * A drag is glided at a slower cadence than a plain cursor move — see DRAG_STEP.
 * Chrome negotiates a native drag with the X server on every motion event, and
 * pushing them out faster than that exchange completes drops the drag silently:
 * the pointer arrives, the tile does not. It was working by accident before,
 * because sampling the outline on every step was slowing the loop down.
 */
async function glide(from: { x: number; y: number }, to: { x: number; y: number }, ms: number,
                     watch?: (state: string) => void, stepMs = 1000 / FPS) {
    const steps = Math.max(2, Math.round(ms / stepMs));
    const started = Date.now();
    for (let i = 1; i <= steps; i++) {
        const e = ease(i / steps);
        mouse.to(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
        if (watch && i % 2 === 0) watch(await evaluate('return window.__ghostState();'));
        // Sleep only for whatever is left of the frame; xdotool and the page
        // have already eaten part of it.
        const due = started + (i * ms) / steps;
        const left = due - Date.now();
        if (left > 0) await sleep(left);
    }
    return { ...to };
}

/** Where an element is, in screen coordinates. The expression must return one. */
async function where(expr: string): Promise<{ x: number; y: number; w: number; h: number }> {
    const r = await evaluate(`
        const el = (() => { ${expr} })();
        if (!el) throw new Error('not on screen: ' + ${JSON.stringify(expr).replace(/`/g, '\\`')});
        const b = el.getBoundingClientRect();
        return JSON.stringify({ x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height });`);
    return JSON.parse(r);
}

/** Everything the page needs so the board can be watched while it is used. */
const HELPERS = `
window.__grid = document.querySelector('bookmark-grid');
window.__root = window.__grid.shadowRoot;
window.__cardOf = (id) => window.__root.querySelector(
    '.bookmark-grid__card[data-id="' + id + '"], .bookmark-grid__section[data-id="' + id + '"]');
window.__ghostState = () => {
    const g = window.__root.getElementById('ghost-element');
    if (!g || g.style.display === 'none') return 'hidden';
    return g.classList.contains('invalid') ? 'invalid' : 'valid';
};
`;



async function main() {
    for (const tool of ['Xvfb', 'xdotool', 'ffmpeg']) {
        if (spawnSync('which', [tool]).status !== 0) {
            log(`✗ ${tool} is missing.  sudo dnf install -y xorg-x11-server-Xvfb xdotool`);
            process.exit(1);
        }
    }
    if (!existsSync(BIN)) { log(`${BIN} is missing — run \`make build\` first.`); process.exit(1); }
    rmSync(WORK, { recursive: true, force: true });
    mkdirSync(WORK, { recursive: true });

    const procs: ChildProcess[] = [];
    const cleanup = () => procs.forEach((p) => { try { p.kill('SIGKILL'); } catch { } });
    process.on('exit', cleanup);
    // A plain 'exit' handler does not run when this process is signalled, and a
    // leftover instance, browser or display keeps its port — the next run then
    // quietly drives the stranger instead of its own, which reads like a hang.
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(sig, () => { cleanup(); process.exit(1); });
    for (const [what, url] of [['instance', APP], ['browser', `http://127.0.0.1:${CDP_PORT}/json/version`]] as const) {
        try {
            await fetch(url, { signal: AbortSignal.timeout(1500) });
            log(`✗ a ${what} is already listening — stop it first`);
            process.exit(1);
        } catch { /* nothing there: good */ }
    }

    log('▶ starting a disposable instance…');
    procs.push(spawn(BIN, [], { env: { ...process.env, DB_FILE: join(WORK, 'motion.db'), PORT: String(PORT) }, stdio: 'ignore' }));
    for (let i = 0; i < 80; i++) { try { await fetch(APP); break; } catch { } await sleep(250); }
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
    if (!cookies.session_token) throw new Error('the disposable instance would not log in');

    log(`▶ starting a private display on ${DISPLAY}…`);
    procs.push(spawn('Xvfb', [DISPLAY, '-screen', '0', `${W}x${H}x24`, '-nolisten', 'tcp'], { stdio: 'ignore' }));
    await sleep(1200);
    if (spawnSync('xdotool', ['getmouselocation'], { env: XENV }).status !== 0) {
        throw new Error(`the display ${DISPLAY} never came up`);
    }

    // Chrome's offer to translate the page opened a bubble across the top of the
    // first recordings, and left repaint artefacts over the app's own bar after
    // it closed. The command-line switches alone did not stop it; the profile
    // preference does.
    const profile = join(WORK, 'profile', 'Default');
    mkdirSync(profile, { recursive: true });
    writeFileSync(join(profile, 'Preferences'), JSON.stringify({
        translate: { enabled: false },
        translate_site_blacklist: ['localhost'],
        profile: { exit_type: 'Normal', exited_cleanly: true },
    }));

    log('▶ starting the browser…');
    procs.push(spawn('google-chrome', [
        // Kiosk so the window is the page and nothing else: no tab strip, no
        // address bar, and screen coordinates equal viewport coordinates.
        // X11 explicitly: on a Wayland desktop Chrome picks Wayland by default
        // and would ignore the display it was handed.
        '--ozone-platform=x11',
        '--kiosk', `--window-size=${W},${H}`, '--window-position=0,0',
        `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${join(WORK, 'profile')}`,
        '--no-first-run', '--no-default-browser-check',
        // Chrome offered to translate the page and put its bubble across the top
        // of the very first recording. Nothing of the browser belongs in a clip
        // about the board.
        '--disable-features=Translate,TranslateUI,InfiniteSessionRestore',
        '--disable-translate', '--disable-infobars', '--noerrdialogs',
        '--force-color-profile=srgb', '--lang=en-US', 'about:blank',
    ], { stdio: 'ignore', env: XENV }));
    for (let i = 0; i < 80; i++) { try { await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`); break; } catch { } await sleep(250); }
    const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    ws = new WebSocket(list.find((t: any) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = () => r(null); });
    ws.onmessage = (e) => {
        const m = JSON.parse(e.data as string);
        if (m.id && pending.has(m.id)) { pending.get(m.id)!(m); pending.delete(m.id); }
    };

    await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
    for (const [name, value] of Object.entries(cookies)) {
        await cdp('Network.setCookie', { name, value, domain: 'localhost', path: '/' });
    }
    // The network domain goes back off now the cookie is planted: the board holds
    // a live WebSocket, and every frame it exchanges would be reported here too.
    await cdp('Network.disable');
    await cdp('Page.navigate', { url: APP });
    await sleep(3500);

    for (let i = 0; i < 40; i++) {
        const left = await evaluate(`
            const walk = (root, out = []) => {
                root.querySelectorAll('img').forEach((x) => out.push(x));
                root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot, out); });
                return out;
            };
            const pending = walk(document).filter((x) => !(x.complete && x.naturalWidth > 0)).length;
            const grid = document.querySelector('bookmark-grid');
            const loading = !grid || grid.shadowRoot.textContent.includes('Just a sec');
            return pending + (loading ? 1 : 0);`);
        if (left === 0) break;
        await sleep(400);
    }
    await sleep(700);

    // Edit mode is entered on camera, from the top bar, like everything else.
    await evaluate(`${HELPERS} return 1;`);
    const seen: string[] = [];
    const seenResize: string[] = [];

    // Park the pointer mid-board so it is seen arriving at the top bar rather
    // than appearing already on the button it is about to press.
    let at = { x: Math.round(W * 0.35), y: Math.round(H * 0.45) };
    mouse.to(at.x, at.y);
    await sleep(300);

    log('▶ recording…');
    const raw = join(WORK, 'raw.mkv');
    const rec = spawn('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'x11grab', '-draw_mouse', '1', '-video_size', `${W}x${H}`, '-framerate', String(FPS),
        '-i', `${DISPLAY}.0+0,0`,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-qp', '0', raw,
    ], { stdio: 'ignore' });
    procs.push(rec);
    await sleep(500);

    /** Moves there and clicks, the way a hand does. */
    const click = async (target: { x: number; y: number }, travel = 420) => {
        at = await glide(at, target, travel);
        await sleep(110);
        mouse.down(); await sleep(70); mouse.up();
    };

    const TOPBAR = `document.querySelector('app-topbar').shadowRoot`;
    const MODAL = `document.querySelector('widget-config-modal').shadowRoot`;

    // ── 1. Into edit mode, from the top bar ─────────────────────────────
    await click(await where(`return ${TOPBAR}.querySelector('#edit-toggle');`), 500);
    await sleep(550);
    if (!await evaluate(`return document.querySelector('bookmark-grid').isEditing;`)) {
        throw new Error('the board never entered edit mode');
    }

    // ── 2. Add a section ────────────────────────────────────────────────
    await click(await where(`return ${TOPBAR}.querySelector('#add-toggle');`), 380);
    await sleep(420);
    const entry = `return ${TOPBAR}.querySelector('#add-menu [data-action="add-section"]');`;
    at = await glide(at, await where(entry), 300);
    // Measured again on arrival: the menu is still opening when the first
    // reading is taken, and clicking the stale position hit the entry next to it.
    const settled = await where(entry);
    if (Math.abs(settled.y - at.y) > 2) { mouse.to(settled.x, settled.y); at = settled; await sleep(110); }
    await sleep(110);
    mouse.down(); await sleep(70); mouse.up();
    await sleep(700);

    // ── 3. Name it. The board opens the new section's settings by itself,
    //       so this is the flow as shipped, not a detour. ────────────────
    const settingsOpen = () => evaluate(`
        const m = document.querySelector('widget-config-modal');
        const d = m && m.shadowRoot && m.shadowRoot.querySelector('dialog');
        return !!(d && d.open);`);
    // The modal element itself lives in the document for good; what opens and
    // closes is the dialog inside it.
    if (!await settingsOpen()) throw new Error('the section settings never opened');
    await click(await where(`return ${MODAL}.getElementById('section-title');`), 420);
    await sleep(200);
    spawnSync('xdotool', ['type', '--delay', '55', 'Media'], { env: XENV });
    await sleep(350);
    await click(await where(`return ${MODAL}.getElementById('save-btn');`), 380);
    await sleep(800);
    if (await settingsOpen()) throw new Error('the settings never closed');

    const section = JSON.parse(await evaluate(`
        const s = (window.__grid.bookmarks || []).filter(b => !b.parent_id && b.type === 'section')
            .sort((a, b) => b.id - a.id)[0];
        if (!s) throw new Error('no section was added');
        return JSON.stringify({ id: s.id, x: s.x, y: s.y, w: s.w, h: s.h });`));
    log(`  added section #${section.id} at ${section.x},${section.y} (${section.w}x${section.h})`);

    // ── 4. Make it big enough to hold something ─────────────────────────
    // A one-cell section is exactly one cell, so its own box gives the step to
    // drag the corner by.
    const box = await where(`return window.__cardOf(${section.id});`);
    const cellW = box.w, cellH = box.h;
    const grip = await where(`return window.__cardOf(${section.id}).querySelector('.resize-handle');`);
    at = await glide(at, grip, 460);
    await sleep(140);
    mouse.down();
    await sleep(110);
    at = await glide(at, { x: grip.x + (cellW + 8) * 2, y: grip.y + (cellH + 8) }, 800,
        (state) => seenResize.push(state), DRAG_STEP);
    await sleep(200);
    mouse.up();
    await sleep(900);

    const grown = JSON.parse(await evaluate(`
        const b = window.__grid.bookmarks.find(b => b.id === ${section.id});
        return JSON.stringify({ w: b.w, h: b.h });`));
    if (grown.w <= section.w && grown.h <= section.h) {
        throw new Error(`the section never grew — still ${grown.w}x${grown.h}`);
    }
    log(`  resized: ${section.w}x${section.h} → ${grown.w}x${grown.h}`);
    await sleep(250);

    // ── 5. Carry two bookmarks that are already on the board into it ────
    const carriers = JSON.parse(await evaluate(`
        const inside = new Set((window.__grid.bookmarks || []).filter(b => b.parent_id === ${section.id}).map(b => b.id));
        const loose = (window.__grid.bookmarks || [])
            .filter(b => !b.parent_id && b.type === 'bookmark' && !inside.has(b.id))
            .sort((a, b) => (b.y - a.y) || (b.x - a.x));
        if (loose.length < 2) throw new Error('the board has fewer than two loose bookmarks');
        return JSON.stringify(loose.slice(0, 2).map(b => b.id));`));

    for (const [i, bookmarkId] of carriers.entries()) {
        const from = await where(`return window.__cardOf(${bookmarkId});`);
        const into = await where(`return window.__cardOf(${section.id});`);
        // A cell inside the section, worked out from the section as it is now —
        // it is three cells wide since the resize, so the second bookmark aims
        // at the second column instead of landing on top of the first.
        const inW = into.w / grown.w, inH = into.h / grown.h;
        const drop = { x: into.x - into.w / 2 + inW * (i + 0.5), y: into.y - into.h / 2 + inH * 0.5 };

        at = await glide(at, from, 420);
        await sleep(130);
        mouse.down();
        await sleep(90);
        at = await glide(at, { x: at.x + 6, y: at.y + 8 }, 150, undefined, DRAG_STEP);
        at = await glide(at, drop, 850, (state) => seen.push(state), DRAG_STEP);
        await sleep(220);
        mouse.up();
        await sleep(900);

        const landed = await evaluate(`
            const b = window.__grid.bookmarks.find(b => b.id === ${bookmarkId});
            return b ? (b.parent_id || 0) : -1;`);
        if (landed !== section.id) {
            throw new Error(`bookmark #${bookmarkId} did not go into the section (parent ${landed})`);
        }
        log(`  bookmark #${bookmarkId} is now inside the section`);
        await sleep(200);
    }
    await sleep(700);

    rec.kill('SIGINT');           // lets ffmpeg close the file cleanly
    await sleep(1500);
    if (!existsSync(raw)) throw new Error('nothing was filmed');

    // Passing over occupied cells on the way is honest and worth showing, but the
    // tile has to be over a free cell when it is let go, and a resize must never
    // go red at all.
    // The resize must never go red: growing a tile over its neighbours is
    // refused, and filming a refusal was the complaint about the first attempt.
    const badResize = seenResize.filter((s) => s === 'invalid').length;
    if (badResize) throw new Error(`the resize outline went red on ${badResize} of ${seenResize.length} steps`);
    // The carries are judged by where the bookmarks ended up, checked above,
    // rather than by the outline: a cell that already holds the section reads as
    // occupied to the outer grid even though dropping into it is exactly right.
    log(`  outline: ${seen.filter((s) => s === 'invalid').length}/${seen.length} samples red while carrying, 0 on the resize`);

    // WebP rather than GIF: a quarter of the weight at this size and no
    // 256-colour banding across a dark interface.
    const ff = spawnSync('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y', '-i', raw,
        '-vf', `fps=${FPS},scale=${W}:-1:flags=lanczos`,
        '-loop', '0', '-lossless', '0', '-q:v', '46', '-preset', 'picture', '-an', OUT,
    ], { encoding: 'utf8' });
    if (ff.status !== 0) { log('✗ ffmpeg: ' + (ff.stderr || '').trim().split('\n').pop()); process.exit(1); }

    const weight = spawnSync('bash', ['-c', `du -h ${OUT} | cut -f1`], { encoding: 'utf8' }).stdout.trim();
    log(`✓ ${OUT} — ${weight}`);
    process.exit(0);
}

main().catch((err) => { log('✗ ' + (err?.stack || err?.message || String(err))); process.exit(1); });
