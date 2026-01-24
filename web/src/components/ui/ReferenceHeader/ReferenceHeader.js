import { template } from './ReferenceHeader.template.js';

class ReferenceHeader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.dropdownOpen = false;
    }

    connectedCallback() {
        this.render();
        this.setupListeners();
    }

    toggleDropdown(state) {
        this.dropdownOpen = typeof state === 'boolean' ? state : !this.dropdownOpen;
        this.render();
    }

    setupListeners() {
        this.shadowRoot.addEventListener('click', (e) => {
            const changelogBtn = e.target.closest('.header__btn-changelog');
            if (changelogBtn) {
                console.log('Changelog closed');
                changelogBtn.style.display = 'none';
            }

            const profileBtn = e.target.closest('#profile-trigger');
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

    async render() {
        const title = this.getAttribute('title') || 'Task';

        // Load external styles
        const cssResponse = await fetch('/src/components/ui/ReferenceHeader/ReferenceHeader.css');
        const cssText = await cssResponse.text();

        this.shadowRoot.innerHTML = `
            <style>${cssText}</style>
            ${template({ title, dropdownOpen: this.dropdownOpen })}
        `;
    }
}

if (!customElements.get('app-header')) {
    customElements.define('app-header', ReferenceHeader);
}
