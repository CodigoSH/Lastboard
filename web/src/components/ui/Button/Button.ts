import { template } from './Button.template';
// @ts-ignore
import css from './Button.css' with { type: 'text' };

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

    render() {
        const variant = this.getAttribute('variant') || 'ghost';

        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({ variant })}
        `;
    }
}

if (!customElements.get('app-button')) {
    customElements.define('app-button', AppButton);
}
