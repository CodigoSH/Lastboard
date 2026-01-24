/**
 * Icon Service
 * Handles fetching and caching of dashboard icons from Homarr Labs
 * Sources: https://github.com/homarr-labs/dashboard-icons
 */

export interface IconInfo {
    name: string;
    url: string;
}

class IconService {
    private icons: IconInfo[] = [];
    private loaded: boolean = false;
    private loading: boolean = false;
    private BASE_URL = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons';
    private FALLBACK_URL = 'https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main';

    async loadIcons(): Promise<IconInfo[]> {
        if (this.loaded) return this.icons;
        if (this.loading) {
            // Wait for loading to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.loadIcons();
        }

        this.loading = true;

        try {
            // Try to fetch tree.json from CDN first
            let response = await fetch(`${this.BASE_URL}/tree.json`);

            // If CDN fails, try GitHub raw
            if (!response.ok) {
                console.log('[IconService] CDN failed, trying GitHub raw');
                response = await fetch(`${this.FALLBACK_URL}/tree.json`);
            }

            if (!response.ok) {
                throw new Error('Failed to fetch icon list');
            }

            const data = await response.json();

            // Parse tree.json structure
            // The tree.json contains an array of icon filenames
            if (Array.isArray(data)) {
                this.icons = data
                    .filter(item => item.endsWith('.png') || item.endsWith('.svg'))
                    .map(filename => {
                        const name = filename.replace(/\.(png|svg)$/, '');
                        return {
                            name,
                            url: `${this.BASE_URL}/png/${name}.png`
                        };
                    })
                    .sort((a, b) => a.name.localeCompare(b.name));
            } else {
                // If tree.json has a different structure, try to parse it
                console.warn('[IconService] Unexpected tree.json structure, using fallback');
                this.icons = this.getFallbackIcons();
            }

            this.loaded = true;
            this.loading = false;
            console.log(`[IconService] Loaded ${this.icons.length} icons`);
            return this.icons;

        } catch (error) {
            console.error('[IconService] Failed to load icons:', error);
            this.loading = false;
            // Return fallback list of popular icons
            this.icons = this.getFallbackIcons();
            this.loaded = true;
            return this.icons;
        }
    }

    private getFallbackIcons(): IconInfo[] {
        // Fallback list of popular icons
        const popularIcons = [
            'github', 'gitlab', 'docker', 'proxmox', 'truenas', 'plex',
            'jellyfin', 'nextcloud', 'cloudflare', 'nginx', 'traefik',
            'portainer', 'grafana', 'prometheus', 'influxdb', 'pihole',
            'adguard', 'homeassistant', 'esphome', 'frigate', 'unraid',
            'synology', 'opnsense', 'pfsense', 'wireguard', 'openvpn',
            'bitwarden', 'vaultwarden', 'sonarr', 'radarr', 'lidarr',
            'bazarr', 'prowlarr', 'overseerr', 'tautulli', 'transmission',
            'qbittorrent', 'deluge', 'sabnzbd', 'nzbget', 'calibre',
            'paperless', 'photoprism', 'immich', 'mealie', 'freshrss',
            'miniflux', 'wallabag', 'linkding', 'shiori', 'firefox',
            'chrome', 'vscode', 'code-server', 'jupyter', 'portainer'
        ];

        return popularIcons.map(name => ({
            name,
            url: `${this.BASE_URL}/png/${name}.png`
        }));
    }

    searchIcons(query: string, limit: number = 50): IconInfo[] {
        if (!query.trim()) return this.icons.slice(0, limit);

        const normalizedQuery = query.toLowerCase().trim();
        return this.icons
            .filter(icon => icon.name.toLowerCase().includes(normalizedQuery))
            .slice(0, limit);
    }

    getIconUrl(iconName: string): string {
        return `${this.BASE_URL}/png/${iconName}.png`;
    }
}

export const iconService = new IconService();
