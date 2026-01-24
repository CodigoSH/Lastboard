import { template } from './Paper.template';
// @ts-ignore
import css from './Paper.css' with { type: 'text' };

class AppPaper extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template()}
        `;
    }
}

if (!customElements.get('app-paper')) {
    customElements.define('app-paper', AppPaper);
}
