import { Dashboard, GridItem, User } from '../types';

/**
 * Unified Default Configuration
 * This file serves as the single source of truth for:
 * 1. Demo Mode Data (in-memory / localStorage)
 * 2. New Installation Defaults (frontend template)
 * 3. New User Defaults (template)
 *
 * NOTE: The backend seed for real installs lives in
 * internal/web/api/helpers.go (SeedDefaultItems) and should be kept in sync
 * with the "Home" dashboard below.
 */

export const DEFAULT_USER: User = {
    id: 999,
    username: 'Demo User',
    initials: 'DU',
    role: 'admin',
    avatar_url: '',
    accent_color: 'orange',
    language: 'en',
    theme: 'dark',
    grid_columns: 12,
    project_name: 'Lastboard',
    beta_updates: false,
    preferences: {
        accent_color: 'orange',
        language: 'en',
        theme: 'dark',
        grid_columns: 12,
        project_name: 'Lastboard',
        beta_updates: false
    }
};

export const DEFAULT_DASHBOARDS: Dashboard[] = [
    { id: 1, name: 'Home', position: 0, is_default: true, created_at: '' },
    { id: 2, name: 'Servers', position: 1, is_default: false, created_at: '' }
];

// ── Content helpers ──────────────────────────────────────────────────────────

const ICON = (name: string) =>
    `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/${name}.webp`;

const WELCOME_MD = `# Welcome to the Lastboard demo 👋

A **live, interactive** dashboard — drag tiles around, add bookmarks and widgets, switch the theme, everything works. Your changes are saved in this browser and **reset every hour**.

Explore the **Servers** dashboard above, or [install your own →](https://codigosh.com/docs/lastboard/getting-started/installation/).`;

const NOTEPAD_HOME =
    '<div><b>Quick notes</b> ✍️</div><div><br></div>' +
    '<div>• Open edit mode from the top bar</div>' +
    '<div>• Drag any tile to rearrange it</div>' +
    '<div>• Add your own bookmarks &amp; widgets</div>';

// ── Item builders ────────────────────────────────────────────────────────────

let _id = 0;
const items: GridItem[] = [];

const widget = (dash: number, x: number, y: number, w: number, h: number, content: object) => {
    items.push({ id: ++_id, dashboard_id: dash, type: 'widget', x, y, w, h, content: JSON.stringify(content) });
};

const section = (dash: number, x: number, y: number, w: number, h: number, title: string): number => {
    const sid = ++_id;
    items.push({ id: sid, dashboard_id: dash, type: 'section', x, y, w, h, content: JSON.stringify({ title }) });
    return sid;
};

const bookmark = (
    dash: number, parent: number, x: number, y: number,
    name: string, label: string, url: string, extra: Record<string, any> = {}
) => {
    items.push({
        id: ++_id, parent_id: parent, dashboard_id: dash, type: 'bookmark', x, y, w: 1, h: 1,
        content: JSON.stringify({ label, url, icon: ICON(name), iconName: name, openInNewTab: true, ...extra })
    });
};

/** Standalone bookmark placed directly on the grid (no section). */
const fav = (dash: number, x: number, y: number, name: string, label: string, url: string) => {
    items.push({
        id: ++_id, dashboard_id: dash, type: 'bookmark', x, y, w: 1, h: 1,
        content: JSON.stringify({ label, url, icon: ICON(name), iconName: name, openInNewTab: true })
    });
};

// ── Dashboard 1: Home ────────────────────────────────────────────────────────
// Widgets at their real sizes; a couple of curated sections plus a few loose
// bookmarks. Fits ~4 rows (no scroll).

widget(1, 1, 1, 4, 2, { widgetId: 'markdown', text: WELCOME_MD });
widget(1, 5, 1, 3, 2, { widgetId: 'weather', city: 'Madrid', latitude: 40.4168, longitude: -3.7038, showForecast: true, forecastDays: 6 });
widget(1, 8, 1, 2, 2, { widgetId: 'notepad', text: NOTEPAD_HOME });
widget(1, 10, 1, 2, 1, { widgetId: 'clock', city: 'Madrid', timezone: 'Europe/Madrid', hour12: false, showDate: true, showSeconds: true, showCity: true });
widget(1, 10, 2, 3, 1, { widgetId: 'telemetry', interval: 2000 });
fav(1, 12, 1, 'github', 'GitHub', 'https://github.com');

/* Several of these say which machine serves them. It is what makes the Proxmox
   page worth opening in the demo: plex is deliberately the stopped one, so the
   page can be seen doing the thing only it can do — naming the service that
   went down with its container.
   Only here: a real install's seed (internal/web/api/helpers.go) must not
   invent a hypervisor its owner may not have. */
