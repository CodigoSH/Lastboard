import { userStore } from '../../../store/userStore';
import { template } from './RightDrawer.template';
import { i18n } from '../../../services/i18n';
// @ts-ignore
import css from './RightDrawer.css' with { type: 'text' };

class RightDrawer extends HTMLElement {
    isOpen: boolean;
    selectedSection: string | null;
    _unsubscribe: (() => void) | undefined;
    _unsubscribeI18n: (() => void) | undefined;
    _keydownHandler: ((e: KeyboardEvent) => void) | undefined;

    updateAvailable: boolean;
    _unsubscribeDashboard: (() => void) | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isOpen = false;
        this.selectedSection = null;
        this.updateAvailable = false;
    }

    connectedCallback() {
        this.render();
        this.setupListeners();

        // Subscribe to user changes
        // @ts-ignore
        this._unsubscribe = userStore.subscribe((user) => {
            if (this.isOpen) this.render();
        });

        // Subscribe to dashboard changes (for updates)
        import('../../../store/dashboardStore').then(({ dashboardStore }) => {
            this._unsubscribeDashboard = dashboardStore.subscribe((state) => {
                if (this.updateAvailable !== state.updateAvailable) {
                    this.updateAvailable = state.updateAvailable;
                    this.render();
                }
            });
        });

        // Subscribe to i18n changes
        this._unsubscribeI18n = i18n.subscribe(() => {
            this.render();
        });
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
        if (this._unsubscribeDashboard) this._unsubscribeDashboard();
        if (this._unsubscribeI18n) this._unsubscribeI18n();
        if (this._keydownHandler) {
            window.removeEventListener('keydown', this._keydownHandler);
        }
    }

    open() {
        this.isOpen = true;
        this.setAttribute('open', '');
        this.render();
        document.body.style.overflow = 'hidden';
        this.dispatchEvent(new CustomEvent('drawer-open', { bubbles: true, composed: true }));
    }

    close() {
        this.isOpen = false;
        this.removeAttribute('open');
        this.selectedSection = null;
        this.render();
        document.body.style.overflow = '';
        this.dispatchEvent(new CustomEvent('drawer-close', { bubbles: true, composed: true }));
    }

    selectSection(section: string) {
        if (this.selectedSection === section) {
            this.selectedSection = null;
        } else {
            this.selectedSection = section;
        }
        this.render();
    }

    async performLogout() {
        const csrfMatch = document.cookie.split('; ').find(c => c.startsWith('csrf_token='));
        const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch.split('=')[1]) : '';
        try {
            await fetch('/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } });
        } catch (e) { /* ignore */ }
        document.body.style.opacity = '0';
        window.location.href = '/login';
    }

    setupListeners() {
        this.shadowRoot!.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('right-drawer__overlay')) {
                this.close();
            }

            if (target.closest('#logout-btn')) {
                e.preventDefault();
                this.performLogout();
                return;
            }

            const menuItem = target.closest('.right-drawer__menu-item') as HTMLElement;
            if (menuItem && menuItem.dataset.section) {
                e.preventDefault();
                this.selectSection(menuItem.dataset.section);
            }
        });

        this._keydownHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        window.addEventListener('keydown', this._keydownHandler);
    }

    render() {
        // @ts-ignore
        const user = userStore.getUser() || { username: 'Guest', initials: '??', role: 'Viewer' };

        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({ user, isOpen: this.isOpen, selectedSection: this.selectedSection, updateAvailable: this.updateAvailable })}
        `;
    }
}

if (!customElements.get('app-right-drawer')) {
    customElements.define('app-right-drawer', RightDrawer);
}
