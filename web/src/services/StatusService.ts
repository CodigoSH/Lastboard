import { dashboardStore } from '../store/dashboardStore';
import { dashboardService } from './dashboardService';
import { i18n } from './i18n';

/**
 * StatusService
 * Periodically checks the health of bookmarks that have "Monitor Status" enabled.
 */
class StatusService {
    private lastDashboardId: number | null = null;
    private lastItemsCount: number = 0;
    private unsubscribe: (() => void) | null = null;
    private interval: number | null = null;
    private checkFrequency = 60000 * 5; // Every 5 minutes

    start() {
        if (this.interval) return;

        // Reactive Intelligence: automatically ping when fresh data loads
        this.unsubscribe = dashboardStore.subscribe((state) => {
            const dashboardChanged = this.lastDashboardId !== state.currentDashboardId;
            const itemsHash = state.items.map(i => i.id).join(',');
            const countChanged = state.items.length !== this.lastItemsCount;
            const loadFinished = !state.loading && state.items.length > 0;

            if (dashboardChanged || (countChanged && loadFinished)) {
                this.lastDashboardId = state.currentDashboardId;
                this.lastItemsCount = state.items.length;
                this.checkAll();
            }
        });

        this.interval = window.setInterval(() => {
            this.checkAll();
        }, this.checkFrequency);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    async checkAll() {
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
    }

    private async checkItem(item: any) {
        let content = item.content;
        if (typeof content === 'string') {
            try { content = JSON.parse(content); } catch (e) { return; }
        }

        const url = content.url;
        if (!url || url === '#' || url.startsWith('javascript:')) return;

        try {
            // ROUTE THROUGH BACKEND PROXY
            const result = await dashboardService.checkHealth(url);

            if (result.status === 'up') {
                this.updateUIStatus(item.id, 'up');
            } else {
                this.updateUIStatus(item.id, 'down');
            }
        } catch (error) {
            console.warn(`[StatusService] ${url} health check failed:`, error);
            this.updateUIStatus(item.id, 'down');
        }
    }

    private updateUIStatus(id: number, status: 'up' | 'down' | 'pending') {
        dashboardStore.setItemStatus(id, status);
    }
}

export const statusService = new StatusService();
