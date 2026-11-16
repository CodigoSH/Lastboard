import { i18n } from '../../../services/i18n';
import { adoptSharedStyles } from '../../../services/sharedStyles';
import { isBackdropClick } from '../../../services/dialogBackdrop';
import { dashboardStore } from '../../../store/dashboardStore';
import { userStore } from '../../../store/userStore';
import { accessAllows } from '../../../services/access';
import { apiService } from '../../../services/apiService';
import { fetchDockerSettings, hostsForWidget } from '../../../services/dockerHosts';
import { fetchContainers, hostAddress, hostErrorKey, type DockerHost } from '../../../services/dockerShared';
import { loadDockerLinks, clearDockerLinks, dockerLinkKey } from '../../../services/dockerLinks';
import { buildIconIndex } from '../../../services/importIcons';
import { materializeIcon } from '../../../services/iconStore';
import { resolveIconUrl } from '../../../services/iconUrl';
import { retryOnRateLimit } from '../../../services/retryOnRateLimit';
import { bookmarkContent } from '../../../services/bookmarkContent';
import {
    candidateUrl, discoverDocker, pickIconName, planServices, type GroupBy, type NewService, type ServiceProposal,
} from '../../../services/discoverServices';
import { createDetected, undoCreated, type CreateLog, type NewBookmark } from '../../../services/createDetected';
import type { BoardItem, SectionToPlace } from '../../../services/placeServices';
import { detectHtml, type RowView, type WindowView } from './DetectServicesModal.template';
import css from './DetectServicesModal.css' with { type: 'text' };

/** What a row holds while the window is open: what the person typed is kept apart from what was proposed. */
interface RowState {
    proposal: ServiceProposal;
    checked: boolean;
    name: string;
    /** The address in the box. */
    url: string;
    /** True once the person typed in the address box: a new host address no longer rewrites it. */
    edited: boolean;
    iconUrl: string;
}

const t = (key: string, params?: Record<string, string>) => i18n.t(key, params);

/**
 * "Detect services": lists what a Docker host's containers could become on the
 * board, and creates the ones the person ticks. Opened with `open()`.
 */
class DetectServicesModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private view: WindowView = this.blankView();
    private hosts: DockerHost[] = [];
    private host: DockerHost | undefined;
    private rows = new Map<string, RowState>();
    private iconIndex = new Map<string, string>();
    private lastRun: CreateLog | null = null;
    private loadToken = 0;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
    }

    private blankView(): WindowView {
        return {
            state: 'loading', hostName: '', hosts: [], hostId: '', address: '', groupBy: 'host', rows: [], withoutAddress: 0,
            boards: [], boardId: null, canPickBoard: false, selected: 0, result: null, busy: false, error: '',
        };
    }

    /** Shows the window for one host, or the first one the account has. */
    async open(opts: { hostId?: string } = {}): Promise<void> {
        this.view = this.blankView();
        this.lastRun = null;
        this.paint();
        this.dialog?.showModal();

        const state = dashboardStore.getState();
        const user = userStore.getUser();
        this.view.boards = (state.dashboards || []).map(d => ({ id: d.id, name: d.name }));
        this.view.boardId = state.currentDashboardId;
        this.view.canPickBoard = accessAllows(user, 'board_multiple');

        try {
            const settings = await fetchDockerSettings(true);
            this.hosts = hostsForWidget(settings.hosts);
        } catch {
            this.hosts = [];
        }
        this.view.hosts = this.hosts.map(h => ({ id: h.id, name: h.name }));
        if (this.hosts.length === 0) {
            this.view.state = 'nohost';
            this.paint();
            return;
        }
        await this.loadHost(this.hosts.find(h => h.id === opts.hostId) ?? this.hosts[0], null);
    }

    private async loadHost(host: DockerHost, result: WindowView['result']): Promise<void> {
        const token = ++this.loadToken;
        this.host = host;
        this.view.hostId = host.id;
        this.view.hostName = host.name;
        this.view.state = 'loading';
        this.view.error = '';
        this.view.result = result;
        this.paint();

        const user = userStore.getUser();
        try {
            const [settings, containers, links] = await Promise.all([
                fetchDockerSettings(),
                fetchContainers(host),
                loadDockerLinks().catch(() => new Map()),
            ]);
            if (token !== this.loadToken) return;

            if (accessAllows(user, 'icons_internet')) {
                try {
                    const { iconService } = await import('../../../services/iconService');
                    await iconService.loadIcons();
                    this.iconIndex = buildIconIndex(iconService.allIcons());
                } catch { /* no library, no suggestions: the default icon is used */ }
            }

            const found = discoverDocker(containers, {
                host,
                linkedLabel: name => links.get(dockerLinkKey(host.id, name))?.label ?? '',
                chosenIcon: name => settings.icons?.[`${host.id}/${name}`] ?? '',
            });
            this.view.address = hostAddress(host, location.hostname);
            this.view.withoutAddress = found.withoutAddress;
            this.rows = new Map(found.proposals.map(p => {
                const urls = p.candidates.map(c => candidateUrl(c, this.view.address));
                const lib = pickIconName(p.iconNames, this.iconIndex);
                const libUrl = lib ? this.iconIndex.get(lib) ?? this.iconIndex.get(lib.replace(/_/g, '-')) ?? '' : '';
                return [p.key, { proposal: p, checked: p.selected, name: p.name, url: urls[0] ?? '', edited: false, iconUrl: p.chosenIcon || libUrl }];
            }));
            this.view.state = this.rows.size === 0 ? 'empty' : 'ready';
        } catch (err) {
            if (token !== this.loadToken) return;
            this.rows = new Map();
            this.view.state = 'empty';
            this.view.error = t(hostErrorKey(err));
        }
        this.paint();
    }

    // ── Drawing ──────────────────────────────────────────────────────────────

    private rowViews(): RowView[] {
        return [...this.rows.values()].map(r => ({
            key: r.proposal.key,
            checked: r.checked,
            name: r.name,
            url: r.url,
            candidates: r.proposal.candidates.map(c => candidateUrl(c, this.view.address)),
            note: r.proposal.note,
            linkedTo: r.proposal.linkedTo,
            iconUrl: r.iconUrl,
        }));
    }

    private selectedCount(): number {
        let n = 0;
        for (const r of this.rows.values()) if (r.checked) n++;
        return n;
    }

    private paint(): void {
        if (!this.shadowRoot) return;
        this.view.rows = this.rowViews();
        this.view.selected = this.selectedCount();
        if (!this.dialog) {
            this.shadowRoot.innerHTML = `<style>${css}</style><dialog class="dialog-base" id="modal" aria-labelledby="dt-title"><div id="content"></div></dialog>`;
            this.dialog = this.shadowRoot.getElementById('modal') as HTMLDialogElement;
            this.dialog.addEventListener('click', e => this.onClick(e));
            this.dialog.addEventListener('input', e => this.onInput(e));
            this.dialog.addEventListener('change', e => this.onChange(e));
        }
        this.shadowRoot.getElementById('content')!.innerHTML = detectHtml(this.view, t);
    }

    private $<T extends HTMLElement>(id: string): T | null {
        return this.shadowRoot?.getElementById(id) as T | null;
    }

    private message(text: string): void {
        const el = this.$('dt-message');
        if (el) el.textContent = text;
    }

    private refreshCount(): void {
        const btn = this.$<HTMLButtonElement>('dt-create');
        if (!btn) return;
        const n = this.selectedCount();
        btn.textContent = t('detect.create', { count: String(n) });
        btn.disabled = this.view.busy || n === 0;
    }

    // ── Events ───────────────────────────────────────────────────────────────

    private rowOf(target: EventTarget | null): { el: HTMLElement; state: RowState } | null {
        const el = (target as HTMLElement | null)?.closest<HTMLElement>('.row');
        const state = el ? this.rows.get(el.dataset.key ?? '') : undefined;
        return el && state ? { el, state } : null;
    }

    private onClick(e: MouseEvent): void {
        if (this.dialog && isBackdropClick(this.dialog, e)) { this.dialog.close(); return; }
        const id = (e.target as HTMLElement).closest('button')?.id;
        if (id === 'dt-close' || id === 'dt-cancel') this.dialog?.close();
        else if (id === 'dt-all' || id === 'dt-none') this.tickVisible(id === 'dt-all');
        else if (id === 'dt-create') void this.create();
        else if (id === 'dt-undo') void this.undo();
    }

    private onInput(e: Event): void {
        const target = e.target as HTMLInputElement;
        if (target.id === 'dt-search') { this.filter(target.value); return; }
        if (target.id === 'dt-address') { this.view.address = target.value.trim(); this.rewriteAddresses(); return; }
        const row = this.rowOf(target);
        if (!row) return;
        if (target.classList.contains('name')) row.state.name = target.value;
        else if (target.classList.contains('addr')) { row.state.url = target.value; row.state.edited = true; }
    }

    private onChange(e: Event): void {
        const target = e.target as HTMLInputElement | HTMLSelectElement;
        if (target.id === 'dt-group') { this.view.groupBy = target.value as GroupBy; return; }
        if (target.id === 'dt-board') { this.view.boardId = Number(target.value); return; }
        if (target.id === 'dt-host') {
            const host = this.hosts.find(h => h.id === target.value);
            if (host) void this.loadHost(host, null);
            return;
        }
        const row = this.rowOf(target);
        if (!row) return;
        if (target.classList.contains('pick')) {
            row.state.checked = (target as HTMLInputElement).checked;
            this.refreshCount();
        } else if (target.classList.contains('alt')) {
            row.state.url = target.value;
            row.state.edited = false;
            const addr = row.el.querySelector<HTMLInputElement>('.addr');
            if (addr) addr.value = target.value;
        }
    }

    private filter(query: string): void {
        const q = query.trim().toLowerCase();
        this.shadowRoot?.querySelectorAll<HTMLElement>('.row').forEach(r => { r.hidden = !!q && !(r.dataset.search ?? '').includes(q); });
    }

    private tickVisible(on: boolean): void {
        this.shadowRoot?.querySelectorAll<HTMLElement>('.row').forEach(r => {
            if (r.hidden) return;
            const state = this.rows.get(r.dataset.key ?? '');
            const box = r.querySelector<HTMLInputElement>('.pick');
            if (state && box) { state.checked = on; box.checked = on; }
        });
        this.refreshCount();
    }

    /** A new address for the host rewrites the addresses nobody typed. */
    private rewriteAddresses(): void {
        this.shadowRoot?.querySelectorAll<HTMLElement>('.row').forEach(r => {
            const state = this.rows.get(r.dataset.key ?? '');
            if (!state) return;
            const urls = state.proposal.candidates.map(c => candidateUrl(c, this.view.address));
            const alt = r.querySelector<HTMLSelectElement>('.alt');
            if (alt) {
                const chosen = alt.selectedIndex;
                alt.replaceChildren(...urls.map(u => {
                    const o = document.createElement('option');
                    o.value = u;
                    o.textContent = u;
                    return o;
                }));
                alt.selectedIndex = Math.max(0, Math.min(chosen, urls.length - 1));
            }
            if (!state.edited && urls.length) {
                const index = alt ? alt.selectedIndex : 0;
                state.url = urls[index] ?? urls[0];
                const addr = r.querySelector<HTMLInputElement>('.addr');
                if (addr) addr.value = state.url;
            }
        });
    }

    // ── Creating ─────────────────────────────────────────────────────────────

    private async create(): Promise<void> {
        const host = this.host;
        if (!host || this.view.busy) return;
        const picked = [...this.rows.values()].filter(r => r.checked);
        if (picked.length === 0) return;
        if (picked.some(r => !r.url.trim())) { this.message(t('detect.need_url')); return; }

        this.view.busy = true;
        this.refreshCount();
        this.message('');

        const user = userStore.getUser();
        const withIcons = accessAllows(user, 'icons_internet');
        const check = accessAllows(user, 'watch_status');
        const services: NewService[] = picked.map(r => ({
            proposal: r.proposal,
            name: r.name.trim() || r.proposal.name,
            url: /^https?:\/\//i.test(r.url.trim()) ? r.url.trim() : `http://${r.url.trim()}`,
        }));

        const state = dashboardStore.getState();
        const gridCols = state.gridColumns || 12;
        const plan = planServices(services, this.view.groupBy, host.name, gridCols);

        const contents: string[] = [];
        for (let i = 0; i < services.length; i++) {
            const s = services[i];
            const row = picked[i];
            let icon = row.proposal.chosenIcon;
            let iconName: string | null = null;
            if (!icon && withIcons) {
                const lib = pickIconName(row.proposal.iconNames, this.iconIndex);
                if (lib) {
                    iconName = lib;
                    icon = await retryOnRateLimit(() => materializeIcon(resolveIconUrl(lib)));
                }
            }
            contents.push(bookmarkContent({
                label: s.name, url: s.url, icon, iconName, statusCheck: check,
                docker: { host: host.id, name: row.proposal.containerName },
            }));
        }
        const sections: SectionToPlace<NewBookmark>[] = plan.sections.map(sec => ({
            title: sec.title, w: sec.w, h: sec.h,
            items: sec.items.map(it => ({ content: contents[it.ref], x: it.x, y: it.y })),
        }));

        const boardId = this.view.boardId ?? state.currentDashboardId;
        if (boardId == null) { this.view.busy = false; this.refreshCount(); return; }
        const open = boardId === state.currentDashboardId;
        let board: BoardItem[] = [];
        try {
            board = open
                ? (state.items as unknown as BoardItem[])
                : await apiService.get<BoardItem[]>(`/api/dashboard?dashboard_id=${boardId}`);
        } catch { /* the board could not be read: the new section goes where the corner is free */ }

        const result = await createDetected({ boardId, gridCols, sections, board: Array.isArray(board) ? board : [] });
        this.lastRun = result.log;
        this.view.busy = false;
        clearDockerLinks();
        if (open) await dashboardStore.fetchItems();
        await this.loadHost(host, {
            created: result.created, failed: result.failed, notFit: result.notFit,
            undoable: result.log.bookmarkIds.length, undone: null,
        });
    }

    private async undo(): Promise<void> {
        const run = this.lastRun;
        const host = this.host;
        if (!run || !host) return;
        this.lastRun = null;
        const removed = await undoCreated(run);
        clearDockerLinks();
        if (this.view.boardId === dashboardStore.getState().currentDashboardId) await dashboardStore.fetchItems();
        await this.loadHost(host, { created: 0, failed: 0, notFit: 0, undoable: 0, undone: removed });
    }
}

if (!customElements.get('detect-services-modal')) customElements.define('detect-services-modal', DetectServicesModal);
