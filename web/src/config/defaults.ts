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

const NOTEPAD_RUNBOOK =
    '<div><b>Runbook</b> 🛠️</div><div><br></div>' +
    '<div>• Backups run nightly at 03:00</div>' +
    '<div>• Renew TLS certificates monthly</div>' +
    '<div>• Pi-hole gravity update: weekly</div>';

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

widget(1, 1, 1, 4, 2, { widgetId: 'markdown', text: WELCOME_MD });
widget(1, 5, 1, 3, 2, { widgetId: 'weather', city: 'Madrid', latitude: 40.4168, longitude: -3.7038, showForecast: true, forecastDays: 4 });
widget(1, 8, 1, 2, 2, { widgetId: 'notepad', text: NOTEPAD_HOME });
widget(1, 10, 1, 2, 1, { widgetId: 'clock', city: 'Madrid', timezone: 'Europe/Madrid', hour12: false, showDate: true, showSeconds: true, showCity: true });
widget(1, 10, 2, 3, 1, { widgetId: 'telemetry', interval: 2000 });
fav(1, 12, 1, 'github', 'GitHub', 'https://github.com');

const media = section(1, 1, 3, 6, 2, 'Media');
bookmark(1, media, 1, 1, 'plex', 'Plex', 'https://plex.tv', { statusCheck: true, statusPos: 'top-right' });
bookmark(1, media, 2, 1, 'jellyfin', 'Jellyfin', 'https://jellyfin.org', { statusCheck: true, statusPos: 'top-right' });
bookmark(1, media, 3, 1, 'jellyseerr', 'Jellyseerr', 'https://github.com/Fallenbagel/jellyseerr');
bookmark(1, media, 4, 1, 'overseerr', 'Overseerr', 'https://overseerr.dev');
bookmark(1, media, 5, 1, 'sonarr', 'Sonarr', 'https://sonarr.tv');
bookmark(1, media, 6, 1, 'radarr', 'Radarr', 'https://radarr.video');
bookmark(1, media, 1, 2, 'prowlarr', 'Prowlarr', 'https://prowlarr.com', { visibleTouch: false });
bookmark(1, media, 2, 2, 'bazarr', 'Bazarr', 'https://www.bazarr.media', { visibleTouch: false });
bookmark(1, media, 3, 2, 'lidarr', 'Lidarr', 'https://lidarr.audio');
bookmark(1, media, 4, 2, 'readarr', 'Readarr', 'https://readarr.com');
bookmark(1, media, 5, 2, 'tautulli', 'Tautulli', 'https://tautulli.com');
bookmark(1, media, 6, 2, 'navidrome', 'Navidrome', 'https://www.navidrome.org');

const apps = section(1, 7, 3, 4, 2, 'Self-Hosted Apps');
bookmark(1, apps, 1, 1, 'nextcloud', 'Nextcloud', 'https://nextcloud.com', { statusCheck: true, statusPos: 'top-right' });
bookmark(1, apps, 2, 1, 'immich', 'Immich', 'https://immich.app');
bookmark(1, apps, 3, 1, 'paperless-ngx', 'Paperless', 'https://docs.paperless-ngx.com', { visibleTouch: false });
bookmark(1, apps, 4, 1, 'audiobookshelf', 'Audiobookshelf', 'https://www.audiobookshelf.org');
bookmark(1, apps, 1, 2, 'open-webui', 'Open WebUI', 'https://openwebui.com', { borderColor: '#8b5cf6', borderWidth: 2 });
bookmark(1, apps, 2, 2, 'vaultwarden', 'Vaultwarden', 'https://github.com/dani-garcia/vaultwarden', { borderColor: '#ef4444', borderWidth: 2 });
bookmark(1, apps, 3, 2, 'linkwarden', 'Linkwarden', 'https://linkwarden.app');
bookmark(1, apps, 4, 2, 'mealie', 'Mealie', 'https://mealie.io');

