/**
 * Renders assets/mockup.png — the image the project page leads with.
 *
 *   bun scripts/docs-shots.ts        # first: the screens it composes
 *   bun scripts/docs-mockup.ts       # then: the mockup itself
 *
 * The screens are whatever docs-shots.ts last produced, so the mockup is never
 * older than the interface it shows.
 */
import { readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const OUT = 'assets/mockup.png';
const WIDTH = 1600, HEIGHT = 900, DPR = 2;
const CDP_PORT = Number(process.env.CDP_PORT || 9226);
const WORK = join(tmpdir(), 'lastboard-mockup');

const dataUri = (path: string, mime: string) =>
    `data:${mime};base64,${readFileSync(path).toString('base64')}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let id = 0;
const pending = new Map<number, (v: any) => void>();
let ws: WebSocket;
function cdp(method: string, params: any = {}): Promise<any> {
    const myId = ++id;
    return new Promise((resolve) => { pending.set(myId, resolve); ws.send(JSON.stringify({ id: myId, method, params })); });
}

async function main() {
    rmSync(WORK, { recursive: true, force: true });
    mkdirSync(WORK, { recursive: true });

    // The screenshots are inlined rather than linked: a file:// page that goes
    // looking for them mid-render is a composition that sometimes ships with
    // empty frames.
    const html = readFileSync('scripts/docs-mockup.html', 'utf8')
        .replace('__LOGO__', dataUri('web/public/images/logo.png', 'image/png'))
        .replace('__DESKTOP__', dataUri('docs/assets/home.png', 'image/png'))
        .replace('__MOBILE__', dataUri('docs/assets/mobile.png', 'image/png'));
    const page = join(WORK, 'mockup.html');
    writeFileSync(page, html);

    const procs: ChildProcess[] = [];
    process.on('exit', () => procs.forEach((p) => { try { p.kill(); } catch { } }));

    procs.push(spawn('google-chrome', [
        '--headless=new', `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${join(WORK, 'profile')}`, '--no-first-run', '--hide-scrollbars',
        '--force-color-profile=srgb', 'about:blank',
    ], { stdio: 'ignore' }));

    for (let i = 0; i < 40; i++) {
        try { await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`); break; } catch { await sleep(250); }
    }

    const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    ws = new WebSocket(list.find((t: any) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = () => r(null); });
    ws.onmessage = (e) => {
        const m = JSON.parse(e.data as string);
        if (m.id && pending.has(m.id)) { pending.get(m.id)!(m); pending.delete(m.id); }
    };

    await cdp('Page.enable'); await cdp('Runtime.enable');
    await cdp('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: DPR, mobile: false });
    await cdp('Page.navigate', { url: `file://${page}` });
    await sleep(1500);
    await cdp('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });
    await sleep(400);

    const png = await cdp('Page.captureScreenshot', { format: 'png' });
    await Bun.write(OUT, Buffer.from(png.result.data, 'base64'));
    console.log(`✓ ${OUT} ${WIDTH * DPR}x${HEIGHT * DPR}`);
    process.exit(0);
}

main().catch((err) => { console.error('✗', err.message); process.exit(1); });
