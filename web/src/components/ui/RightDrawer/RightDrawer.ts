import { csrfToken as readCsrfToken } from '../../../services/csrf';
import { userStore } from '../../../store/userStore';
import { adoptSharedStyles } from '../../../services/sharedStyles';
import { template, panelInnerTemplate } from './RightDrawer.template';
import { i18n } from '../../../services/i18n';
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
        adoptSharedStyles(this.shadowRoot);
        this.isOpen = false;
        this.selectedSection = null;
        this.updateAvailable = false;
    }

    connectedCallback() {
        this.render();
        this.setupListeners();

        // Subscribe to user changes. Only the side menu needs refreshing; the
        // content panel is left untouched to avoid re-mounting <settings-content>.
        this._unsubscribe = userStore.subscribe(() => {
            if (this.isOpen) this.refreshChrome();
        });

        // Subscribe to dashboard changes (for updates)
        import('../../../store/dashboardStore').then(({ dashboardStore }) => {
            this._unsubscribeDashboard = dashboardStore.subscribe((state) => {
                if (this.updateAvailable !== state.updateAvailable) {
                    this.updateAvailable = state.updateAvailable;
                    this.refreshChrome();
                }
            });
        });

        // Subscribe to i18n changes (language switch re-translates the menu only).
        this._unsubscribeI18n = i18n.subscribe(() => {
            this.refreshChrome();
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
        // Default to the first section ("My profile") so the panel is never empty.
        if (!this.selectedSection) this.selectedSection = 'account';
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
        // Re-selecting the active section is a no-op: the panel stays open.
        if (this.selectedSection === section) return;
        this.selectedSection = section;
        // Surgical update instead of rebuilding the whole shadow DOM, so the
        // content panel and the side menu persist and are not re-animated.
        this.updateSelection();
    }

    /**
     * Updates only what changes when switching sections: the active menu item
     * and the content panel's section. The panel element itself is preserved,
     * which keeps the CSS transition smooth and avoids the re-mount "zoom".
     */
    private updateSelection() {
        const root = this.shadowRoot;
        if (!root) return;

        root.querySelectorAll('.right-drawer__menu-item').forEach(item => {
            const el = item as HTMLElement;
            el.classList.toggle(
                'right-drawer__menu-item--active',
                el.dataset.section === this.selectedSection
            );
        });

        const panel = root.querySelector('.right-drawer__content-panel');
        const body = root.querySelector('.right-drawer__content-body');
        if (!panel || !body) return;

        panel.classList.toggle('right-drawer__content-panel--closed', !this.selectedSection);

        if (this.selectedSection) {
            const existing = body.querySelector('settings-content');
            if (existing) {
                // SettingsContent observes the `section` attribute and re-renders itself.
                existing.setAttribute('section', this.selectedSection);
            } else {
                body.innerHTML = `<settings-content section="${this.selectedSection}"></settings-content>`;
            }
        }
    }

    async performLogout() {
        const token = readCsrfToken();
        try {
            await fetch('/logout', { method: 'POST', headers: { 'X-CSRF-Token': token } });
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

    private currentUser() {
        return userStore.getUser() ?? {
            username: 'Guest',
            initials: '??',
            role: 'Viewer',
            avatar_url: '',
            accent_color: '',
            language: 'en'
        };
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({ user: this.currentUser(), isOpen: this.isOpen, selectedSection: this.selectedSection, updateAvailable: this.updateAvailable })}
        `;
    }

    /**
     * Re-renders only the side menu panel (header, nav, footer) in place, leaving
     * the content panel and its <settings-content> untouched. Used for live
     * updates (user, language, available update) so switching them never replays
     * the content panel's entry animation.
     */
    private refreshChrome() {
        const panel = this.shadowRoot?.querySelector('.right-drawer__panel');
        if (!panel) {
            this.render();
            return;
        }
        panel.innerHTML = panelInnerTemplate({
            user: this.currentUser(),
            isOpen: this.isOpen,
            selectedSection: this.selectedSection,
            updateAvailable: this.updateAvailable
        });
    }
}

if (!customElements.get('app-right-drawer')) {
    customElements.define('app-right-drawer', RightDrawer);
}
