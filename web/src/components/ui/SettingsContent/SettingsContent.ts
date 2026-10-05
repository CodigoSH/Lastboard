import { i18n } from '../../../services/i18n';
import { resizeImage } from '../../../services/image';
import { adoptSharedStyles } from '../../../services/sharedStyles';
import { userStore } from '../../../store/userStore';
import { updateStore } from '../../../store/updateStore';
import { userService } from '../../../services/userService';
import { ThemeService, asThemeChoice } from '../../../services/ThemeService';
import { apiService } from '../../../services/apiService';
import { importService } from '../../../services/importService';
import { ImportTooLargeError } from '../../../services/importPlan';
import { accountTemplate, themeTemplate, personalizationTemplate, usersTemplate, advancedTemplate, dataTemplate, monitoringTemplate, proxmoxTemplate, aboutTemplate, updateZoneTemplate, type PxSettingsHost, type PxHostStatus } from './SettingsContent.template';
import { loadProxmox } from '../../../services/proxmoxApi';
import { sameHostUrl } from '../../../services/proxmoxMatch';
import { User, UserPreferences } from '../../../types';
import { setupPasswordToggles } from '../../../services/passwordToggle';
import '../Select/Select';
import '../ColorPicker/ColorPicker';
import '../IconSelectionModal/IconSelectionModal';
import { SECRET_MASK, secretChange } from './secretField';
import { proxmoxPayload } from './proxmoxPayload';
import css from './SettingsContent.css' with { type: 'text' };

class SettingsContent extends HTMLElement {
    private prefs: UserPreferences;
    private users: User[] = [];
    /** Bookmarks of mine whose icon still comes from somewhere else. */
    private pendingIcons = 0;
    /** Bookmarks of mine already served from this instance. */
    private localIcons = 0;
    private storingIcons = false;
    private importFormat = 'auto';
    private monitoring: {
        mode: string; interval_sec: number; alerts_enabled: boolean;
        notify_type: string; notify_url: string; notify_has_token: boolean; fail_threshold: number;
        // Write-only: sent when typed or removed, never received.
        notify_token?: string; clear_notify_token?: boolean;
    } = { mode: 'tab', interval_sec: 300, alerts_enabled: false, notify_type: 'none', notify_url: '', notify_has_token: false, fail_threshold: 1 };
    /**
     * Whether the values above came from the server. The object starts as a
     * guess, and drawing switches from a guess is not a cosmetic problem: the
     * panel showed 24/7 and alerts as OFF for as long as the request took —
     * forever, if it failed — and flipping any switch then saved the guess,
     * which turned monitoring off and wiped the notification provider, URL and
     * token of anyone who touched it before the answer arrived.
     */
    private monitoringLoaded = false;
    private monitoringFailed = false;
    /**
     * Bumped on every save so a slower GET that started earlier cannot land
     * afterwards and paint the state the user just changed.
     */
    private monitoringSeq = 0;

    /**
     * The Proxmox connection. Same reason as monitoring for the `loaded` flag:
     * a form drawn from a guess can be saved back over the real thing. The
     * secret is not part of the state because the server never sends it — an
     * empty box means "keep the stored one".
     */
    private proxmox: { enabled: boolean; hosts: PxSettingsHost[] } = { enabled: false, hosts: [] };
    private proxmoxLoaded = false;
    private proxmoxFailed = false;
    /** What the last save found out, shown under the button. */
    /** What the last verification said, per host id. */
    private proxmoxStatus: Record<string, PxHostStatus> = {};


