import { template } from './TopBar.template';
import { dashboardStore } from '../../../store/dashboardStore';
import { eventBus, EVENTS } from '../../../services/EventBus';
import { apiService } from '../../../services/apiService';
import { i18n } from '../../../services/i18n';
import '../RenameDashboardModal/RenameDashboardModal';
import '../MobileReorderModal/MobileReorderModal';
import css from './TopBar.css' with { type: 'text' };
import { isTypingTarget, opensSearch } from '../../../services/searchShortcut';
import { accessAllows } from '../../../services/access';
import { userStore } from '../../../store/userStore';
import { fetchDockerSettings } from '../../../services/dockerHosts';
import type { User } from '../../../types';

interface TopBarState {
    editMode: boolean;
    selectMode: boolean;
    selectedCount: number;
    searchActive: boolean;
    addMenuActive: boolean;
    drawerOpen: boolean;
    searchQuery: string;
    user?: User | null;
    updateAvailable?: boolean;
    isDemo?: boolean;
    currentDashboardId?: number | null;
    projectLogo?: string;
    isTouchDevice?: boolean;
    monitoringOn?: boolean;
    proxmoxOn?: boolean;
    proxmoxOpen?: boolean;
    dockerOn?: boolean;
    dockerOpen?: boolean;
    monitorOpen?: boolean;
}

class TopBar extends HTMLElement {
    state: TopBarState;
    _unsubscribeDashboard: (() => void) | undefined;
    _unsubscribeI18n: (() => void) | undefined;
    _unsubscribeUser: (() => void) | undefined;
    private _monitorAsked = false;
    private _proxmoxAsked = false;
    private _dockerAsked = false;
    _windowClickHandler: ((e: Event) => void) | undefined;
    _monitoringHandler: ((e: CustomEvent) => void) | undefined;
    _monitorOpenHandler: ((e: CustomEvent) => void) | undefined;
    _proxmoxHandler: ((e: CustomEvent) => void) | undefined;
    _proxmoxOpenHandler: ((e: CustomEvent) => void) | undefined;
    _dockerHandler: ((e: CustomEvent) => void) | undefined;
    _dockerOpenHandler: ((e: CustomEvent) => void) | undefined;

    static get observedAttributes() {
        return ['title'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.state = {
            editMode: false,
            selectMode: false,
            selectedCount: 0,
            searchActive: false,
            addMenuActive: false,
            drawerOpen: false,
            searchQuery: '',
            monitorOpen: false,
            proxmoxOn: false,
            proxmoxOpen: false,
            dockerOn: false,
            dockerOpen: false,
            isDemo: window.LASTBOARD_CONFIG?.demo_mode || false,
            isTouchDevice: window.innerWidth < 768 && window.matchMedia('(pointer: coarse)').matches
        };
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'title' && oldValue !== newValue) {
            this.render();
        }
    }

