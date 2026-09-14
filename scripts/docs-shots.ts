/**
 * Regenerates every screenshot in docs/assets from a running copy of the app.
 *
 *   bun scripts/docs-shots.ts            # all of them
 *   bun scripts/docs-shots.ts home p-*   # only the ones matching
 *   KEEP=1 bun scripts/docs-shots.ts     # leave the instance up to poke at it
 *
 * The two Docker shots need a Docker-compatible API to point at, named in
 * DOCKER_API; without it that widget is not seeded and those shots are skipped.
 * Podman serves one:  podman system service --time=0 tcp://127.0.0.1:2375 &
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
import { createServer } from 'node:http';
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
const PVE_PORT = Number(process.env.PVE_PORT || 8198);   // the stand-in hypervisor
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
    /**
     * Small pieces — a single widget — are composed onto a canvas of one fixed
     * shape instead of being handed to the docs at their own size.
     *
     * A clock tile is ~280 CSS pixels wide in the app. Published on its own it
     * was stretched across a 720px column and read as something enormous, which
     * is exactly what a screenshot must not do: it has to say how big the thing
     * actually is. On the canvas it sits at a size close to life, centred, with
     * the same margin every other exhibit gets — so the whole set looks like one
     * family rather than a pile of crops.
     */
    exhibit?: boolean;
    /**
     * Photographed before the instance has an account — the Setup Wizard only
     * exists until someone finishes it, so it has to be caught on the way in.
     */
    beforeSetup?: boolean;
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
    `(() => {
        const el = document.querySelector('bookmark-grid').shadowRoot.querySelector('${widgetTag}');
        // Named on purpose: a bare null.closest() aborted a whole run once, and
        // the eleven shots queued behind this one were never taken.
        if (!el) throw new Error('no ${widgetTag} on the board — was it seeded?');
        return el.closest('.bookmark-grid__card');
    })()`;

/** Section names as they appear in the settings nav, and the file each becomes. */
const SETTINGS_SECTIONS: [string, string][] = [
    ['account', 'p-profile'],
    ['theme', 'p-look-feel'],
    ['personalization', 'p-personalization'],
    ['users', 'p-users'],
    ['monitoring', 'p-monitoring'],
    ['proxmox', 'p-proxmox'],
    ['data', 'p-data'],
    ['advanced', 'p-advanced'],
    ['about', 'p-about'],
];

