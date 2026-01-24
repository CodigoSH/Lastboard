import { template } from './Paper.template.js';

class AppPaper extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    async render() {
        // Load external styles
        const cssResponse = await fetch('/src/components/ui/Paper/Paper.css');
        const cssText = await cssResponse.text();

        this.shadowRoot.innerHTML = `
            <style>${cssText}</style>
            ${template()}
        `;
    }
}

if (!customElements.get('app-paper')) {
    customElements.define('app-paper', AppPaper);
}
