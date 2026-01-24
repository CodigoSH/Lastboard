import { template } from './TopBar.template';
import { dashboardStore } from '../../../store/dashboardStore';
// @ts-ignore
import css from './TopBar.css' with { type: 'text' };

interface TopBarState {
    editMode: boolean;
    searchActive: boolean;
    addMenuActive: boolean;
    drawerOpen: boolean;
    searchQuery: string;
}

class TopBar extends HTMLElement {
    state: TopBarState;
    _unsubscribeDashboard: (() => void) | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.state = {
            editMode: false,
            searchActive: false,
            addMenuActive: false,
            drawerOpen: false,
            searchQuery: ''
        };
    }

    connectedCallback() {
        this.render();
        this.setupListeners();
        this._unsubscribeDashboard = dashboardStore.subscribe((state) => {
            if (this.state.editMode !== state.isEditing) {
                this.setState({ editMode: state.isEditing });
            }
        });
    }

    disconnectedCallback() {
        if (this._unsubscribeDashboard) this._unsubscribeDashboard();
    }

    setState(newState: Partial<TopBarState>) {
        this.state = { ...this.state, ...newState };
        this.render();
    }

    setupListeners() {
        this.shadowRoot!.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;

            const searchClear = target.closest('#search-clear');
            if (searchClear) {
                e.stopPropagation();
                this.state.searchQuery = '';
                const input = this.shadowRoot!.getElementById('search-input') as HTMLInputElement;
                if (input) {
                    input.value = '';
                    input.focus();
                }
                this.render(); // Re-render to hide X button
                this.dispatchEvent(new CustomEvent('search-input', {
                    detail: { query: '' },
                    bubbles: true,
                    composed: true
                }));
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
                dashboardStore.toggleEditMode();
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
            if (target.id === 'search-input' && keyEvent.key === 'Escape') {
                target.value = '';
                this.setState({ searchActive: false });
                this.dispatchEvent(new CustomEvent('search-input', {
                    detail: { query: '' },
                    bubbles: true,
                    composed: true
                }));
                target.blur();
            }
        });

        // Global click to close search/menu
        window.addEventListener('click', (e: Event) => {
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
        });
    }

    render() {
        const title = this.getAttribute('title') || 'CSH Dashboard';

        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({
            title,
            editMode: this.state.editMode,
            searchActive: this.state.searchActive,
            addMenuActive: this.state.addMenuActive,
            drawerOpen: this.state.drawerOpen,
            searchQuery: this.state.searchQuery
        })}
        `;
    }
}

if (!customElements.get('app-topbar')) {
    customElements.define('app-topbar', TopBar);
}
