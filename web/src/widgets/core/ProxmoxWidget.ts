import { i18n } from '../../services/i18n';
import { dashboardStore } from '../../store/dashboardStore';
import { adoptSharedStyles } from '../../services/sharedStyles';
import { loadProxmoxLinks, linkFor } from '../../services/proxmoxLinks';
import { loadProxmox, iconKey, type PxHost } from '../../services/proxmoxApi';
import { resolveIconUrl } from '../../services/iconUrl';
import { whenVisible } from '../../services/whenVisible';
import { type GuestSettings } from '../../services/proxmoxGuests';
import { proxmoxShell, type WGuest } from '../../services/proxmoxWidget';
import { eventBus, EVENTS } from '../../services/EventBus';
import { readMetrics, showsSeeAll, type MetricFlags } from '../shell/metrics';
import { SHELL_CSS, shellHtml } from '../shell/shell';

/** A machine, plus which hypervisor it is on: the tile mixes them all. */
type PxGuestOn = WGuest;

interface PxOverview {
    nodes: PxHost['nodes'];
    guests: PxGuestOn[];
    /** Icons the operator chose on the page, keyed "host|node|vmid". */
    icons: Record<string, string>;
}

/**
 * Every connected hypervisor folded into the one list a tile can show.
 *
 * A widget that showed only the first would go quiet about the machine that
 * actually went down, which is the one thing it is on the board to say.
 */
function mergeHosts(hosts: PxHost[]): PxOverview {
    const out: PxOverview = { nodes: [], guests: [], icons: {} };
    for (const h of hosts) {
        if (h.error) continue;
        out.nodes.push(...(h.nodes || []));
        for (const g of h.guests || []) out.guests.push({ ...g, host: h.id });
        Object.assign(out.icons, h.icons || {});
    }
    return out;
}

interface ProxmoxConfig {
    refreshSec: number;
    title: string;
    /** Show the line of totals (of the node under most pressure) under the tile's name. */
    showNode: boolean;
    /** Which of CPU, memory and disk are shown, in the totals and in every row. */
    metrics: MetricFlags;
    /** Whether the foot leads to the page. */
    showAll: boolean;
    /** Which machines are on the tile, in what order, under what name. */
    guests: GuestSettings;
}

const DEFAULT_CONFIG: ProxmoxConfig = {
    refreshSec: 30, title: '', showNode: true, metrics: { cpu: true, mem: true, disk: true }, showAll: true, guests: {},
};

/**
 * The hypervisor underneath, on the board beside the things it runs.
 *
 * What it adds over the Docker widget — and the reason it exists — is the line
 * of node health under the name. Docker can say a container stopped; only this
 * can say the machine it lived on is at 90% memory.
 *
 * Reading only: starting and stopping a machine is done on the page, which a click on
 * a row opens with that machine in its panel.
 */
class ProxmoxWidget extends HTMLElement {
    private _itemId = 0;
    private _config: ProxmoxConfig = { ...DEFAULT_CONFIG };
    private data: PxOverview | null = null;
    private loaded = false;
    private error = '';
    private timer: ReturnType<typeof setInterval> | null = null;
    /** Last body markup written, so an unchanged refresh writes nothing. */
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

        // Delegated on the shadow root, which outlives every repaint: rows are
        // rewritten on each refresh and a listener bound to one would go inert.
        this.shadowRoot!.addEventListener('click', this.onClick);

