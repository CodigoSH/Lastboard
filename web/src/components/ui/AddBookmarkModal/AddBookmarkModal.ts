import { template } from './AddBookmarkModal.template';
import { dashboardStore } from '../../../store/dashboardStore';
import { i18n } from '../../../services/i18n';
import '../IconPicker/IconPicker';
// @ts-ignore
import css from './AddBookmarkModal.css' with { type: 'text' };

class AddBookmarkModal extends HTMLElement {
    private isOpen: boolean = false;
    private iconPicker: any = null;
    private selectedIconName: string = '';
    private clickHandler: any = null;
    private submitHandler: any = null;
    private escapeHandler: any = null;
    private _unsubscribeI18n: (() => void) | undefined;

    // Edit Mode State
    private isEditMode: boolean = false;
    private currentItemId: number | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.setupHandlers();
    }

    setupHandlers() {
        // Create handlers once to avoid multiple event listeners
        this.clickHandler = (e: Event) => {
            const target = e.target as HTMLElement;

            // Close on overlay click
            if (target.id === 'modal-overlay') {
                console.log('[Modal] Overlay clicked - closing');
                this.close();
                return;
            }

            // Close button
            if (target.id === 'modal-close' || target.id === 'btn-cancel') {
                console.log('[Modal] Cancel/Close clicked');
                e.preventDefault();
                e.stopPropagation();
                this.close();
                return;
            }
        };

        this.submitHandler = async (e: Event) => {
            e.preventDefault();
            e.stopPropagation();

            console.log('[Modal] Form submitted!');

            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);

            const label = formData.get('label') as string;
            const url = formData.get('url') as string;
            const statusCheck = formData.get('statusCheck') === 'on';

            console.log('[Modal] Label:', label, 'URL:', url, 'Status:', statusCheck);

            // Get selected icon
            const iconName = this.iconPicker ? this.iconPicker.getSelectedIcon() : '';
            console.log('[Modal] Selected icon:', iconName);

            const iconUrl = iconName
                ? `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${iconName}.png`
                : '';

            try {
                const content = JSON.stringify({
                    label,
                    url,
                    icon: iconUrl,
                    iconName: iconName,
                    statusCheck
                });

                if (this.isEditMode && this.currentItemId) {
                    await dashboardStore.updateItem({
                        id: this.currentItemId,
                        content: content
                    });
                    // @ts-ignore
                    if (window.notifier) window.notifier.show(i18n.t('notifier.bookmark_updated'));
                } else {
                    // Logic for Adding New Bookmarks
                    const state = dashboardStore.getState();
                    const items = Array.isArray(state.items) ? state.items : [];

                    // @ts-ignore
                    import('../../../services/collisionService').then(async ({ collisionService }) => {
                        const slot = collisionService.findFirstAvailableSlot(1, 1, items);

                        await dashboardStore.addItem({
                            type: 'bookmark',
                            x: slot.x,
                            y: slot.y,
                            w: 1,
                            h: 1,
                            content: content
                        });
                        // @ts-ignore
                        if (window.notifier) window.notifier.show(i18n.t('notifier.bookmark_added'));
                    });
                }
                console.log('[Modal] Operation successful!');
                this.close();
            } catch (error) {
                console.error('[Modal] Error:', error);
                // @ts-ignore
                if (window.notifier) window.notifier.show(i18n.t('notifier.bookmark_error'), 'error');
            }
        };

        this.escapeHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.isOpen) {
                console.log('[Modal] Escape pressed - closing');
                this.close();
            }
        };
    }

    connectedCallback() {
        this.render();
        this.setupListeners();
        // Subscribe to language changes
        this._unsubscribeI18n = i18n.subscribe(() => {
            if (this.isOpen) this.render();
        });
    }

    disconnectedCallback() {
        // Clean up listeners
        if (this._unsubscribeI18n) this._unsubscribeI18n();
        const root = this.shadowRoot!;
        if (this.clickHandler) {
            root.removeEventListener('click', this.clickHandler);
        }
        if (this.submitHandler) {
            root.removeEventListener('submit', this.submitHandler);
        }
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }
    }

    setupListeners() {
        const root = this.shadowRoot!;

        // Use event delegation - add listeners once and they survive re-renders
        root.addEventListener('click', this.clickHandler);
        root.addEventListener('submit', this.submitHandler);
        document.addEventListener('keydown', this.escapeHandler);
    }

    open() {
        console.log('[Modal] Opening modal');
        this.isOpen = true;
        this.isEditMode = false;
        this.currentItemId = null;
        this.render();
        this.initializeIconPicker();
        // Focus first input
        setTimeout(() => {
            const input = this.shadowRoot!.getElementById('bookmark-label') as HTMLInputElement;
            if (input) input.focus();
        }, 100);
    }

    openForEdit(item: any) {
        console.log('[Modal] Opening for edit', item);
        this.isOpen = true;
        this.isEditMode = true;
        this.currentItemId = item.id;

        // Parse content
        let content = item.content;
        if (typeof content === 'string') {
            try {
                content = JSON.parse(content);
            } catch (e) { console.error('Failed to parse item content', e); }
        }

        this.selectedIconName = content.iconName || '';
        this.render();
        this.initializeIconPicker();

        // Populate Form
        setTimeout(() => {
            const form = this.shadowRoot!.getElementById('bookmark-form') as HTMLFormElement;
            if (form) {
                const labelInput = form.elements.namedItem('label') as HTMLInputElement;
                const urlInput = form.elements.namedItem('url') as HTMLInputElement;
                const statusInput = form.elements.namedItem('statusCheck') as HTMLInputElement;

                if (labelInput) labelInput.value = content.label || '';
                if (urlInput) urlInput.value = content.url || '';
                if (statusInput) statusInput.checked = !!content.statusCheck;
            }
            if (this.iconPicker) {
                this.iconPicker.setSelectedIcon(this.selectedIconName);
            }
        }, 100);
    }

    close() {
        console.log('[Modal] Closing modal');
        this.isOpen = false;
        this.selectedIconName = '';
        this.resetForm();
        this.render();
    }

    resetForm() {
        setTimeout(() => {
            const form = this.shadowRoot!.getElementById('bookmark-form') as HTMLFormElement;
            if (form) form.reset();
            if (this.iconPicker) {
                this.iconPicker.setSelectedIcon('');
            }
        }, 100);
    }

    initializeIconPicker() {
        // Ejecutar inmediatamente, el requestAnimationFrame es suficiente
        requestAnimationFrame(() => {
            const container = this.shadowRoot!.getElementById('icon-picker-container');
            if (!container) {
                console.error('[Modal] Icon picker container not found');
                return;
            }

            // Create icon picker if not exists
            if (!this.iconPicker) {
                this.iconPicker = document.createElement('icon-picker');
                this.iconPicker.addEventListener('icon-selected', (e: CustomEvent) => {
                    this.selectedIconName = e.detail.iconName;
                    console.log('[Modal] Icon selected:', this.selectedIconName);
                });
            }

            container.innerHTML = '';
            container.appendChild(this.iconPicker);
            console.log('[Modal] Icon picker initialized');
        });
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({ isOpen: this.isOpen, isEditMode: this.isEditMode })}
        `;
    }
}

if (!customElements.get('add-bookmark-modal')) {
    customElements.define('add-bookmark-modal', AddBookmarkModal);
}
