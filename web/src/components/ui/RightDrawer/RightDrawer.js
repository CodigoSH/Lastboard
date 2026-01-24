import { userStore } from '../../../store/userStore.js';
import { template } from './RightDrawer.template.js';

class RightDrawer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isOpen = false;
        this.selectedSection = null;
    }

    async connectedCallback() {
        if (!this.constructor.cssText) {
            const cssResponse = await fetch('/src/components/ui/RightDrawer/RightDrawer.css');
            this.constructor.cssText = await cssResponse.text();
        }
        this.render();
        this.setupListeners();

        // Subscribe to user changes
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

    selectSection(section) {
        if (this.selectedSection === section) {
            this.selectedSection = null;
        } else {
            this.selectedSection = section;
        }
        this.render();
    }

    setupListeners() {
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.classList.contains('right-drawer__overlay')) {
                this.close();
            }

            const menuItem = e.target.closest('.right-drawer__menu-item');
            if (menuItem && menuItem.dataset.section) {
                e.preventDefault();
                this.selectSection(menuItem.dataset.section);
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    render() {
        if (!this.constructor.cssText) return;

        const user = userStore.getUser() || { username: 'Guest', initials: '??', role: 'Viewer' };

        this.shadowRoot.innerHTML = `
            <style>${this.constructor.cssText}</style>
            ${template({ user, isOpen: this.isOpen, selectedSection: this.selectedSection })}
        `;
    }
}

if (!customElements.get('app-right-drawer')) {
    customElements.define('app-right-drawer', RightDrawer);
}
