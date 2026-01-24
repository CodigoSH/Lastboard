import { template } from './IconPicker.template';
import { iconService, IconInfo } from '../../../services/iconService';
// @ts-ignore
import css from './IconPicker.css' with { type: 'text' };

class IconPicker extends HTMLElement {
    private icons: IconInfo[] = [];
    private filteredIcons: IconInfo[] = [];
    private selectedIcon: string = '';
    private searchQuery: string = '';
    private isLoading: boolean = true;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        this.render();
        this.setupListeners();
        await this.loadIcons();
    }

    async loadIcons() {
        try {
            this.icons = await iconService.loadIcons();
            this.filteredIcons = this.icons.slice(0, 50); // Show first 50 initially
            this.isLoading = false;
            this.render();
        } catch (error) {
            console.error('[IconPicker] Failed to load icons', error);
            this.isLoading = false;
            this.render();
        }
    }

    setupListeners() {
        const root = this.shadowRoot!;

        // Search input
        root.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.id === 'icon-search') {
                this.searchQuery = target.value;
                this.filteredIcons = iconService.searchIcons(this.searchQuery, 50);
                this.render();
            }
        });

        // Icon selection
        root.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const item = target.closest('.icon-picker__item') as HTMLElement;
            if (item && item.dataset.icon) {
                this.selectedIcon = item.dataset.icon;
                this.render();

                // Dispatch event with selected icon
                this.dispatchEvent(new CustomEvent('icon-selected', {
                    detail: { iconName: this.selectedIcon },
                    bubbles: true,
                    composed: true
                }));
            }
        });
    }

    getSelectedIcon(): string {
        return this.selectedIcon;
    }

    setSelectedIcon(iconName: string) {
        this.selectedIcon = iconName;
        this.render();
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({
                icons: this.filteredIcons,
                selectedIcon: this.selectedIcon,
                searchQuery: this.searchQuery,
                isLoading: this.isLoading
            })}
        `;
    }
}

if (!customElements.get('icon-picker')) {
    customElements.define('icon-picker', IconPicker);
}
