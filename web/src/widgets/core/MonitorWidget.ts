import { i18n } from '../../services/i18n';
import { fetchMonitorOverview } from '../../services/monitorOverview';
import { dashboardStore } from '../../store/dashboardStore';
import { eventBus, EVENTS } from '../../services/EventBus';
import { adoptSharedStyles } from '../../services/sharedStyles';
import { resolveIconUrl } from '../../services/iconUrl';
import { whenVisible } from '../../services/whenVisible';
import { monitorShell, readItemConfig, type ItemCfg, type WRow } from '../../services/monitorWidget';
import { showsSeeAll } from '../shell/metrics';
import { SHELL_CSS, shellHtml } from '../shell/shell';

interface MonitorConfig {
    /** Item ids to show. Empty means every monitored service. */
    items: number[];
    /** The services in the order they were arranged in. One it does not name comes after. */
    itemOrder: number[];
    /** A name and an icon of this widget's own for a service, by its id. */
    itemConfig: Record<string, ItemCfg>;
    /** Whether the foot leads to the page. */
    showAll: boolean;
    refreshSec: number;
    /** Header text. Empty falls back to the widget's own name. */
    title: string;
}

const DEFAULT_CONFIG: MonitorConfig = { items: [], itemOrder: [], itemConfig: {}, showAll: true, refreshSec: 60, title: '' };

const ids = (v: unknown): number[] => (Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number') : []);

function parseConfig(data: any): MonitorConfig {
    return {
        items: ids(data.items),
        itemOrder: ids(data.itemOrder),
        itemConfig: readItemConfig(data.itemConfig),
        showAll: showsSeeAll(data.showAll),
        refreshSec: Number(data.refreshSec) > 0 ? Number(data.refreshSec) : DEFAULT_CONFIG.refreshSec,
        title: typeof data.title === 'string' ? data.title : '',
    };
}

/**
 * A compact status page: the services being monitored, their uptime over the
 * last 24h and a heartbeat, with the same reading as the full monitor page.
 * A click on one opens the status page at that service, in its side panel.
 *
 * It refreshes on a timer, which is why the overview endpoint was rewritten to
 * summarise in SQL first — it used to read a whole day of history per service
 * on every call.
 */
class MonitorWidget extends HTMLElement {
    private _itemId = 0;
    private _config: MonitorConfig = { ...DEFAULT_CONFIG };
    private rows: WRow[] = [];
    private loaded = false;
    private failed = false;
    private timer: ReturnType<typeof setInterval> | null = null;
    /** Last list markup written, so an unchanged refresh writes nothing. */
    private _lastBody: string | null = null;
    private _unsubscribe: (() => void) | null = null;
    private _unsubscribeI18n: (() => void) | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
    }

    static get observedAttributes() { return ['item-id']; }

    attributeChangedCallback(name: string, _old: string, val: string) {
        if (name === 'item-id') this._itemId = parseInt(val);
    }

    connectedCallback() {
        this.readConfig();
        this.render();
        this.load();
        this.restartTimer();

        this.shadowRoot!.addEventListener('click', this.onClick);

        this._unsubscribe = dashboardStore.subscribe((state) => {
            if (!this._itemId) return;
            const item = state.items.find(i => i.id === this._itemId);
            if (!item?.content) return;
            try {
                const data = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
                if (data.widgetId !== 'monitor') return;

                const next = parseConfig(data);
                const intervalChanged = next.refreshSec !== this._config.refreshSec;
                const changed = JSON.stringify(next) !== JSON.stringify(this._config);
                this._config = next;

                // Stats tick every second through this same store; repainting on every one of them would fight
                // the heartbeat, so only a change of this widget's own settings repaints.
                if (changed) this.refreshBody();
                if (intervalChanged) this.restartTimer();
            } catch { /* keep the current config */ }
        });

        this._unsubscribeI18n = i18n.subscribe(() => this.render());
    }

    disconnectedCallback() {
        this.shadowRoot?.removeEventListener('click', this.onClick);
        if (this.timer) clearInterval(this.timer);
        if (this._unsubscribe) this._unsubscribe();
        if (this._unsubscribeI18n) this._unsubscribeI18n();
    }

    private readConfig() {
        const item = dashboardStore.getState().items.find(i => i.id === this._itemId);
        if (!item?.content) return;
        try {
            const data = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
            this._config = parseConfig(data);
        } catch { /* defaults */ }
    }

    private restartTimer() {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(whenVisible(() => this.load()), this._config.refreshSec * 1000);
    }

    // ── Data ──

    private async load() {
        try {
            this.rows = await fetchMonitorOverview<WRow>();
            this.failed = false;
        } catch {
            this.failed = true;
        }
        this.loaded = true;
        this.refreshBody();
    }

    // ── Events ──

    private onClick = (e: Event) => {
        const target = e.target as HTMLElement;
        // Both open the status page here, at the services: a full load would throw away the board the person is on.
        if (target.closest('[data-act="all"]')) {
            eventBus.emit(EVENTS.SHOW_MONITOR_OVERVIEW, { tab: 'services' });
            return;
        }
        const row = target.closest('[data-sel]') as HTMLElement | null;
        if (row) eventBus.emit(EVENTS.SHOW_MONITOR_OVERVIEW, { tab: 'services', sel: row.dataset.sel });
    };

    // ── Render ──

    private body(): string {
        const t = (key: string) => i18n.t(key);
        const state = !this.loaded ? t('general.loading') : this.failed ? t('general.error') : undefined;
        return shellHtml(monitorShell({
            rows: this.rows,
            items: this._config.items,
            itemOrder: this._config.itemOrder,
            itemConfig: this._config.itemConfig,
            showAll: this._config.showAll,
            resolveIcon: resolveIconUrl,
            t,
            num: n => i18n.formatNumber(n),
            time: iso => i18n.formatDateTime(iso),
            state,
        }));
    }

    render() {
        if (!this.shadowRoot) return;
        // The name, when there is one, is the pill on the tile's border: the body is all there is.
        this.shadowRoot.innerHTML = `<style>${SHELL_CSS}</style><div class="sh-body" id="mw-body"></div>`;
        this._lastBody = null;
        this.refreshBody();
    }

    /**
     * Repaints the list without rebuilding the widget: the list scrolls, so reassigning the shadow root sent
     * anyone reading past the first few services back to the top on every cycle. Only the list is touched,
     * and only when it differs.
     */
    private refreshBody(): void {
        const body = this.shadowRoot?.getElementById('mw-body');
        if (!body) return;

        const html = this.body();
        if (html === this._lastBody) return;
        this._lastBody = html;

        const scrollTop = body.querySelector('.sh-rows')?.scrollTop ?? 0;
        body.innerHTML = html;
        const rows = body.querySelector('.sh-rows');
        if (rows && scrollTop) rows.scrollTop = scrollTop;
    }
}

if (!customElements.get('widget-monitor')) {
    customElements.define('widget-monitor', MonitorWidget);
}
