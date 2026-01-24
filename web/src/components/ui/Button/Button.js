import { template } from './Button.template.js';

class AppButton extends HTMLElement {
    static get observedAttributes() {
        return ['variant'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback() {
        this.render();
    }

    async render() {
        const variant = this.getAttribute('variant') || 'ghost';

        // Load external styles
        const cssResponse = await fetch('/src/components/ui/Button/Button.css');
        const cssText = await cssResponse.text();

        this.shadowRoot.innerHTML = `
            <style>${cssText}</style>
            ${template({ variant })}
        `;
    }
}

if (!customElements.get('app-button')) {
    customElements.define('app-button', AppButton);
}
