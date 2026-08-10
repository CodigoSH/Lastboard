/**
 * Regenerates every screenshot in docs/assets from a running copy of the app.
 *
 *   bun scripts/docs-shots.ts            # all of them
 *   bun scripts/docs-shots.ts home p-*   # only the ones matching
 *   KEEP=1 bun scripts/docs-shots.ts     # leave the instance up to poke at it
 *
 * Why this exists: the screenshots used to be taken by hand, one at a time,
 * over months. They ended up at sixteen different widths, all at 1x — a 313px
 * image stretched to 720 in the docs column — with the interface in two
 * languages and three accent colours, and they aged the moment anything was
 * redesigned. Re-shooting them was expensive enough that nobody did it.
 *
 * So the whole set is generated instead: one throwaway instance seeded with
 * the same starter board a new install gets, one browser, one framing rule,
 * everything at 2x. Re-shooting after a redesign is this command.
 *
 * The instance is disposable (a temp database on a spare port) and is torn
 * down at the end. Nothing here touches your own data.
 */
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ── The look every screenshot shares ────────────────────────────────────────
const ACCENT = '#e8520e';      // CodigoSH brand orange, so docs and site agree
const LANG = 'en';             // the docs are English only
const THEME = 'dark';
const DPR = Number(process.env.DPR || 2);   // 1x is soft on every modern display
const PAD = 24;                // breathing room around a clipped element

const PORT = Number(process.env.PORT || 8097);
const CDP_PORT = Number(process.env.CDP_PORT || 9224);
const APP = `http://localhost:${PORT}/`;
const OUT_DIR = 'docs/assets';
const WORK = join(tmpdir(), 'lastboard-docs-shots');
const BIN = './bin/lastboard';

type Shot = {
    /** File name without extension, as referenced from the docs. */
    name: string;
    /** Viewport, in CSS pixels. */
    w?: number;
    h?: number;
    /** Runs in the page to reach the state being photographed. */
    act?: string;
    /** Element to frame. Omitted means the whole viewport. */
    clip?: string;
    /** Padding around the clipped element. */
    pad?: number;
    /** Extra settle time for anything that loads on demand. */
    wait?: number;
    /**
     * Rasterization density. A widget tile is only ~280 CSS pixels wide, so at
     * 2x it would still be upscaled in a 720px docs column; shooting it at 4x
     * renders the text and icons at that size instead of stretching them.
     */
    dpr?: number;
};

// Reaching into the app from outside: the pieces live in shadow roots, so the
// selectors are written as expressions rather than plain CSS.
const TOPBAR = `document.querySelector('app-topbar').shadowRoot`;
const DRAWER = `document.querySelector('app-right-drawer').shadowRoot`;
const openSettings = (section: string) => `
  ${TOPBAR}.querySelector('#drawer-toggle').click();
  await sleep(700);
  ${DRAWER}.querySelector('.right-drawer__menu-item[data-section="${section}"]').click();
  await sleep(900);`;

/** The card on the board that holds a given widget, for framing one tile. */
const tile = (widgetTag: string) =>
    `document.querySelector('bookmark-grid').shadowRoot.querySelector('${widgetTag}').closest('.bookmark-grid__card')`;

/** Section names as they appear in the settings nav, and the file each becomes. */
const SETTINGS_SECTIONS: [string, string][] = [
    ['account', 'p-profile'],
    ['theme', 'p-look-feel'],
    ['personalization', 'p-personalization'],
    ['users', 'p-users'],
    ['monitoring', 'p-monitoring'],
    ['data', 'p-data'],
    ['advanced', 'p-advanced'],
    ['about', 'p-about'],
];

