import { layoutContainer, gridTemplate, selectedIconTemplate } from './IconPicker.template';
import { iconService, IconInfo } from '../../../services/iconService';
// @ts-ignore
import css from './IconPicker.css' with { type: 'text' };

class IconPicker extends HTMLElement {
    private icons: IconInfo[] = [];
    private filteredIcons: IconInfo[] = [];
    private selectedIcon: string = '';
    private searchQuery: string = '';
    private isLoading: boolean = true;

    private debounceTimer: number | null = null;
    private inputElement: HTMLInputElement | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

    }

    async connectedCallback() {

        // Robust check: if shadowRoot has children, we are already initialized
        if (this.shadowRoot!.childElementCount > 0) {

            return;
        }

        this.renderBase();
        this.setupListeners();

        // Load icons if not already loaded
        if (this.icons.length === 0) {
            await this.loadIcons();
        }
    }

    async loadIcons() {
        try {

            this.icons = await iconService.loadIcons();
            this.filteredIcons = this.icons.slice(0, 50);
            this.isLoading = false;
            this.updateGrid();

        } catch (error) {
            console.error('[IconPicker] Failed to load icons', error);
            this.isLoading = false;
            this.updateGrid();
        }
    }

    setupListeners() {

        const root = this.shadowRoot!;
        this.inputElement = root.getElementById('icon-search') as HTMLInputElement;

        this.inputElement?.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            this.searchQuery = target.value;

            // Debounce the search to prevent UI blocking
            if (this.debounceTimer) window.clearTimeout(this.debounceTimer);

            this.debounceTimer = window.setTimeout(() => {

                this.performSearch();
            }, 100);
        });

        // Icon selection
        const grid = root.getElementById('grid-container');
        grid?.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const item = target.closest('.icon-picker__item') as HTMLElement;
            if (item && item.dataset.icon) {
                this.selectedIcon = item.dataset.icon;
                this.updateSelected();
                this.updateGrid();

                this.dispatchEvent(new CustomEvent('icon-selected', {
                    detail: { iconName: this.selectedIcon },
                    bubbles: true,
                    composed: true
                }));
            }
        });
    }

    performSearch() {
        this.filteredIcons = iconService.searchIcons(this.searchQuery, 50);
        this.updateGrid();
    }

    getSelectedIcon(): string {
        return this.selectedIcon;
    }

    setSelectedIcon(iconName: string) {
        this.selectedIcon = iconName;
        this.updateSelected();
        this.updateGrid();
    }

    renderBase() {

        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${layoutContainer()}
        `;
    }

    updateGrid() {
        const grid = this.shadowRoot!.getElementById('grid-container');
        if (grid) {
            // Only show grid if there is a search query or if loading
            if (!this.searchQuery.trim() && !this.isLoading) {
                grid.style.display = 'none';
                grid.innerHTML = '';
                return;
            }

            grid.style.display = 'grid';
            grid.innerHTML = gridTemplate(this.filteredIcons, this.selectedIcon, this.isLoading);
        }
    }

    updateSelected() {
        const container = this.shadowRoot!.getElementById('selected-container');
        if (container) {
            container.innerHTML = selectedIconTemplate(this.selectedIcon);
        }
    }
}

if (!customElements.get('icon-picker')) {
    customElements.define('icon-picker', IconPicker);
}
