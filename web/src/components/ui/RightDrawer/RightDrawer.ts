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

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isOpen = false;
        this.selectedSection = null;
    }

    connectedCallback() {
        this.render();
        this.setupListeners();

        // Subscribe to user changes
        // @ts-ignore
        this._unsubscribe = userStore.subscribe((user) => {
            if (this.isOpen) this.render();
        });

        // Subscribe to i18n changes
        this._unsubscribeI18n = i18n.subscribe(() => {
            this.render();
        });
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
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

    setupListeners() {
        this.shadowRoot!.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('right-drawer__overlay')) {
                this.close();
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
            ${template({ user, isOpen: this.isOpen, selectedSection: this.selectedSection })}
        `;
    }
}

if (!customElements.get('app-right-drawer')) {
    customElements.define('app-right-drawer', RightDrawer);
}