// Standalone favourites (bookmarks outside any section)
fav(1, 11, 3, 'google', 'Google', 'https://google.com');
fav(1, 12, 3, 'youtube', 'YouTube', 'https://youtube.com');
fav(1, 11, 4, 'gmail', 'Gmail', 'https://mail.google.com');
fav(1, 12, 4, 'cloudflare', 'Cloudflare', 'https://dash.cloudflare.com');

const downloads = section(1, 1, 5, 4, 2, 'Downloads');
bookmark(1, downloads, 1, 1, 'qbittorrent', 'qBittorrent', 'https://www.qbittorrent.org');
bookmark(1, downloads, 2, 1, 'sabnzbd', 'SABnzbd', 'https://sabnzbd.org');
bookmark(1, downloads, 3, 1, 'nzbget', 'NZBGet', 'https://nzbget.com');
bookmark(1, downloads, 4, 1, 'deluge', 'Deluge', 'https://deluge-torrent.org');
bookmark(1, downloads, 1, 2, 'transmission', 'Transmission', 'https://transmissionbt.com');
bookmark(1, downloads, 2, 2, 'jdownloader', 'JDownloader', 'https://jdownloader.org');
bookmark(1, downloads, 3, 2, 'pyload', 'pyLoad', 'https://pyload.net');
bookmark(1, downloads, 4, 2, 'rutorrent', 'ruTorrent', 'https://github.com/Novik/ruTorrent');

const productivity = section(1, 5, 5, 5, 2, 'Productivity');
bookmark(1, productivity, 1, 1, 'joplin', 'Joplin', 'https://joplinapp.org');
bookmark(1, productivity, 2, 1, 'actual-budget', 'Actual', 'https://actualbudget.org');
bookmark(1, productivity, 3, 1, 'freshrss', 'FreshRSS', 'https://freshrss.org');
bookmark(1, productivity, 4, 1, 'duplicati', 'Duplicati', 'https://duplicati.com');
bookmark(1, productivity, 5, 1, 'healthchecks', 'Healthchecks', 'https://healthchecks.io');
bookmark(1, productivity, 1, 2, 'memos', 'Memos', 'https://usememos.com');
bookmark(1, productivity, 2, 2, 'vikunja', 'Vikunja', 'https://vikunja.io');
bookmark(1, productivity, 3, 2, 'wallabag', 'Wallabag', 'https://wallabag.org');
bookmark(1, productivity, 4, 2, 'grocy', 'Grocy', 'https://grocy.info');
bookmark(1, productivity, 5, 2, 'planka', 'Planka', 'https://planka.app');

const devHome = section(1, 10, 5, 3, 2, 'Dev');
bookmark(1, devHome, 1, 1, 'gitea', 'Gitea', 'https://gitea.io');
bookmark(1, devHome, 2, 1, 'forgejo', 'Forgejo', 'https://forgejo.org');
bookmark(1, devHome, 3, 1, 'code-server', 'Code', 'https://coder.com');
bookmark(1, devHome, 1, 2, 'jenkins', 'Jenkins', 'https://jenkins.io');
bookmark(1, devHome, 2, 2, 'drone', 'Drone', 'https://drone.io');
bookmark(1, devHome, 3, 2, 'gitlab', 'GitLab', 'https://gitlab.com');

// ── Dashboard 2: Servers ─────────────────────────────────────────────────────

widget(2, 1, 1, 4, 2, { widgetId: 'markdown', text: '### 🖥️ Server room\n\nInfra, containers & monitoring — the **Docker** stats are simulated.' });
widget(2, 5, 1, 2, 2, { widgetId: 'clock', timezone: 'UTC', hour12: false, showDate: false, showSeconds: false, showCity: true, city: 'UTC' });
widget(2, 7, 1, 6, 4, { widgetId: 'docker', hosts: [{ id: 'demo', name: 'Demo Server', type: 'local' }], activeHost: 'demo' });

