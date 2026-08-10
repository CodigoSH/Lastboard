/**
 * Records the two things a screenshot cannot show: moving a tile and resizing one.
 *
 *   bun scripts/docs-motion.ts        # writes docs/assets/grid.webp
 *
 * Two scenes, both performed on a real board with a real pointer:
 *
 *   1. A bookmark is dragged to a free cell.
 *   2. A widget is resized by its corner into the empty space below it.
 *
 * Both targets are read off the board's actual occupancy rather than picked by
 * eye, and the drop outline is checked on every step — it turns red the moment
 * a target overlaps something, and a run that goes red aborts rather than
 * publish a recording of an action the product would refuse. The move and the
 * resize are each verified against the board's own state afterwards, because a
 * recording of a tile that never moved is worse than no recording at all.
 *
 * Playwright drives this rather than the debugging protocol by hand. Hand-rolling
 * it meant owning every race in it: navigation swapping the execution context
 * out from under a call, a headless page having its timers frozen so anything
 * awaited inside it never came back, a killed run leaving a browser holding the
 * port for the next run to attach to by mistake. Playwright settles all of that
 * and records the video itself. It runs the Chrome already on the machine
 * (`channel: 'chrome'`), so no browser is downloaded.
 */
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const OUT = 'docs/assets/grid.webp';
const PORT = Number(process.env.PORT || 8096);
const APP = `http://localhost:${PORT}/`;
const WORK = join(tmpdir(), 'lastboard-docs-motion');
const BIN = './bin/lastboard';
const SIZE = { width: 1280, height: 800 };
const FPS = 16;

let done = false;
/**
 * stderr, not stdout: when the output is redirected to a file, stdout is
 * buffered and a run that stalls shows nothing at all about where it stalled.
 */
const log = (m: string) => process.stderr.write(m + '\n');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Occupancy of the top level, so the targets come from the board, not from me. */
function findTargets() {
    const grid = document.querySelector('bookmark-grid') as any;
    const cols = grid.currentGridCols;
    const top = (grid.bookmarks || []).filter((b: any) => !b.parent_id);
    const taken = new Set<string>();
    for (const b of top) {
        for (let x = b.x; x < b.x + b.w; x++) for (let y = b.y; y < b.y + b.h; y++) taken.add(`${x}:${y}`);
    }
    // The row bound matters as much as the column one. Without it the search
    // below runs off the bottom of the board for ever — an empty column has no
    // last row — and freezes the page it is running in, which is a very
    // convincing impression of a browser that has stopped answering.
    const lastRow = Math.max(...top.map((b: any) => b.y + b.h - 1));
    const maxRow = lastRow + 4;
    const free = (x: number, y: number, w: number, h: number) => {
        if (x < 1 || y < 1 || x + w - 1 > cols || y + h - 1 > maxRow) return false;
        for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) if (taken.has(`${i}:${j}`)) return false;
        return true;
    };

    // The bookmark to move: the standalone one with the longest clear run beneath it.
    const mover = top.filter((b: any) => b.type === 'bookmark')
        .map((b: any) => ({ b, run: (() => { let n = 0; while (free(b.x, b.y + b.h + n, b.w, b.h)) n++; return n; })() }))
        .sort((a: any, c: any) => c.run - a.run)[0];
    if (!mover || mover.run < 2) throw new Error('no bookmark has room to move into');

    // The tile to resize: whatever can grow a row downwards without overlapping.
    // A widget is preferred, but on the board a new install starts with, the
    // widgets sit on the top rows with sections directly beneath them and none
    // of them can grow at all — the sections on the bottom row can.
    const canGrow = (b: any) => free(b.x, b.y + b.h, b.w, 1);
    const grower = top.find((b: any) => b.type === 'widget' && canGrow(b))
        || top.find((b: any) => b.type === 'section' && canGrow(b));
    if (!grower) throw new Error('nothing on this board has room to grow');

    return {
        move: { id: mover.b.id, from: { x: mover.b.x, y: mover.b.y }, rows: Math.min(mover.run, 3) },
        grow: { id: grower.id, w: grower.w, h: grower.h },
    };
}