        this._unsubscribe = dashboardStore.subscribe((state) => {
            if (!this._itemId) return;
            const item = state.items.find(i => i.id === this._itemId);
            if (!item?.content) return;
            try {
                const data = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
                if (data.widgetId !== 'proxmox') return;
                const next = this.parseConfig(data);
                const intervalChanged = next.refreshSec !== this._config.refreshSec;
                const changed = JSON.stringify(next) !== JSON.stringify(this._config);
                this._config = next;
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

    private parseConfig(data: any): ProxmoxConfig {
        return {
            refreshSec: Number(data.refreshSec) > 0 ? Number(data.refreshSec) : DEFAULT_CONFIG.refreshSec,
            title: typeof data.title === 'string' ? data.title : '',
            showNode: data.showNode !== false,
            metrics: readMetrics(data.metrics, ['cpu', 'mem', 'disk']),
            showAll: showsSeeAll(data.showAll),
            guests: {
                guestConfig: data.guestConfig && typeof data.guestConfig === 'object' ? data.guestConfig : undefined,
                guestOrder: data.guestOrder && typeof data.guestOrder === 'object' ? data.guestOrder : undefined,
                showNew: data.showNew === false ? false : undefined,
            },
        };
    }

    private readConfig() {
        const item = dashboardStore.getState().items.find(i => i.id === this._itemId);
        if (!item?.content) return;
        try {
            const data = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
            this._config = this.parseConfig(data);
        } catch { /* defaults */ }
    }

    private restartTimer() {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(whenVisible(() => this.load()), this._config.refreshSec * 1000);
    }

    // ── Data ──

    private async load() {
        // Which machine backs which bookmark, from every board: see
        // proxmoxLinks. It arrives on its own and repaints when it does.
        loadProxmoxLinks().then(() => { if (this.isConnected) this.refreshBody(); }).catch(() => { });
        try {
            // Every connected hypervisor, folded into one tile.
            this.data = mergeHosts(await loadProxmox());
            this.error = '';
        } catch (e: any) {
            // The server answers in translation keys; anything else is shown as
            // a generic failure rather than raw English.
            const key = typeof e?.message === 'string' ? e.message.trim() : '';
            this.error = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(key) ? key : 'proxmox.connection_error';
        }
        this.loaded = true;
        this.refreshBody();
    }

    private onClick = (e: Event) => {
        const target = e.target as HTMLElement;
        // "See all" opens the page here, at the machines: a full load would throw away the board the person is standing on.
        if (target.closest('[data-act="all"]')) {
            eventBus.emit(EVENTS.SHOW_PROXMOX_PAGE, { tab: 'machines' });
            return;
        }
        const row = target.closest('[data-sel]') as HTMLElement | null;
        if (row) eventBus.emit(EVENTS.SHOW_PROXMOX_PAGE, { tab: 'machines', sel: row.dataset.sel, panel: true });
    };

    // ── Markup ──

    private body(): string {
        const t = (key: string) => i18n.t(key);
        const state = !this.loaded ? t('general.loading') : this.error ? t(this.error) : undefined;
        const icons = this.data?.icons ?? {};
        return shellHtml(proxmoxShell({
            nodes: this.data?.nodes ?? [],
            guests: this.data?.guests ?? [],
            settings: this._config.guests,
            metrics: this._config.metrics,
            showSummary: this._config.showNode,
            showAll: this._config.showAll,
            // Same order as the page: what the operator chose, then the bookmark's, then the board's fallback.
            faceOf: g => {
                const face = icons[iconKey(g.host, g.node, g.vmid)] || linkFor(g)?.icon || '';
                return face ? resolveIconUrl(face) : '';
            },
            linked: g => !!linkFor(g),
            t,
            num: n => i18n.formatNumber(n, { maximumFractionDigits: 1 }),
            state,
        }));
    }

    render() {
        if (!this.shadowRoot) return;
        // The name, when there is one, is the pill on the tile's border: the body is all there is.
        this.shadowRoot.innerHTML = `<style>${SHELL_CSS}</style><div class="sh-body" id="px-body"></div>`;
        this._lastBody = null;
        this.refreshBody();
    }

    /**
     * Repaints the body without rebuilding the widget: a timer that reassigns the shadow root reparses the
     * stylesheet, closes anything open under the pointer and sends a scrolled list back to the top. Only
     * the body is touched, and only when it differs.
     */
    private refreshBody(): void {
        const body = this.shadowRoot?.getElementById('px-body');
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

if (!customElements.get('widget-proxmox')) {
    customElements.define('widget-proxmox', ProxmoxWidget);
}
