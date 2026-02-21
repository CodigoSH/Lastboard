import { i18n } from '../../../services/i18n';
import { layoutContainer, gridTemplate } from './IconPicker.template';
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
    private previewElement: HTMLElement | null = null;
    private uploadBtn: HTMLButtonElement | null = null;
    private fileInput: HTMLInputElement | null = null;

    private customUrl: string | null = null;

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
            this.filteredIcons = iconService.searchIcons('', 12);
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
        this.previewElement = root.getElementById('icon-preview');
        this.uploadBtn = root.getElementById('icon-upload-btn') as HTMLButtonElement;
        this.fileInput = root.getElementById('icon-upload-input') as HTMLInputElement;

        this.inputElement?.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            this.searchQuery = target.value;

            // Check if it's a URL
            if (this.searchQuery.startsWith('http://') || this.searchQuery.startsWith('https://') || this.searchQuery.startsWith('data:image/')) {
                this.customUrl = this.searchQuery;
                if (this.previewElement) {
                    this.previewElement.innerHTML = `<img src="${this.customUrl}" alt="preview" />`;
                }

                // Truncate search so the UI shows '0 results' 
                // but we might want to still allow clicking a "use this URL" button.
                // For a seamless experience, if they paste a URL and it's valid, 
                // we can just select it instantly or put a button.
                // Let's hide the grid and show a specific item to click.
                this.filteredIcons = [];
                this.updateGrid();
            } else {
                this.customUrl = null;
                if (this.previewElement) {
                    this.previewElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-dim);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
                }

                // Debounce the search to prevent UI blocking
                if (this.debounceTimer) window.clearTimeout(this.debounceTimer);

                this.debounceTimer = window.setTimeout(() => {
                    this.performSearch();
                }, 100);
            }
        });

        // Trigger file input
        this.uploadBtn?.addEventListener('click', () => {
            this.fileInput?.click();
        });

        // Handle file upload to Base64
        this.fileInput?.addEventListener('change', (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
                const file = target.files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target && typeof event.target.result === 'string') {
                        const base64 = event.target.result;
                        this.selectedIcon = base64;

                        this.dispatchEvent(new CustomEvent('icon-selected', {
                            detail: { iconName: base64 },
                            bubbles: true,
                            composed: true
                        }));
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        // Icon selection
        const grid = root.getElementById('grid-container');
        grid?.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const item = target.closest('.icon-picker__item') as HTMLElement;

            // If it's a custom URL injected directly via search
            if (item && item.dataset.icon) {
                this.selectedIcon = item.dataset.icon;
                this.updateGrid();

                this.dispatchEvent(new CustomEvent('icon-selected', {
                    detail: { iconName: this.selectedIcon },
                    bubbles: true,
                    composed: true
                }));
            }
            // If it's a normal grid item with data-iconurl
            else if (item && item.dataset.iconurl) {
                this.selectedIcon = item.dataset.iconurl;
                this.updateGrid();

                this.dispatchEvent(new CustomEvent('icon-selected', {
                    detail: { iconName: item.dataset.iconurl },
                    bubbles: true,
                    composed: true
                }));
            }
        });
    }

    performSearch() {
        this.filteredIcons = iconService.searchIcons(this.searchQuery, 12);
        this.updateGrid();
    }

    getSelectedIcon(): string {
        return this.selectedIcon;
    }

    setSelectedIcon(iconName: string) {
        this.selectedIcon = iconName;
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
            // ALWAYS show grid container to maintain layout stability
            grid.style.display = 'block';

            if (!this.searchQuery.trim() && !this.isLoading) {
                grid.innerHTML = `<div class="icon-picker__empty">${i18n.t('general.search_icons')}</div>`;
                return;
            }

            if (this.customUrl) {
                grid.innerHTML = `
                    <div class="icon-picker__group">
                        <div class="icon-picker__group-header">${i18n.t('general.custom_url')}</div>
                        <div class="icon-picker__group-grid" style="grid-template-columns: repeat(4, 1fr);">
                            <div class="icon-picker__item" style="grid-column: span 4; display: flex; gap: 12px; padding: 12px;" data-icon="${this.customUrl}">
                                <img src="${this.customUrl}" alt="Custom Icon" style="width: 32px; height: 32px;" />
                                <span style="font-size: 13px; color: var(--text-main); word-break: break-all;">${i18n.t('general.click_to_use_url')}</span>
                            </div>
                        </div>
                    </div>
                `;
                return;
            }

            grid.innerHTML = gridTemplate(this.filteredIcons, this.selectedIcon, this.isLoading);
        }
    }

    disconnectedCallback() {
        if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
    }
}

if (!customElements.get('icon-picker')) {
    customElements.define('icon-picker', IconPicker);
}