const media = section(1, 1, 3, 3, 2, 'Media');
bookmark(1, media, 1, 1, 'plex', 'Plex', 'https://plex.tv', { statusCheck: true, statusPos: 'top-right', proxmox: { node: 'pve', kind: 'lxc', vmid: 106 } });
bookmark(1, media, 2, 1, 'jellyfin', 'Jellyfin', 'https://jellyfin.org', { statusCheck: true, statusPos: 'top-right', proxmox: { node: 'pve', kind: 'lxc', vmid: 100 } });
bookmark(1, media, 3, 1, 'sonarr', 'Sonarr', 'https://sonarr.tv');
bookmark(1, media, 1, 2, 'radarr', 'Radarr', 'https://radarr.video');
bookmark(1, media, 2, 2, 'prowlarr', 'Prowlarr', 'https://prowlarr.com', { visibleTouch: false });
bookmark(1, media, 3, 2, 'overseerr', 'Overseerr', 'https://overseerr.dev');

const apps = section(1, 4, 3, 4, 2, 'Self-Hosted Apps');
bookmark(1, apps, 1, 1, 'nextcloud', 'Nextcloud', 'https://nextcloud.com', { statusCheck: true, statusPos: 'top-right', proxmox: { node: 'pve', kind: 'lxc', vmid: 101 } });
bookmark(1, apps, 2, 1, 'immich', 'Immich', 'https://immich.app', { proxmox: { node: 'pve', kind: 'qemu', vmid: 105 } });
bookmark(1, apps, 3, 1, 'vaultwarden', 'Vaultwarden', 'https://github.com/dani-garcia/vaultwarden', { borderColor: '#ef4444', borderWidth: 2, proxmox: { node: 'pve', kind: 'lxc', vmid: 107 } });
bookmark(1, apps, 4, 1, 'open-webui', 'Open WebUI', 'https://openwebui.com', { borderColor: '#8b5cf6', borderWidth: 2 });
bookmark(1, apps, 1, 2, 'paperless-ngx', 'Paperless', 'https://docs.paperless-ngx.com', { visibleTouch: false, proxmox: { node: 'pve', kind: 'lxc', vmid: 108 } });
bookmark(1, apps, 2, 2, 'audiobookshelf', 'Audiobookshelf', 'https://www.audiobookshelf.org');
bookmark(1, apps, 3, 2, 'linkwarden', 'Linkwarden', 'https://linkwarden.app');
bookmark(1, apps, 4, 2, 'freshrss', 'FreshRSS', 'https://freshrss.org');

const devHome = section(1, 8, 3, 3, 2, 'Dev');
bookmark(1, devHome, 1, 1, 'gitea', 'Gitea', 'https://gitea.io');
bookmark(1, devHome, 2, 1, 'forgejo', 'Forgejo', 'https://forgejo.org', { proxmox: { node: 'pve', kind: 'lxc', vmid: 104 } });
bookmark(1, devHome, 3, 1, 'code-server', 'Code', 'https://coder.com');
bookmark(1, devHome, 1, 2, 'portainer', 'Portainer', 'https://www.portainer.io');
bookmark(1, devHome, 2, 2, 'grafana', 'Grafana', 'https://grafana.com');
bookmark(1, devHome, 3, 2, 'uptime-kuma', 'Uptime Kuma', 'https://github.com/louislam/uptime-kuma', { statusCheck: true, statusPos: 'top-right', proxmox: { node: 'pve', kind: 'lxc', vmid: 109 } });

// Standalone favourites (bookmarks outside any section)
fav(1, 11, 3, 'google', 'Google', 'https://google.com');
fav(1, 12, 3, 'youtube', 'YouTube', 'https://youtube.com');
fav(1, 11, 4, 'gmail', 'Gmail', 'https://mail.google.com');
fav(1, 12, 4, 'cloudflare', 'Cloudflare', 'https://dash.cloudflare.com');

// ── Dashboard 2: Servers ─────────────────────────────────────────────────────
// Docker at its real size (4x3), two curated sections, small widgets. ~3 rows.

// Docker carries a title of its own and a hand-written address for a container
// that publishes no port — the two things its config screen is for.
widget(2, 1, 1, 5, 3, {
    widgetId: 'docker',
    title: 'Server room',
    hosts: [{ id: 'demo', name: 'Demo Server', type: 'local' }],
    activeHost: 'demo',
    refreshSec: 60,
    containerConfig: {
        'demo-red': { url: 'http://redis-commander.home:8081' },
    },
});

