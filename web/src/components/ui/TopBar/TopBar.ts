import { template } from './TopBar.template';
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
                this.setState({ editMode: !this.state.editMode });
                this.dispatchEvent(new CustomEvent('edit-mode-change', {
                    detail: { active: this.state.editMode },
                    bubbles: true,
                    composed: true
                }));
            }

            const addToggle = target.closest('#add-toggle');
            if (addToggle) {
                e.stopPropagation();
                this.setState({ addMenuActive: !this.state.addMenuActive });
            }

            const drawerToggle = target.closest('#drawer-toggle');
            if (drawerToggle) {
                const action = this.state.drawerOpen ? 'close' : 'open';
                this.dispatchEvent(new CustomEvent('drawer-toggle', {
                    detail: { action },
                    bubbles: true,
                    composed: true
                }));
                // We'll let the event handler in index.html call back if needed
                return;
            }
        });

        // Search Input Logic
        this.shadowRoot!.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.id === 'search-input') {
                const val = target.value;
                this.state.searchQuery = val;

                // Manually toggle visibility to avoid full re-render (focus loss)
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
                // Only close if click is truly outside the wrapper
                const input = this.shadowRoot!.getElementById('search-input') as HTMLInputElement;
                if (input && input.value === '') {
                    this.setState({ searchActive: false });
                }
            }
        });
    }

    render() {
        // CSS import is string
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
