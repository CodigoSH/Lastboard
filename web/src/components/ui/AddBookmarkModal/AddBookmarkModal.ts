import { template } from './AddBookmarkModal.template';
import { dashboardStore } from '../../../store/dashboardStore';
import { i18n } from '../../../services/i18n';
import '../IconSelectionModal/IconSelectionModal'; // Import the new modal
// @ts-ignore
import css from './AddBookmarkModal.css' with { type: 'text' };

class AddBookmarkModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;

    // State
    private isEditMode: boolean = false;
    private currentItemId: number | null = null;

    private bookmarkTitle: string = '';
    private url: string = '';
    private protocol: string = 'http://';
    private selectedIconName: string | null = null;
    private color: string = '#333333';
    private statusPosition: string = 'top-right';
    private checkStatus: boolean = false;
    private labelPosition: string = 'bottom';
    private visibleTouch: boolean = true;

    private _unsubscribeI18n: (() => void) | undefined;

    // Event Handlers
    private clickHandler: any = null;
    private submitHandler: any = null;
    private escapeHandler: any = null;
    private inputHandler: any = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.setupHandlers();
    }

    setupHandlers() {
        this.clickHandler = async (e: Event) => {
            const target = e.target as HTMLElement;

            // Close button (X)
            if (target.closest('#modal-close')) {
                e.preventDefault();
                this.close();
                return;
            }

            // Tab Switching
            if (target.classList.contains('tab-btn')) {
                e.preventDefault();
                const tabName = target.dataset.tab;
                this.switchTab(tabName!);
            }

            // Icon Trigger (Open Icon Modal)
            if (target.closest('#icon-trigger-btn')) {
                e.preventDefault();
                const iconModal = this.shadowRoot!.getElementById('icon-modal-component') as any;
                if (iconModal) {
                    const selected = await iconModal.open();
                    if (selected) {
                        this.selectedIconName = selected;
                        this.updateIconPreview();
                    }
                }
            }

            // Dropdown Toggles with Smart Positioning
            if (target.closest('#label-pos-btn')) {
                e.preventDefault(); e.stopPropagation();
                this.toggleDropdown('label-pos-menu', target.closest('#label-pos-btn') as HTMLElement);
            } else if (target.closest('#status-pos-btn')) {
                e.preventDefault(); e.stopPropagation();
                this.toggleDropdown('status-pos-menu', target.closest('#status-pos-btn') as HTMLElement);
            } else if (target.closest('#touch-pos-btn')) {
                e.preventDefault(); e.stopPropagation();
                this.toggleDropdown('touch-pos-menu', target.closest('#touch-pos-btn') as HTMLElement);
            } else if (target.closest('#protocol-btn')) {
                e.preventDefault(); e.stopPropagation();
                this.toggleDropdown('protocol-menu', target.closest('#protocol-btn') as HTMLElement);
            } else {
                this.closeAllDropdowns();
            }

            // Dropdown Selection
            const dropdownItem = target.closest('.dropdown-item');
            if (dropdownItem) {
                e.preventDefault(); e.stopPropagation();
                const el = dropdownItem as HTMLElement;

                if (el.dataset.pos) {
                    this.labelPosition = el.dataset.pos!;
                    this.updateTriggers();
                }
                if (el.dataset.statusPos) {
                    const val = el.dataset.statusPos!;
                    if (val === 'off') {
                        this.checkStatus = false;
                    } else {
                        this.checkStatus = true;
                        this.statusPosition = val;
                    }
                    this.updateTriggers();
                }
                if (el.dataset.touch) {
                    this.visibleTouch = el.dataset.touch === 'on';
                    this.updateTriggers();
                }
                if (el.dataset.protocol) {
                    this.protocol = el.dataset.protocol!;
                    this.updateTriggers();
                }
            }
        };

        this.inputHandler = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.id === 'bookmark-label') this.bookmarkTitle = target.value;
            if (target.id === 'bookmark-url') this.url = target.value;
            if (target.id === 'bookmark-borderColor') this.color = target.value;
        };

        this.submitHandler = async (e: Event) => {
            e.preventDefault();

            // Re-read values just in case (though state should be consistent)
            const iconUrl = this.selectedIconName
                ? `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${this.selectedIconName}.png`
                : '';

            const content = JSON.stringify({
                label: this.bookmarkTitle,
                url: this.protocol + this.url.replace(/^https?:\/\//, ''),
                description: '',
                icon: iconUrl,
                iconName: this.selectedIconName,
                statusCheck: this.checkStatus,
                statusPos: this.checkStatus ? this.statusPosition : 'off',
                visibleTouch: this.visibleTouch,
                openInNewTab: true,
                labelPos: this.labelPosition,
                borderColor: this.color
            });

            try {
                if (this.isEditMode && this.currentItemId) {
                    await dashboardStore.updateItem({
                        id: this.currentItemId,
                        content: content
                    });
                    // @ts-ignore
                    if (window.notifier) window.notifier.show(i18n.t('notifier.bookmark_updated'));
                } else {
                    const { collisionService } = await import('../../../services/collisionService');
                    const state = dashboardStore.getState();
                    const items = Array.isArray(state.items) ? state.items : [];
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
                }
                this.close();
            } catch (error) {
                console.error('[Modal] Error:', error);
                // @ts-ignore
                if (window.notifier) window.notifier.show(i18n.t('notifier.bookmark_error'), 'error');
            }
        };

        this.escapeHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                const iconModal = this.shadowRoot!.querySelector('icon-selection-modal') as any;
                // If icon modal is not open (implemented via check or assumption), close this one
                // Simple logic: Close main modal on Escape. 
                // Note: The icon modal handles its own escape natively via <dialog> usually, 
                // but we might need to check if it's open to prevent double closing. 
                // For now, simple close logic.
                if (this.dialog?.open) this.close();
            }
        };
    }

    // --- Targeted UI Updates to avoid full render() ---
    updateTriggers() {
        const root = this.shadowRoot!;

        // Update Label Position Trigger
        const labelBtn = root.getElementById('label-pos-btn');
        if (labelBtn) {
            labelBtn.innerHTML = `
                ${this.labelPosition === 'top' ?
                    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M8 8 h8" /><path d="M12 13 v2" /></svg>` :
                    this.labelPosition === 'section' ?
                        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M7 4 h10" stroke-width="4" /></svg>` :
                        this.labelPosition === 'off' ?
                            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>` :
                            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M8 16 h8" /><path d="M12 9 v2" /></svg>`
                }
                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="position: absolute; bottom: 1px; right: 1px; opacity: 0.7;">
                    <path d="M7 10l5 5 5-5z" />
                </svg>
            `;
            const input = root.getElementById('bookmark-labelPos') as HTMLInputElement;
            if (input) input.value = this.labelPosition;

            // Sync selected class in menu
            root.querySelectorAll('#label-pos-menu .dropdown-item').forEach(el => {
                el.classList.toggle('selected', (el as HTMLElement).dataset.pos === this.labelPosition);
            });
        }

        // Update Status Position Trigger
        const statusBtn = root.getElementById('status-pos-btn');
        if (statusBtn) {
            statusBtn.innerHTML = `
                ${this.checkStatus ?
                    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" />
                        ${this.statusPosition.includes('top') ? '<circle cx="16" cy="8" r="2" fill="currentColor"/>' : '<circle cx="16" cy="16" r="2" fill="currentColor"/>'}
                    </svg>` :
                    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /></svg>`
                }
                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="position: absolute; bottom: 1px; right: 1px; opacity: 0.7;">
                    <path d="M7 10l5 5 5-5z" />
                </svg>
            `;
            const input = root.getElementById('bookmark-statusPos') as HTMLInputElement;
            if (input) input.value = this.checkStatus ? this.statusPosition : 'off';

            // Sync selected class in menu
            root.querySelectorAll('#status-pos-menu .dropdown-item').forEach(el => {
                const val = (el as HTMLElement).dataset.statusPos;
                const isSelected = val === 'off' ? !this.checkStatus : (this.checkStatus && val === this.statusPosition);
                el.classList.toggle('selected', isSelected);
            });
        }

        // Update Protocol Trigger
        const protocolText = root.getElementById('protocol-text');
        if (protocolText) {
            protocolText.textContent = this.protocol;
            const input = root.getElementById('bookmark-protocol') as HTMLInputElement;
            if (input) input.value = this.protocol;

            root.querySelectorAll('#protocol-menu .dropdown-item').forEach(el => {
                el.classList.toggle('selected', (el as HTMLElement).dataset.protocol === this.protocol);
            });
        }

        // Update Touch Visibility
        const touchBtn = root.getElementById('touch-pos-btn');
        if (touchBtn) {
            touchBtn.innerHTML = `
                ${this.visibleTouch ?
                    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2" stroke-opacity="0.5" /><path d="M12 18h.01" stroke-width="3" stroke-linecap="round" /></svg>` :
                    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2" stroke-opacity="0.5" /><path d="M12 18h.01" stroke-width="3" stroke-linecap="round" /><path d="M5 5l14 14" opacity="0.7" /></svg>`
                }
                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="position: absolute; bottom: 1px; right: 1px; opacity: 0.7;">
                    <path d="M7 10l5 5 5-5z" />
                </svg>
            `;
            const input = root.getElementById('bookmark-visibleTouch') as HTMLInputElement;
            if (input) input.value = this.visibleTouch ? 'on' : 'off';

            root.querySelectorAll('#touch-pos-menu .dropdown-item').forEach(el => {
                const val = (el as HTMLElement).dataset.touch;
                el.classList.toggle('selected', (val === 'on' && this.visibleTouch) || (val === 'off' && !this.visibleTouch));
            });
        }
    }

    updateIconPreview() {
        const root = this.shadowRoot!;
        const btn = root.getElementById('icon-trigger-btn');
        if (btn) {
            btn.innerHTML = this.selectedIconName ?
                `<img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${this.selectedIconName}.png" alt="icon" style="width: 24px; height: 24px; object-fit: contain;">` :
                `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
        }
    }

    // --- Dropdown Logic with Smart Positioning ---
    toggleDropdown(id: string, triggerBtn: HTMLElement) {
        this.closeAllDropdowns(id); // Close others
        const menu = this.shadowRoot!.getElementById(id);
        if (!menu) {
            return;
        }

        // Toggle
        const isShowing = menu.classList.toggle('show');

        if (isShowing) {
            // Position Helper logic
            requestAnimationFrame(() => {
                const modalRect = this.dialog!.getBoundingClientRect();
                const triggerRect = triggerBtn.getBoundingClientRect();

                // Calculate position relative to dialog (since menu-overlay is absolute to dialog)
                // Left: relative to dialog
                let left = triggerRect.left - modalRect.left;

                // Top: below the button
                let top = triggerRect.bottom - modalRect.top + 4; // 4px gap

                // Check if it goes off bottom (simple check, can be improved)
                // If we are very low in the modal, we might want to drop up?
                // For now, let's just stick to drop down as requested, but since it's an overlay
                // it will just protrude. If the user wants to force drop up later we can add it.
                // But user specifically said "it will protrude".

                menu.style.left = `${left}px`;
                menu.style.top = `${top}px`;
                menu.style.minWidth = `${triggerRect.width}px`; // Match button width at minimum
            });
        }
    }

    closeAllDropdowns(exceptId: string | null = null) {
        const ids = ['label-pos-menu', 'status-pos-menu', 'touch-pos-menu', 'protocol-menu'];
        ids.forEach(id => {
            if (id !== exceptId) {
                const menu = this.shadowRoot!.getElementById(id);
                menu?.classList.remove('show');
            }
        });
    }

    switchTab(tabName: string) {
        const root = this.shadowRoot!;
        root.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tabName);
        });
        root.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
    }

    connectedCallback() {
        this.render();
        // Subscribe to language changes
        this._unsubscribeI18n = i18n.subscribe(() => {
            if (this.dialog?.open) this.render();
        });
    }

    disconnectedCallback() {
        if (this._unsubscribeI18n) this._unsubscribeI18n();
        const root = this.shadowRoot!;
        if (this.clickHandler) root.removeEventListener('click', this.clickHandler);
        if (this.submitHandler) root.removeEventListener('submit', this.submitHandler);
        if (this.inputHandler) root.removeEventListener('input', this.inputHandler);
        if (this.escapeHandler) document.removeEventListener('keydown', this.escapeHandler);
    }

    render() {
        // Save focus if needed, or simple re-render
        // Ideally we use a vDOM, but full HTML replacement is fast enough here
        // We must re-bind listeners after render

        const wasOpen = this.dialog?.open;

        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({
            isOpen: true,
            isEditMode: this.isEditMode,
            title: this.bookmarkTitle,
            url: this.url,
            protocol: this.protocol,
            selectedIcon: this.selectedIconName,
            color: this.color,
            statusPosition: this.statusPosition,
            checkStatus: this.checkStatus,
            labelPosition: this.labelPosition,
            visibleTouch: this.visibleTouch
        })}
        `;

        this.dialog = this.shadowRoot!.getElementById('modal') as HTMLDialogElement;

        // Re-attach listeners
        const root = this.shadowRoot!;
        root.addEventListener('click', this.clickHandler);
        root.addEventListener('submit', this.submitHandler);
        root.addEventListener('input', this.inputHandler);

        // Restore open state
        if (wasOpen) this.dialog?.showModal();
    }

    open() {
        this.resetState();
        this.isEditMode = false;
        this.render();
        this.dialog?.showModal();
    }

    openForEdit(item: any) {
        this.isEditMode = true;
        this.currentItemId = item.id;

        let content = item.content;
        if (typeof content === 'string') {
            try { content = JSON.parse(content); } catch (e) { console.error(e); }
        }

        // Populate State
        this.bookmarkTitle = content.label || '';
        this.selectedIconName = content.iconName || '';
        this.color = content.borderColor || '#333333';
        this.labelPosition = content.labelPos || 'bottom';
        this.visibleTouch = (content.visibleTouch !== false);

        // URL parsing
        let fullUrl = content.url || '';
        if (fullUrl.startsWith('https://')) {
            this.protocol = 'https://';
            this.url = fullUrl.substring(8);
        } else if (fullUrl.startsWith('http://')) {
            this.protocol = 'http://';
            this.url = fullUrl.substring(7);
        } else {
            this.protocol = 'http://';
            this.url = fullUrl;
        }

        // Status
        if (content.statusPos && content.statusPos !== 'off') {
            this.checkStatus = true;
            this.statusPosition = content.statusPos;
        } else {
            this.checkStatus = false;
            this.statusPosition = 'top-right';
        }

        this.render();
        this.dialog?.showModal();
    }

    close() {
        this.dialog?.close();
        this.resetState();
    }

    resetState() {
        this.bookmarkTitle = '';
        this.url = '';
        this.protocol = 'http://';
        this.selectedIconName = null;
        this.color = '#333333';
        this.statusPosition = 'top-right';
        this.checkStatus = false;
        this.labelPosition = 'bottom';
        this.visibleTouch = true;
        this.currentItemId = null;
    }
}

if (!customElements.get('add-bookmark-modal')) {
    customElements.define('add-bookmark-modal', AddBookmarkModal);
}
