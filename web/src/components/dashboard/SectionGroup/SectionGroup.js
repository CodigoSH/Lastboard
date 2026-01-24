import { template } from './SectionGroup.template.js';

class SectionGroup extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        if (!this.constructor.cssText) {
            const cssResponse = await fetch('/src/components/dashboard/SectionGroup/SectionGroup.css');
            this.constructor.cssText = await cssResponse.text();
        }
        this.render();
    }

    static get observedAttributes() {
        return ['title'];
    }

    attributeChangedCallback() {
        this.render();
    }

    render() {
        if (!this.constructor.cssText) return;

        const title = this.getAttribute('title') || 'Section';

        this.shadowRoot.innerHTML = `
            <style>${this.constructor.cssText}</style>
            ${template({ title })}
        `;
    }
}

if (!customElements.get('section-group')) {
    customElements.define('section-group', SectionGroup);
}
