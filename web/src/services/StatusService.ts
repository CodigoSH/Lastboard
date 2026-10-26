import { dashboardStore } from '../store/dashboardStore';
import { dashboardService } from './dashboardService';
import { accessAllows, isForbidden } from './access';
import { userStore } from '../store/userStore';
import { OneAtATime, planStatusCheck, type Scope } from './statusPlan';

/**
 * StatusService
 * Periodically checks the health of bookmarks that have "Monitor Status" enabled,
 * painting their live status dots while the tab is open. This is independent of
 * the global 24/7 monitoring toggle: the dots always work per-bookmark, and 24/7
 * mode only adds backend history recording on top.
 */

const WAKE_DELAY_MS = 5000; // Time to wait after tab becomes visible before re-checking

class StatusService {
    private lastDashboardId: number | null = null;
    private unsubscribe: (() => void) | null = null;
    private interval: number | null = null;
    private wakeTimer: number | null = null;
    private checkFrequency = 60000 * 5; // Every 5 minutes
    private gate = new OneAtATime(scope => this.run(scope));

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
                // The board changed, not the world: ask only about what has no answer yet.
                this.checkAll('unknown');
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

    /** Asks for a check; one runs at a time, and requests made meanwhile run once after it. */
    checkAll(scope: Scope = 'all'): Promise<void> {
        return this.gate.request(scope);
    }

    private async run(scope: Scope): Promise<void> {
        if (!navigator.onLine) return;
        // The dots are an account permission; without it there is nothing to ask.
        if (!accessAllows(userStore.getUser(), 'watch_status')) return;

        const plan = planStatusCheck(dashboardStore.getState().items, scope);

        // Only dots with nothing to show yet turn yellow; a known one keeps its colour
        // until the new answer replaces it.
        if (plan.pending.length) {
            dashboardStore.setItemStatuses(plan.pending.map(id => ({ id, status: 'pending' as const })));
        }
        if (plan.invalid.length) {
            dashboardStore.setItemStatuses(plan.invalid.map(id => ({ id, status: 'down' as const })));
        }

        // Groups are asked together, so a dead host holds back its own group only.
        await Promise.all(plan.chunks.map(async urls => {
            try {
                const results = await dashboardService.checkHealthBatch(urls);
                dashboardStore.setItemStatuses(urls.flatMap(url => {
                    const status = (results[url] === 'up' ? 'up' : 'down') as 'up' | 'down';
                    return (plan.byUrl.get(url) ?? []).map(id => ({ id, status }));
                }));
            } catch (error) {
                // No network is not "down": leave what was known.
                if (!navigator.onLine || error instanceof TypeError || isForbidden(error)) return;
                dashboardStore.setItemStatuses(urls.flatMap(url =>
                    (plan.byUrl.get(url) ?? []).map(id => ({ id, status: 'down' as const }))));
            }
        }));
    }
}

export const statusService = new StatusService();
