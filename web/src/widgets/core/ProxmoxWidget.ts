import { i18n } from '../../services/i18n';
import { apiService } from '../../services/apiService';
import { dashboardStore } from '../../store/dashboardStore';
import { escapeHtml } from '../../services/escape';
import { adoptSharedStyles } from '../../services/sharedStyles';

/** A node as /api/proxmox/overview reports it. Percentages, not fractions. */
interface PxNode {
    name: string;
    status: string;
    cpu: number;
    mem: number;
    disk: number;
    threads: number;
    cores: number;
    uptime: number;
    guests: number;
}

interface PxGuest {
    vmid: number;
    name: string;
    kind: 'lxc' | 'qemu';
    node: string;
    running: boolean;
    cpu: number;
    mem: number;
    mem_total: number;
}

interface PxOverview {
    cluster: boolean;
    caps: { read: boolean; power: boolean };
    nodes: PxNode[];
    guests: PxGuest[];
}

interface ProxmoxConfig {
    refreshSec: number;
    title: string;
    /** Show the node meters in the header. */
    showNode: boolean;
}

const DEFAULT_CONFIG: ProxmoxConfig = { refreshSec: 30, title: '', showNode: true };

const ICON_SERVER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';
const ICON_STOP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>';
/**
 * The same fallback the board draws for a bookmark with no icon
 * (BookmarkGrid.template.ts). Kept identical on purpose: a machine row and a
 * bookmark tile are the same kind of thing wearing different clothes.
 */
const ICON_FALLBACK = '<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';

/** Rows a tile draws before the footer takes over and says "and the rest". */
const MAX_ROWS = 8;

