import { dashboardStore } from '../store/dashboardStore';
import { dashboardService } from './dashboardService';

/**
 * StatusService
 * Periodically checks the health of bookmarks that have "Monitor Status" enabled.
 */

const WAKE_DELAY_MS = 5000; // Time to wait after tab becomes visible before re-checking

class StatusService {
    private lastDashboardId: number | null = null;
    private unsubscribe: (() => void) | null = null;
    private interval: number | null = null;
    private wakeTimer: number | null = null;
    private checkFrequency = 60000 * 5; // Every 5 minutes
    private _isChecking = false;

    start() {
        if (this.interval) return;

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

        // Cancel any previous pending wake check
        if (this.wakeTimer) {
            clearTimeout(this.wakeTimer);
            this.wakeTimer = null;
        }

        // Wait for the network to stabilise before checking
        this.wakeTimer = window.setTimeout(() => {
            this.wakeTimer = null;
            this.checkAll();
        }, WAKE_DELAY_MS);
    };

    async checkAll() {
        if (this._isChecking) return;
        if (!navigator.onLine) return;

        this._isChecking = true;
        try {

        const state = dashboardStore.getState();
        const items = state.items.filter(item => {
            if (item.type !== 'bookmark') return false;
            let content = item.content;
            if (typeof content === 'string') {
                try { content = JSON.parse(content); } catch (e) { return false; }
            }
            return content && content.statusCheck === true;
        });

        // 1. Set ALL to pending immediately for visual feedback
        // BATCH UPDATE to avoid O(N^2) notify() cycle
        const pendingUpdates = items.map(item => ({ id: item.id, status: 'pending' as const }));
        dashboardStore.setItemStatuses(pendingUpdates);

        // 2. Process in batches to avoid network congestion but remain fast
        const CONCURRENCY = 5;
        const queue = [...items];

        const worker = async () => {
            while (queue.length > 0) {
                const item = queue.shift();
                if (item) {
                    await this.checkItem(item);
                }
            }
        };

        // Start N workers
        const workers = Array(Math.min(items.length, CONCURRENCY)).fill(null).map(() => worker());
        await Promise.all(workers);
        } finally {
            this._isChecking = false;
        }
    }

    private async checkItem(item: any) {
        let content = item.content;
        if (typeof content === 'string') {
            try { content = JSON.parse(content); } catch (e) { return; }
        }

        const url = content.url;
        if (!url || url === '#' || url.startsWith('javascript:')) {
            this.updateUIStatus(item.id, 'down');
            return;
        }

        try {
            // ROUTE THROUGH BACKEND PROXY
            const result = await dashboardService.checkHealth(url);

            if (result.status === 'up') {
                this.updateUIStatus(item.id, 'up');
            } else {
                this.updateUIStatus(item.id, 'down');
            }
        } catch (error) {
            // Network-level error (offline, DNS failure, server unreachable after wake):
            // do not mark as down — the service may still be up, we just can't reach it yet.
            if (!navigator.onLine || error instanceof TypeError) {
                console.warn(`[StatusService] Network error for ${url}, keeping current status`);
                // Restore to the status before we set it to pending
                // (unknown / no data) — use pending so the UI shows "checking" rather than red
                this.updateUIStatus(item.id, 'pending');
                return;
            }
            console.warn(`[StatusService] ${url} health check failed:`, error);
            this.updateUIStatus(item.id, 'down');
        }
    }

    private updateUIStatus(id: number, status: 'up' | 'down' | 'pending') {
        dashboardStore.setItemStatus(id, status);
    }
}

export const statusService = new StatusService();
