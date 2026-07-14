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
    accent_color: 'blue',
    language: 'en',
    theme: 'dark',
    grid_columns: 12,
    project_name: 'Lastboard',
    beta_updates: false,
    preferences: {
        accent_color: 'blue',
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

const media = section(1, 1, 3, 3, 2, 'Media');
bookmark(1, media, 1, 1, 'plex', 'Plex', 'https://plex.tv', { statusCheck: true, statusPos: 'top-right' });
bookmark(1, media, 2, 1, 'jellyfin', 'Jellyfin', 'https://jellyfin.org', { statusCheck: true, statusPos: 'top-right' });
bookmark(1, media, 3, 1, 'sonarr', 'Sonarr', 'https://sonarr.tv');
bookmark(1, media, 1, 2, 'radarr', 'Radarr', 'https://radarr.video');
bookmark(1, media, 2, 2, 'prowlarr', 'Prowlarr', 'https://prowlarr.com', { visibleTouch: false });
bookmark(1, media, 3, 2, 'overseerr', 'Overseerr', 'https://overseerr.dev');

const apps = section(1, 4, 3, 4, 2, 'Self-Hosted Apps');
bookmark(1, apps, 1, 1, 'nextcloud', 'Nextcloud', 'https://nextcloud.com', { statusCheck: true, statusPos: 'top-right' });
bookmark(1, apps, 2, 1, 'immich', 'Immich', 'https://immich.app');
bookmark(1, apps, 3, 1, 'vaultwarden', 'Vaultwarden', 'https://github.com/dani-garcia/vaultwarden', { borderColor: '#ef4444', borderWidth: 2 });
bookmark(1, apps, 4, 1, 'open-webui', 'Open WebUI', 'https://openwebui.com', { borderColor: '#8b5cf6', borderWidth: 2 });
bookmark(1, apps, 1, 2, 'paperless-ngx', 'Paperless', 'https://docs.paperless-ngx.com', { visibleTouch: false });
bookmark(1, apps, 2, 2, 'audiobookshelf', 'Audiobookshelf', 'https://www.audiobookshelf.org');
bookmark(1, apps, 3, 2, 'linkwarden', 'Linkwarden', 'https://linkwarden.app');
bookmark(1, apps, 4, 2, 'freshrss', 'FreshRSS', 'https://freshrss.org');

const devHome = section(1, 8, 3, 3, 2, 'Dev');
bookmark(1, devHome, 1, 1, 'gitea', 'Gitea', 'https://gitea.io');
bookmark(1, devHome, 2, 1, 'forgejo', 'Forgejo', 'https://forgejo.org');
bookmark(1, devHome, 3, 1, 'code-server', 'Code', 'https://coder.com');
bookmark(1, devHome, 1, 2, 'portainer', 'Portainer', 'https://www.portainer.io');
bookmark(1, devHome, 2, 2, 'grafana', 'Grafana', 'https://grafana.com');
bookmark(1, devHome, 3, 2, 'uptime-kuma', 'Uptime Kuma', 'https://github.com/louislam/uptime-kuma', { statusCheck: true, statusPos: 'top-right' });

// Standalone favourites (bookmarks outside any section)
fav(1, 11, 3, 'google', 'Google', 'https://google.com');
fav(1, 12, 3, 'youtube', 'YouTube', 'https://youtube.com');
fav(1, 11, 4, 'gmail', 'Gmail', 'https://mail.google.com');
fav(1, 12, 4, 'cloudflare', 'Cloudflare', 'https://dash.cloudflare.com');

// ── Dashboard 2: Servers ─────────────────────────────────────────────────────
// Docker at its real size (4x3), two curated sections, small widgets. ~3 rows.

widget(2, 1, 1, 5, 3, { widgetId: 'docker', hosts: [{ id: 'demo', name: 'Demo Server', type: 'local' }], activeHost: 'demo' });

const infra = section(2, 6, 1, 4, 2, 'Infrastructure');
bookmark(2, infra, 1, 1, 'proxmox', 'Proxmox', 'https://www.proxmox.com', { statusCheck: true, statusPos: 'top-right' });
bookmark(2, infra, 2, 1, 'portainer', 'Portainer', 'https://www.portainer.io');
bookmark(2, infra, 3, 1, 'traefik', 'Traefik', 'https://traefik.io');
bookmark(2, infra, 4, 1, 'nginx-proxy-manager', 'Nginx PM', 'https://nginxproxymanager.com');
bookmark(2, infra, 1, 2, 'pi-hole', 'Pi-hole', 'https://pi-hole.net', { statusCheck: true, statusPos: 'top-right' });
bookmark(2, infra, 2, 2, 'home-assistant', 'Home Assistant', 'https://www.home-assistant.io');
bookmark(2, infra, 3, 2, 'adguard-home', 'AdGuard', 'https://adguard.com');
bookmark(2, infra, 4, 2, 'unifi', 'UniFi', 'https://ui.com');

const monitoring = section(2, 10, 1, 3, 2, 'Monitoring');
bookmark(2, monitoring, 1, 1, 'grafana', 'Grafana', 'https://grafana.com');
bookmark(2, monitoring, 2, 1, 'prometheus', 'Prometheus', 'https://prometheus.io');
bookmark(2, monitoring, 3, 1, 'uptime-kuma', 'Uptime Kuma', 'https://github.com/louislam/uptime-kuma', { statusCheck: true, statusPos: 'top-right' });
bookmark(2, monitoring, 1, 2, 'netdata', 'Netdata', 'https://netdata.cloud');
bookmark(2, monitoring, 2, 2, 'glances', 'Glances', 'https://nicolargo.github.io/glances');
bookmark(2, monitoring, 3, 2, 'dozzle', 'Dozzle', 'https://dozzle.dev');

widget(2, 6, 3, 3, 1, { widgetId: 'markdown', text: '**🖥️ Server room** — Docker stats simulated.' });
widget(2, 9, 3, 2, 1, { widgetId: 'clock', timezone: 'UTC', hour12: false, showDate: false, showSeconds: false, showCity: true, city: 'UTC' });
fav(2, 11, 3, 'cloudflare', 'Cloudflare', 'https://dash.cloudflare.com');
fav(2, 12, 3, 'github', 'GitHub', 'https://github.com');

export const DEFAULT_ITEMS: GridItem[] = items;
