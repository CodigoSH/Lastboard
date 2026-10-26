import { i18n } from '../../../services/i18n';
import { adoptSharedStyles } from '../../../services/sharedStyles';
import { layoutContainer, gridTemplate } from './IconPicker.template';
import { iconService, IconInfo } from '../../../services/iconService';
import { safeImageSrc } from '../../../services/escape';
import { accessAllows } from '../../../services/access';
import { userStore } from '../../../store/userStore';
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
        adoptSharedStyles(this.shadowRoot);

    }

    async connectedCallback() {

        // Robust check: if shadowRoot has children, we are already initialized
        if (this.shadowRoot!.childElementCount > 0) {

            return;
        }

        this.renderBase();
        this.setupListeners();
    }

    /**
     * Fetch the icon catalogues, and only when someone is about to look at them.
     *
     * This used to run from connectedCallback, which sounds harmless until you
     * follow where the picker is mounted: it sits inside the bookmark modal,
     * and index.ts appends that to the body on every load. So four requests
     * went out — three to jsDelivr, one to the GitHub API — on every single
     * dashboard load, carrying the visitor's address, for a catalogue the grid
     * does not even display until something is typed in the search box.
     *
     * The security page promises that loading your dashboard reports nothing
     * to a CDN, "neither your address nor ... which services you run". The
     * second half held, because picked icons are served from the instance. The
     * first half did not.
     *
     * Safe to call on every open: iconService keeps the catalogue once loaded.
     */
    async ensureIcons() {
        if (this.inputElement) this.inputElement.disabled = !this.mayBrowse();
        if (!this.mayBrowse()) {
            // Nothing is fetched from the catalogues; the grid says so, calmly.
            this.isLoading = false;
            this.updateGrid();
            return;
        }
        if (this.icons.length > 0) return;
        this.isLoading = true;
        this.updateGrid();
        await this.loadIcons();
    }

    /** The catalogues live on the internet and picking from them stores the icon here: a permission of its own. */
    private mayBrowse(): boolean {
        return accessAllows(userStore.getUser(), 'icons_internet');
    }

    async loadIcons() {
        try {

            this.icons = await iconService.loadIcons();
            // Honour whatever is in the search box: the catalogue now travels
            // while the dialog is already open, so the user can be typing.
            this.filteredIcons = iconService.searchIcons(this.searchQuery, 10);
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
                    this.previewElement.innerHTML = `<img src="${safeImageSrc(this.customUrl)}" alt="preview" />`;
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
        this.filteredIcons = iconService.searchIcons(this.searchQuery, 10);
        this.updateGrid();
    }

    /**
     * Returns the picker to how it looks the first time it is opened.
     *
     * The element stays in the DOM between openings — the modal only calls
     * showModal() — so without this the previous search, its results and the
     * pasted-URL preview were all still sitting there, and choosing icons for
     * several containers in a row meant clearing the box by hand every time.
     */
    reset() {
        this.searchQuery = '';
        this.customUrl = null;
        this.selectedIcon = '';
        this.filteredIcons = [];
        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        if (this.inputElement) this.inputElement.value = '';
        if (this.previewElement) {
            this.previewElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-dim);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
        }
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

            if (!this.mayBrowse()) {
                grid.innerHTML = `<div class="icon-picker__empty">${i18n.t('access.icons_not_enabled')}</div>`;
                return;
            }

            if (!this.searchQuery.trim() && !this.isLoading) {
                grid.innerHTML = `<div class="icon-picker__empty">${i18n.t('general.search_icons')}</div>`;
                return;
            }

            if (this.customUrl) {
                grid.innerHTML = `
                    <div class="icon-picker__group">
                        <div class="icon-picker__group-header">${i18n.t('general.custom_url')}</div>
                        <div class="icon-picker__group-grid" style="grid-template-columns: repeat(4, 1fr);">
                            <div class="icon-picker__item" style="grid-column: span 4; display: flex; gap: 12px; padding: 12px;" data-icon="${safeImageSrc(this.customUrl)}">
                                <img src="${safeImageSrc(this.customUrl)}" alt="${i18n.t('general.custom_url')}" style="width: 32px; height: 32px;" />
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
