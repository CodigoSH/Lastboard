import { csrfToken as readCsrfToken } from '../../../services/csrf';
import { logoutDestination } from '../../../services/logoutDestination';
import { userStore } from '../../../store/userStore';
import { adoptSharedStyles } from '../../../services/sharedStyles';
import { template, panelInnerTemplate } from './RightDrawer.template';
import { i18n } from '../../../services/i18n';
import css from './RightDrawer.css' with { type: 'text' };

/** Mirrors the sheet's slide in RightDrawer.css. */
const SLIDE_MS = 400;

class RightDrawer extends HTMLElement {
    isOpen: boolean;
    selectedSection: string | null;
    _unsubscribe: (() => void) | undefined;
    _unsubscribeI18n: (() => void) | undefined;
    _keydownHandler: ((e: KeyboardEvent) => void) | undefined;
    /** Pending clean-up of the section, once the window has slid out. */
    private closeTimer: number | null = null;

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
        if (this.closeTimer !== null) {
            clearTimeout(this.closeTimer);
            this.closeTimer = null;
        }
    }

    /**
     * Opening and closing only change state — they do not rebuild the shadow
     * DOM any more.
     *
     * That rebuild is why the window never slid in: `open` was set and the DOM
     * replaced in the same tick, so the sheet was created with :host([open])
     * already matching and was born at its final position. A newly inserted
     * element does not transition from a state it never had, so the 0.4s
     * transform in the stylesheet was never travelled — measured at 3ms after
     * the click the panel was already at its resting x, and the overlay already
     * fully opaque. With the DOM kept, flipping the attribute is enough.
     */
    open() {
        // Reopened while the previous close was still sliding out: drop the
        // pending clean-up and start from the same place a finished close would
        // have left us.
        if (this.closeTimer !== null) {
            clearTimeout(this.closeTimer);
            this.closeTimer = null;
            this.selectedSection = null;
        }

        this.isOpen = true;
        // Default to the first section ("My profile") so the panel is never empty.
        if (!this.selectedSection) this.selectedSection = 'account';
        this.refreshChrome();
        this.updateSelection();
        this.setAttribute('open', '');
        document.body.style.overflow = 'hidden';
        this.measureOnOpen();
        this.dispatchEvent(new CustomEvent('drawer-open', { bubbles: true, composed: true }));
    }

    /** The band has no width until the panel is on screen. */
    private measureOnOpen() {
        requestAnimationFrame(this.updateBandFade);
        setTimeout(this.updateBandFade, 450);
    }

    close() {
        this.isOpen = false;
        this.removeAttribute('open');
        document.body.style.overflow = '';
        this.dispatchEvent(new CustomEvent('drawer-close', { bubbles: true, composed: true }));

        // The section is let go only once the window is out of sight. Dropping
        // it now would empty the panel in the middle of its own slide, so what
        // leaves the screen would be a blank box.
        if (this.closeTimer !== null) clearTimeout(this.closeTimer);
        this.closeTimer = window.setTimeout(() => {
            this.closeTimer = null;
            if (this.isOpen) return;
            this.selectedSection = null;
            this.updateSelection();
            const body = this.shadowRoot?.querySelector('.right-drawer__content-body');
            if (body) body.innerHTML = '';
        }, SLIDE_MS);
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
        let destination = '/login';
        try {
            const res = await fetch('/logout', { method: 'POST', headers: { 'X-CSRF-Token': token } });
            destination = logoutDestination(await res.text());
        } catch (e) { /* ignore */ }
        document.body.style.opacity = '0';
        window.location.href = destination;
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
        this.watchBandOverflow();
    }

    /**
     * Says which way the section band still has content, so the edge can fade
     * there and stop pretending the list ends at the screen.
     *
     * Asked of the boxes rather than of `scrollLeft`: the value that property
     * takes at the far edge of a mirrored page differs between engines, while
     * "the first item starts left of what you can see" means the same thing
     * everywhere.
     */
    private updateBandFade = () => {
        const body = this.shadowRoot?.querySelector('.right-drawer__body') as HTMLElement | null;
        const menu = body?.querySelector('.right-drawer__menu');
        const first = menu?.firstElementChild as HTMLElement | null;
        const last = menu?.lastElementChild as HTMLElement | null;
        if (!body || !first || !last) return;

        const view = body.getBoundingClientRect();
        const a = first.getBoundingClientRect();
        const b2 = last.getBoundingClientRect();
        // The far ends of the row, not the first and last of the list: mirrored,
        // the first item sits on the right and the last on the left, so reading
        // them as leftmost and rightmost found no overflow in Arabic and the
        // band lost its only clue that three quarters of it was off-screen.
        const leftmost = Math.min(a.left, b2.left);
        const rightmost = Math.max(a.right, b2.right);
        // A pixel of slack: rounding alone should not draw a fade over nothing.
        body.classList.toggle('right-drawer__body--fade-left', leftmost < view.left - 1);
        body.classList.toggle('right-drawer__body--fade-right', rightmost > view.right + 1);
    };

    private watchBandOverflow() {
        const body = this.shadowRoot?.querySelector('.right-drawer__body');
        if (!body) return;
        body.addEventListener('scroll', this.updateBandFade, { passive: true });
        // Fonts and the avatar land after the first paint and move the ends.
        requestAnimationFrame(this.updateBandFade);
        setTimeout(this.updateBandFade, 300);
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
        // A language change rewrites the band, so the old node's listener went
        // with it and the ends it measured no longer exist.
        this.watchBandOverflow();
    }
}

if (!customElements.get('app-right-drawer')) {
    customElements.define('app-right-drawer', RightDrawer);
}
