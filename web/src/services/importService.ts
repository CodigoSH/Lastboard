import { apiService } from './apiService';
import { dashboardStore } from '../store/dashboardStore';
import { dashboardService } from './dashboardService';

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
export interface NativeConfig { version: number; dashboards: NativeDashboard[]; }

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
     * Create the config's dashboards, sections and bookmarks. Returns the id of
     * the first dashboard created (to switch to it), or null if nothing was made.
     */
    async materialize(cfg: NativeConfig, gridCols: number, ungroupedLabel: string): Promise<number | null> {
        let firstDashId: number | null = null;
        const SW = Math.max(2, Math.min(gridCols || 12, 4));

        for (const nd of cfg.dashboards || []) {
            if (!nd.items || nd.items.length === 0) continue;
            const dash = await dashboardStore.createDashboard(nd.name || 'Import');
            if (firstDashId === null) firstDashId = dash.id;

            // Group items, preserving first-seen order.
            const groups = new Map<string, NativeItem[]>();
            for (const it of nd.items) {
                const g = (it.group || '').trim() || ungroupedLabel;
                if (!groups.has(g)) groups.set(g, []);
                groups.get(g)!.push(it);
            }

            let yCursor = 0;
            for (const [groupName, its] of groups) {
                const rows = Math.max(1, Math.ceil(its.length / SW));
                const section = await dashboardService.createItem({
                    dashboard_id: dash.id,
                    type: 'section',
                    x: 0, y: yCursor, w: SW, h: rows,
                    content: JSON.stringify({ title: groupName }),
                } as never);

                for (let k = 0; k < its.length; k++) {
                    const it = its[k];
                    await dashboardService.createItem({
                        dashboard_id: dash.id,
                        parent_id: section.id,
                        type: 'bookmark',
                        x: k % SW, y: Math.floor(k / SW), w: 1, h: 1,
                        content: JSON.stringify({
                            label: it.title, url: it.url, icon: it.icon || '',
                            description: it.description || '', statusCheck: !!it.status_check,
                        }),
                    } as never);
                }
                yCursor += rows + 1;
            }
        }

        if (firstDashId !== null) {
            await dashboardStore.switchDashboard(firstDashId);
        }
        return firstDashId;
    }
}

export const importService = new ImportService();
