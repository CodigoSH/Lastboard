import { template } from './AddBookmarkModal.template';
import { adoptSharedStyles } from '../../../services/sharedStyles';
import { dashboardStore } from '../../../store/dashboardStore';
import { i18n } from '../../../services/i18n';
import { loadProxmox, allGuests } from '../../../services/proxmoxApi';
import { safeImageSrc } from '../../../services/escape';
import { iconForEdit, resolveIconUrl } from '../../../services/iconUrl';
import { apiService } from '../../../services/apiService';
import { materializeIcon } from '../../../services/iconStore';
import { accessAllows } from '../../../services/access';
import { userStore } from '../../../store/userStore';
import '../IconSelectionModal/IconSelectionModal'; // Import the new modal
import '../ColorPicker/ColorPicker';
import '../Select/Select';
import css from './AddBookmarkModal.css' with { type: 'text' };

const premiumColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#64748b', '#f8fafc', '#1e293b', '#333333'
];

class AddBookmarkModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;

    // State
    private isEditMode: boolean = false;
    private currentItemId: number | null = null;

    private bookmarkTitle: string = '';
    private url: string = '';
    private protocol: string = 'http://';
    private selectedIconName: string | null = null;
    private color: string = '';
    private statusPosition: string = 'top-right';
    private checkStatus: boolean = false;
    private labelPosition: string = 'bottom';
    private visibleTouch: boolean = true;
    private borderWidth: number = 1;
    /** The machine that serves this bookmark, if its owner said so. */
    /** The machine this bookmark is served by, and on which hypervisor. */
    private proxmox: { host: string; node: string; kind: string; vmid: number } | null = null;

    private _unsubscribeI18n: (() => void) | undefined;

    // Event Handlers
    private clickHandler: any = null;
    private submitHandler: any = null;
    private escapeHandler: any = null;
    private inputHandler: any = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
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

            // Premium Color Swatch Selection
            const premiumSwatch = target.closest('.premium-color-swatch');
            if (premiumSwatch && !premiumSwatch.classList.contains('premium-color-swatch--custom')) {
                e.preventDefault();
                this.color = (premiumSwatch as HTMLElement).dataset.color!;
                this.updateTriggers();
                return;
            }

            // Border Width Selection
            const widthBtn = target.closest('.border-width-btn');
            if (widthBtn) {
                e.preventDefault();
                this.borderWidth = parseInt((widthBtn as HTMLElement).dataset.width!);
                this.updateTriggers();
                return;
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
            if (target.id === 'bookmark-url') {
                const value = target.value;
                if (value.startsWith('https://')) {
                    this.protocol = 'https://';
                    this.url = value.substring(8);
                    target.value = this.url;
                    this.updateTriggers();
                } else if (value.startsWith('http://')) {
                    this.protocol = 'http://';
                    this.url = value.substring(7);
                    target.value = this.url;
                    this.updateTriggers();
                } else {
                    this.url = value;
                }
            }
            if (target.id === 'bookmark-borderColor') {
                this.color = target.value;
                this.updateTriggers();
            }
        };

        this.submitHandler = async (e: Event) => {
            e.preventDefault();

            // Re-read values just in case (though state should be consistent).
            // The icon is downloaded here, once, so the board never asks a CDN
            // for it again; if that fails the original URL is kept and the
            // bookmark saves exactly as before.
            const pxSel = this.shadowRoot?.getElementById('bookmark-proxmox') as (HTMLElement & { value: string }) | null;
            if (pxSel) {
                const v = pxSel.value;
                if (!v) {
                    this.proxmox = null;
                } else {
                    const [host, node, kind, vmid] = v.split('|');
                    this.proxmox = { host, node, kind, vmid: Number(vmid) };
                }
            }

            const iconUrl = await materializeIcon(resolveIconUrl(this.selectedIconName));

            // The machine↔bookmark index is cached across boards; a bookmark
            // that just changed hands has to rebuild it.
            const { clearProxmoxLinks } = await import('../../../services/proxmoxLinks');
            clearProxmoxLinks();

            const content = JSON.stringify({
                label: this.bookmarkTitle,
                url: this.protocol + this.url.replace(/^https?:\/\//, ''),
                description: '',
                icon: iconUrl,
                iconName: this.selectedIconName,
                statusCheck: this.checkStatus,
                // Only written when there is one, so a board without Proxmox
                // keeps exactly the content it had before this existed.
                ...(this.proxmox ? { proxmox: this.proxmox } : {}),
                statusPos: this.checkStatus ? this.statusPosition : 'off',
                visibleTouch: this.visibleTouch,
                openInNewTab: true,
                labelPos: this.labelPosition,
                borderColor: this.color,
                borderWidth: this.borderWidth
            });

            try {
                if (this.isEditMode && this.currentItemId) {
                    await dashboardStore.updateItem({
                        id: this.currentItemId,
                        content: content
                    });
                    if (window.notifier) window.notifier.show(i18n.t('notifier.bookmark_updated'));
                } else {
                    const { collisionService } = await import('../../../services/collisionService');
                    const state = dashboardStore.getState();
                    const items = Array.isArray(state.items) ? state.items : [];
                    const slot = collisionService.findCompactPosition(1, 1, items, 12);

                    await dashboardStore.addItem({
                        type: 'bookmark',
                        x: slot.x,
                        y: slot.y,
                        w: 1,
                        h: 1,
                        content: content
                    });
                    if (window.notifier) window.notifier.show(i18n.t('notifier.bookmark_added'));
                }
                this.close();
            } catch (error) {
                console.error('[Modal] Error:', error);
                if (window.notifier) window.notifier.show(i18n.t('notifier.bookmark_error'), 'error');
            }
        };

        this.escapeHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
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
                        <circle cx="${this.statusPosition.includes('left') ? '8' : '16'}" cy="${this.statusPosition.includes('top') ? '8' : '16'}" r="2" fill="currentColor"/>
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

        // Update Border Width Selection
        root.querySelectorAll('.border-width-btn').forEach(btn => {
            const w = parseInt((btn as HTMLElement).dataset.width!);
            btn.classList.toggle('active', w === this.borderWidth);
        });

        // Update Color Grid Selection
        root.querySelectorAll('.premium-color-swatch').forEach(swatch => {
            const el = swatch as HTMLElement;
            const color = el.dataset.color;

            if (color) {
                // Preset Swatch
                if (color === this.color) {
                    el.classList.add('active');
                    if (!el.querySelector('svg')) {
                        el.innerHTML += '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>';
                    }
                } else {
                    el.classList.remove('active');
                    const svg = el.querySelector('svg');
                    if (svg) svg.remove();
                }
            } else if (el.classList.contains('premium-color-swatch--custom')) {
                // Custom Swatch
                const isCustom = !premiumColors.includes(this.color) && this.color !== '';
                el.classList.toggle('active', isCustom);

                const svg = el.querySelector('svg');
                if (svg) svg.style.fill = isCustom ? '#fff' : 'rgba(255,255,255,0.4)';

                const input = root.getElementById('bookmark-borderColor') as HTMLInputElement;
                if (input && isCustom) input.value = this.color;

                if (isCustom) el.style.backgroundColor = this.color;
                else el.style.backgroundColor = '#333';
            }
        });
    }

    updateIconPreview() {
        const root = this.shadowRoot!;
        const btn = root.getElementById('icon-trigger-btn');
        if (btn) {
            if (this.selectedIconName) {
                const iconUrl = resolveIconUrl(this.selectedIconName);
                btn.innerHTML = `<img src="${safeImageSrc(iconUrl)}" alt="icon" style="width: 24px; height: 24px; object-fit: contain;">`;
            } else {
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
            }
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
            requestAnimationFrame(() => {
                const modalRect = this.dialog!.getBoundingClientRect();
                const triggerRect = triggerBtn.getBoundingClientRect();

                // Calculate position relative to dialog
                let left = triggerRect.left - modalRect.left;
                let top = triggerRect.bottom - modalRect.top + 4; // 4px gap

                menu.style.left = `${left}px`;
                menu.style.top = `${top}px`;
                menu.style.minWidth = `${triggerRect.width}px`;
            });
        }
    }

    closeAllDropdowns(exceptId: string | null = null) {
        const ids = ['label-pos-menu', 'status-pos-menu', 'touch-pos-menu', 'protocol-menu', 'color-menu'];
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
        const wasOpen = this.dialog?.open;

        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({
            title: this.bookmarkTitle,
            url: this.url,
            protocol: this.protocol,
            selectedIcon: this.selectedIconName,
            color: this.color,
            statusPosition: this.statusPosition,
            checkStatus: this.checkStatus,
            labelPosition: this.labelPosition,
            visibleTouch: this.visibleTouch,
            borderWidth: this.borderWidth,
            // The up/down dot is the account's to use or not.
            canWatch: accessAllows(userStore.getUser(), 'watch_status')
        })}
        `;

        this.dialog = this.shadowRoot!.getElementById('modal') as HTMLDialogElement;

        // Re-attach listeners
        const root = this.shadowRoot!;
        root.addEventListener('click', this.clickHandler);
        root.addEventListener('submit', this.submitHandler);
        root.addEventListener('input', this.inputHandler);

        this.fillProxmoxChoices();

        // Restore open state
        if (wasOpen) this.dialog?.showModal();
    }

    /**
     * Fills the "backed by" list from the hypervisor, and leaves the field
     * hidden when there is nothing to fill it with.
     *
     * This is what turns a bookmark into something the Proxmox page can explain:
     * without it, a stopped container is just a stopped container, and nobody
     * can be told which of their services went down with it.
     */
    private async fillProxmoxChoices() {
        const group = this.shadowRoot?.getElementById('proxmox-group') as HTMLElement | null;
        const sel = this.shadowRoot?.getElementById('bookmark-proxmox') as
            (HTMLElement & { value: string; options: { value: string; label: string }[]; searchable: boolean }) | null;
        if (!group || !sel) return;
        // It stays hidden, as it starts, for an account without Proxmox.
        // Nor before the account is known: nothing is taken away without a user, and nothing is asked either.
        const who = userStore.getUser();
        if (!who || !accessAllows(who, 'proxmox_view')) return;
        try {
            // Ask the cheap question first. Going straight to the overview made
            // every board without Proxmox log a failed request each time this
            // modal opened — our own noise in a console people read to find
            // real problems. This endpoint answers for any account allowed to
            // see Proxmox and never calls the hypervisor.
            const cfg = await apiService.get<{ enabled: boolean }>('/api/proxmox/settings');
            if (!cfg?.enabled) return;

            // Every connected hypervisor: the machine somebody wants to name
            // may well be on the second one.
            const hosts = await loadProxmox();
            const guests = allGuests(hosts);
            if (!guests.length) return;
            // Two hypervisors can both hold a machine 106, so the row says
            // which one — but only when there is more than one to confuse.
            const several = hosts.length > 1;

            const chosen = this.proxmox
                ? `${this.proxmox.host || ''}|${this.proxmox.node}|${this.proxmox.kind}|${this.proxmox.vmid}`
                : '';
            // Searchable, because a real host has twenty-nine of these and the
            // one you want is the one you can already name.
            sel.searchable = guests.length > 8;
            sel.options = [{ value: '', label: i18n.t('bookmark.backed_by_auto') }].concat(
                [...guests]
                    .sort((a, b) => a.vmid - b.vmid)
                    .map(g => ({
                        value: `${g.host}|${g.node}|${g.kind}|${g.vmid}`,
                        label: `${g.name} · ${g.kind === 'lxc' ? 'LXC' : 'VM'} ${g.vmid}`
                            + (several ? ` · ${g.hostName}` : ''),
                    })),
            );
            sel.value = chosen;
            group.style.display = '';
        } catch {
            /* No hypervisor, or not configured: the field simply never appears. */
        }
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
        this.selectedIconName = iconForEdit(content);
        this.color = content.borderColor || '';
        this.labelPosition = content.labelPos || 'bottom';
        this.visibleTouch = (content.visibleTouch !== false);
        this.borderWidth = content.borderWidth || 1;
        this.proxmox = (content.proxmox && content.proxmox.vmid)
            ? {
                host: content.proxmox.host || '',
                node: content.proxmox.node || '',
                kind: content.proxmox.kind || 'lxc',
                vmid: Number(content.proxmox.vmid),
            }
            : null;

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
        this.color = '';
        this.statusPosition = 'top-right';
        this.checkStatus = false;
        this.labelPosition = 'bottom';
        this.visibleTouch = true;
        this.borderWidth = 1;
        this.currentItemId = null;
    }
}

if (!customElements.get('add-bookmark-modal')) {
    customElements.define('add-bookmark-modal', AddBookmarkModal);
}
