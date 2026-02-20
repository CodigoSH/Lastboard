import { template } from './ReferenceHeader.template';
// @ts-ignore
import css from './ReferenceHeader.css' with { type: 'text' };

class ReferenceHeader extends HTMLElement {
    dropdownOpen: boolean;
    private _boundWindowClick?: () => void;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.dropdownOpen = false;
    }

    connectedCallback() {
        this.render();
        this.setupListeners();
    }

    disconnectedCallback() {
        if (this._boundWindowClick) {
            window.removeEventListener('click', this._boundWindowClick);
        }
    }

    toggleDropdown(state?: boolean) {
        this.dropdownOpen = typeof state === 'boolean' ? state : !this.dropdownOpen;
        this.render();
    }

    setupListeners() {
        this.shadowRoot!.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const changelogBtn = target.closest('.header__btn-changelog') as HTMLElement;
            if (changelogBtn) {
                changelogBtn.style.display = 'none';
            }

            const profileBtn = target.closest('#profile-trigger');
            if (profileBtn) {
                e.stopPropagation();
                this.toggleDropdown();
            }
        });

        this._boundWindowClick = () => {
            if (this.dropdownOpen) {
                this.toggleDropdown(false);
            }
        };
        window.addEventListener('click', this._boundWindowClick);
    }

    render() {
        const title = this.getAttribute('title') || 'Task';

        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({ title, dropdownOpen: this.dropdownOpen })}
        `;
    }
}

if (!customElements.get('app-header')) {
    customElements.define('app-header', ReferenceHeader);
}
