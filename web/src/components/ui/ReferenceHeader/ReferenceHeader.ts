import { template } from './ReferenceHeader.template';
// @ts-ignore
import css from './ReferenceHeader.css' with { type: 'text' };

class ReferenceHeader extends HTMLElement {
    dropdownOpen: boolean;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.dropdownOpen = false;
    }

    connectedCallback() {
        this.render();
        this.setupListeners();
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

        window.addEventListener('click', () => {
            if (this.dropdownOpen) {
                this.toggleDropdown(false);
            }
        });
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