/**
 * The hypervisor underneath, on the board beside the things it runs.
 *
 * What it adds over the Docker widget — and the reason it exists — is the line
 * of node health in the header. Docker can say a container stopped; only this
 * can say the machine it lived on is at 90% memory.
 *
 * With twenty-nine machines on one node, measured, a widget cannot be a list.
 * It shows what needs attention and the footer counts the rest.
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
    private _busy = new Set<number>();
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
                const titleChanged = next.title !== this._config.title;
                const nodeChanged = next.showNode !== this._config.showNode;
                const intervalChanged = next.refreshSec !== this._config.refreshSec;
                this._config = next;
                if (titleChanged || nodeChanged) this.render();
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
        this.timer = setInterval(() => this.load(), this._config.refreshSec * 1000);
    }

    // ── Data ──

    private async load() {
        try {
            this.data = await apiService.get<PxOverview>('/api/proxmox/overview');
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

    private onClick = async (e: Event) => {
        const btn = (e.target as HTMLElement).closest('[data-power]') as HTMLElement | null;
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        const vmid = Number(btn.dataset.vmid);
        const guest = this.data?.guests.find(g => g.vmid === vmid);
        if (!guest || this._busy.has(vmid)) return;

        const starting = !guest.running;
        const modal = document.querySelector('confirmation-modal') as any;
        if (modal?.confirm) {
            const ok = await modal.confirm(
                `${i18n.t(starting ? 'docker.action_start' : 'docker.action_stop')} ${guest.name}`,
                i18n.t(starting ? 'widget.proxmox.confirm_start' : 'widget.proxmox.confirm_stop'),
            );
            if (!ok) return;
        }

        this._busy.add(vmid);
        this.refreshBody();
        try {
            await apiService.post('/api/proxmox/power', {
                node: guest.node, kind: guest.kind, vmid,
                action: starting ? 'start' : 'shutdown',
            });
        } catch { /* the next poll tells the truth either way */ }
        // Starting a machine takes seconds; the poll after this one is what
        // turns the dot green, so nothing here pretends it already happened.
        this._busy.delete(vmid);
        this.load();
    };

    // ── Markup ──

    private meter(label: string, pct: number) {
        const level = pct >= 90 ? 'bad' : pct >= 60 ? 'warn' : '';
        return `<span class="px-m">
            <span class="px-m-top">${escapeHtml(label)}<b class="${level}">${Math.round(pct)}%</b></span>
            <span class="px-bar"><i class="${level}" style="width:${Math.min(100, Math.max(0, pct))}%"></i></span>
        </span>`;
    }

    private metersHtml(node: PxNode): string {
        return this.meter(i18n.t('widget.telemetry.cpu'), node.cpu)
            + this.meter(i18n.t('widget.telemetry.ram'), node.mem)
            + this.meter(i18n.t('widget.proxmox.disk'), node.disk);
    }

    /** The node the header speaks for: the one under most pressure. */
    private worstNode(): PxNode | null {
        if (!this.data?.nodes.length) return null;
        return [...this.data.nodes].sort(
            (a, b) => Math.max(b.cpu, b.mem, b.disk) - Math.max(a.cpu, a.mem, a.disk),
        )[0];
    }

    private rowHtml(g: PxGuest): string {
        const busy = this._busy.has(g.vmid);
        const power = this.data?.caps.power === true;
        const mem = g.mem_total > 0 ? Math.round((g.mem / g.mem_total) * 100) : 0;

        // The icon slot is the bookmark's icon once a machine is tied to one.
        // Until then it wears the board's own fallback, which is what a
        // bookmark with no icon wears too.
        const action = power
            ? `<button class="px-act" data-power data-vmid="${g.vmid}" ${busy ? 'disabled' : ''}
                    aria-label="${escapeHtml(i18n.t(g.running ? 'docker.action_stop' : 'docker.action_start'))}"
               >${g.running ? ICON_STOP : ICON_PLAY}</button>`
            : '';

        return `<div class="px-row${g.running ? '' : ' px-row--off'}">
            <span class="px-dot px-dot--${g.running ? 'up' : 'off'}"></span>
            <span class="px-ico">${ICON_FALLBACK}</span>
            <span class="px-name">
                <b>${escapeHtml(g.name) || '—'}</b>
                <span>${g.kind === 'lxc' ? 'LXC' : 'VM'} ${g.vmid}</span>
            </span>
            <span class="px-ty px-ty--${g.kind === 'lxc' ? 'lxc' : 'vm'}">${g.kind === 'lxc' ? 'LXC' : 'VM'}</span>
            <span class="px-use">${g.running
                ? `<b>${g.cpu}%</b> · ${mem}%`
                : escapeHtml(i18n.t('docker.state_stopped'))}</span>
            <span class="px-acts">${action}</span>
        </div>`;
    }

    private body(): string {
        if (!this.loaded) return `<div class="px-state">${escapeHtml(i18n.t('general.loading'))}</div>`;
        if (this.error) return `<div class="px-state">${escapeHtml(i18n.t(this.error))}</div>`;

        const guests = this.data?.guests ?? [];
        if (!guests.length) return `<div class="px-state">${escapeHtml(i18n.t('widget.proxmox.empty'))}</div>`;

        // Stopped first, then by id. The page keeps a stable order because its
        // grid is complete; a tile shows only the first few rows, so anything
        // that needs attention has to be among them or it is not shown at all.
        const sorted = [...guests].sort((a, b) => {
            if (a.running !== b.running) return a.running ? 1 : -1;
            return a.vmid - b.vmid;
        });
        const shown = sorted.slice(0, MAX_ROWS);
        const running = guests.filter(g => g.running).length;

        return `<div class="px-rows">${shown.map(g => this.rowHtml(g)).join('')}</div>
            <div class="px-foot">
                <span>${escapeHtml(i18n.t('widget.proxmox.running_label'))}: ${running}/${guests.length}</span>
                <a class="px-more" href="/?view=proxmox">${escapeHtml(i18n.t('widget.proxmox.see_all'))} →</a>
            </div>`;
    }

    render() {
        if (!this.shadowRoot) return;
        const title = this._config.title || i18n.t('widget.proxmox.name');
        const node = this.worstNode();

        // The container is written even with nothing in it yet. render() runs
        // before the first load answers, so making it conditional on having a
        // node meant the meters were never created at all — and refreshBody,
        // which fills them in place, had nothing to find. Measured in the
        // browser: the header said "undefined" and stayed empty forever.
        const health = this._config.showNode
            ? `<div class="px-health">${node ? this.metersHtml(node) : ''}</div>`
            : '';

        const header = `
            <div class="widget-header">
                <div class="widget-header__top">
                    <span class="widget-header__icon">${ICON_SERVER}</span>
                    <span class="widget-header__title">${escapeHtml(title)}</span>
                    <span class="px-node">${node ? escapeHtml(node.name) : ''}</span>
                </div>
                ${health}
            </div>`;

        this.shadowRoot.innerHTML = `<style>${CSS}</style>${header}<div class="px-body" id="px-body"></div>`;
        this._lastBody = null;
        this.refreshBody();
    }

    /**
     * Repaints the list without rebuilding the widget.
     *
     * The Docker and monitor widgets both learned this the same way: a timer
     * that calls render() reassigns the shadow root, which reparses the
     * stylesheet, closes anything open under the pointer and sends a scrolled
     * list back to the top — every few seconds, for as long as the board is
     * open. Only the body is touched, and only when it differs.
     */
    private refreshBody(): void {
        const body = this.shadowRoot?.getElementById('px-body');
        if (!body) return;

        // The header carries live figures too, so it is updated in place rather
        // than rebuilt: replacing it would take the meters' width transition
        // back to zero on every poll.
        const node = this.worstNode();
        if (node) {
            const meters = this.shadowRoot?.querySelector('.px-health');
            if (meters) meters.innerHTML = this.metersHtml(node);
            const label = this.shadowRoot?.querySelector('.px-node');
            if (label && label.textContent !== node.name) label.textContent = node.name;
        }

        const html = this.body();
        if (html === this._lastBody) return;
        this._lastBody = html;

        const scrollTop = body.querySelector('.px-rows')?.scrollTop ?? 0;
        body.innerHTML = html;
        const rows = body.querySelector('.px-rows');
        if (rows && scrollTop) rows.scrollTop = scrollTop;
    }
}