const SHOTS: Shot[] = [
    // ── Before there is an account ──────────────────────────────────────
    {
        // English is picked in the wizard rather than forced through the
        // browser: the page reads the browser's locale and Chrome's --lang did
        // not move it, and choosing it here is what a reader outside Spain does
        // anyway. The accent is the product's default blue — this screen runs
        // before any preference exists, and dressing it in the brand's orange
        // would be staging something no first run ever shows.
        name: 'setup', w: 1280, h: 900, beforeSetup: true, wait: 1500, pad: 56,
        clip: `document.querySelector('.setup-container')`,
        act: `const sel = document.getElementById('language');
              sel.value = 'en';
              sel.dispatchEvent(new CustomEvent('change', { detail: 'en', bubbles: true }));
              await sleep(1200);`,
    },

    // ── The board itself ────────────────────────────────────────────────
    // Long enough for the API tile to answer: caught early it draws its
    // error state, and the board is the image everything else leads with.
    // Tall enough for the whole board, measured rather than guessed: the tiles
    // end 840px down at this width. At 760 the bottom row was sliced through the
    // middle — the Docker widget's rows ran off the edge — and the top bar was
    // dropping its right-hand button as well.
    { name: 'home', w: 1600, h: 880, wait: 3000 },
    { name: 'mobile', w: 430, h: 880 },

    // ── Settings, one per section, all framed identically ───────────────
    ...SETTINGS_SECTIONS.map(([section, name]) => ({
        name, w: 1600, h: 940,
        // The Proxmox card is the one place a screenshot would otherwise print
        // an address that means something: the stand-in host runs on this
        // machine, and a manual showing 127.0.0.1 there teaches the wrong
        // thing. The field is dressed for the photograph in the address a
        // reader actually has to type.
        act: openSettings(section) + (section !== 'proxmox' ? '' : `
            const px = ${DRAWER}.querySelector('settings-content').shadowRoot.getElementById('proxmox-url');
            px.value = 'https://192.168.1.10:8006';
            await sleep(200);`),
        clip: `${DRAWER}.querySelector('.right-drawer__sheet')`,
    })),

    // ── One widget per tile, framed the same way ────────────────────────
    // pad 0: any margin here catches the neighbouring tile, and the figure
    // frame in the docs supplies the breathing room anyway.
    { name: 'w-time', exhibit: true, clip: tile('widget-clock'), pad: 0, dpr: 4 },
    { name: 'w-weather', exhibit: true, clip: tile('widget-weather'), pad: 0, dpr: 4 },
    { name: 'w-telemetry', exhibit: true, clip: tile('widget-telemetry'), pad: 0, dpr: 4 },
    { name: 'w-notepad', exhibit: true, clip: tile('widget-notepad'), pad: 0, dpr: 4 },
    { name: 'w-markdown', exhibit: true, clip: tile('widget-markdown'), pad: 0, dpr: 4 },

    // ── The two widgets that only mean anything with live data ──────────
    // Taller viewport, not a longer wait: these three sit on the fifth row and a
    // 900px window leaves them below the fold, where the board never mounts them
    // — so the wait found nothing to wait for and the close-up was captured on a
    // tile that only started loading when the screenshot forced it to render.
    { name: 'w-monitor', exhibit: true, clip: tile('widget-monitor'), pad: 0, dpr: 4, h: 1300, wait: 2500 },
    { name: 'w-api', exhibit: true, clip: tile('widget-api'), pad: 0, dpr: 4, h: 1300, wait: 1800 },

    // ── Docker, when a Docker-compatible API is available ───────────────
    { name: 'w-docker', exhibit: true, clip: tile('widget-docker'), pad: 0, dpr: 4, h: 1300, wait: 2500 },
    {
        name: 'w-p-docker', w: 1500, h: 980, pad: 0, wait: 1200,
        act: `${TOPBAR}.querySelector('#edit-toggle').click(); await sleep(900);
              const grid = document.querySelector('bookmark-grid').shadowRoot;
              const card = grid.querySelector('widget-docker').closest('.bookmark-grid__card');
              card.querySelector('.kebab-btn').click(); await sleep(600);
              grid.querySelector('#kebab-menu .menu-edit').click(); await sleep(1800);`,
        clip: `document.querySelector('widget-config-modal').shadowRoot.querySelector('dialog')`,
    },

    // ── The menus you reach them from ───────────────────────────────────
    {
        // On the exhibit canvas, and shot at 4x: the menu is only ~180 CSS px
        // wide, so left as a bare crop it arrives in the docs as a small image
        // stretched across the column — soft, with type twice the size of the
        // paragraph beside it.
        name: 'm-addnew', w: 1400, h: 800, pad: 0, exhibit: true, dpr: 4,
        act: `${TOPBAR}.querySelector('#edit-toggle').click(); await sleep(600);
              ${TOPBAR}.querySelector('#add-toggle').click(); await sleep(500);`,
        clip: `${TOPBAR}.querySelector('#add-menu')`,
    },

    {
        name: 'm-dashboards', w: 1400, h: 800, pad: 0, wait: 700, exhibit: true, dpr: 4,
        // The switcher lives inside the top bar's shadow root, not the document.
        act: `const sw = ${TOPBAR}.querySelector('dashboard-switcher').shadowRoot;
              sw.querySelector('.switcher-trigger').click(); await sleep(800);`,
        clip: `${TOPBAR}.querySelector('dashboard-switcher').shadowRoot.querySelector('.switcher-dropdown')`,
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

    // ── Proxmox, against the stand-in hypervisor ────────────────────────
    {
        // Opens on the one machine that is stopped, because that is the thing
        // this page does that the Proxmox console does not: it names the
        // service that went down with its container.
        // 790 tall, measured rather than guessed: the grid ends there at this
        // width, and the 1000px window it was first shot at published a third
        // of an empty board under it.
        name: 'proxmox', w: 1600, h: 790, wait: 2200,
        act: `${TOPBAR}.querySelector('#proxmox-toggle').click(); await sleep(2000);`,
    },
    {
        // The sheet of the one stopped machine, which is where the page makes
        // its case: it names the service that went down with the container.
        name: 'proxmox-machine', w: 1600, h: 1000, pad: 0, wait: 1200,
        act: `${TOPBAR}.querySelector('#proxmox-toggle').click(); await sleep(2000);
              const page = document.querySelector('proxmox-page').shadowRoot;
              const tiles = [...page.querySelectorAll('.tile')];
              const hit = tiles.find((t) => /plex/i.test(t.textContent || ''));
              if (!hit) throw new Error('no plex tile on the page — was the fake host seeded?');
              hit.click(); await sleep(1600);`,
        clip: `document.querySelector('proxmox-page').shadowRoot.querySelector('dialog')`,
    },
    // Taller than the rest: this tile sits on the seventh row, and a widget
    // below the fold is never mounted, so the wait would find nothing to wait
    // for and the close-up would catch a tile that had not loaded.
    { name: 'w-proxmox', exhibit: true, clip: tile('widget-proxmox'), pad: 0, dpr: 4, h: 1750, wait: 2500 },

    // ── Editing the board ───────────────────────────────────────────────
    {
        name: 'edit-mode', w: 1600, h: 880, wait: 700,
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
    ...[['w-p-monitor', 'widget-monitor'], ['w-api-conf', 'widget-api'], ['w-p-proxmox', 'widget-proxmox']].map(([name, tag]) => ({
        // Tall enough that every tile is on the board before its menu is
        // opened: the Proxmox one lives on the seventh row.
        name, w: 1500, h: name === 'w-p-proxmox' ? 1750 : 980, pad: 0, wait: 900,
        // Two clicks, not one: the tile's button opens a small menu, and it is
        // that menu's Edit entry which opens the settings. Clicking only the
        // first one is why these shots came out empty the first time round.
        act: `${TOPBAR}.querySelector('#edit-toggle').click(); await sleep(900);
              const grid = document.querySelector('bookmark-grid').shadowRoot;
              const card = grid.querySelector('${tag}').closest('.bookmark-grid__card');
              const kebab = card.querySelector('.kebab-btn');
              if (!kebab) throw new Error('no menu button on the ${tag} tile');
              kebab.click(); await sleep(600);
              const edit = grid.querySelector('#kebab-menu .menu-edit');
              if (!edit) throw new Error('the tile menu has no Edit entry');
              edit.click();
              for (let i = 0; i < 25; i++) {
                  const d = document.querySelector('widget-config-modal')?.shadowRoot?.querySelector('dialog');
                  if (d && d.open) break;
                  await sleep(200);
              }`,
        clip: `document.querySelector('widget-config-modal').shadowRoot.querySelector('dialog')`,
    })),
];

/**
 * A hypervisor that is not real, so the pictures can be published.
 *
 * The Docker shots point at whatever Docker API the machine happens to have,
 * and that works because the widget is photographed with a couple of test
 * containers. Proxmox is different: pointing this at anyone's actual cluster
 * would publish the names of the machines their household runs on. So the rig
 * serves the two endpoints the integration reads, with a cluster invented to
 * match the starter board — including one container left stopped, because the
 * page's whole argument is the sentence it writes about it.
 */
function startFakeProxmox(): { close: () => void } {
    const resources = [
        { type: 'node', node: 'pve', status: 'online', cpu: 0.14, mem: 22548578304, maxmem: 34359738368, disk: 412316860416, maxdisk: 1000204886016, maxcpu: 16, uptime: 3628800 },
        { type: 'lxc', vmid: 100, name: 'jellyfin', node: 'pve', status: 'running', cpu: 0.121, mem: 2254857830, maxmem: 4294967296, uptime: 1382400 },
        { type: 'lxc', vmid: 101, name: 'nextcloud', node: 'pve', status: 'running', cpu: 0.043, mem: 1932735283, maxmem: 4294967296, uptime: 1382400 },
        { type: 'qemu', vmid: 102, name: 'home-assistant', node: 'pve', status: 'running', cpu: 0.089, mem: 3113851289, maxmem: 4294967296, uptime: 1209600 },
        { type: 'lxc', vmid: 103, name: 'pihole', node: 'pve', status: 'running', cpu: 0.011, mem: 214748364, maxmem: 1073741824, uptime: 1382400 },
        { type: 'lxc', vmid: 104, name: 'paperless', node: 'pve', status: 'running', cpu: 0.061, mem: 1503238553, maxmem: 3221225472, uptime: 950400 },
        { type: 'qemu', vmid: 105, name: 'immich', node: 'pve', status: 'running', cpu: 0.382, mem: 8375186227, maxmem: 12884901888, uptime: 604800 },
        // Stopped, and a bookmark points at it: the page says which service
        // that costs, and the widget lifts it to the top of the tile.
        { type: 'lxc', vmid: 106, name: 'plex', node: 'pve', status: 'stopped', cpu: 0, mem: 0, maxmem: 4294967296, uptime: 0 },
        { type: 'lxc', vmid: 107, name: 'vaultwarden', node: 'pve', status: 'running', cpu: 0.008, mem: 322122547, maxmem: 1073741824, uptime: 1382400 },
        { type: 'lxc', vmid: 108, name: 'uptime-kuma', node: 'pve', status: 'running', cpu: 0.029, mem: 644245094, maxmem: 1073741824, uptime: 1296000 },
        { type: 'qemu', vmid: 900, name: 'debian-12-template', node: 'pve', status: 'stopped', template: 1 },
        { type: 'storage', storage: 'local', node: 'pve', plugintype: 'dir', disk: 19327352832, maxdisk: 100931731456, shared: 0 },
        { type: 'storage', storage: 'local-lvm', node: 'pve', plugintype: 'lvmthin', disk: 431677874176, maxdisk: 955630223360, shared: 0 },
        { type: 'storage', storage: 'tank', node: 'pve', plugintype: 'zfspool', disk: 7477813964800, maxdisk: 11982492172288, shared: 0 },
        { type: 'storage', storage: 'backups', node: 'pve', plugintype: 'pbs', disk: 4266133552005, maxdisk: 4398046511104, shared: 1 },
    ];

    // An hour of RRD data, so the sparklines in a machine's sheet have a shape.
    // `stopped` is not a detail: a machine that is down has to show a line that
    // falls to the floor and stays there, or the picture of its sheet argues
    // against the words beside it.
    const rrd = (base: number, stopped = false) => Array.from({ length: 60 }, (_, i) => ({
        time: Math.floor(Date.now() / 1000) - (60 - i) * 60,
        cpu: stopped && i > 26 ? 0 : Math.max(0, base + Math.sin(i / 7) * base * 0.4) / 100,
        mem: stopped && i > 26 ? 0 : 2.1e9 + Math.sin(i / 11) * 2e8,
        maxmem: 4294967296,
    }));

    const server = createServer((req, res) => {
        const path = (req.url || '').split('?')[0];
        res.setHeader('content-type', 'application/json');
        if (path === '/api2/json/cluster/resources') {
            res.end(JSON.stringify({ data: resources }));
        } else if (path === '/api2/json/access/permissions') {
            res.end(JSON.stringify({ data: { '/': { 'VM.Audit': 1, 'VM.PowerMgmt': 1, 'Datastore.Audit': 1, 'Sys.Audit': 1 } } }));
        } else if (path.endsWith('/rrddata')) {
            const guest = resources.find((r) => path.includes(`/${r.vmid}/`));
            res.end(JSON.stringify({ data: rrd(12, guest?.status === 'stopped') }));
        } else if (path.endsWith('/status')) {
            res.end(JSON.stringify({ data: { uptime: 3628800, loadavg: ['0.62', '0.71', '0.68'], cpuinfo: { cores: 8, cpus: 16 } } }));
        } else {
            res.end(JSON.stringify({ data: null }));
        }
    });
    server.listen(PVE_PORT, '127.0.0.1');
    return { close: () => server.close() };
}

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

    // Two more accounts. The Users panel is where a household shares a board, and
    // photographed on a fresh install it says "No users here yet." — a picture of
    // an empty room, which explains nothing about what the panel is for.
    for (const username of ['ana', 'marco']) {
        await api('/users', { username, password: 'Lastboard123!' });
    }

    // 24/7 monitoring on, so the status page and the widget have something to say.
    await api('/monitor/settings', {
        mode: 'background', interval_sec: 300, alerts_enabled: true,
        notify_type: 'ntfy', notify_url: 'https://ntfy.sh/my-topic', notify_token: '', fail_threshold: 2,
    });

    const { Database } = await import('bun:sqlite');
    const db = new Database(dbPath);

    // Boards. Two things are being fixed here, and both were caught by reading
    // the database rather than the picture:
    //
    //  - The default board does not exist yet. The server creates it lazily, on
    //    the first GET /api/dashboards, which happens after this seed runs, so
    //    inserting the extra boards on their own left all 35 items orphaned.
    //  - When the server does create it, it names it 'Dashboard principal' —
    //    hardcoded Spanish, whatever language was chosen — which would be the
    //    only Spanish words in an English manual.
    //
    // So the default board is created here exactly as the server would, adopting
    // the orphans, and two more give the switcher something to switch between.
    db.run(`INSERT INTO dashboards (user_id, name, position, is_default) VALUES (1, 'Main dashboard', 0, 1)`);
    const main = db.query(`SELECT id FROM dashboards WHERE is_default = 1`).get() as { id: number };
    db.run(`UPDATE items SET dashboard_id = ? WHERE dashboard_id IS NULL`, [main.id]);
    for (const [i, name] of ['Media', 'Infrastructure'].entries()) {
        db.run(`INSERT INTO dashboards (user_id, name, position, is_default) VALUES (1, ?, ?, 0)`, [name, i + 1]);
    }

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

    // Proxmox, pointed at the stand-in. The token is nonsense and says so: it
    // is written into the picture of the settings screen, so it has to be a
    // value nobody could mistake for a real one.
    await api('/proxmox/settings', {
        enabled: true,
        url: `http://127.0.0.1:${PVE_PORT}`,
        token_id: 'lastboard@pve!lastboard',
        secret: '00000000-0000-0000-0000-000000000000',
        insecure: true,
    });

    // Which bookmark each machine serves. Without this the page draws a grid of
    // container names, which is what the Proxmox console already does; with it
    // the tiles wear the service's icon and the stopped one says what it costs.
    const backing: Record<string, { kind: string; vmid: number }> = {
        Plex: { kind: 'lxc', vmid: 106 },
        Jellyfin: { kind: 'lxc', vmid: 100 },
        Nextcloud: { kind: 'lxc', vmid: 101 },
        Immich: { kind: 'qemu', vmid: 105 },
        Vaultwarden: { kind: 'lxc', vmid: 107 },
        Paperless: { kind: 'lxc', vmid: 104 },
        'Home Assistant': { kind: 'qemu', vmid: 102 },
        'Pi-hole': { kind: 'lxc', vmid: 103 },
        'Uptime Kuma': { kind: 'lxc', vmid: 108 },
    };
    for (const row of rows) {
        const c = JSON.parse(row.content || '{}');
        const px = backing[c.label];
        if (!px) continue;
        c.proxmox = { node: 'pve', ...px };
        db.run(`UPDATE items SET content = ? WHERE id = ?`, [JSON.stringify(c), row.id]);
    }

    // Row seven: row five is already full (monitoring, API, Docker), and two
    // tiles sharing a cell is not a layout, it is a bug in a photograph.
    addWidget(1, 7, 3, 2, { widgetId: 'proxmox', refreshSec: 30, showNode: true, title: '' });

    // The Docker widget, pointed at whatever Docker-compatible API is listening
    // on DOCKER_API (Podman serves one too). Without it the widget is left out
    // rather than photographed empty — an empty widget teaches nothing, and a
    // screenshot of someone's real containers is not ours to publish.
    if (process.env.DOCKER_API) {
        // Given as host:port. A `tcp://` prefix — the form DOCKER_HOST uses, and
        // the obvious thing to paste for a host type the UI calls "TCP" — is
        // stripped here because the server does not accept it: it prepends
        // http:// to anything unrecognised and ends up dialling
        // `http://tcp://127.0.0.1:2375`, which fails after a four-second
        // timeout. That is what put "Could not connect to Docker host" across
        // the main board, and it is a product bug, not a rig one.
        const dockerHost = process.env.DOCKER_API.replace(/^tcp:\/\//, '');
        addWidget(8, 5, 4, 2, {
            widgetId: 'docker',
            hosts: [{ id: 'docs', name: 'Home server', type: 'tcp', url: dockerHost }],
            activeHost: 'docs',
        });
        // Warm the proxy before anything is photographed. The first call to a
        // just-started Podman service takes several seconds to come back, which
        // is longer than any shot waits — the main board was photographed with
        // "Could not connect to Docker host" across its Docker tile, while the
        // tile's own close-up, taken minutes later, was fine.
        const warm = Date.now();
        await fetch(`${APP}api/docker/containers?host=${encodeURIComponent(dockerHost)}`, {
            headers: { Cookie: `session_token=${token}; csrf_token=${csrf}` },
        }).catch(() => { });
        console.log(`  docker proxy warmed in ${Date.now() - warm}ms`);
    }
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

/**
 * Places a captured piece on the shared exhibit canvas.
 *
 * One shape for every exhibit (16:10), the piece centred at a size near its
 * real one, on the board's own background. Done with Python + Pillow rather
 * than in the browser because compositing after the fact keeps the capture
 * itself honest: what is photographed is the widget, untouched.
 */
function mountOnCanvas(file: string, dpr: number) {
    const script = `
import sys
from PIL import Image
src = Image.open(sys.argv[1]).convert('RGBA')
dpr = float(sys.argv[2])

CANVAS_CSS = (720, 450)          # what the docs column gives a figure
MAX_CSS    = 460                 # never wider than this on the canvas
GROWTH     = 1.28                # a touch larger than life, still believable
BG         = (17, 17, 18, 255)   # the board's own background

nat_css = src.width / dpr
target_css = min(MAX_CSS, nat_css * GROWTH, CANVAS_CSS[0] - 80)
scale = target_css / nat_css

out_px = (CANVAS_CSS[0] * 2, CANVAS_CSS[1] * 2)
piece_px = (max(1, round(src.width * scale * 2 / dpr)), max(1, round(src.height * scale * 2 / dpr)))
if piece_px[1] > out_px[1] - 80:                      # tall pieces fit by height
    k = (out_px[1] - 80) / piece_px[1]
    piece_px = (max(1, round(piece_px[0] * k)), max(1, round(piece_px[1] * k)))

piece = src.resize(piece_px, Image.LANCZOS)
canvas = Image.new('RGBA', out_px, BG)
canvas.paste(piece, ((out_px[0] - piece_px[0]) // 2, (out_px[1] - piece_px[1]) // 2), piece)
canvas.convert('RGB').save(sys.argv[1])
print(f'{out_px[0]}x{out_px[1]} (pieza {piece_px[0]}x{piece_px[1]})')
`;
    const r = spawnSync('python3', ['-c', script, file, String(dpr)], { encoding: 'utf8' });
    if (r.status !== 0) console.warn(`  ! canvas failed: ${(r.stderr || '').trim().split('\n').pop()}`);
    return (r.stdout || '').trim();
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

    const pve = startFakeProxmox();
    process.on('exit', () => pve.close());

    // The browser comes up first: the Setup Wizard only exists until an account
    // is created, so anything photographing it has to run before that call.
    await startBrowser(procs);

    const preSetup = wanted.filter((s) => s.beforeSetup);
    for (const shot of preSetup) await capture(shot);

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

    // 3. The shots that need an account.
    await setCookies(cookies);
    // One shot that throws must not take the rest of the run with it: the whole
    // point of a rig is that a full pass leaves a consistent set behind, and a
    // half-finished set is how mismatched images got published in the first
    // place. Failures are collected and reported at the end instead.
    const failed: string[] = [];
    for (const shot of wanted.filter((s) => !s.beforeSetup)) {
        try {
            await capture(shot);
        } catch (err) {
            failed.push(shot.name);
            console.warn(`  ! ${shot.name}: ${(err as Error).message}`);
        }
    }
    if (failed.length) console.warn(`\n✗ not taken: ${failed.join(', ')}`);
    pve.close();
    await finish();
}

/** A browser with a clean profile, so no extension or leftover state paints
 *  itself into a screenshot. */
async function startBrowser(procs: ChildProcess[]) {
    console.log('▶ starting the browser…');
    procs.push(spawn('google-chrome', [
        '--headless=new', `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${join(WORK, 'profile')}`, '--no-first-run', '--hide-scrollbars',
        '--force-color-profile=srgb', '--disable-lcd-text',
        // The Setup Wizard runs before any account exists, so it follows the
        // browser's language rather than a stored preference. Left to this
        // machine's locale it came out in Spanish on an English-only site.
        `--lang=${LANG}-US`, 'about:blank',
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
    await cdp('Network.setExtraHTTPHeaders', { headers: { 'Accept-Language': `${LANG}-US,${LANG};q=0.9` } });
    // Entry animations would otherwise be caught halfway through, giving a
    // board of half-faded tiles.
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    mkdirSync(OUT_DIR, { recursive: true });
}

async function setCookies(cookies: Record<string, string>) {
    for (const [name, value] of Object.entries(cookies)) {
        await cdp('Network.setCookie', { name, value, domain: 'localhost', path: '/' });
    }
}

async function finish() {
    if (process.env.KEEP) {
        console.log(`\nInstance left running on ${APP} (user demo / Lastboard123!). Ctrl-C to stop.`);
        await new Promise(() => { });
    }
    console.log('\n✨ done');
    process.exit(0);
}

/**
 * Waits until no tile is still drawing a placeholder.
 *
 * Fixed waits are not enough and were never going to be: the same shot came out
 * fine on its own and as a skeleton inside a full run, because the close-ups
 * render at four times the scale and everything is slower. This polls for the
 * two things a waiting widget shows — the Docker skeleton rows and the
 * "loading" state the others use — and gives up loudly rather than quietly
 * photographing a half-drawn board.
 */
async function waitForWidgetContent(timeoutMs = 15000) {
    const started = Date.now();
    let clean = 0;
    while (Date.now() - started < timeoutMs) {
        const waiting = await evaluate(`
            const grid = document.querySelector('bookmark-grid');
            if (!grid) return 0;
            let n = 0;
            for (const card of grid.shadowRoot.querySelectorAll('.bookmark-grid__card')) {
                for (const el of card.querySelectorAll('*')) {
                    const r = el.shadowRoot;
                    if (!r) continue;
                    if (r.querySelector('.skeleton-row')) n++;
                    else if (/${'Just a sec|Loading|Cargando'}/.test(r.textContent || '')) n++;
                }
            }
            return n;`);
        // Two clean readings, not one. A single look can land in the gap between
        // a tile mounting and its first request starting, which is how the
        // monitoring close-up was published showing "Just a sec…" while the run
        // reported it fine.
        if (!waiting) {
            clean++;
            if (clean >= 2) return;
        } else {
            clean = 0;
        }
        await sleep(600);
    }
    console.warn('  ! a widget was still loading after 15s — check the shot');
}

/**
 * Presses any widget's retry button once and waits for the second attempt.
 * Returns how many it found, so a run that keeps failing is visible in the log
 * rather than quietly producing pictures of error states.
 */
async function settleWidgets() {
    const clicked = await evaluate(`
        const grid = document.querySelector('bookmark-grid');
        if (!grid) return 0;
        let n = 0;
        for (const card of grid.shadowRoot.querySelectorAll('.bookmark-grid__card')) {
            for (const el of card.querySelectorAll('*')) {
                const btn = el.shadowRoot?.getElementById?.('retry-btn');
                if (btn) { btn.click(); n++; }
            }
        }
        return n;`);
    if (clicked) {
        console.log(`    (${clicked} widget${clicked > 1 ? 's' : ''} retried)`);
        await sleep(2500);
    }
}

/** Takes one shot: sets the viewport, reaches the state, frames and writes it. */
async function capture(shot: Shot) {
    {
        const w = shot.w ?? 1600, h = shot.h ?? 900;
        const dpr = shot.dpr ?? DPR;
        // `?? 0` here, not `?? 1600`, quietly put every shot that does not name a
        // width — all the close-ups — into mobile emulation with a coarse
        // pointer, which is the layout the board switches on.
        const phone = (shot.w ?? 1600) < 600;
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
        // A widget that failed to reach its service draws a retry button. That is
        // the honest state of a real board, but photographing it teaches nothing
        // — and it happened to the main board shot, where the Docker tile was
        // caught before its first request came back. Any retry on screen is
        // pressed once and given time, exactly as a person would.
        await settleWidgets();
        await waitForWidgetContent();
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
            return;
        }
        // captureBeyondViewport re-renders the page against a different surface,
        // and a widget that re-renders goes back to its loading state — which is
        // how the monitoring close-up kept coming out as "Just a sec…" while a
        // probe taken a moment earlier confirmed the tile was fully drawn. It is
        // only needed when the clip runs past the window, so it is asked for
        // only then.
        const beyond = !!clip && (clip.y + clip.height > h || clip.x + clip.width > w);
        const png = await cdp('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}), captureBeyondViewport: beyond });
        if (!png.result?.data) {
            console.warn(`  ! ${shot.name}: the browser refused the capture — skipped`);
            return;
        }
        const file = join(OUT_DIR, `${shot.name}.png`);
        await Bun.write(file, Buffer.from(png.result.data, 'base64'));
        if (shot.exhibit) mountOnCanvas(file, dpr);
        const size = spawnSync('python3', ['-c',
            `import struct;d=open('${file}','rb').read(33);w,h=struct.unpack('>II',d[16:24]);print(f'{w}x{h}')`]).stdout.toString().trim();
        console.log(`  ✓ ${shot.name.padEnd(22)} ${size}`);
    }
}

main().catch((err) => { console.error('✗', err.message); process.exit(1); });