const SHOTS: Shot[] = [
    // ── The board itself ────────────────────────────────────────────────
    // Long enough for the API tile to answer: caught early it draws its
    // error state, and the board is the image everything else leads with.
    { name: 'home', w: 1600, h: 760, wait: 3000 },
    { name: 'mobile', w: 430, h: 880 },

    // ── Settings, one per section, all framed identically ───────────────
    ...SETTINGS_SECTIONS.map(([section, name]) => ({
        name, w: 1600, h: 940,
        act: openSettings(section),
        clip: `${DRAWER}.querySelector('.right-drawer__sheet')`,
    })),

    // ── One widget per tile, framed the same way ────────────────────────
    // pad 0: any margin here catches the neighbouring tile, and the figure
    // frame in the docs supplies the breathing room anyway.
    { name: 'w-time', clip: tile('widget-clock'), pad: 0, dpr: 4 },
    { name: 'w-weather', clip: tile('widget-weather'), pad: 0, dpr: 4 },
    { name: 'w-telemetry', clip: tile('widget-telemetry'), pad: 0, dpr: 4 },
    { name: 'w-notepad', clip: tile('widget-notepad'), pad: 0, dpr: 4 },
    { name: 'w-markdown', clip: tile('widget-markdown'), pad: 0, dpr: 4 },

    // ── The two widgets that only mean anything with live data ──────────
    { name: 'w-monitor', clip: tile('widget-monitor'), pad: 0, dpr: 4, wait: 1500 },
    { name: 'w-api', clip: tile('widget-api'), pad: 0, dpr: 4, wait: 1800 },

    // ── The menus you reach them from ───────────────────────────────────
    {
        name: 'm-addnew', w: 1400, h: 800, pad: 16,
        act: `${TOPBAR}.querySelector('#edit-toggle').click(); await sleep(600);
              ${TOPBAR}.querySelector('#add-toggle').click(); await sleep(500);`,
        clip: `${TOPBAR}.querySelector('#add-menu')`,
    },

    // ── Monitoring, end to end ──────────────────────────────────────────
    {
        // Opens on a service that actually went down, so the outage table and
        // the uptime figure have something in them.
        name: 'monitor', w: 1600, h: 900, wait: 1600,
        act: `${TOPBAR}.querySelector('#monitor-toggle').click(); await sleep(1400);
              const page = document.querySelector('monitor-page').shadowRoot;
              const rows = [...page.querySelectorAll('.mp__row, .monitor-page__row, [data-item-id]')];
              const hit = rows.find((r) => /Nextcloud/.test(r.textContent || ''));
              if (hit) { hit.click(); await sleep(1200); }`,
    },

    // ── Editing the board ───────────────────────────────────────────────
    {
        name: 'edit-mode', w: 1600, h: 760, wait: 700,
        act: `${TOPBAR}.querySelector('#edit-toggle').click(); await sleep(700);`,
    },
    {
        name: 'm-bookmark', w: 1500, h: 950, pad: 0, wait: 600,
        act: `${TOPBAR}.querySelector('#edit-toggle').click(); await sleep(500);
              ${TOPBAR}.querySelector('#add-toggle').click(); await sleep(400);
              ${TOPBAR}.querySelector('[data-action="add-bookmark"]').click(); await sleep(900);`,
        clip: `document.querySelector('add-bookmark-modal').shadowRoot.querySelector('dialog')`,
    },
    {
        name: 'm-icons', w: 1500, h: 950, pad: 0, wait: 900,
        act: `${TOPBAR}.querySelector('#edit-toggle').click(); await sleep(500);
              ${TOPBAR}.querySelector('#add-toggle').click(); await sleep(400);
              ${TOPBAR}.querySelector('[data-action="add-bookmark"]').click(); await sleep(900);
              const m = document.querySelector('add-bookmark-modal').shadowRoot;
              m.querySelector('#icon-trigger-btn').click(); await sleep(1400);
              // The search box sits one component deeper, inside <icon-picker>.
              const picker = m.querySelector('#icon-modal-component').shadowRoot
                  .querySelector('#icon-picker-component').shadowRoot;
              const search = picker.querySelector('input');
              search.focus(); search.value = 'jellyfin';
              search.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
              await sleep(2200);`,
        // The picker lives inside the bookmark modal's shadow root, not in the document.
        clip: `document.querySelector('add-bookmark-modal').shadowRoot.querySelector('#icon-modal-component').shadowRoot.querySelector('dialog')`,
    },

    // ── Widget settings, opened from the tile's own menu ─────────────────
    ...[['w-p-monitor', 'widget-monitor'], ['w-api-conf', 'widget-api']].map(([name, tag]) => ({
        name, w: 1500, h: 980, pad: 0, wait: 900,
        act: `${TOPBAR}.querySelector('#edit-toggle').click(); await sleep(900);
              const grid = document.querySelector('bookmark-grid').shadowRoot;
              const card = grid.querySelector('${tag}').closest('.bookmark-grid__card');
              const kebab = card.querySelector('.kebab-btn');
              if (!kebab) throw new Error('no edit button on the ${tag} tile');
              kebab.click();
              for (let i = 0; i < 25; i++) {
                  const d = document.querySelector('widget-config-modal')?.shadowRoot?.querySelector('dialog');
                  if (d && d.open) break;
                  await sleep(200);
              }`,
        clip: `document.querySelector('widget-config-modal').shadowRoot.querySelector('dialog')`,
    })),
];

