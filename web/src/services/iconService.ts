/**
 * Icon Service
 * Handles fetching and caching of dashboard icons from Homarr Labs
 * Sources: https://github.com/homarr-labs/dashboard-icons
 */

export interface IconInfo {
    name: string;
    url: string;
    provider: string; // The group name (e.g., 'homarr-labs/dashboard-icons')
    format: 'webp' | 'svg' | 'png';
}

interface IconProvider {
    id: string;
    name: string;
    url: string; // URL to the index JSON
    prefix: string; // Base URL for actual image files
    format: 'webp' | 'svg' | 'png';
    parser: (data: any, prefix: string, name: string) => IconInfo[];
}

class IconService {
    private icons: IconInfo[] = [];
    private loaded: boolean = false;
    private loading: boolean = false;

    // Legacy URLs needed for current code while we transition
    private BASE_URL = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons';
    private FALLBACK_URL = 'https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main';

    private PROVIDERS: IconProvider[] = [
        {
            id: 'homarr',
            name: 'homarr-labs/dashboard-icons',
            url: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/tree.json',
            prefix: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/',
            format: 'webp',
            parser: (data, prefix, name) => {
                const list = Array.isArray(data) ? data : (data.webp || data.png || []);
                return list
                    .filter((item: string) => item.endsWith('.webp') || item.endsWith('.svg') || item.endsWith('.png'))
                    .map((filename: string) => ({
                        name: filename.replace(/\.(webp|png|svg)$/, ''),
                        url: `${prefix}${filename.replace(/\.(png|svg)$/, '.webp')}`,
                        provider: name,
                        format: 'webp' as const
                    }));
            }
        },
        {
            id: 'selfhst',
            name: 'selfhst/icons',
            url: 'https://cdn.jsdelivr.net/gh/selfhst/icons@main/index.json',
            prefix: 'https://cdn.jsdelivr.net/gh/selfhst/icons@main/webp/',
            format: 'webp',
            parser: (data, prefix, name) => {
                const list = Array.isArray(data) ? data : [];
                return list.map((item: any) => ({
                    name: item.Name || item.Reference,
                    url: `${prefix}${item.Reference}.webp`,
                    provider: name,
                    format: 'webp' as const
                }));
            }
        },
        {
            id: 'loganmarchione',
            name: 'loganmarchione/homelab-svg-assets',
            url: 'https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets@main/icons.json',
            prefix: 'https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets@main/',
            format: 'svg',
            parser: (data, prefix, name) => {
                const list = data.icons || [];
                return list.map((item: any) => ({
                    name: item.name,
                    url: `${prefix}${item.path.replace('./', '')}`,
                    provider: name,
                    format: 'svg' as const
                }));
            }
        },
        {
            id: 'simple-icons',
            name: 'simple-icons/simple-icons',
            url: 'https://unpkg.com/simple-icons@14.0.0/_data/simple-icons.json',
            prefix: 'https://cdn.jsdelivr.net/npm/simple-icons@14.0.0/icons/',
            format: 'svg',
            parser: (data, prefix, name) => {
                // simple-icons uses slugs. We slugify the title.
                const slugify = (title: string) => {
                    return title.toLowerCase()
                        .replace(/\+/g, 'plus')
                        .replace(/^\./, 'dot-')
                        .replace(/\./g, 'dot')
                        .replace(/&/g, 'and')
                        .replace(/đ/g, 'd')
                        .replace(/ħ/g, 'h')
                        .replace(/ı/g, 'i')
                        .replace(/ĸ/g, 'k')
                        .replace(/ŀ/g, 'l')
                        .replace(/ł/g, 'l')
                        .replace(/ß/g, 'ss')
                        .replace(/ŧ/g, 't')
                        .replace(/[^a-z0-9]/g, '');
                };

                const list = Array.isArray(data) ? data : (data.icons || []);
                return list.map((item: any) => {
                    const slug = item.slug || slugify(item.title);
                    return {
                        name: item.title,
                        url: `${prefix}${slug}.svg`,
                        provider: name,
                        format: 'svg' as const
                    };
                });
            }
        },
        {
            id: 'papirus',
            name: 'PapirusDevelopmentTeam/papirus-icon-theme',
            url: 'https://api.github.com/repos/PapirusDevelopmentTeam/papirus-icon-theme/git/trees/master:Papirus/64x64/apps',
            prefix: 'https://cdn.jsdelivr.net/gh/PapirusDevelopmentTeam/papirus-icon-theme@master/Papirus/64x64/apps/',
            format: 'svg',
            parser: (data, prefix, name) => {
                const list = data.tree ? data.tree : [];
                return list
                    .filter((item: any) => item.path && item.path.endsWith('.svg') && item.mode !== '120000')
                    .map((item: any) => ({
                        name: item.path.replace(/\.svg$/, ''),
                        url: `${prefix}${item.path}`,
                        provider: name,
                        format: 'svg' as const
                    }));
            }
        }
    ];

    async loadIcons(): Promise<IconInfo[]> {
        if (this.loaded) return this.icons;
        if (this.loading) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.loadIcons();
        }

        this.loading = true;

        try {
            const fetchPromises = this.PROVIDERS.map(async (provider) => {
                try {
                    const res = await fetch(provider.url);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    return provider.parser(data, provider.prefix, provider.name);
                } catch (err) {
                    console.error(`[IconService] Failed to load provider ${provider.name}`, err);
                    return [];
                }
            });

            // Await all fetches
            const results = await Promise.all(fetchPromises);

            // Flatten the array of arrays
            let allIcons = results.flat();

            if (allIcons.length === 0) {
                allIcons = this.getFallbackIcons();
            }

            this.icons = allIcons;
            this.loaded = true;
            this.loading = false;
            return this.icons;

        } catch (error) {
            console.error('[IconService] Global failure loading icons:', error);
            this.loading = false;
            this.icons = this.getFallbackIcons();
            this.loaded = true;
            return this.icons;
        }
    }

    private getFallbackIcons(): IconInfo[] {
        const popularIcons = [
            'github', 'gitlab', 'docker', 'proxmox', 'truenas', 'plex',
            'jellyfin', 'nextcloud', 'cloudflare', 'nginx', 'traefik'
        ];

        return popularIcons.map(name => ({
            name,
            url: `${this.BASE_URL}/webp/${name}.webp`,
            provider: 'homarr-labs/dashboard-icons',
            format: 'webp' as const
        }));
    }

    searchIcons(query: string, limit: number = 12): IconInfo[] {
        let results = query.trim()
            ? this.icons.filter(icon => icon.name.toLowerCase().includes(query.toLowerCase().trim()))
            : this.icons;

        // Group by provider to ensure we get results from all providers
        // without one provider dominating the top N
        const grouped = results.reduce((acc, icon) => {
            if (!acc[icon.provider]) acc[icon.provider] = [];
            acc[icon.provider].push(icon);
            return acc;
        }, {} as Record<string, IconInfo[]>);

        // Take up to `limit` per provider
        const finalResults: IconInfo[] = [];
        for (const providerIcons of Object.values(grouped)) {
            finalResults.push(...providerIcons.slice(0, limit));
        }

        return finalResults;
    }

    getIconUrl(iconName: string): string {
        return `${this.BASE_URL}/webp/${iconName}.webp`;
    }
}

export const iconService = new IconService();
