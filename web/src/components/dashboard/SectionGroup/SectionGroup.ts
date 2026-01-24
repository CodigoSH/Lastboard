import { template } from './SectionGroup.template';
// @ts-ignore
import css from './SectionGroup.css' with { type: 'text' };

class SectionGroup extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    static get observedAttributes() {
        return ['title'];
    }

    attributeChangedCallback() {
        this.render();
    }

    render() {
        const title = this.getAttribute('title') || 'Section';

        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({ title })}
        `;
    }
}

if (!customElements.get('section-group')) {
    customElements.define('section-group', SectionGroup);
}
