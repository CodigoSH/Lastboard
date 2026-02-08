import { dashboardStore } from '../store/dashboardStore';
import { dashboardService } from './dashboardService';
import { i18n } from './i18n';

/**
 * StatusService
 * Periodically checks the health of bookmarks that have "Monitor Status" enabled.
 */
class StatusService {
    private interval: number | null = null;
    private checkFrequency = 60000 * 5; // Every 5 minutes

    start() {
        if (this.interval) return;

        // Initial check after a short delay
        setTimeout(() => this.checkAll(), 2000);

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
        items.forEach(item => this.updateUIStatus(item.id, 'pending'));

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
        const grid = document.querySelector('bookmark-grid');
        if (!grid || !grid.shadowRoot) return;

        const card = grid.shadowRoot.querySelector(`.bookmark-grid__card[data-id="${id}"]`);
        if (!card) return;

        const indicator = card.querySelector('.status-indicator');
        if (!indicator) return;

        indicator.classList.remove('status-pending', 'status-up', 'status-down');
        indicator.classList.add(`status-${status}`);

        const title = status === 'up'
            ? i18n.t('status.online')
            : (status === 'down' ? i18n.t('status.unreachable') : i18n.t('status.checking'));
        indicator.setAttribute('title', title);
    }
}

export const statusService = new StatusService();