const infra = section(2, 6, 1, 4, 2, 'Infrastructure');
bookmark(2, infra, 1, 1, 'proxmox', 'Proxmox', 'https://www.proxmox.com', { statusCheck: true, statusPos: 'top-right' });
bookmark(2, infra, 2, 1, 'portainer', 'Portainer', 'https://www.portainer.io');
bookmark(2, infra, 3, 1, 'traefik', 'Traefik', 'https://traefik.io');
bookmark(2, infra, 4, 1, 'nginx-proxy-manager', 'Nginx PM', 'https://nginxproxymanager.com');
bookmark(2, infra, 1, 2, 'pi-hole', 'Pi-hole', 'https://pi-hole.net', { statusCheck: true, statusPos: 'top-right', proxmox: { node: 'pve', kind: 'lxc', vmid: 103 } });
bookmark(2, infra, 2, 2, 'home-assistant', 'Home Assistant', 'https://www.home-assistant.io', { proxmox: { node: 'pve', kind: 'qemu', vmid: 102 } });
bookmark(2, infra, 3, 2, 'adguard-home', 'AdGuard', 'https://adguard.com');
bookmark(2, infra, 4, 2, 'unifi', 'UniFi', 'https://ui.com');

const monitoring = section(2, 10, 1, 3, 2, 'Monitoring');
bookmark(2, monitoring, 1, 1, 'grafana', 'Grafana', 'https://grafana.com', { statusCheck: true, statusPos: 'top-right' });
bookmark(2, monitoring, 2, 1, 'prometheus', 'Prometheus', 'https://prometheus.io');
bookmark(2, monitoring, 3, 1, 'uptime-kuma', 'Uptime Kuma', 'https://github.com/louislam/uptime-kuma', { proxmox: { node: 'pve', kind: 'lxc', vmid: 109 } });
bookmark(2, monitoring, 1, 2, 'netdata', 'Netdata', 'https://netdata.cloud');
bookmark(2, monitoring, 2, 2, 'glances', 'Glances', 'https://nicolargo.github.io/glances');
bookmark(2, monitoring, 3, 2, 'dozzle', 'Dozzle', 'https://dozzle.dev');

widget(2, 6, 3, 3, 1, { widgetId: 'markdown', text: '**🖥️ Docker & monitoring** — simulated data.' });
widget(2, 9, 3, 2, 1, { widgetId: 'clock', timezone: 'UTC', hour12: false, showDate: false, showSeconds: false, showCity: true, city: 'UTC' });
fav(2, 11, 3, 'cloudflare', 'Cloudflare', 'https://dash.cloudflare.com');
fav(2, 12, 3, 'github', 'GitHub', 'https://github.com');

// Row 4 — the two widgets a visitor could not see before. Monitoring is wide
// enough (5 columns) to land past the 300px container query, where the
// heartbeat sits on the same line as the name and roughly twice as many
// services fit.
widget(2, 1, 4, 5, 2, { widgetId: 'monitor', title: 'Service status', refreshSec: 60, items: [] });

// Two API widgets, one per view: rows on the left, figures on the right. The
// demo had only ever shown the widget's metric view.
widget(2, 6, 4, 4, 2, {
    widgetId: 'api',
    preset: '',
    title: 'Download queue',
    url: 'http://10.0.0.8:8989/api/v3/queue',
    method: 'GET',
    headers: {},
    viewMode: 'list',
    arrayPath: 'records',
    mappings: [
        { label: 'Title', path: 'title' },
        { label: 'Status', path: 'status' },
    ],
    refreshSec: 120,
});
widget(2, 10, 4, 2, 1, {
    widgetId: 'api',
    preset: 'adguard',
    title: 'AdGuard',
    url: 'http://10.0.0.2:3000/control/stats',
    method: 'GET',
    headers: {},
    viewMode: 'metrics',
    mappings: [
        { label: 'Queries', path: 'num_dns_queries', format: 'number' },
        { label: 'Blocked', path: 'num_blocked_filtering', format: 'number' },
    ],
    refreshSec: 60,
});

// The hypervisor, under the things it runs. It sits beside the Docker widget
// on purpose: one lists containers, the other lists the machines those
// containers live in — and only this one can say the node is short of memory.
widget(2, 10, 5, 3, 2, { widgetId: 'proxmox', title: 'Hypervisor', refreshSec: 30, showNode: true });

export const DEFAULT_ITEMS: GridItem[] = items;
