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
import { loadProxmox, chosenIcon as machineIcon } from '../../../services/proxmoxApi';
import { loadProxmoxLinks, linkFor as machineLink, bookmarkNamed, clearProxmoxLinks } from '../../../services/proxmoxLinks';
import { fetchAddresses, fetchProxmoxHosts, type ProxmoxHostRef } from '../../../services/proxmoxAddresses';
import { buildIconIndex } from '../../../services/importIcons';
import { materializeIcon } from '../../../services/iconStore';
import '../Select/Select';
import '../IconSelectionModal/IconSelectionModal';
import type { AppSelect } from '../Select/Select';
import { isOwnIcon, ownIcons } from '../../../services/ownIcons';
import { resolveIconUrl } from '../../../services/iconUrl';
import { retryOnRateLimit } from '../../../services/retryOnRateLimit';
import { bookmarkContent } from '../../../services/bookmarkContent';
import { probeAddresses } from '../../../services/probeAddresses';
import { dismissKey, dismissalChanges, fetchDismissed, saveDismissals } from '../../../services/dismissedServices';
import {
    candidateUrl, discoverDocker, discoverProxmox, pickIconName, planServices,
    type Discovery, type GroupBy, type NewService, type ServiceProposal,
} from '../../../services/discoverServices';
import { createDetected, undoCreated, type CreateLog, type NewBookmark } from '../../../services/createDetected';
import type { BoardItem, SectionToPlace } from '../../../services/placeServices';
import { safeImageSrc } from '../../../services/escape';
import { countHtml, detectHtml, healthText, type RowView, type Source, type WindowView } from './DetectServicesModal.template';
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
    /** An earlier window left it out on purpose, so it starts unticked. */
    dismissed: boolean;
    /** It was proposed ticked. */
    proposedTicked: boolean;
    /** What the person chose in the icon search for this row, as the picker returned it; '' when they did not. */
    pickedIcon: string;
    /** Which of its addresses the menu has chosen. */
    choice: number;
}

const t = (key: string, params?: Record<string, string>) => i18n.t(key, params);

/**
 * "Detect services": lists what a host's containers, or a hypervisor's machines,
 * could become on the board, and creates the ones the person ticks. Opened with `open()`.
 */
class DetectServicesModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private view: WindowView = this.blankView();
    private source: Source = 'docker';
    private dockerHosts: DockerHost[] = [];
    private pxHosts: ProxmoxHostRef[] = [];
    private host: { id: string; name: string } | undefined;
    private rows = new Map<string, RowState>();
    private iconIndex = new Map<string, string>();
    private lastRun: CreateLog | null = null;
    private loadToken = 0;
    /** Which of the addresses proposed answered, by address: what was asked, not what is now in a box. */
    private health = new Map<string, 'up' | 'down'>();

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
    }

    private blankView(): WindowView {
        return {
            source: 'docker', state: 'loading', hostName: '', hosts: [], hostId: '', address: '', groupBy: 'host', rows: [], withoutAddress: 0,
            boards: [], boardId: null, canPickBoard: false, selected: 0, result: null, busy: false, error: '',
        };
    }

    /**
     * Shows the window for one host, or the first one the account has. `quiet`
     * is for when nobody asked: it appears only if there is something to offer.
     */
    async open(opts: { source?: Source; hostId?: string; quiet?: boolean } = {}): Promise<void> {
        if (!accessAllows(userStore.getUser(), 'board_edit')) return;
        this.source = opts.source ?? 'docker';
        this.view = this.blankView();
        this.view.source = this.source;
        this.lastRun = null;
        this.paint();
        if (!opts.quiet) this.dialog?.showModal();

        const state = dashboardStore.getState();
        const user = userStore.getUser();
        this.view.boards = (state.dashboards || []).map(d => ({ id: d.id, name: d.name }));
        this.view.boardId = state.currentDashboardId;
        this.view.canPickBoard = accessAllows(user, 'board_multiple');

        try {
            if (this.source === 'docker') {
                this.dockerHosts = hostsForWidget((await fetchDockerSettings(true)).hosts);
                this.view.hosts = this.dockerHosts.map(h => ({ id: h.id, name: h.name }));
            } else {
                this.pxHosts = await fetchProxmoxHosts();
                this.view.hosts = this.pxHosts.map(h => ({ id: h.id, name: h.name }));
            }
        } catch {
            this.view.hosts = [];
        }
        if (this.view.hosts.length === 0) {
            this.view.state = 'nohost';
            this.paint();
            return;
        }
        const first = this.view.hosts.find(h => h.id === opts.hostId) ?? this.view.hosts[0];
        await this.loadHost(first.id, null);
        if (opts.quiet && this.view.state === 'ready' && !this.dialog?.open) this.dialog?.showModal();
    }

    private async loadHost(hostId: string, result: WindowView['result']): Promise<void> {
        const token = ++this.loadToken;
        const ref = this.view.hosts.find(h => h.id === hostId);
        if (!ref) return;
        this.host = ref;
        this.view.hostId = ref.id;
        this.view.hostName = ref.name;
        this.view.state = 'loading';
        this.view.error = '';
        this.view.result = result;
        this.paint();

        try {
            const found = this.source === 'docker' ? await this.readDocker(hostId) : await this.readProxmox(hostId);
            if (token !== this.loadToken) return;
            if (found) { this.health = new Map(); this.adopt(found, await fetchDismissed()); }
            if (token !== this.loadToken) return;
        } catch (err) {
            if (token !== this.loadToken) return;
            this.rows = new Map();
            this.view.state = 'empty';
            this.view.error = this.source === 'docker' ? t(hostErrorKey(err)) : t('proxmox.connection_error');
        }
        this.paint();
        if (this.rows.size > 0) this.probeRows(token);
    }

    /** The icon library, when the account may look icons up: it names the icons that are proposed. */
    private async loadIconIndex(): Promise<void> {
        // Without the permission only our own marks are known: they are served from here.
        if (!accessAllows(userStore.getUser(), 'icons_internet')) { this.iconIndex = buildIconIndex(ownIcons()); return; }
        try {
            const { iconService } = await import('../../../services/iconService');
            await iconService.loadIcons();
            this.iconIndex = buildIconIndex(iconService.allIcons());
        } catch { /* no library, no suggestions: the default icon is used */ }
    }

    private async readDocker(hostId: string): Promise<Discovery | null> {
        const host = this.dockerHosts.find(h => h.id === hostId);
        if (!host) return null;
        const [settings, containers, links] = await Promise.all([
            fetchDockerSettings(),
            fetchContainers(host),
            loadDockerLinks().catch(() => new Map()),
            loadProxmoxLinks().catch(() => null), // the boards' bookmarks, read once for both kinds
        ]);
        await this.loadIconIndex();
        this.view.address = hostAddress(host, location.hostname);
        return discoverDocker(containers, {
            host,
            // A container tied to a bookmark by hand, or else one the bookmark's name says it is:
            // a board made before this page existed is full of them, and a second one is a duplicate.
            linkedLabel: name => links.get(dockerLinkKey(host.id, name))?.label ?? bookmarkNamed(name)?.label ?? '',
            chosenIcon: name => settings.icons?.[`${host.id}/${name}`] ?? '',
        });
    }

    private async readProxmox(hostId: string): Promise<Discovery | null> {
        const ref = this.pxHosts.find(h => h.id === hostId);
        if (!ref) return null;
        const [[px]] = await Promise.all([loadProxmox(hostId), loadProxmoxLinks()]);
        if (!px || px.error) {
            this.rows = new Map();
            this.view.state = 'empty';
            this.view.error = px?.error ? (px.error.startsWith('proxmox.') ? t(px.error) : px.error) : t('proxmox.connection_error');
            return null;
        }
        const running = px.guests.filter(g => g.running).map(g => ({ node: g.node, kind: g.kind, vmid: g.vmid }));
        const [{ addresses, urls }] = await Promise.all([fetchAddresses(hostId, running), this.loadIconIndex()]);
        this.view.address = '';
        return discoverProxmox({
            host: { id: ref.id, name: ref.name },
            consoleBase: ref.url,
            guests: px.guests,
            addresses,
            urls,
            linkedLabel: g => machineLink({ vmid: g.vmid, node: g.node, name: g.name, host: ref.id })?.label ?? '',
            chosenIcon: g => machineIcon(px, g.node, g.vmid),
        });
    }

    /** Makes the proposals the rows of the window. */
    private adopt(found: Discovery, dismissed: Set<string>): void {
        this.view.withoutAddress = found.withoutAddress;
        this.rows = new Map(found.proposals.map(p => {
            const urls = p.candidates.map(c => candidateUrl(c, this.view.address));
            const lib = pickIconName(p.iconNames, this.iconIndex);
            const libUrl = lib ? this.iconIndex.get(lib) ?? this.iconIndex.get(lib.replace(/_/g, '-')) ?? '' : '';
            const left = dismissed.has(dismissKey(p.link));
            return [p.key, {
                proposal: p, checked: p.selected && !left, name: p.name, url: urls[0] ?? '', edited: false,
                iconUrl: p.chosenIcon || p.labelIcon || libUrl, dismissed: left, proposedTicked: p.selected && !left, pickedIcon: '', choice: 0,
            }];
        }));
        this.view.state = this.rows.size === 0 ? 'empty' : 'ready';
    }

    /**
     * Asks, row by row as the answers come, whether each proposed address answers.
     * Only for an account that may check status, and never in the way: the window
     * is already usable, and a row whose address is changed stops showing its answer.
     */
    private probeRows(token: number): void {
        if (!accessAllows(userStore.getUser(), 'watch_status')) return;
        void probeAddresses([...this.rows.values()].map(r => r.url), answers => {
            for (const [u, s] of Object.entries(answers)) this.health.set(u, s);
            this.showHealth();
        }, { alive: () => token === this.loadToken });
    }

    /** Puts each row's answer in place without redrawing the window, so nobody loses what they are typing. */
    private showHealth(): void {
        for (const r of this.shadowRoot?.querySelectorAll<HTMLElement>('.row') ?? []) {
            const state = this.rows.get(r.dataset.key ?? '');
            const box = r.querySelector<HTMLElement>('.row__health');
            if (!state || !box) continue;
            const h = this.health.get(state.url) ?? '';
            box.dataset.h = h;
            box.textContent = healthText(h, t);
            box.title = healthText(h, t);
        }
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
            health: this.health.get(r.url) ?? '',
            dismissed: r.dismissed,
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
        this.wireSelects();
    }

    /** An `app-select` takes its options as a property: they travel in the markup as data and are handed over here. */
    private wireSelects(): void {
        for (const el of this.shadowRoot?.querySelectorAll<AppSelect>('app-select') ?? []) {
            try { el.options = JSON.parse(el.dataset.options ?? '[]'); } catch { el.options = []; }
            el.value = el.getAttribute('value') ?? '';
        }
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
        const count = this.$<HTMLElement>('dt-count');
        if (count) count.innerHTML = countHtml(n, this.rows.size);
    }

    // ── Events ───────────────────────────────────────────────────────────────

    /** The icon search of the product, as the bookmark window and the pages use it. A choice is the row's until the window closes. */
    private async chooseIcon(row: { el: HTMLElement; state: RowState }): Promise<void> {
        let modal = document.querySelector('icon-selection-modal') as (HTMLElement & { open: () => Promise<string | null> }) | null;
        if (!modal) {
            modal = document.createElement('icon-selection-modal') as HTMLElement & { open: () => Promise<string | null> };
            document.body.appendChild(modal);
        }
        const picked = await modal.open();
        if (!picked) return;
        row.state.pickedIcon = picked;
        row.state.iconUrl = resolveIconUrl(picked);
        const face = row.el.querySelector<HTMLElement>('.face');
        if (!face) return;
        face.querySelector('img, .face__letter')?.remove();
        const img = document.createElement('img');
        img.alt = '';
        img.src = safeImageSrc(row.state.iconUrl);
        face.prepend(img);
    }

    private rowOf(target: EventTarget | null): { el: HTMLElement; state: RowState } | null {
        const el = (target as HTMLElement | null)?.closest<HTMLElement>('.row');
        const state = el ? this.rows.get(el.dataset.key ?? '') : undefined;
        return el && state ? { el, state } : null;
    }

    private onClick(e: MouseEvent): void {
        if (this.dialog && isBackdropClick(this.dialog, e)) { this.dialog.close(); return; }
        const face = (e.target as HTMLElement).closest('.face');
        if (face) { const row = this.rowOf(face); if (row) void this.chooseIcon(row); return; }
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
        else if (target.classList.contains('addr')) { row.state.url = target.value; row.state.edited = true; this.showHealth(); }
    }

    private onChange(e: Event): void {
        const target = e.target as HTMLInputElement | AppSelect;
        if (target.id === 'dt-group') { this.view.groupBy = target.value as GroupBy; return; }
        if (target.id === 'dt-board') { this.view.boardId = Number(target.value); return; }
        if (target.id === 'dt-host') { void this.loadHost(target.value, null); return; }
        const row = this.rowOf(target);
        if (!row) return;
        if (target.classList.contains('pick')) {
            row.state.checked = (target as HTMLInputElement).checked;
            this.refreshCount();
        } else if (target.classList.contains('alt')) {
            const urls = row.state.proposal.candidates.map(c => candidateUrl(c, this.view.address));
            row.state.choice = Math.max(0, urls.indexOf(target.value));
            row.state.url = target.value;
            row.state.edited = false;
            const addr = row.el.querySelector<HTMLInputElement>('.addr');
            if (addr) addr.value = target.value;
            this.showHealth();
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
            const alt = r.querySelector<AppSelect>('.alt');
            // The menu keeps the choice by its place in the list, as the addresses behind it change.
            const index = Math.min(state.choice, Math.max(0, urls.length - 1));
            if (alt) {
                alt.dataset.options = JSON.stringify(urls.map(u => ({ value: u, label: u })));
                alt.options = urls.map(u => ({ value: u, label: u }));
                alt.value = urls[index] ?? '';
            }
            if (!state.edited && urls.length) {
                state.url = urls[index] ?? urls[0];
                const addr = r.querySelector<HTMLInputElement>('.addr');
                if (addr) addr.value = state.url;
            }
        });
        this.showHealth();
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
        // A hypervisor's machines go in the hypervisor's section; Compose's projects are Docker's.
        const plan = planServices(services, this.source === 'docker' ? this.view.groupBy : 'host', host.name, gridCols);

        const contents: string[] = [];
        for (let i = 0; i < services.length; i++) {
            const s = services[i];
            const row = picked[i];
            let icon = row.proposal.chosenIcon;
            let iconName: string | null = null;
            // What the person picked in the icon search wins over everything that was proposed.
            if (row.pickedIcon) {
                const url = resolveIconUrl(row.pickedIcon);
                icon = await retryOnRateLimit(() => materializeIcon(url));
                iconName = url;
            }
            if (!icon && row.proposal.labelIcon && withIcons) {
                icon = await retryOnRateLimit(() => materializeIcon(row.proposal.labelIcon));
            }
            if (!icon) {
                const lib = pickIconName(row.proposal.iconNames, this.iconIndex);
                if (lib) {
                    // The address the library the name came from gives it, as the picker would store it.
                    const libUrl = this.iconIndex.get(lib) ?? this.iconIndex.get(lib.replace(/_/g, '-')) ?? resolveIconUrl(lib);
                    // A library's icon is fetched by the server, which takes the permission; our own marks are already here.
                    if (withIcons || isOwnIcon(libUrl)) {
                        iconName = libUrl;
                        icon = await retryOnRateLimit(() => materializeIcon(libUrl));
                    }
                }
            }
            const link = row.proposal.link;
            contents.push(bookmarkContent({
                label: s.name, url: s.url, icon, iconName, statusCheck: check,
                docker: 'docker' in link ? link.docker : null,
                proxmox: 'proxmox' in link ? link.proxmox : null,
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
        this.forgetLinks();
        if (open) await dashboardStore.fetchItems();
        // What was proposed ticked and has been left out is remembered, so it comes back unticked.
        if (result.created > 0) {
            await saveDismissals(dismissalChanges([...this.rows.values()].map(r => ({
                key: dismissKey(r.proposal.link), proposedTicked: r.proposedTicked, dismissed: r.dismissed, checked: r.checked,
            }))));
        }
        this.announce();
        await this.loadHost(host.id, {
            created: result.created, failed: result.failed, notFit: result.notFit,
            undoable: result.log.bookmarkIds.length, undone: null,
        });
    }

    /** The two indexes of what each bookmark serves are rebuilt by whoever reads them next. */
    private forgetLinks(): void {
        clearDockerLinks();
        clearProxmoxLinks();
    }

    /** The pages count what is left to add; they read it again. */
    private announce(): void {
        document.dispatchEvent(new CustomEvent('services-detected'));
    }

    private async undo(): Promise<void> {
        const run = this.lastRun;
        const host = this.host;
        if (!run || !host) return;
        this.lastRun = null;
        const removed = await undoCreated(run);
        this.forgetLinks();
        if (this.view.boardId === dashboardStore.getState().currentDashboardId) await dashboardStore.fetchItems();
        this.announce();
        await this.loadHost(host.id, { created: 0, failed: 0, notFit: 0, undoable: 0, undone: removed });
    }
}

if (!customElements.get('detect-services-modal')) customElements.define('detect-services-modal', DetectServicesModal);