    static get observedAttributes() {
        return ['section'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
        // Safe initial state while loading
        this.prefs = {
            accent_color: '#e8520e',
            language: 'en',
            widget_min_width: 140,
            beta_updates: false,
            unit_system: 'metric',
            dashboard_background: ''
        };
        // Delegated listeners attached once to the stable shadow root (they
        // survive every render() innerHTML swap). Replaces the inline on* handlers
        // that required CSP 'unsafe-inline'.
        setupPasswordToggles(this.shadowRoot!);
        this.setupDelegation();
    }

    /**
     * Single set of delegated listeners driving every control in the settings
     * panel via data-action / data-change / data-input attributes.
     */
    private setupDelegation() {
        const root = this.shadowRoot!;

        // Keyboard activation for the non-native controls (the avatar / background
        // upload tiles are focusable role="button" divs). matches() (not closest())
        // so a real <button> nested inside — e.g. remove-background — never double-fires.
        root.addEventListener('keydown', (e) => {
            const key = (e as KeyboardEvent).key;
            if (key !== 'Enter' && key !== ' ') return;
            const el = e.target as HTMLElement;
            if (el.matches?.('[role="button"]')) {
                e.preventDefault();
                el.click();
                return;
            }
            // Enter on an auto-saving text field commits it (blur fires 'change').
            if (key === 'Enter' && el instanceof HTMLInputElement && el.dataset.change) {
                el.blur();
            }
        });

        root.addEventListener('click', (e) => {
            const el = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
            if (!el) return;
            switch (el.dataset.action) {
                case 'click-file':
                    (root.getElementById(el.dataset.file!) as HTMLElement | null)?.click();
                    break;
                case 'close-modal':
                    (root.getElementById(el.dataset.modal!) as HTMLDialogElement | null)?.close();
                    break;
                case 'update-username':
                    this.updateUsername((root.getElementById('username-input') as HTMLInputElement).value);
                    break;
                case 'update-password':
                    this.updatePassword();
                    break;
                case 'set-accent':
                    this.savePrefs({ accent_color: el.dataset.color! });
                    break;
                case 'set-theme':
                    this.savePrefs({ theme: el.dataset.theme! });
                    break;
                case 'remove-background':
                    this.removeBackground();
                    break;
                case 'open-logo-picker':
                    this.openLogoPicker();
                    break;
                case 'remove-logo':
                    this.savePrefs({ project_logo: '' }, { notify: true });
                    break;
                case 'open-monitor-overview':
                    import('../../../services/EventBus').then(({ eventBus, EVENTS }) =>
                        eventBus.emit(EVENTS.SHOW_MONITOR_OVERVIEW));
                    break;
                case 'clear-monitor-data':
                    this.clearMonitorData();
                    break;
                case 'localize-icons':
                    this.localizeIcons();
                    break;
                case 'test-notify':
                    this.testNotify();
                    break;
                case 'export-native':
                    importService.exportNative();
                    break;
                case 'open-add-user':
                    this.openAddUserModal();
                    break;
                case 'edit-user':
                    this.openEditUserModal(Number(el.dataset.userId), el.dataset.username || '');
                    break;
                case 'delete-user':
                    this.deleteUser(Number(el.dataset.userId));
                    break;
                case 'create-user':
                    this.createUser();
                    break;
                case 'update-admin-user':
                    this.updateAdminUser();
                    break;
                case 'download-backup':
                    this.downloadBackup();
                    break;
                case 'factory-reset':
                    this.executeFactoryReset();
                    break;
                case 'perform-update':
                    this.openUpdateModal();
                    break;
                case 'check-updates':
                    this.handleManualCheckUpdates();
                    break;
                case 'add-proxmox-host':
                    this.openAddProxmoxHost();
                    break;
                case 'edit-proxmox-host':
                    this.openEditProxmoxHost(Number(el.dataset.index ?? -1));
                    break;
                case 'delete-proxmox-host':
                    this.deleteProxmoxHost(Number(el.dataset.index ?? -1));
                    break;
                case 'save-proxmox-host':
                    this.saveProxmoxHost();
                    break;
            }
        });

        // Select the dots on entering the box, so the first key typed replaces
        // them and Delete empties it: there is no button for either.
        root.addEventListener('focusin', (e) => {
            const t = e.target as HTMLInputElement;
            if (t?.id === 'notify-token' || t?.id === 'proxmox-secret') t.select();
        });

        root.addEventListener('change', (e) => {
            const el = (e.target as HTMLElement).closest('[data-change]') as HTMLElement | null;
            if (!el) return;
            switch (el.dataset.change) {
                case 'avatar':
                    this.handleAvatarChange(e);
                    break;
                case 'background':
                    this.handleBackgroundChange(e);
                    break;
                case 'project-name':
                    // Auto-save on blur/Enter (a text input fires 'change' then).
                    this.savePrefs({ project_name: (el as HTMLInputElement).value.trim() || 'Lastboard' }, { notify: true });
                    break;
                case 'accent-picker':
                    this.savePrefs({ accent_color: (el as unknown as { value: string }).value });
                    break;
                case 'commit-columns':
                    this.commitColumns((el as HTMLInputElement).value);
                    break;
                case 'restore-backup': {
                    const file = (el as HTMLInputElement).files?.[0];
                    if (file) this.restoreBackup(file);
                    break;
                }
                case 'beta-toggle':
                    this.handleBetaToggle((el as HTMLInputElement).checked);
                    break;
                case 'import-file':
                    this.handleImport(e);
                    break;
                case 'monitoring-toggle':
                    this.saveMonitoring({ mode: (el as HTMLInputElement).checked ? 'background' : 'off' });
                    break;
                case 'alerts-toggle':
                    this.saveMonitoring({ alerts_enabled: (el as HTMLInputElement).checked });
                    break;
                case 'notify-url':
                    this.saveMonitoring({ notify_url: (el as HTMLInputElement).value.trim() });
                    break;
                case 'notify-token': {
                    // The box shows dots when one is saved: what happened to them decides.
                    const change = secretChange((el as HTMLInputElement).value, this.monitoring.notify_has_token);
                    if (change.action === 'set') this.saveMonitoring({ notify_token: change.token });
                    else if (change.action === 'clear') this.saveMonitoring({ clear_notify_token: true });
                    else this.render();   // untouched, or half-erased dots: draw them whole again
                    break;
                }
            }
        });

        root.addEventListener('input', (e) => {
            const el = (e.target as HTMLElement).closest('[data-input]') as HTMLElement | null;
            if (el && el.dataset.input === 'update-columns') {
                this.updateColumns((el as HTMLInputElement).value);
            }
        });
    }

    private unsubscribe: (() => void) | null = null;
    private _renderPending = false;

    connectedCallback() {
        this.unsubscribe = userStore.subscribe(user => {
            if (user && user.preferences) {
                this.prefs = {
                    ...user.preferences,
                    project_name: user.project_name || user.preferences.project_name || 'Lastboard',
                    project_logo: user.project_logo || user.preferences.project_logo || ''
                };
                this.render();
            }
        });

        // Trigger fetch which performs the actual state sync
        this.fetchPrefs();
        const section = this.getAttribute('section');
        if (section === 'users') {
            this.fetchUsers();
        }
        if (section === 'monitoring' || section === 'notifications') {
            this.fetchMonitoring();
        }
        if (section === 'proxmox') {
            this.fetchProxmox();
        }
        if (section === 'data') {
            this.fetchPendingIcons();
        }
        if (section === 'about') {
            // No longer checking automatically here. Using background + manual button.
        }
        this.render();
    }

    disconnectedCallback() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    async fetchPrefs() {
        const u = userStore.getUser();
        if (u && u.preferences) {
            this.prefs = {
                ...u.preferences,
                project_name: u.project_name || u.preferences.project_name || 'Lastboard',
                project_logo: u.project_logo || u.preferences.project_logo || ''
            };
            this.render();
        }
    }

    async fetchUsers() {
        try {
            this.users = await userService.getUsers();
            this.render();
        } catch (e) {
            console.error("Failed to fetch users", e);
        }
    }

    async handleImport(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = ''; // allow re-importing the same file
        if (!file) return;
        try {
            const cfg = await importService.parseFile(file, this.importFormat);
            const count = importService.countItems(cfg);
            if (!count) {
                if (window.notifier) window.notifier.show(i18n.t('settings.import_empty'), 'error');
                return;
            }
            const { eventBus, EVENTS } = await import('../../../services/EventBus');
            // Said before anything is created: a file that listed fifty services
            // and imported forty should not leave the person counting.
            const skipped = cfg.skipped ?? 0;
            const message = i18n.t('settings.import_confirm', { count: String(count) })
                + (skipped > 0 ? ' ' + i18n.t('settings.import_skipped', { count: String(skipped) }) : '');
            eventBus.emit(EVENTS.SHOW_CONFIRMATION, {
                title: i18n.t('settings.import_dashboards'),
                message,
                onConfirm: async () => {
                    try {
                        const gridCols = userStore.getUser()?.preferences?.grid_columns || 12;
                        await importService.materialize(cfg, gridCols, i18n.t('settings.import_ungrouped'));
                        if (window.notifier) window.notifier.show(i18n.t('settings.import_ok'));
                    } catch (err) {
                        // Say why when it is something the person can act on.
                        const why = err instanceof ImportTooLargeError ? 'settings.import_too_large'
                            : (err as Error)?.message === 'error.item_limit_reached' ? 'error.item_limit_reached'
                            : 'settings.import_fail';
                        if (window.notifier) window.notifier.show(i18n.t(why), 'error');
                    }
                },
            });
        } catch {
            if (window.notifier) window.notifier.show(i18n.t('settings.import_fail'), 'error');
        }
    }

    async clearMonitorData() {
        const { eventBus, EVENTS } = await import('../../../services/EventBus');
        eventBus.emit(EVENTS.SHOW_CONFIRMATION, {
            title: i18n.t('monitor.clear_all'),
            message: i18n.t('monitor.clear_all_confirm'),
            onConfirm: async () => {
                try {
                    await apiService.delete('/api/monitor/history');
                    if (window.notifier) window.notifier.show(i18n.t('monitor.data_cleared'));
                } catch {
                    if (window.notifier) window.notifier.show(i18n.t('settings.save_error'), 'error');
                }
            },
        });
    }

    /**
     * Reads how many of my bookmarks still fetch their icon from elsewhere.
     *
     * A failure here is silent on purpose: this only decides whether an
     * optional card is drawn, and an error toast about it would be noise on a
     * settings screen the user opened to do something else.
     */
    async fetchPendingIcons() {
        try {
            const r = await apiService.get<{ pending: number; local: number }>('/api/icons/pending');
            const before = `${this.pendingIcons}/${this.localIcons}`;
            this.pendingIcons = r?.pending ?? 0;
            this.localIcons = r?.local ?? 0;
            if (before !== `${this.pendingIcons}/${this.localIcons}`) this.render();
        } catch {
            this.pendingIcons = 0;
        }
    }

    /**
     * Brings the remaining icons in, on demand.
     *
     * The server does this by itself when it starts, so pressing this means
     * that pass could not finish — no connection at the time, or a provider
     * that was down. It calls the same routine, and reports what is left
     * rather than claiming success it can't verify.
     */
    async localizeIcons() {
        if (this.storingIcons) return;
        this.storingIcons = true;
        this.render();

        try {
            const r = await apiService.post<{ stored: number; failed: number; pending: number; local: number }>(
                '/api/icons/localize', {},
            );
            this.pendingIcons = r?.pending ?? 0;
            this.localIcons = r?.local ?? this.localIcons;

            if (window.notifier) {
                if (r?.failed) {
                    window.notifier.show(
                        i18n.t('settings.icons_stored_partial', {
                            stored: String(r.stored),
                            failed: String(r.failed),
                        }),
                        'error',
                    );
                } else {
                    window.notifier.show(
                        i18n.t('settings.icons_stored', { count: String(r?.stored ?? 0) }),
                    );
                }
            }
        } catch {
            if (window.notifier) window.notifier.show(i18n.t('settings.save_error'), 'error');
        } finally {
            this.storingIcons = false;
            this.render();
        }
    }

    async fetchMonitoring() {
        const seq = this.monitoringSeq;
        this.monitoringFailed = false;
        try {
            const loaded = await apiService.get<typeof this.monitoring>('/api/monitor/settings');
            // A save happened while this was in flight: its response is newer
            // than ours, so drop what we fetched instead of undoing it.
            if (seq !== this.monitoringSeq) return;
            this.monitoring = loaded;
            this.monitoringLoaded = true;
            this.render();
        } catch (e) {
            console.error("Failed to fetch monitoring settings", e);
            if (seq !== this.monitoringSeq) return;
            this.monitoringFailed = true;
            this.render();
        }
    }

    // Global (system-wide) setting, so it goes through the monitor endpoint
    // rather than savePrefs. Re-renders to toggle dependent rows.
    async saveMonitoring(patch: Partial<typeof this.monitoring>) {
        // Never build a save on top of the placeholder: without the server's
        // values every field we did not touch would be sent as its default.
        if (!this.monitoringLoaded) return;
        const next = { ...this.monitoring, ...patch };
        this.monitoringSeq++;
        try {
            const saved = await apiService.post<typeof this.monitoring>('/api/monitor/settings', next);
            this.monitoring = saved;
            this.render();
            const { eventBus, EVENTS } = await import('../../../services/EventBus');
            eventBus.emit(EVENTS.MONITORING_CHANGED, { mode: saved.mode });
            if (window.notifier) window.notifier.show(i18n.t('settings.saved'));
        } catch {
            if (window.notifier) window.notifier.show(i18n.t('settings.save_error'), 'error');
        }
    }

    async fetchProxmox() {
        this.proxmoxFailed = false;
        try {
            this.proxmox = await apiService.get<typeof this.proxmox>('/api/proxmox/settings');
            this.proxmoxLoaded = true;
        } catch {
            this.proxmoxFailed = true;
        }
        this.render();
        // And then ask the hypervisors themselves. Opening the section used to
        // show every host grey with its address underneath, as though nothing
        // had ever connected, and only editing one turned it green — so the
        // list said least about the state of a connection precisely when
        // somebody had come to look at it.
        if (this.proxmoxLoaded && !this.proxmoxFailed) this.verifyProxmox();
    }

    /** The dialog, empty, for a hypervisor that does not exist yet. */
    openAddProxmoxHost() {
        if (!this.proxmoxLoaded) return;
        this.fillProxmoxModal(-1);
    }

    /** The same dialog, carrying what the row already holds. */
    openEditProxmoxHost(index: number) {
        if (!this.proxmoxLoaded || !this.proxmox.hosts[index]) return;
        this.fillProxmoxModal(index);
    }

    private fillProxmoxModal(index: number) {
        const root = this.shadowRoot!;
        const h = index >= 0 ? this.proxmox.hosts[index] : null;
        const set = (id: string, v: string) => {
            const el = root.getElementById(id) as HTMLInputElement | null;
            if (el) el.value = v;
        };
        const check = (id: string, v: boolean) => {
            const el = root.getElementById(id) as HTMLInputElement | null;
            if (el) el.checked = v;
        };
        set('proxmox-edit-index', String(index));
        set('proxmox-name', h?.name || '');
        set('proxmox-url', h?.url || '');
        set('proxmox-token-id', h?.token_id || '');
        // Dots when one is stored: the operator sees that it is there and never
        // what it is. Typing replaces it, emptying the box removes it.
        set('proxmox-secret', h?.has_secret ? SECRET_MASK : '');
        check('proxmox-enabled', h ? h.enabled : true);
        check('proxmox-insecure', h ? h.insecure : true);

        const title = root.getElementById('proxmox-modal-title');
        if (title) title.textContent = i18n.t(h ? 'general.edit' : 'settings.proxmox_add');
        (root.getElementById('proxmox-modal') as HTMLDialogElement | null)?.showModal();
    }

    /** What the dialog was opened for: one hypervisor, added or edited. */
    async saveProxmoxHost() {
        if (!this.proxmoxLoaded) return;
        const root = this.shadowRoot!;
        const val = (id: string) => (root.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';
        const on = (id: string) => !!(root.getElementById(id) as HTMLInputElement | null)?.checked;

        const index = Number(val('proxmox-edit-index'));
        const existing = index >= 0 ? this.proxmox.hosts[index] : undefined;
        const url = val('proxmox-url');
        const tokenId = val('proxmox-token-id');
        const change = secretChange((root.getElementById('proxmox-secret') as HTMLInputElement | null)?.value ?? '', !!existing?.has_secret);
        const hasSecret = change.action === 'set' || (change.action === 'keep' && !!existing?.has_secret);
        const enabled = on('proxmox-enabled');

        // Enabled with nothing behind it would put a page in the top bar with
        // nothing to draw. Left off, an incomplete one is just a draft.
        if (enabled && (!url || !tokenId || !hasSecret)) {
            if (window.notifier) window.notifier.show(i18n.t('settings.proxmox_needs_connection'), 'error');
            return;
        }

        const edited: PxSettingsHost & { secret?: string; clear_secret?: boolean } = {
            id: existing?.id || '',
            name: val('proxmox-name'),
            url, token_id: tokenId,
            insecure: on('proxmox-insecure'),
            enabled,
            has_secret: hasSecret,
            // Only what was typed over the dots travels, and removal has its own mark.
            secret: change.action === 'set' ? change.token : '',
            clear_secret: change.action === 'clear',
        };
        // Two connections to the same address are allowed — a second token with
        // narrower permissions is a real thing to want — but they are almost
        // always a mistake, and the summary adds every hypervisor up, so the
        // same server lands in every total twice. Said once, and it saves.
        if (this.proxmox.hosts.some((h, i) => i !== index && sameHostUrl(h.url || '', url))) {
            if (window.notifier) window.notifier.show(i18n.t('proxmox.duplicate_host'), 'warning');
        }

        const hosts = [...this.proxmox.hosts] as (PxSettingsHost & { secret?: string; clear_secret?: boolean })[];
        if (existing) hosts[index] = edited; else hosts.push(edited);

        if (await this.putProxmoxHosts(hosts)) {
            (root.getElementById('proxmox-modal') as HTMLDialogElement | null)?.close();
            this.verifyProxmox();
        }
    }

    /** Removing one asks first: it takes its machines' icons out of reach. */
    deleteProxmoxHost(index: number) {
        const h = this.proxmox.hosts[index];
        if (!h) return;
        import('../../../services/EventBus').then(({ eventBus, EVENTS }) => {
            eventBus.emit(EVENTS.SHOW_CONFIRMATION, {
                title: i18n.t('action.remove'),
                message: h.name || i18n.t('widget.proxmox.name'),
                onConfirm: async () => {
                    const hosts = this.proxmox.hosts.filter((_, i) => i !== index);
                    if (await this.putProxmoxHosts(hosts)) this.verifyProxmox();
                },
            });
        });
    }

    /**
     * Writes the whole list, because that is what the server takes as the
     * truth: a host missing from it is one that was removed.
     *
     * Every host that is not the one being edited is sent back exactly as it
     * came, with no secret — which the server reads as "keep the one you have".
     */
    private async putProxmoxHosts(hosts: (PxSettingsHost & { secret?: string; clear_secret?: boolean })[]): Promise<boolean> {
        try {
            await apiService.post('/api/proxmox/settings', proxmoxPayload(hosts));
            // Re-read: the server prefixes a bare address with https://, mints
            // the ids, and is the only one that knows a secret is now stored.
            this.proxmox = await apiService.get<typeof this.proxmox>('/api/proxmox/settings');
            this.render();
            const { eventBus: bus, EVENTS: E } = await import('../../../services/EventBus');
            bus.emit(E.PROXMOX_CHANGED, { enabled: this.proxmox.enabled });
            if (window.notifier) window.notifier.show(i18n.t('settings.saved'));
            return true;
        } catch {
            if (window.notifier) window.notifier.show(i18n.t('settings.save_error'), 'error');
            return false;
        }
    }

    /**
     * Asks every hypervisor, with what was just saved, and says what came back.
     *
     * "Saved" is not the answer anyone wants here — a typo in a token saves
     * perfectly. This reads the overview, which is the same call the page
     * makes, so a green line means that host will work and the permissions it
     * names are the token's real ones, straight from /access/permissions.
     */
    async verifyProxmox() {
        const enabled = this.proxmox.hosts.filter(h => h.enabled && h.id);
        if (!enabled.length) { this.proxmoxStatus = {}; this.render(); return; }
        this.proxmoxStatus = Object.fromEntries(enabled.map(h => [h.id, { state: 'testing' } as PxHostStatus]));
        this.render();
        try {
            const hosts = await loadProxmox();
            const byId = new Map(hosts.map(h => [h.id, h]));
            const next: Record<string, PxHostStatus> = {};
            for (const h of enabled) {
                const got = byId.get(h.id);
                // One host failing says nothing about the others, so each row
                // answers for itself.
                next[h.id] = !got || got.error
                    ? { state: 'error', key: 'proxmox.connection_error' }
                    : { state: 'ok', nodes: got.nodes?.length ?? 0, guests: got.guests?.length ?? 0, power: !!got.caps?.power };
            }
            this.proxmoxStatus = next;
        } catch (e) {
            const key = String((e as Error)?.message || '').trim();
            const failure: PxHostStatus = { state: 'error', key: key.startsWith('proxmox.') ? key : 'proxmox.connection_error' };
            this.proxmoxStatus = Object.fromEntries(enabled.map(h => [h.id, failure]));
        }
        this.render();
    }

    async testNotify() {
        try {
            await apiService.post('/api/monitor/test', {
                notify_type: this.monitoring.notify_type,
                notify_url: this.monitoring.notify_url,
                // Only what was typed over the dots; with nothing new the server uses the saved one.
                notify_token: (() => {
                    const raw = (this.shadowRoot?.getElementById('notify-token') as HTMLInputElement | null)?.value ?? '';
                    const c = secretChange(raw, this.monitoring.notify_has_token);
                    return c.action === 'set' ? c.token : '';
                })(),
            });
            if (window.notifier) window.notifier.show(i18n.t('settings.notify_test_ok'));
        } catch {
            if (window.notifier) window.notifier.show(i18n.t('settings.notify_test_fail'), 'error');
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'section' && oldValue !== newValue) {
            if (newValue === 'users') {
                this.fetchUsers();
            }
            if (newValue === 'monitoring' || newValue === 'notifications') {
                this.fetchMonitoring();
            }
            if (newValue === 'proxmox') {
                this.fetchProxmox();
            }
            if (newValue === 'data') {
                this.fetchPendingIcons();
            }
            if (newValue === 'about') {
                this.checkForUpdates();
            }
            this.render();
        }
    }

    // --- Logic Layer Delegates ---

    // notify: show a "Saved"/error toast. Used for auto-saved text fields (e.g.
    // the project name) where the change isn't otherwise visually obvious; the
    // aesthetic prefs (theme/accent/language) stay silent since the UI reacts.
    async savePrefs(newPrefs: Partial<UserPreferences>, opts: { notify?: boolean } = {}) {
        const previousPrefs = { ...this.prefs };

        // Optimistic UI state update
        this.prefs = { ...this.prefs, ...newPrefs };

        if (newPrefs.accent_color) {
            this.applyAccent(newPrefs.accent_color);
        }
        if (newPrefs.language) {
            i18n.setLanguage(newPrefs.language);
        }
        if (newPrefs.theme) {
            ThemeService.apply(asThemeChoice(newPrefs.theme));
        }

        let ok = true;
        try {
            await userStore.updatePreferences(newPrefs);
        } catch {
            // userStore already rolled back aesthetics and reported the failure;
            // restore local state and language here.
            ok = false;
            this.prefs = previousPrefs;
            if (newPrefs.language && previousPrefs.language) {
                i18n.setLanguage(previousPrefs.language);
            }
        }
        this.render();
        if (ok && opts.notify && window.notifier) {
            window.notifier.show(i18n.t('settings.saved'));
        }
    }

    applyAccent(color: string) {
        let hex = color;
        const colorMap: Record<string, string> = {
            'blue': '#228be6', 'indigo': '#4c6ef5', 'cyan': '#15aabf',
            'teal': '#12b886', 'orange': '#e8520e', 'red': '#fa5252', 'grape': '#be4bdb'
        };

        if (!color.startsWith('#')) {
            hex = colorMap[color] || '#e8520e';
        }

        document.documentElement.style.setProperty('--accent', hex);

        // Update RGB variable for transparency effects
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
        }
    }

    async handleBetaToggle(checked: boolean) {
        // savePrefs re-renders, which repaints the badge.
        this.savePrefs({ beta_updates: checked }, { notify: true });
    }

    updateColumns(value: string) {
        const valSpan = this.shadowRoot!.getElementById('val-grid_columns');
        if (valSpan) valSpan.textContent = value;
        document.documentElement.style.setProperty('--user-preferred-columns', value);
    }

    // Saved without going through savePrefs on purpose: that re-renders the
    // panel, and rebuilding the slider mid-drag (or between arrow keys) would
    // steal the focus the user is still holding.
    async commitColumns(value: string) {
        const val = parseInt(value);
        this.prefs = { ...this.prefs, grid_columns: val };
        try {
            await userStore.updatePreferences({ grid_columns: val });
            if (window.notifier) window.notifier.show(i18n.t('settings.saved'));
        } catch {
            // userStore rolled back and already told the user.
        }
    }

    async updateUsername(newUsername: string) {
        const u = userStore.getUser();
        if (!u) return;
        await userStore.updateProfile({
            username: newUsername,
            avatar_url: this.prefs.avatar_url || u.avatar_url
        });
        if (window.notifier) window.notifier.show(i18n.t('notifier.username_updated'));
    }

    async updatePassword() {
        const currentPw = (this.shadowRoot!.getElementById('current-password') as HTMLInputElement)?.value;
        const newPw = (this.shadowRoot!.getElementById('new-password') as HTMLInputElement)?.value;
        const confirmPw = (this.shadowRoot!.getElementById('confirm-password') as HTMLInputElement)?.value;

        if (!currentPw) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.password_required'), 'error');
            return;
        }

        if (newPw !== confirmPw) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.password_mismatch'), 'error');
            return;
        }