const CSS = `
:host {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    font-family: var(--font-sans);
    color: var(--text-main);
}

/* The node name sits at the end of the header line, where the Docker widget
   puts its host. */
.px-node {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    color: var(--text-dim);
    white-space: nowrap;
}

/* Node health: the line only this widget can draw. */
.px-health { display: flex; gap: 10px; align-items: center; }
.px-m { flex: 1; min-width: 0; }
.px-m-top {
    display: flex; justify-content: space-between;
    font-family: var(--font-mono, monospace);
    font-size: 9.5px; letter-spacing: 0.08em; color: var(--text-dim);
}
.px-m-top b { color: var(--text-main); font-weight: 600; font-variant-numeric: tabular-nums; }
.px-m-top b.warn { color: var(--warning-color); }
.px-m-top b.bad { color: var(--danger-color); }
.px-bar {
    display: block; height: 3px; border-radius: 2px; margin-top: 3px;
    background: rgba(128, 128, 128, 0.18); overflow: hidden;
}
.px-bar i { display: block; height: 100%; border-radius: 2px; background: var(--accent); transition: width 0.3s var(--ease-out, ease); }
.px-bar i.warn { background: var(--warning-color); }
.px-bar i.bad { background: var(--danger-color); }

.px-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.px-state { padding: 16px; font-size: 12px; color: var(--text-dim); text-align: center; }

.px-rows { flex: 1; min-height: 0; overflow-y: auto; }

/* The same grid the Docker widget uses for a container, so a board with both
   does not look assembled from parts. */
.px-row {
    display: grid;
    grid-template-columns: 8px 18px minmax(0, 2fr) 34px minmax(0, 1.1fr) 30px;
    gap: 0 8px;
    align-items: center;
    padding: 7px 10px;
    border-bottom: 1px solid rgba(128, 128, 128, 0.08);
}
.px-row:last-child { border-bottom: none; }

.px-dot { width: 8px; height: 8px; border-radius: 50%; }
.px-dot--up { background: var(--success-color); }
.px-dot--off { background: var(--text-dim); opacity: 0.5; }

.px-ico { display: grid; place-items: center; color: var(--text-dim); }
.px-ico svg { width: 16px; height: 16px; stroke: currentColor; stroke-width: 1.5px; fill: none; }

.px-name { min-width: 0; }
.px-name b { display: block; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.px-name span { display: block; font-family: var(--font-mono, monospace); font-size: 10px; color: var(--text-dim); opacity: 0.75; }

/* Container or full machine, told by the shape and nothing else: the colour is
   the service's and the icon is the bookmark's, so form is the channel left. */
.px-ty {
    font-family: var(--font-mono, monospace);
    font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
    padding: 3px 5px; justify-self: start;
    color: var(--text-dim);
    background: rgba(128, 128, 128, 0.14);
    border: 1px solid var(--card-border, rgba(128, 128, 128, 0.2));
}
.px-ty--lxc { border-radius: 999px; }
.px-ty--vm { border-radius: 3px; }

.px-use {
    font-family: var(--font-mono, monospace);
    font-size: 11px; color: var(--text-dim);
    font-variant-numeric: tabular-nums; text-align: end;
}
.px-use b { color: var(--text-main); font-weight: 500; }
.px-row--off .px-name b { color: var(--text-dim); }

.px-acts { display: flex; justify-content: flex-end; }
.px-act {
    width: 26px; height: 26px; border-radius: 6px;
    border: 1px solid var(--card-border, rgba(128, 128, 128, 0.2));
    background: none; color: var(--text-dim);
    display: grid; place-items: center; cursor: pointer;
    transition: all 0.15s ease;
}
.px-act svg { width: 12px; height: 12px; }
.px-act:hover { color: var(--accent); border-color: rgba(var(--accent-rgb), 0.4); }
.px-act[disabled] { opacity: 0.4; pointer-events: none; }

.px-foot {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid var(--border);
    font-family: var(--font-mono, monospace);
    font-size: 10.5px; color: var(--text-dim);
    flex-shrink: 0;
}
.px-more { margin-inline-start: auto; color: var(--accent); font-weight: 600; text-decoration: none; }
`;

if (!customElements.get('widget-proxmox')) {
    customElements.define('widget-proxmox', ProxmoxWidget);
}
