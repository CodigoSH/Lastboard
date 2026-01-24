import { template } from './AddBookmarkModal.template';
import { dashboardStore } from '../../../store/dashboardStore';
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

            console.log('[Modal] Label:', label, 'URL:', url);

            // Get selected icon
            const iconName = this.iconPicker ? this.iconPicker.getSelectedIcon() : '';
            console.log('[Modal] Selected icon:', iconName);

            const iconUrl = iconName
                ? `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${iconName}.png`
                : '';

            // Find next available position
            const state = dashboardStore.getState();

            // Ensure items is an array
            const items = Array.isArray(state.items) ? state.items : [];
            console.log('[Modal] Current items count:', items.length);

            const maxY = items.length > 0
                ? Math.max(0, ...items.map(item => item.y + item.h - 1))
                : 0;

            console.log('[Modal] Creating bookmark at position y:', maxY + 1);

            try {
                await dashboardStore.addItem({
                    type: 'bookmark',
                    x: 1,
                    y: maxY + 1,
                    w: 1,
                    h: 1,
                    content: {
                        label,
                        url,
                        icon: iconUrl,
                        iconName: iconName
                    }
                });

                console.log('[Modal] Bookmark added successfully!');
                this.close();

                // @ts-ignore
                if (window.notifier) window.notifier.show('Bookmark added successfully');
            } catch (error) {
                console.error('[Modal] Error adding bookmark:', error);
                // @ts-ignore
                if (window.notifier) window.notifier.show('Error adding bookmark', 'error');
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
    }

    disconnectedCallback() {
        // Clean up listeners
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
        this.render();
        this.initializeIconPicker();

        // Focus first input
        setTimeout(() => {
            const input = this.shadowRoot!.getElementById('bookmark-label') as HTMLInputElement;
            if (input) {
                input.focus();
                console.log('[Modal] Focused on label input');
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
        setTimeout(() => {
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
        }, 50);
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({ isOpen: this.isOpen })}
        `;
    }
}

if (!customElements.get('add-bookmark-modal')) {
    customElements.define('add-bookmark-modal', AddBookmarkModal);
}