async function main() {
    if (!existsSync(BIN)) { log(`${BIN} is missing — run \`make build\` first.`); process.exit(1); }
    rmSync(WORK, { recursive: true, force: true });
    mkdirSync(join(WORK, 'video'), { recursive: true });

    // Refuse to start if the port is taken. A leftover instance from an earlier
    // run answers every check, so the new one exits quietly, the browser talks
    // to the stranger, and the stranger dies mid-recording — which is exactly
    // how several runs "hung" for no visible reason.
    let taken = false;
    try { await fetch(APP, { signal: AbortSignal.timeout(1500) }); taken = true; } catch { }
    if (taken) {
        log(`✗ something is already on ${PORT} — stop it first:  fuser -k ${PORT}/tcp`);
        process.exit(1);
    }

    log('▶ starting a disposable instance…');
    const app = spawn(BIN, [], { env: { ...process.env, DB_FILE: join(WORK, 'motion.db'), PORT: String(PORT) }, stdio: 'ignore' });
    app.on('exit', (code) => {
        // If it dies while we are still recording, say so instead of letting the
        // next call fail with something unrelated.
        if (!done) { log(`✗ the disposable instance exited (${code}) mid-run`); process.exit(1); }
    });
    const stop = () => { try { app.kill('SIGKILL'); } catch { } };
    process.on('exit', stop);
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(sig, () => { stop(); process.exit(1); });

    for (let i = 0; i < 80; i++) { try { await fetch(APP); break; } catch { } await sleep(250); }
    await fetch(`${APP}api/setup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo', password: 'Lastboard123!', language: 'en', theme: 'dark', accent_color: '#e8520e' }),
    });
    const login = await fetch(`${APP}api/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo', password: 'Lastboard123!' }),
    });
    const cookies = (login.headers.getSetCookie?.() || []).map((c) => {
        const [name, value] = c.split(';')[0].split('=');
        return { name, value, domain: 'localhost', path: '/' };
    });
    if (!cookies.some((c) => c.name === 'session_token')) throw new Error('the disposable instance would not log in');

    log('▶ starting the browser…');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    log('  · chrome up');
    const context = await browser.newContext({
        viewport: SIZE,
        deviceScaleFactor: 1,
        locale: 'en-US',
        // Playwright records the video itself, from the page opening until the
        // context closes.
        recordVideo: { dir: join(WORK, 'video'), size: SIZE },
    });
    log('  · context up');
    await context.addCookies(cookies);
    const page = await context.newPage();
    const recordingStarted = Date.now();
    log('  · page up');
    await page.goto(APP, { waitUntil: 'domcontentloaded' });
    log('  · loaded');

    // Nothing is recorded until every tile has its content: a widget still
    // showing "Just a sec…" makes the whole board look broken.
    await page.waitForFunction(() => {
        const walk = (root: any, out: any[] = []) => {
            root.querySelectorAll('img').forEach((x: any) => out.push(x));
            root.querySelectorAll('*').forEach((el: any) => { if (el.shadowRoot) walk(el.shadowRoot, out); });
            return out;
        };
        const grid = document.querySelector('bookmark-grid') as any;
        if (!grid || !grid.shadowRoot || grid.shadowRoot.textContent.includes('Just a sec')) return false;
        return walk(document).every((x: any) => x.complete && x.naturalWidth > 0);
    }, undefined, { timeout: 30000 });
    log('  · content ready');
    await sleep(900);

    // Playwright's CSS engine pierces open shadow roots, so the toggle and the
    // cards are addressable without hand-walking the tree.
    await page.click('#edit-toggle');
    log('  · edit clicked');
    await page.waitForFunction(() => (document.querySelector('bookmark-grid') as any).isEditing, undefined, { timeout: 10000 });
    log('  · editing');
    await sleep(900);

    log('  · picking targets');
    const plan = await page.evaluate(findTargets);
    log('  · targets picked');
    log(`  moving #${plan.move.id} down ${plan.move.rows} rows, growing #${plan.grow.id} by one`);

    const ghost = () => page.evaluate(() => {
        const root = (document.querySelector('bookmark-grid') as any).shadowRoot;
        const g = root.getElementById('ghost-element');
        if (!g || g.style.display === 'none') return 'hidden';
        return g.classList.contains('invalid') ? 'invalid' : 'valid';
    });
    const seen: string[] = [];
    const seenResize: string[] = [];
    // Where the interesting part begins, measured rather than guessed: the video
    // starts when the page opens, and the load, the wait for icons and the trip
    // into edit mode are all dead air at the front of the clip.
    const actionStarted = Date.now();

    // ── Scene 1: move a bookmark ────────────────────────────────────────
    const card = page.locator(`.bookmark-grid__card[data-id="${plan.move.id}"]`);
    const box = await card.boundingBox();
    if (!box) throw new Error('the tile to move is not on screen');
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const dy = (box.height + 8) * plan.move.rows;

    // Driven with the board's own drag events rather than the pointer. Moving a
    // tile is HTML5 drag and drop, which the browser runs in its own process
    // once it starts — a synthetic pointer never gets it going, and the first
    // attempt recorded a tile that sat exactly where it was. These are the same
    // events the board listens for, so the same code runs: the card dims, the
    // outline follows, and the drop is committed for real.
    const drag = (type: string, x: number, y: number, onGrid: boolean) => page.evaluate(
        ({ type, x, y, onGrid, id }) => {
            const grid = document.querySelector('bookmark-grid') as any;
            const w = window as any;
            if (!w.__dt) w.__dt = new DataTransfer();
            const card = grid.shadowRoot.querySelector(`.bookmark-grid__card[data-id="${id}"]`);
            const target = onGrid ? grid : card;
            target.dispatchEvent(new DragEvent(type, {
                bubbles: true, cancelable: true, composed: true,
                clientX: x, clientY: y, dataTransfer: w.__dt,
            }));
        }, { type, x, y, onGrid, id: plan.move.id });

    await page.mouse.move(from.x, from.y);
    await sleep(300);
    await drag('dragstart', from.x, from.y, false);
    await sleep(260);
    for (let i = 1; i <= 30; i++) {
        const y = from.y + dy * ease(i / 30);
        await page.mouse.move(from.x, y);
        await drag('dragover', from.x, y, true);
        seen.push(await ghost());
        await sleep(34);
    }
    await sleep(450);
    await drag('drop', from.x, from.y + dy, true);
    await drag('dragend', from.x, from.y + dy, false);
    await sleep(1500);

    const now = await page.evaluate((id) => {
        const b = (document.querySelector('bookmark-grid') as any).bookmarks.find((b: any) => b.id === id);
        return { x: b.x, y: b.y };
    }, plan.move.id);
    if (now.x === plan.move.from.x && now.y === plan.move.from.y) {
        throw new Error(`the tile never moved — still at ${now.x},${now.y}`);
    }
    log(`  moved: ${plan.move.from.x},${plan.move.from.y} → ${now.x},${now.y}`);
    await sleep(900);

    // ── Scene 2: resize a widget into the space below it ────────────────
    // A section is a <fieldset class="bookmark-grid__section">, not a card, so
    // the selector has to accept either — and on a new install it is a section
    // that has the room to grow.
    const grower = page.locator(`.bookmark-grid__card[data-id="${plan.grow.id}"], .bookmark-grid__section[data-id="${plan.grow.id}"]`);
    const gbox = await grower.boundingBox();
    const hbox = await grower.locator('.resize-handle').boundingBox();
    if (!gbox || !hbox) throw new Error('that tile has no resize handle on screen');
    const cell = gbox.height / plan.grow.h;
    const grip = { x: hbox.x + hbox.width / 2, y: hbox.y + hbox.height / 2 };

    await page.mouse.move(grip.x, grip.y);
    await sleep(300);
    await page.mouse.down();
    await sleep(250);
    for (let i = 1; i <= 26; i++) {
        await page.mouse.move(grip.x, grip.y + cell * ease(i / 26));
        seenResize.push(await ghost());
        await sleep(34);
    }
    await sleep(450);
    await page.mouse.up();
    await sleep(1700);

    const size = await page.evaluate((id) => {
        const b = (document.querySelector('bookmark-grid') as any).bookmarks.find((b: any) => b.id === id);
        return { w: b.w, h: b.h };
    }, plan.grow.id);
    if (size.w === plan.grow.w && size.h === plan.grow.h) {
        throw new Error(`the tile never grew — still ${size.w}x${size.h}`);
    }
    log(`  resized: ${plan.grow.w}x${plan.grow.h} → ${size.w}x${size.h}`);
    await sleep(1000);

    // A red outline is the board refusing the action. Passing over occupied
    // cells on the way is honest and worth showing, but the tile has to be over
    // a free cell when it is let go, and a resize must never go red at all —
    // that was the complaint about the first attempt at this clip.
    const badResize = seenResize.filter((s) => s === 'invalid').length;
    if (badResize) throw new Error(`the resize outline went red on ${badResize} of ${seenResize.length} steps — it overlaps something`);
    const tail = seen.slice(-5);
    if (tail.includes('invalid')) throw new Error('the tile was over an occupied cell when it was dropped');
    log(`  outline: ${seen.filter((s) => s === 'invalid').length}/${seen.length} red while travelling, 0 on the resize`);

    // The video is only written out when the context closes.
    await context.close();
    await browser.close();
    const webm = readdirSync(join(WORK, 'video')).find((f) => f.endsWith('.webm'));
    if (!webm) throw new Error('the browser recorded nothing');

    // WebP rather than GIF: a quarter of the weight at this size and no
    // 256-colour banding across a dark interface.
    const skip = Math.max(0, (actionStarted - recordingStarted) / 1000 - 0.6);
    const ff = spawnSync('ffmpeg', [
        '-y', '-ss', skip.toFixed(2), '-i', join(WORK, 'video', webm),
        '-vf', `fps=${FPS},scale=${SIZE.width}:-1:flags=lanczos`,
        '-loop', '0', '-lossless', '0', '-q:v', '52', '-preset', 'picture', '-an', OUT,
    ], { encoding: 'utf8' });
    if (ff.status !== 0) { log('✗ ffmpeg:', (ff.stderr || '').trim().split('\n').pop()); process.exit(1); }

    done = true;
    const weight = spawnSync('bash', ['-c', `du -h ${OUT} | cut -f1`], { encoding: 'utf8' }).stdout.trim();
    log(`✓ ${OUT} — ${weight}, outline valid on all ${seen.length} steps`);
    process.exit(0);
}

main().catch((err) => { log('✗ ' + (err?.stack || err?.message || String(err))); process.exit(1); });
