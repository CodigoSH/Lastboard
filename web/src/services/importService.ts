import { apiService } from './apiService';
import { dashboardStore } from '../store/dashboardStore';
import { dashboardService } from './dashboardService';
import { bookmarkRequest, planImport, sectionRequest } from './importPlan';
import { retryOnRateLimit } from './retryOnRateLimit';
import { buildIconIndex, resolveImportedIcon } from './importIcons';
import { iconService } from './iconService';
import { csrfToken } from './csrf';

export interface NativeItem {
    type: string;
    title: string;
    url: string;
    icon?: string;
    group?: string;
    description?: string;
    status_check?: boolean;
}
export interface NativeDashboard { name: string; items: NativeItem[]; }
export interface NativeConfig {
    version: number;
    dashboards: NativeDashboard[];
    /** Entries the file listed that could not become a bookmark. */
    skipped?: number;
    /** The images a native export carries, by the address its bookmarks name them with. */
    icons?: Record<string, string>;
}

/**
 * Import/export of dashboards. Export downloads the native YAML; import parses a
 * competitor/native file server-side into a NativeConfig, then materializes it
 * here — one section per group, bookmarks laid out in a grid inside.
 */
class ImportService {
    /** Trigger a browser download of the native YAML export (uses the session cookie). */
    exportNative() {
        const a = document.createElement('a');
        a.href = '/api/export/native';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    /** Parse an uploaded file into a NativeConfig via the backend adapters. */
    async parseFile(file: File, format: string): Promise<NativeConfig> {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('format', format);
        return apiService.postForm<NativeConfig>('/api/import/parse', fd);
    }

    /** Count the items a config would create (for a confirmation prompt). */
    countItems(cfg: NativeConfig): number {
        return (cfg.dashboards || []).reduce((n, d) => n + (d.items?.length || 0), 0);
    }

    /**
     * Gives every bookmark an icon the board can draw.
     *
     * A native export names its stored images by an address on the server that
     * made it and carries the bytes alongside: they are stored here and the
     * bookmarks pointed at the copies. Whatever else the file calls an icon is a
     * library name (Homepage, Dashy), which is looked up in the icon libraries.
     * Neither can stop the import: an icon that cannot be had is left empty and
     * the bookmark is still made.
     */
    async prepareIcons(cfg: NativeConfig): Promise<NativeConfig> {
        const restored = new Map<string, string>();
        for (const [ref, dataUri] of Object.entries(cfg.icons || {})) {
            try {
                const res = await retryOnRateLimit(() => apiService.post<{ url?: string }>('/api/icons', { source: dataUri }));
                restored.set(ref, res?.url || '');
            } catch {
                restored.set(ref, '');
            }
        }

        // A stored image a file names but does not carry is only worth keeping if
        // this server has it (the same installation, an earlier import). Otherwise
        // the bookmark would point at a picture that is not there.
        const unknown = new Set<string>();
        for (const d of cfg.dashboards || []) {
            for (const i of d.items || []) {
                const v = (i.icon || '').trim();
                if (v.startsWith('/api/icons/') && !restored.has(v)) unknown.add(v);
            }
        }
        for (const ref of unknown) {
            let there = false;
            try {
                const res = await retryOnRateLimit(async () => {
                    const r = await fetch(ref, { method: 'HEAD', cache: 'no-store' });
                    if (r.status === 429) throw new Error('error.rate_limited');
                    return r;
                });
                there = res.ok;
            } catch { /* treated as missing */ }
            if (!there) restored.set(ref, '');
        }

        let index = new Map<string, string>();
        let complete = false;
        const needsLibrary = (cfg.dashboards || []).some(d => (d.items || []).some(i => {
            const v = (i.icon || '').trim();
            return v !== '' && !restored.has(v) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(v);
        }));
        if (needsLibrary) {
            try {
                await iconService.loadIcons();
                index = buildIconIndex(iconService.allIcons());
                complete = iconService.hasFullIndex();
            } catch { /* the guess below covers it */ }
        }

        return {
            ...cfg,
            dashboards: (cfg.dashboards || []).map(d => ({
                ...d,
                items: (d.items || []).map(i => {
                    const own = restored.has((i.icon || '').trim());
                    const icon = own ? restored.get((i.icon || '').trim())! : resolveImportedIcon(i.icon, index, complete);
                    return { ...i, icon };
                }),
            })),
        };
    }

    /** Asks the server to store, now, the icons the new bookmarks still fetch from elsewhere. */
    private storeIconsInBackground() {
        // Not awaited: the board is already complete, and the same pass runs at
        // every start, so a connection that drops here loses nothing.
        fetch('/api/icons/localize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken() },
            body: '{}',
        }).catch(() => { /* picked up at the next start */ });
    }

    /**
     * Create the config's dashboards, sections and bookmarks. Returns the id of
     * the first dashboard created (to switch to it), or null if nothing was made.
     *
     * The layout is worked out and checked first (see planImport), so a file that
     * cannot fit is refused before anything exists. If a request still fails
     * part-way — the item limit, the connection — the dashboard being built is
     * deleted again: an import that fails leaves nothing behind, instead of an
     * empty board next to an error message.
     */
    async materialize(cfg: NativeConfig, gridCols: number, ungroupedLabel: string): Promise<number | null> {
        // Refused before anything is stored or created if it cannot fit; the
        // layout does not depend on the icons, so it is checked once more below
        // only because the icons change the items.
        planImport(cfg.dashboards || [], gridCols, ungroupedLabel);
        const plans = planImport((await this.prepareIcons(cfg)).dashboards || [], gridCols, ungroupedLabel);
        let firstDashId: number | null = null;
        const made: number[] = [];

        try {
            for (const plan of plans) {
                const dash = await retryOnRateLimit(() => dashboardStore.createDashboard(plan.name || 'Import'));
                made.push(dash.id);
                if (firstDashId === null) firstDashId = dash.id;

                for (const sec of plan.sections) {
                    const section = await retryOnRateLimit(() => dashboardService.createItem(
                        sectionRequest(dash.id, sec) as never));

                    for (const it of sec.items) {
                        await retryOnRateLimit(() => dashboardService.createItem(
                            bookmarkRequest(dash.id, section.id, it) as never));
                    }
                }
            }
        } catch (err) {
            for (const id of made) {
                try { await retryOnRateLimit(() => dashboardStore.deleteDashboard(id)); } catch { /* best effort */ }
            }
            throw err;
        }

        if (firstDashId !== null) {
            await dashboardStore.switchDashboard(firstDashId);
            this.storeIconsInBackground();
        }
        return firstDashId;
    }
}

export const importService = new ImportService();
