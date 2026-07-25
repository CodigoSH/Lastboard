import { dashboardStore } from '../store/dashboardStore';
import { dashboardService } from './dashboardService';
import { apiService } from './apiService';

/**
 * StatusService
 * Periodically checks the health of bookmarks that have "Monitor Status" enabled.
 *
 * Honors the global monitoring_mode: "off" disables live checks entirely, while
 * "tab" and "background" both keep the frontend probing for live dots (in
 * "background" the backend scheduler additionally records history 24/7).
 */

const WAKE_DELAY_MS = 5000; // Time to wait after tab becomes visible before re-checking

class StatusService {
    private lastDashboardId: number | null = null;
    private unsubscribe: (() => void) | null = null;
    private interval: number | null = null;
    private wakeTimer: number | null = null;
    private checkFrequency = 60000 * 5; // Every 5 minutes
    private mode: 'off' | 'tab' | 'background' = 'tab';

    /** Read the current monitoring mode from the backend (best-effort). */
    async refreshMode() {
        try {
            const s = await apiService.get<{ mode: string }>('/api/monitor/settings');
            if (s.mode === 'off' || s.mode === 'tab' || s.mode === 'background') {
                this.mode = s.mode;
            }
        } catch {
            // Keep the last known / default mode on failure.
        }
    }

    /** Apply a mode change made in settings without a round-trip. */
    setMode(mode: 'off' | 'tab' | 'background') {
        const wasOff = this.mode === 'off';
        this.mode = mode;
        if (mode !== 'off' && wasOff) this.checkAll();
    }

    start() {
        if (this.interval) return;

        this.refreshMode();

        let lastItemsHash = '';

        this.unsubscribe = dashboardStore.subscribe((state) => {
            const dashboardChanged = this.lastDashboardId !== state.currentDashboardId;
            const itemsHash = state.items.map(i => i.id).join(',');
            const hashChanged = itemsHash !== lastItemsHash;
            const loadFinished = !state.loading && state.items.length > 0;

            if (loadFinished && (dashboardChanged || hashChanged)) {
                this.lastDashboardId = state.currentDashboardId;
                lastItemsHash = itemsHash;
                this.checkAll();
            }
        });

        this.interval = window.setInterval(() => {
            this.checkAll();
        }, this.checkFrequency);

        document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        if (this.wakeTimer) {
            clearTimeout(this.wakeTimer);
            this.wakeTimer = null;
        }
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }

    private onVisibilityChange = () => {
        if (document.visibilityState !== 'visible') return;

        if (this.wakeTimer) {
            clearTimeout(this.wakeTimer);
            this.wakeTimer = null;
        }

        // Wait for the network to stabilise after wake/suspend before checking
        this.wakeTimer = window.setTimeout(() => {
            this.wakeTimer = null;
            this.checkAll();
        }, WAKE_DELAY_MS);
    };

    async checkAll() {
        if (this.mode === 'off') return;
        if (!navigator.onLine) return;

        const state = dashboardStore.getState();
        const items = state.items.filter(item => {
            if (item.type !== 'bookmark') return false;
            let content = item.content;
            if (typeof content === 'string') {
                try { content = JSON.parse(content); } catch (e) { return false; }
            }
            return content && content.statusCheck === true;
        });

        if (items.length === 0) return;

        // Set all to pending immediately for visual feedback
        const pendingUpdates = items.map(item => ({ id: item.id, status: 'pending' as const }));
        dashboardStore.setItemStatuses(pendingUpdates);

        // Collect URLs (items with no valid URL are marked down immediately)
        const urlMap = new Map<string, number[]>(); // url → [itemIds]
        for (const item of items) {
            let content = item.content;
            if (typeof content === 'string') {
                try { content = JSON.parse(content); } catch { continue; }
            }
            const url = content?.url;
            if (!url || url === '#' || url.startsWith('javascript:')) {
                this.updateUIStatus(item.id, 'down');
                continue;
            }
            const ids = urlMap.get(url) ?? [];
            ids.push(item.id);
            urlMap.set(url, ids);
        }

        if (urlMap.size === 0) return;

        try {
            // Single request — backend fans out with one goroutine per URL
            const results = await dashboardService.checkHealthBatch(Array.from(urlMap.keys()));
            const statusUpdates = Array.from(urlMap.entries()).map(([url, ids]) => {
                const status = (results[url] === 'up' ? 'up' : 'down') as 'up' | 'down';
                return ids.map(id => ({ id, status }));
            }).flat();
            dashboardStore.setItemStatuses(statusUpdates);
        } catch (error) {
            if (!navigator.onLine || error instanceof TypeError) {
                dashboardStore.setItemStatuses(items.map(item => ({ id: item.id, status: 'pending' as const })));
                return;
            }
            dashboardStore.setItemStatuses(items.map(item => ({ id: item.id, status: 'down' as const })));
        }
    }

    private updateUIStatus(id: number, status: 'up' | 'down' | 'pending') {
        dashboardStore.setItemStatus(id, status);
    }
}

export const statusService = new StatusService();
