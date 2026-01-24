import { template } from './TopBar.template.js';

class TopBar extends HTMLElement {
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

    async connectedCallback() {
        if (!this.constructor.cssText) {
            const cssResponse = await fetch('/src/components/ui/TopBar/TopBar.css');
            this.constructor.cssText = await cssResponse.text();
        }
        this.render();
        this.setupListeners();
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }

    setupListeners() {
        this.shadowRoot.addEventListener('click', (e) => {
            const searchClear = e.target.closest('#search-clear');
            if (searchClear) {
                e.stopPropagation();
                this.state.searchQuery = '';
                const input = this.shadowRoot.getElementById('search-input');
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

            const searchWrapper = e.target.closest('#search-wrapper');
            if (searchWrapper && !this.state.searchActive) {
                e.stopPropagation();
                this.setState({ searchActive: true });
                this.shadowRoot.getElementById('search-input').focus();
            }

            const editToggle = e.target.closest('#edit-toggle');
            if (editToggle) {
                this.setState({ editMode: !this.state.editMode });
                this.dispatchEvent(new CustomEvent('edit-mode-change', {
                    detail: { active: this.state.editMode },
                    bubbles: true,
                    composed: true
                }));
            }

            const addToggle = e.target.closest('#add-toggle');
            if (addToggle) {
                e.stopPropagation();
                this.setState({ addMenuActive: !this.state.addMenuActive });
            }

            const drawerToggle = e.target.closest('#drawer-toggle');
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
        this.shadowRoot.addEventListener('input', (e) => {
            if (e.target.id === 'search-input') {
                const val = e.target.value;
                this.state.searchQuery = val;

                // Manually toggle visibility to avoid full re-render (focus loss)
                const clearBtn = this.shadowRoot.getElementById('search-clear');
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

        this.shadowRoot.addEventListener('keydown', (e) => {
            if (e.target.id === 'search-input' && e.key === 'Escape') {
                e.target.value = '';
                this.setState({ searchActive: false });
                this.dispatchEvent(new CustomEvent('search-input', {
                    detail: { query: '' },
                    bubbles: true,
                    composed: true
                }));
                e.target.blur();
            }
        });

        // Global click to close search/menu
        window.addEventListener('click', (e) => {
            if (this.state.addMenuActive) {
                this.setState({ addMenuActive: false });
            }

            const path = e.composedPath();
            const searchWrapper = this.shadowRoot.getElementById('search-wrapper');

            if (this.state.searchActive && !path.includes(searchWrapper)) {
                // Only close if click is truly outside the wrapper
                const input = this.shadowRoot.getElementById('search-input');
                if (input && input.value === '') {
                    this.setState({ searchActive: false });
                }
            }
        });
    }

    render() {
        if (!this.constructor.cssText) return;

        const title = this.getAttribute('title') || 'CSH Dashboard';

        this.shadowRoot.innerHTML = `
            <style>${this.constructor.cssText}</style>
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