const infra = section(2, 1, 3, 6, 2, 'Infrastructure');
bookmark(2, infra, 1, 1, 'proxmox', 'Proxmox', 'https://www.proxmox.com', { statusCheck: true, statusPos: 'top-right' });
bookmark(2, infra, 2, 1, 'portainer', 'Portainer', 'https://www.portainer.io');
bookmark(2, infra, 3, 1, 'home-assistant', 'Home Assistant', 'https://www.home-assistant.io');
bookmark(2, infra, 4, 1, 'traefik', 'Traefik', 'https://traefik.io');
bookmark(2, infra, 5, 1, 'nginx-proxy-manager', 'Nginx PM', 'https://nginxproxymanager.com');
bookmark(2, infra, 6, 1, 'unifi', 'UniFi', 'https://ui.com');
bookmark(2, infra, 1, 2, 'watchtower', 'Watchtower', 'https://containrrr.dev/watchtower');
bookmark(2, infra, 2, 2, 'harbor', 'Harbor', 'https://goharbor.io');
bookmark(2, infra, 3, 2, 'homebridge', 'Homebridge', 'https://homebridge.io');
bookmark(2, infra, 4, 2, 'esphome', 'ESPHome', 'https://esphome.io');
bookmark(2, infra, 5, 2, 'zigbee2mqtt', 'Zigbee2MQTT', 'https://www.zigbee2mqtt.io');
bookmark(2, infra, 6, 2, 'node-red', 'Node-RED', 'https://nodered.org');

const network = section(2, 1, 5, 3, 2, 'Network');
bookmark(2, network, 1, 1, 'pi-hole', 'Pi-hole', 'https://pi-hole.net', { statusCheck: true, statusPos: 'top-right' });
bookmark(2, network, 2, 1, 'adguard-home', 'AdGuard', 'https://adguard.com');
bookmark(2, network, 3, 1, 'wireguard', 'WireGuard', 'https://www.wireguard.com');
bookmark(2, network, 1, 2, 'tailscale', 'Tailscale', 'https://tailscale.com');
bookmark(2, network, 2, 2, 'mosquitto', 'Mosquitto', 'https://mosquitto.org');
bookmark(2, network, 3, 2, 'ntfy', 'ntfy', 'https://ntfy.sh');

const monitoring = section(2, 4, 5, 4, 2, 'Monitoring');
bookmark(2, monitoring, 1, 1, 'grafana', 'Grafana', 'https://grafana.com');
bookmark(2, monitoring, 2, 1, 'prometheus', 'Prometheus', 'https://prometheus.io');
bookmark(2, monitoring, 3, 1, 'uptime-kuma', 'Uptime Kuma', 'https://github.com/louislam/uptime-kuma', { statusCheck: true, statusPos: 'top-right' });
bookmark(2, monitoring, 4, 1, 'netdata', 'Netdata', 'https://netdata.cloud');
bookmark(2, monitoring, 1, 2, 'glances', 'Glances', 'https://nicolargo.github.io/glances');
bookmark(2, monitoring, 2, 2, 'dozzle', 'Dozzle', 'https://dozzle.dev');
bookmark(2, monitoring, 3, 2, 'influxdb', 'InfluxDB', 'https://www.influxdata.com');
bookmark(2, monitoring, 4, 2, 'gotify', 'Gotify', 'https://gotify.net');

const devSrv = section(2, 8, 5, 3, 2, 'Dev');
bookmark(2, devSrv, 1, 1, 'gitea', 'Gitea', 'https://gitea.io');
bookmark(2, devSrv, 2, 1, 'forgejo', 'Forgejo', 'https://forgejo.org');
bookmark(2, devSrv, 3, 1, 'jenkins', 'Jenkins', 'https://jenkins.io');
bookmark(2, devSrv, 1, 2, 'drone', 'Drone', 'https://drone.io');
bookmark(2, devSrv, 2, 2, 'code-server', 'Code', 'https://coder.com');
bookmark(2, devSrv, 3, 2, 'gitlab', 'GitLab', 'https://gitlab.com');

widget(2, 11, 5, 2, 2, { widgetId: 'notepad', text: NOTEPAD_RUNBOOK });

export const DEFAULT_ITEMS: GridItem[] = items;