        if (!newPw) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.password_empty'), 'error');
            return;
        }

        try {
            await userStore.changePassword({
                current_password: currentPw,
                new_password: newPw
            });

            // Clear inputs
            (this.shadowRoot!.getElementById('current-password') as HTMLInputElement).value = '';
            (this.shadowRoot!.getElementById('new-password') as HTMLInputElement).value = '';
            (this.shadowRoot!.getElementById('confirm-password') as HTMLInputElement).value = '';

            // Show success message
            if (window.notifier) window.notifier.show(i18n.t('notifier.password_changed_relogin'));

            // Session was invalidated by backend, redirect to login
            setTimeout(() => {
                // Clear local storage
                localStorage.removeItem('lastboard_user_cache');
                document.body.style.opacity = '0';
                window.location.href = '/login';
            }, 2000);
        } catch (e) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.password_incorrect'), 'error');
        }
    }

    async handleAvatarChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Validation: Must be image
        if (!file.type.startsWith('image/')) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.invalid_image_type'), 'error');
            return;
        }

        try {
            const resizedDataUrl = await resizeImage(file, 256, 256);
            const u = userStore.getUser();
            if (!u) return;

            // Optimistic localized update
            this.prefs.avatar_url = resizedDataUrl;

            await userStore.updateProfile({
                username: u.username,
                avatar_url: resizedDataUrl
            });

            this.render();
            if (window.notifier) window.notifier.show(i18n.t('notifier.avatar_updated'));
        } catch (error) {
            console.error('Resize failed', error);
            if (window.notifier) window.notifier.show(i18n.t('notifier.avatar_error'), 'error');
        }
    }

    async handleBackgroundChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Validation: Must be image
        if (!file.type.startsWith('image/')) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.invalid_image_type'), 'error');
            return;
        }

        try {
            // Backgrounds can be larger than avatars. 1920x1080 is a good balance.
            const resizedDataUrl = await resizeImage(file, 1920, 1080);
            
            // Optimistic localized update
            this.prefs.dashboard_background = resizedDataUrl;

            await this.savePrefs({
                dashboard_background: resizedDataUrl
            }, { notify: true });

            this.render();
        } catch (error) {
            console.error('Background resize failed', error);
            if (window.notifier) window.notifier.show(i18n.t('notifier.save_error'), 'error');
        }
    }

    async removeBackground() {
        try {
            this.prefs.dashboard_background = '';
            await this.savePrefs({
                dashboard_background: ''
            }, { notify: true });
            this.render();
        } catch (error) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.save_error'), 'error');
        }
    }

    async openLogoPicker() {
        let modal = document.body.querySelector('icon-selection-modal') as any;
        if (!modal) {
            modal = document.createElement('icon-selection-modal');
            document.body.appendChild(modal);
        }
        const result: string | null = await modal.open();
        if (result) {
            this.prefs.project_logo = result;
            await this.savePrefs({ project_logo: result }, { notify: true });
        }
    }

    // --- User Management Logic ---

    openAddUserModal() {
        const modal = this.shadowRoot!.getElementById('add-user-modal') as HTMLDialogElement;
        if (modal) modal.showModal();
    }

    async createUser() {
        const username = (this.shadowRoot!.getElementById('new-user-username') as HTMLInputElement).value;
        const password = (this.shadowRoot!.getElementById('new-user-password') as HTMLInputElement).value;

        if (!username || !password) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.fields_required'), 'error');
            return;
        }

        try {
            await userService.createUser({ username, password });
            if (window.notifier) window.notifier.show(i18n.t('notifier.user_created'));
            const modal = this.shadowRoot!.getElementById('add-user-modal') as HTMLDialogElement;
            if (modal) modal.close();
            this.fetchUsers();
        } catch (e) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.user_create_error'), 'error');
        }
    }

    openEditUserModal(id: number, username: string) {
        const modal = this.shadowRoot!.getElementById('edit-user-modal') as HTMLDialogElement;
        if (modal) {
            (this.shadowRoot!.getElementById('edit-user-id') as HTMLInputElement).value = id.toString();
            (this.shadowRoot!.getElementById('edit-user-username') as HTMLInputElement).value = username;
            (this.shadowRoot!.getElementById('edit-user-password') as HTMLInputElement).value = '';
            modal.showModal();
        }
    }

    async updateAdminUser() {
        const id = parseInt((this.shadowRoot!.getElementById('edit-user-id') as HTMLInputElement).value);
        const username = (this.shadowRoot!.getElementById('edit-user-username') as HTMLInputElement).value;
        const password = (this.shadowRoot!.getElementById('edit-user-password') as HTMLInputElement).value;

        if (!username) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.username_required'), 'error');
            return;
        }

        try {
            await userService.adminUpdateUser({
                id,
                username,
                password: password || undefined
            });
            if (window.notifier) window.notifier.show(i18n.t('notifier.user_updated'));
            const modal = this.shadowRoot!.getElementById('edit-user-modal') as HTMLDialogElement;
            if (modal) modal.close();
            this.fetchUsers();
        } catch (e) {
            if (window.notifier) window.notifier.show(i18n.t('notifier.user_update_error'), 'error');
        }
    }

    async deleteUser(id: number) {
        const confirmationModal = document.querySelector('confirmation-modal') as any;
        if (confirmationModal) {
            const confirmed = await confirmationModal.confirm(
                i18n.t('general.delete'),
                i18n.t('notifier.user_delete_confirm')
            );
            if (!confirmed) return;
        }

        const passwordModal = document.querySelector('password-confirm-modal') as any;
        if (passwordModal) {
            const password = await passwordModal.prompt(
                i18n.t('general.delete'),
                i18n.t('notifier.user_delete_confirm')
            );
            if (!password) return;

            try {
                // Optimistic UI Update
                this.users = this.users.filter(u => u.id !== id);
                this.render();

                await userService.deleteUser(id, password);
                if (window.notifier) window.notifier.show(i18n.t('notifier.user_deleted'));
                this.fetchUsers();
            } catch (e: any) {
                this.fetchUsers();
                let msg = i18n.t('notifier.user_delete_error');
                if (e.message && e.message.includes('error.cannot_delete_superadmin')) {
                    msg = i18n.t('notifier.user_delete_superadmin');
                } else if (e.status === 401) {
                    msg = i18n.t('notifier.password_incorrect');
                }
                if (window.notifier) window.notifier.show(msg, 'error');
            }
        }
    }

    // --- Rendering ---

    getContent(section: string) {
        const user = userStore.getUser() || {
            username: 'Guest',
            initials: '??',
            role: i18n.t('role.view_only'),
            avatar_url: '',
            accent_color: '#e8520e',
            language: 'en',
            preferences: {}
        } as User;

        switch (section) {
            case 'account':
                return accountTemplate(user);

            case 'theme': {
                const colorMap: Record<string, string> = {
                    'blue': '#228be6', 'indigo': '#4c6ef5', 'cyan': '#15aabf',
                    'teal': '#12b886', 'orange': '#e8520e', 'red': '#fa5252', 'grape': '#be4bdb'
                };
                const colors = Object.keys(colorMap);
                return themeTemplate(this.prefs, colorMap, colors);
            }

            case 'personalization': {
                return personalizationTemplate(this.prefs);
            }

            case 'advanced':
                return advancedTemplate();

            case 'data':
                return dataTemplate(this.pendingIcons, this.localIcons, this.storingIcons);

            // 'notifications' used to be its own section; anything still
            // pointing there lands on the section that absorbed it.
            case 'monitoring':
            case 'notifications':
                return monitoringTemplate(this.monitoring, this.monitoringLoaded, this.monitoringFailed);

            case 'proxmox':
                return proxmoxTemplate(this.proxmox, this.proxmoxLoaded, this.proxmoxFailed, this.proxmoxStatus);

            case 'users':
                return usersTemplate(this.users);

            case 'about':
                return aboutTemplate(this.version, this.updateInfo, user.role || 'user', user.preferences?.beta_updates || false, this.isCheckingUpdates);

            default:
                return `<div class="bento-card"><h3>${section}</h3><p class="settings-content__text-dim">${i18n.t('settings.default_module_desc')}</p></div>`;
        }
    }

    // --- Update System Logic ---
    private version = 'v1.8.3'; // Populated by checkForUpdates() from backend
    private updateInfo: any = null;
    private checkUpdatesPromise: Promise<void> | null = null;
    private isCheckingUpdates = false;

    async handleManualCheckUpdates() {
        if (this.isCheckingUpdates) return;
        this.isCheckingUpdates = true;
        this.updateUpdateUI();

        try {
            await this.checkForUpdates();
            if (this.updateInfo && !this.updateInfo.available) {
                if (window.notifier) window.notifier.show(i18n.t('settings.up_to_date'));
            }
        } finally {
            this.isCheckingUpdates = false;
            this.updateUpdateUI();
        }
    }

    async checkForUpdates() {
        if (this.checkUpdatesPromise) return this.checkUpdatesPromise;

        this.checkUpdatesPromise = (async () => {
            try {
                const { updateService } = await import('../../../services/UpdateService');
                const isBeta = this.prefs.beta_updates || false;

                this.updateInfo = await updateService.check(isBeta);
                if (this.updateInfo) {
                    this.version = this.updateInfo.current_version;
                    // Keep the store current so the modal always opens on the
                    // latest result — including a check that ran while it was
                    // already open.
                    updateStore.setInfo(this.updateInfo);
                    this.updateUpdateUI();
                }
            } catch (e) {
                console.error("Check update failed", e);
            } finally {
                this.checkUpdatesPromise = null;
            }
        })();

        return this.checkUpdatesPromise;
    }



    /**
     * Hands the update over to the modal.
     *
     * This panel used to run the whole thing inline, which meant the progress
     * lived in markup that any re-render of this section wiped, and it vanished
     * altogether if the drawer was closed. Here it only opens the modal; the
     * process itself belongs to updateStore.
     */
    private openUpdateModal() {
        const modal = document.querySelector('update-modal') as any;
        if (!modal) return;
        updateStore.setInfo(this.updateInfo);
        modal.open();
    }

    // --- System Logic ---

    async downloadBackup() {
        const modal = document.querySelector('backup-modal') as any;
        if (!modal) return;

        // null is a cancelled dialog; an empty string is the plain file.
        const password: string | null = await modal.prompt();
        if (password === null) return;

        try {
            const { blob, filename } = await apiService.postForFile('/api/system/backup', { password });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10_000);
        } catch (e) {
            console.error('Backup error', e);
            if (window.notifier) window.notifier.show(i18n.t('general.error'), 'error');
        }
    }

    /** A protected backup says so at the top of the file; no need to open it whole. */
    private async isProtectedBackup(file: File): Promise<boolean> {
        const head = await file.slice(0, 512).text();
        return /"encrypted"\s*:\s*true/.test(head);
    }

    async restoreBackup(file: File) {
        if (!file) return;

        const confirmationModal = document.querySelector('confirmation-modal') as any;
        if (confirmationModal) {
            const confirmed = await confirmationModal.confirm(
                i18n.t('general.restore'),
                i18n.t('notifier.restore_confirm')
            );
            if (!confirmed) return;
        }

        const protectedFile = await this.isProtectedBackup(file);
        const passwordModal = document.querySelector('password-confirm-modal') as any;

        // A wrong password asks again rather than throwing the choice away.
        for (;;) {
            const formData = new FormData();
            formData.append('backup_file', file);

            if (protectedFile) {
                if (!passwordModal) return;
                const password = await passwordModal.prompt(
                    i18n.t('general.restore'),
                    i18n.t('backup.password_required')
                );
                if (!password) return;
                formData.append('password', password);
            }

            try {
                await apiService.postForm('/api/system/restore', formData);
                if (window.notifier) window.notifier.show(i18n.t('notifier.restore_success'));
                // Clear all localStorage so stale cached items/dashboard IDs don't
                // survive into the fresh session. The server also sends Clear-Site-Data
                // to wipe browser cache and cookies, but localStorage is cleared here
                // as a fallback for browsers that don't support that header.
                setTimeout(() => {
                    localStorage.clear();
                    window.location.href = '/';
                }, 2000);
                return;
            } catch (e) {
                console.error('Restore error', e);
                if (protectedFile && (e as Error).message === 'backup.wrong_password') {
                    if (window.notifier) window.notifier.show(i18n.t('backup.wrong_password'), 'error');
                    continue;
                }
                if (window.notifier) window.notifier.show(i18n.t('notifier.restore_failed'), 'error');
                return;
            }
        }
    }



    async executeFactoryReset() {

        const passwordModal = document.querySelector('password-confirm-modal') as any;
        if (!passwordModal) return;

        const password = await passwordModal.prompt(
            i18n.t('settings.factory_reset'),
            i18n.t('settings.confirm_reset_msg')
        );

        if (!password) return;

        const btn = this.shadowRoot!.getElementById('btn-reset-confirm') as HTMLButtonElement;

        try {
            if (btn) {
                btn.disabled = true;
                btn.textContent = i18n.t('settings.restoring') || "Restoring...";
            }

            await apiService.post('/api/system/reset', { password });

            // Show Overlay
            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
                position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
                backgroundColor: 'rgba(0,0,0,0.9)', zIndex: '9999',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontFamily: 'var(--font-main, sans-serif)'
            });

            overlay.innerHTML = `
                <div style="border: 4px solid #333; border-top: 4px solid var(--accent, #0078d4); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin-bottom: 24px;"></div>
                <h2 style="margin: 0; font-weight: 500;">${i18n.t('notifier.system_restarting')}</h2>
                <p style="opacity: 0.7; margin-top: 8px;">${i18n.t('notifier.please_wait')}</p>
                <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            `;
            document.body.appendChild(overlay);

            // Poll for recovery
            let attempts = 0;
            const poll = async () => {
                attempts++;
                try {
                    const check = await fetch('/', { method: 'HEAD', cache: 'no-store' });
                    if (check.ok) {
                        window.location.href = '/setup';
                        return;
                    }
                } catch (e) {
                    // Still down
                }
                if (attempts < 60) setTimeout(poll, 1000);
                else window.location.href = '/setup'; // Fallback after 60s
            };

            // Wait 2s for shutdown, then start polling
            setTimeout(poll, 2000);

        } catch (e) {
            console.error('Reset error', e);
            if (window.notifier) window.notifier.show(i18n.t('notifier.reset_error'), 'error');
        }
    }

    render() {
        if (this._renderPending) return;
        this._renderPending = true;
        requestAnimationFrame(() => {
            this._renderPending = false;
            this._doRender();
        });
    }

    private _doRender() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            <div class="fade-in">
                ${this.getContent(this.getAttribute('section') || 'account')}
            </div>
        `;

        this.shadowRoot!.querySelectorAll('.settings-content__checkbox').forEach(cb => {
            cb.addEventListener('click', () => cb.classList.toggle('settings-content__checkbox--checked'));
        });

        this.initSelects();

        if (this.getAttribute('section') === 'about') {
            this.updateBetaBadgeVisuals();
        }
    }

    initSelects() {
        const langSelect = this.shadowRoot!.getElementById('language-select') as any;
        if (langSelect) {
            const locales = i18n.getAvailableLocales();
            // Map to format expected by AppSelect
            langSelect.options = locales.map(l => ({
                value: l.code,
                label: `${l.flag} ${l.name}`
            }));

            langSelect.addEventListener('change', (e: CustomEvent) => {
                this.savePrefs({ language: e.detail });
            });
        }

        const unitSelect = this.shadowRoot!.getElementById('unit-system-select') as any;
        if (unitSelect) {
            unitSelect.options = [
                { value: 'metric', label: i18n.t('settings.unit_metric') },
                { value: 'imperial', label: i18n.t('settings.unit_imperial') }
            ];

            // Unlike the language or the theme, switching units changes nothing
            // on screen until a widget refreshes, so confirm the save.
            unitSelect.addEventListener('change', (e: CustomEvent) => {
                this.savePrefs({ unit_system: e.detail }, { notify: true });
            });
        }

        const monitoringIntervalSelect = this.shadowRoot!.getElementById('monitoring-interval') as any;
        if (monitoringIntervalSelect) {
            monitoringIntervalSelect.options = [
                { value: '60', label: i18n.t('settings.interval_1m') },
                { value: '300', label: i18n.t('settings.interval_5m') },
                { value: '600', label: i18n.t('settings.interval_10m') },
                { value: '1800', label: i18n.t('settings.interval_30m') },
            ];
            monitoringIntervalSelect.addEventListener('change', (e: CustomEvent) => {
                this.saveMonitoring({ interval_sec: parseInt(e.detail, 10) });
            });
        }

        const notifyTypeSelect = this.shadowRoot!.getElementById('notify-type') as any;
        if (notifyTypeSelect) {
            notifyTypeSelect.options = [
                { value: 'none', label: i18n.t('settings.notify_none') },
                { value: 'ntfy', label: 'ntfy' },
                { value: 'gotify', label: 'Gotify' },
                { value: 'webhook', label: i18n.t('settings.notify_webhook') },
            ];
            notifyTypeSelect.addEventListener('change', (e: CustomEvent) => {
                this.saveMonitoring({ notify_type: e.detail });
            });
        }

        const importFormatSelect = this.shadowRoot!.getElementById('import-format') as any;
        if (importFormatSelect) {
            importFormatSelect.options = [
                { value: 'auto', label: i18n.t('settings.import_auto') },
                { value: 'native', label: i18n.t('settings.import_native') },
                { value: 'homepage-services', label: 'Homepage — services.yaml' },
                { value: 'homepage-bookmarks', label: 'Homepage — bookmarks.yaml' },
                { value: 'dashy', label: 'Dashy — conf.yml' },
            ];
            importFormatSelect.value = this.importFormat;
            importFormatSelect.addEventListener('change', (e: CustomEvent) => {
                this.importFormat = e.detail;
            });
        }

        const failThresholdSelect = this.shadowRoot!.getElementById('fail-threshold') as any;
        if (failThresholdSelect) {
            failThresholdSelect.options = [
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '5', label: '5' },
            ];
            failThresholdSelect.addEventListener('change', (e: CustomEvent) => {
                this.saveMonitoring({ fail_threshold: parseInt(e.detail, 10) });
            });
        }
    }

    updateBetaBadgeVisuals() {
        // Simple initialization of the toggle state
        setTimeout(() => {
            const toggle = this.shadowRoot!.getElementById('beta-updates-toggle-badge') as HTMLInputElement;
            if (toggle) {
                toggle.checked = this.prefs.beta_updates || false;
            }
        }, 0);
    }

    private updateUpdateUI() {
        const wrapper = this.shadowRoot!.getElementById('update-zone-wrapper');
        if (wrapper) {
            const user = userStore.getUser();
            const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'administrator';
            wrapper.innerHTML = updateZoneTemplate(isAdmin, this.updateInfo, this.isCheckingUpdates);
        }
        const versionLabel = this.shadowRoot!.getElementById('current-version-label');
        if (versionLabel && this.version) {
            versionLabel.textContent = this.version;
        }
    }
}

if (!customElements.get('settings-content')) {
    customElements.define('settings-content', SettingsContent);
}