    connectedCallback() {
        this.render();
        this.setupListeners();
        window.addEventListener('keydown', this._shortcutHandler);
        this._unsubscribeDashboard = dashboardStore.subscribe((state) => {
            const selectedCount = state.selectedIds?.length || 0;
            const changed =
                this.state.editMode !== state.isEditing ||
                this.state.selectMode !== state.selectMode ||
                this.state.selectedCount !== selectedCount ||
                this.state.updateAvailable !== state.updateAvailable ||
                this.state.currentDashboardId !== state.currentDashboardId;
            if (changed) {
                this.setState({
                    editMode: state.isEditing,
                    selectMode: state.selectMode,
                    selectedCount,
                    updateAvailable: state.updateAvailable,
                    currentDashboardId: state.currentDashboardId
                });
            }
        });

        // Listen to language changes
        this._unsubscribeI18n = i18n.subscribe(() => {
            this.render();
        });

        // Monitoring icon visibility: on when 24/7 is enabled. Fetched once
        // the account is known to be allowed to see it, then reacts to changes
        // made in settings.
        this._monitoringHandler = (e: CustomEvent) => {
            this.setState({ monitoringOn: e.detail?.mode === 'background' });
        };
        eventBus.on(EVENTS.MONITORING_CHANGED, this._monitoringHandler);

        // The Proxmox icon appears only once a connection is saved and enabled,
        // and only for an account that may see Proxmox.
        this._proxmoxHandler = (e: CustomEvent) => {
            this.setState({ proxmoxOn: !!e.detail?.enabled });
        };
        eventBus.on(EVENTS.PROXMOX_CHANGED, this._proxmoxHandler);

        // The account's permissions come from the user store: the bar is drawn
        // again when they change, and asks for the two flags only when allowed.
        this._unsubscribeUser = userStore.subscribe(user => {
            this.setState({ user });
            this.askFlags();
        });
        this.askFlags();

        this._proxmoxOpenHandler = (e: CustomEvent) => {
            this.setState({ proxmoxOpen: !!e.detail?.open });
        };
        eventBus.on(EVENTS.PROXMOX_PAGE_CHANGED, this._proxmoxOpenHandler);

        // The Docker icon is there while the account has a host it can use, and
        // follows the hosts being saved in settings.
        this._dockerHandler = (e: CustomEvent) => {
            this.setState({ dockerOn: !!e.detail?.enabled });
        };
        eventBus.on(EVENTS.DOCKER_CHANGED, this._dockerHandler);
        this._dockerOpenHandler = (e: CustomEvent) => {
            this.setState({ dockerOpen: !!e.detail?.open });
        };
        eventBus.on(EVENTS.DOCKER_PAGE_CHANGED, this._dockerOpenHandler);

        // While the status page is up the rest of the topbar is locked, so the
        // only way out is the status icon itself or the page's own close button.
        this._monitorOpenHandler = (e: CustomEvent) => {
            this.setState({ monitorOpen: !!e.detail?.open });
        };
        eventBus.on(EVENTS.MONITOR_OVERVIEW_CHANGED, this._monitorOpenHandler);
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this._shortcutHandler);
        if (this._unsubscribeDashboard) this._unsubscribeDashboard();
        if (this._unsubscribeI18n) this._unsubscribeI18n();
        if (this._unsubscribeUser) this._unsubscribeUser();
        if (this._windowClickHandler) {
            window.removeEventListener('click', this._windowClickHandler);
        }
        if (this._monitoringHandler) eventBus.off(EVENTS.MONITORING_CHANGED, this._monitoringHandler);
        if (this._monitorOpenHandler) eventBus.off(EVENTS.MONITOR_OVERVIEW_CHANGED, this._monitorOpenHandler);
        if (this._proxmoxHandler) eventBus.off(EVENTS.PROXMOX_CHANGED, this._proxmoxHandler);
        if (this._proxmoxOpenHandler) eventBus.off(EVENTS.PROXMOX_PAGE_CHANGED, this._proxmoxOpenHandler);
        if (this._dockerHandler) eventBus.off(EVENTS.DOCKER_CHANGED, this._dockerHandler);
        if (this._dockerOpenHandler) eventBus.off(EVENTS.DOCKER_PAGE_CHANGED, this._dockerOpenHandler);
    }

    /** Whether the signed-in account may do this; the demo has no accounts and may do all. */
    private may(cap: string): boolean {
        return accessAllows(this.state.user ?? userStore.getUser(), cap);
    }

    /** Asks whether monitoring and Proxmox are on, once, and only if the account may see them. */
    private askFlags() {
        // Until the account is known nothing is asked: an unknown account is not an allowed one.
        if (!(this.state.user ?? userStore.getUser())) return;
        // Not on the copy of the account kept from the last visit: its
        // permissions may have changed since, and asking with them is a refusal.
        if (!userStore.isFromServer()) return;
        if (!this._monitorAsked && this.may('watch_monitor')) {
            this._monitorAsked = true;
            apiService.get<{ mode: string }>('/api/monitor/settings')
                .then(s => this.setState({ monitoringOn: s.mode === 'background' }))
                .catch(() => { this._monitorAsked = false; /* leave hidden */ });
        }
        if (!this._proxmoxAsked && this.may('proxmox_view')) {
            this._proxmoxAsked = true;
            apiService.get<{ enabled: boolean }>('/api/proxmox/settings')
                .then(s => this.setState({ proxmoxOn: !!s.enabled }))
                .catch(() => { this._proxmoxAsked = false; /* leave hidden */ });
        }
        if (!this._dockerAsked && this.may('docker_view')) {
            this._dockerAsked = true;
            fetchDockerSettings()
                .then(s => this.setState({ dockerOn: s.enabled }))
                .catch(() => { this._dockerAsked = false; /* leave hidden */ });
        }
    }

    setState(newState: Partial<TopBarState>) {
        const oldEditMode = this.state.editMode;
        this.state = { ...this.state, ...newState };
        this.render();

        if (newState.editMode !== undefined && newState.editMode !== oldEditMode) {
            this.dispatchEvent(new CustomEvent('edit-mode-change', {
                detail: { active: this.state.editMode },
                bubbles: true,
                composed: true
            }));
        }
    }

    /**
     * Ctrl+K / Cmd+K puts the cursor in the search box, from anywhere on the board.
     * preventDefault matters: browsers take the same combination for their own
     * address or search bar. The event is read from the window, so it works
     * whichever shadow root has focus.
     */
    private _shortcutHandler = (e: KeyboardEvent) => {
        const st = this.state;
        const locked = st.editMode || st.drawerOpen || !!st.monitorOpen || !!st.proxmoxOpen || !!st.dockerOpen;
        const target = (e.composedPath()[0] as Element | undefined) ?? null;
        if (!opensSearch(e, { locked, typing: isTypingTarget(target) })) return;
        e.preventDefault();
        this.focusSearch();
    };

    /** Opens the search if it is folded and puts the cursor in it. */
    focusSearch() {
        if (!this.state.searchActive) this.setState({ searchActive: true });
        const input = this.shadowRoot?.getElementById('search-input') as HTMLInputElement | null;
        input?.focus();
        input?.select();
    }

    /**
     * Fold the search away and drop the filter with it.
     *
     * The query lives in three places — the state, the input, and the board
     * that is listening — and all three have to agree. Escape used to clear the
     * first two only, so the next render wrote the stale query back into a box
     * that was filtering nothing.
     */
    closeSearch() {
        const input = this.shadowRoot?.getElementById('search-input') as HTMLInputElement | null;
        if (input) input.value = '';
        this.state.searchQuery = '';
        this.setState({ searchActive: false });
        this.dispatchEvent(new CustomEvent('search-input', {
            detail: { query: '' },
            bubbles: true,
            composed: true
        }));
    }

    setupListeners() {
        this.shadowRoot!.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;

            // While an exclusive mode is up, only the toggle that closes it
            // answers — the status page wins over the drawer because it is the
            // one opened last (from inside the drawer's own settings). The
            // greyed-out controls are inert in CSS too; this keeps them inert
            // for clicks that never went through the pointer.
            const exclusiveToggle = this.state.dockerOpen ? '#docker-toggle'
                : this.state.proxmoxOpen ? '#proxmox-toggle'
                : this.state.monitorOpen ? '#monitor-toggle'
                    : this.state.drawerOpen ? '#drawer-toggle'
                        : null;
            if (exclusiveToggle && !target.closest(exclusiveToggle)) {
                return;
            }

            // Clicking inside the search input must not bubble to the window
            // handler that closes the search (replaces the old inline onclick).
            if (target.id === 'search-input') {
                e.stopPropagation();
                return;
            }

            const searchClear = target.closest('#search-clear');
            if (searchClear) {
                e.stopPropagation();
                this.state.searchQuery = '';
                this.render(); // Re-render to hide X button
                // After the render, not before: render() rewrites the shadow
                // root, so anything focused beforehand is a detached node by
                // the time the user looks at it.
                const input = this.shadowRoot!.getElementById('search-input') as HTMLInputElement;
                if (input) {
                    input.value = '';
                    input.focus();
                }
                this.dispatchEvent(new CustomEvent('search-input', {
                    detail: { query: '' },
                    bubbles: true,
                    composed: true
                }));
                return;
            }

            // The magnifier opens the search and closes it again. Closing
            // empties the field with it: the alternative is a board still
            // filtered by a box nobody can see any more.
            if (this.state.searchActive && target.closest('#search-icon')) {
                e.stopPropagation();
                this.closeSearch();
                return;
            }

            const searchWrapper = target.closest('#search-wrapper');
            if (searchWrapper && !this.state.searchActive) {
                e.stopPropagation();
                this.setState({ searchActive: true });
                this.shadowRoot!.getElementById('search-input')?.focus();
            }

            const editToggle = target.closest('#edit-toggle');
            if (editToggle) {
                if (this.state.isTouchDevice) {
                    // On mobile: open reorder sheet directly — no edit-mode grid confusion
                    const modal = document.createElement('mobile-reorder-modal');
                    document.body.appendChild(modal);
                } else {
                    dashboardStore.toggleEditMode();
                }
            }

            const selectToggle = target.closest('#select-toggle');
            if (selectToggle) {
                e.stopPropagation();
                dashboardStore.toggleSelectMode();
            }

            const bulkMove = target.closest('#bulk-move');
            if (bulkMove) {
                e.stopPropagation();
                const ids = dashboardStore.getState().selectedIds;
                if (ids.length) {
                    eventBus.emit(EVENTS.SHOW_MOVE_DASHBOARD, { itemIds: ids });
                }
            }

            const bulkClear = target.closest('#bulk-clear');
            if (bulkClear) {
                e.stopPropagation();
                dashboardStore.setSelectMode(false);
            }

            const addToggle = target.closest('#add-toggle');
            if (addToggle) {
                e.stopPropagation();
                this.setState({ addMenuActive: !this.state.addMenuActive });
            }

            // Handle add menu items
            const addMenuItem = target.closest('.add-menu-item') as HTMLElement;
            if (addMenuItem) {
                const action = addMenuItem.dataset.action;
                if (action) {
                    this.setState({ addMenuActive: false });
                    this.dispatchEvent(new CustomEvent('add-item', {
                        detail: { action },
                        bubbles: true,
                        composed: true
                    }));
                }
                return;
            }

            const proxmoxBtn = target.closest('#proxmox-toggle');
            if (proxmoxBtn) {
                eventBus.emit(this.state.proxmoxOpen
                    ? EVENTS.HIDE_PROXMOX_PAGE
                    : EVENTS.SHOW_PROXMOX_PAGE);
                return;
            }

            const dockerBtn = target.closest('#docker-toggle');
            if (dockerBtn) {
                eventBus.emit(this.state.dockerOpen
                    ? EVENTS.HIDE_DOCKER_PAGE
                    : EVENTS.SHOW_DOCKER_PAGE);
                return;
            }

            const monitorBtn = target.closest('#monitor-toggle');
            if (monitorBtn) {
                e.stopPropagation();
                eventBus.emit(this.state.monitorOpen
                    ? EVENTS.HIDE_MONITOR_OVERVIEW
                    : EVENTS.SHOW_MONITOR_OVERVIEW);
                return;
            }

            const drawerToggle = target.closest('#drawer-toggle');
            if (drawerToggle) {
                const action = this.state.drawerOpen ? 'close' : 'open';
                this.dispatchEvent(new CustomEvent('drawer-toggle', {
                    detail: { action },
                    bubbles: true,
                    composed: true
                }));
                return;
            }
        });

        // Search Input Logic
        this.shadowRoot!.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.id === 'search-input') {
                const val = target.value;
                this.state.searchQuery = val;

                const clearBtn = this.shadowRoot!.getElementById('search-clear');
                if (clearBtn) {
                    clearBtn.style.display = val ? 'flex' : 'none';
                }

                this.dispatchEvent(new CustomEvent('search-input', {
                    detail: { query: val },
                    bubbles: true,
                    composed: true
                }));
            }
        });

        this.shadowRoot!.addEventListener('keydown', (e: Event) => {
            const target = e.target as HTMLInputElement;
            const keyEvent = e as KeyboardEvent;

            // Activate role="button" elements (e.g. the add-menu items) with
            // Enter/Space, reusing the click delegation above. matches() (not
            // closest()) so a real <button> nested inside never double-fires.
            if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                const activatable = e.target as HTMLElement;
                if (activatable.matches?.('[role="button"]')) {
                    keyEvent.preventDefault();
                    activatable.click();
                    return;
                }
            }

            if (target.id === 'search-input' && keyEvent.key === 'Escape') {
                target.blur();
                this.closeSearch();
            }
        });

        // Global click to close search/menu
        this._windowClickHandler = (e: Event) => {
            if (this.state.addMenuActive) {
                this.setState({ addMenuActive: false });
            }

            const path = e.composedPath();
            const searchWrapper = this.shadowRoot!.getElementById('search-wrapper');

            if (this.state.searchActive && searchWrapper && !path.includes(searchWrapper)) {
                const input = this.shadowRoot!.getElementById('search-input') as HTMLInputElement;
                if (input && input.value === '') {
                    this.setState({ searchActive: false });
                }
            }
        };
        window.addEventListener('click', this._windowClickHandler);

        this.shadowRoot!.addEventListener('dashboard-create', () => {
            this.dispatchEvent(new CustomEvent('add-item', {
                detail: { action: 'add-dashboard' },
                bubbles: true,
                composed: true
            }));
        });
    }

    render() {
        const title = this.getAttribute('title') || 'Lastboard';

        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({
            title,
            editMode: this.state.editMode,
            selectMode: this.state.selectMode,
            selectedCount: this.state.selectedCount,
            searchActive: this.state.searchActive,
            addMenuActive: this.state.addMenuActive,
            drawerOpen: this.state.drawerOpen,
            searchQuery: this.state.searchQuery,
            user: this.state.user ?? userStore.getUser(),
            updateAvailable: this.state.updateAvailable,
            isDemo: this.state.isDemo,
            currentDashboardId: this.state.currentDashboardId,
            projectLogo: this.state.projectLogo,
            isTouchDevice: this.state.isTouchDevice,
            monitoringOn: this.state.monitoringOn,
            proxmoxOn: this.state.proxmoxOn,
            proxmoxOpen: this.state.proxmoxOpen,
            dockerOn: this.state.dockerOn,
            dockerOpen: this.state.dockerOpen,
            monitorOpen: this.state.monitorOpen
        })}
        `;
    }
}

if (!customElements.get('app-topbar')) {
    customElements.define('app-topbar', TopBar);
}