/**
 * Gives the throwaway instance the few things the starter board cannot have on
 * its own: services with a status indicator, a plausible day of uptime history
 * behind them, and the two widgets that only mean something with live data.
 *
 * The history is synthetic but shaped like real history — a couple of short
 * outages, latency that wanders — because a monitoring page whose chart is a
 * flat line teaches nothing.
 */
async function seedLiveData(dbPath: string, token: string, csrf: string) {
    const api = (path: string, body: unknown) => fetch(`${APP}api${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, Cookie: `session_token=${token}; csrf_token=${csrf}` },
        body: JSON.stringify(body),
    });

    // 24/7 monitoring on, so the status page and the widget have something to say.
    await api('/monitor/settings', {
        mode: 'background', interval_sec: 300, alerts_enabled: true,
        notify_type: 'ntfy', notify_url: 'https://ntfy.sh/my-topic', notify_token: '', fail_threshold: 2,
    });

    const { Database } = await import('bun:sqlite');
    const db = new Database(dbPath);

    // Put a status dot on a handful of recognisable services.
    const watched = ['Plex', 'Jellyfin', 'Nextcloud', 'Immich', 'Proxmox', 'Grafana'];
    const rows = db.query(`SELECT id, content FROM items WHERE type = 'bookmark'`).all() as { id: number; content: string }[];
    const monitored: number[] = [];
    for (const row of rows) {
        const c = JSON.parse(row.content || '{}');
        if (!watched.includes(c.label)) continue;
        c.statusCheck = true;
        c.statusPos = 'top-right';
        db.run(`UPDATE items SET content = ? WHERE id = ?`, [JSON.stringify(c), row.id]);
        monitored.push(row.id);
    }

    // A day of checks, every five minutes, with two services having had a rough
    // patch — one long outage and one blip.
    const now = Date.now();
    const insert = db.prepare(
        `INSERT INTO monitor_checks (item_id, checked_at, up, latency_ms, status_code) VALUES (?, ?, ?, ?, ?)`);
    monitored.forEach((itemId, index) => {
        const base = 40 + index * 18;
        for (let i = 288; i >= 0; i--) {
            const at = new Date(now - i * 5 * 60 * 1000);
            const outage = (index === 2 && i > 60 && i < 78) || (index === 4 && i > 150 && i < 154);
            const latency = Math.round(base + Math.sin(i / 9) * 12 + Math.random() * 14);
            insert.run(itemId, at.toISOString().replace('T', ' ').slice(0, 19), outage ? 0 : 1,
                outage ? null : latency, outage ? 0 : 200);
        }
    });

    // The two widgets that need all of the above to be worth photographing.
    const dashboardId = (db.query(`SELECT dashboard_id FROM items WHERE dashboard_id IS NOT NULL LIMIT 1`).get() as any)?.dashboard_id ?? null;
    const addWidget = (x: number, y: number, w: number, h: number, content: unknown) =>
        db.run(`INSERT INTO items (user_id, type, x, y, w, h, content, dashboard_id) VALUES (1, 'widget', ?, ?, ?, ?, ?, ?)`,
            [x, y, w, h, JSON.stringify(content), dashboardId]);

    addWidget(1, 5, 4, 2, { widgetId: 'monitor', items: [], refreshSec: 60, title: 'Service status' });
    addWidget(5, 5, 3, 2, {
        widgetId: 'api',
        title: 'Lastboard on Forgejo',
        url: 'https://git.codigosh.com/api/v1/repos/CodigoSH/Lastboard',
        method: 'GET',
        refreshSec: 300,
        // An object, not an array: the proxy decodes this into a string map and
        // an empty array makes it reject the whole request, which the widget
        // then draws as "Unreachable".
        headers: {},
        arrayPath: '',
        mappings: [
            { label: 'Stars', path: 'stars_count', format: 'number' },
            { label: 'Forks', path: 'forks_count', format: 'number' },
            { label: 'Issues', path: 'open_issues_count', format: 'number' },
        ],
    });
    db.close();
}

// ── Plumbing ────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let id = 0;
const pending = new Map<number, (v: any) => void>();
let ws: WebSocket;

function cdp(method: string, params: any = {}): Promise<any> {
    const myId = ++id;
    return new Promise((resolve) => {
        pending.set(myId, resolve);
        ws.send(JSON.stringify({ id: myId, method, params }));
    });
}

async function evaluate(expression: string) {
    const r = await cdp('Runtime.evaluate', {
        expression: `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); ${expression} })()`,
        awaitPromise: true,
        returnByValue: true,
    });
    if (r.result?.exceptionDetails) {
        throw new Error(r.result.exceptionDetails.exception?.description || 'evaluate failed');
    }
    return r.result?.result?.value;
}

/**
 * Waits until every image on the page has actually decoded.
 *
 * A fixed sleep is not enough: on a freshly created instance the bookmark
 * icons are still coming down from the CDN, and a screenshot taken too early
 * is a board of empty tiles — which is exactly what a dashboard must never
 * look like in its own documentation. Images live inside shadow roots, so the
 * walk has to cross them.
 */
async function waitForImages(timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const pending = await evaluate(`
            const walk = (root, out = []) => {
                root.querySelectorAll('img').forEach((i) => out.push(i));
                root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot, out); });
                return out;
            };
            const imgs = walk(document);
            return imgs.filter((i) => !(i.complete && i.naturalWidth > 0)).length;`);
        if (pending === 0) return;
        await sleep(250);
    }
    console.warn('  ! some images never loaded — check the shot');
}

async function waitFor(url: string, tries = 40) {
    for (let i = 0; i < tries; i++) {
        try {
            const r = await fetch(url);
            if (r.ok || r.status === 303 || r.status === 404) return;
        } catch { /* not up yet */ }
        await sleep(250);
    }
    throw new Error(`timed out waiting for ${url}`);
}

async function main() {
    const only = process.argv.slice(2);
    const wanted = SHOTS.filter((s) => !only.length || only.some((p) => new RegExp('^' + p.replace(/\*/g, '.*') + '$').test(s.name)));
    if (!wanted.length) {
        console.error('Nothing matched. Known shots:\n  ' + SHOTS.map((s) => s.name).join('\n  '));
        process.exit(1);
    }
    if (!existsSync(BIN)) {
        console.error(`${BIN} is missing — run \`make build\` first.`);
        process.exit(1);
    }

    rmSync(WORK, { recursive: true, force: true });
    mkdirSync(WORK, { recursive: true });

    const procs: ChildProcess[] = [];
    const stop = () => procs.forEach((p) => { try { p.kill(); } catch { } });
    process.on('exit', stop);
    process.on('SIGINT', () => { stop(); process.exit(1); });

    // 1. A throwaway instance, seeded with the starter board a new install gets.
    console.log('▶ starting a disposable instance…');
    procs.push(spawn(BIN, [], {
        env: { ...process.env, DB_FILE: join(WORK, 'shots.db'), PORT: String(PORT) },
        stdio: 'ignore', detached: false,
    }));
    await waitFor(APP);

    await fetch(`${APP}api/setup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo', password: 'Lastboard123!', language: LANG, theme: THEME, accent_color: ACCENT }),
    });
    const login = await fetch(`${APP}api/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo', password: 'Lastboard123!' }),
    });
    const cookies = Object.fromEntries(
        (login.headers.getSetCookie?.() || []).map((c) => {
            const [k, v] = c.split(';')[0].split('=');
            return [k, v];
        }),
    );
    if (!cookies.session_token) throw new Error('could not sign in to the shot instance');

    console.log('▶ seeding monitoring history and the data-backed widgets…');
    await seedLiveData(join(WORK, 'shots.db'), cookies.session_token, cookies.csrf_token);

    // 2. A browser with a clean profile, so no extension or leftover state
    //    paints itself into a screenshot.
    console.log('▶ starting the browser…');
    procs.push(spawn('google-chrome', [
        '--headless=new', `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${join(WORK, 'profile')}`, '--no-first-run', '--hide-scrollbars',
        '--force-color-profile=srgb', '--disable-lcd-text', 'about:blank',
    ], { stdio: 'ignore' }));
    await waitFor(`http://127.0.0.1:${CDP_PORT}/json/version`);

    const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    ws = new WebSocket(list.find((t: any) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = () => r(null); });
    ws.onmessage = (e) => {
        const m = JSON.parse(e.data as string);
        if (m.id && pending.has(m.id)) { pending.get(m.id)!(m); pending.delete(m.id); }
    };

    await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
    await cdp('Network.setCacheDisabled', { cacheDisabled: true });
    // Entry animations would otherwise be caught halfway through, giving a
    // board of half-faded tiles.
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    for (const [name, value] of Object.entries(cookies)) {
        await cdp('Network.setCookie', { name, value, domain: 'localhost', path: '/' });
    }

    // 3. The shots.
    mkdirSync(OUT_DIR, { recursive: true });
    for (const shot of wanted) {
        const w = shot.w ?? 1600, h = shot.h ?? 900;
        const dpr = shot.dpr ?? DPR;
        const phone = (shot.w ?? 0) < 600;
        await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: phone });
        // The board switches to its touch layout on `pointer: coarse`, not on
        // width. Without touch emulation a narrow window just squeezes the
        // desktop grid, and the "mobile" screenshot came out as overlapping
        // tiles with the labels clipped.
        await cdp('Emulation.setTouchEmulationEnabled', { enabled: phone, maxTouchPoints: phone ? 5 : 0 });
        await cdp('Emulation.setEmitTouchEventsForMouse', { enabled: phone, configuration: phone ? 'mobile' : 'desktop' });
        await cdp('Page.navigate', { url: APP });
        await sleep(1200);
        await waitForImages();
        if (shot.act) await evaluate(shot.act);
        // Whatever the action opened may bring its own images with it.
        await waitForImages(6000);
        await sleep(shot.wait ?? 400);

        let clip;
        if (shot.clip) {
            const pad = shot.pad ?? PAD;
            const r = await evaluate(`const el = ${shot.clip}; const b = el.getBoundingClientRect();
                return { x: Math.max(0, b.left - ${pad}), y: Math.max(0, b.top - ${pad}),
                         width: b.width + ${pad} * 2, height: b.height + ${pad} * 2 };`);
            // scale 1, not DPR: the device pixel ratio already renders at 2x and
            // the two multiply, which is how the settings shots first came out
            // at 3960px wide instead of 1976.
            clip = { ...r, scale: 1 };
        }

        if (clip && (!clip.width || !clip.height)) {
            console.warn(`  ! ${shot.name}: nothing to frame — skipped`);
            continue;
        }
        const png = await cdp('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}), captureBeyondViewport: !!clip });
        if (!png.result?.data) {
            console.warn(`  ! ${shot.name}: the browser refused the capture — skipped`);
            continue;
        }
        const file = join(OUT_DIR, `${shot.name}.png`);
        await Bun.write(file, Buffer.from(png.result.data, 'base64'));
        const size = spawnSync('python3', ['-c',
            `import struct;d=open('${file}','rb').read(33);w,h=struct.unpack('>II',d[16:24]);print(f'{w}x{h}')`]).stdout.toString().trim();
        console.log(`  ✓ ${shot.name.padEnd(22)} ${size}`);
    }

    if (process.env.KEEP) {
        console.log(`\nInstance left running on ${APP} (user demo / Lastboard123!). Ctrl-C to stop.`);
        await new Promise(() => { });
    }
    console.log('\n✨ done');
    process.exit(0);
}

main().catch((err) => { console.error('✗', err.message); process.exit(1); });
