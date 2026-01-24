import { userStore } from '../../../store/userStore';
import { template } from './RightDrawer.template';
// @ts-ignore
import css from './RightDrawer.css' with { type: 'text' };

class RightDrawer extends HTMLElement {
    isOpen: boolean;
    selectedSection: string | null;
    _unsubscribe: (() => void) | undefined;

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
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
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

        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
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
