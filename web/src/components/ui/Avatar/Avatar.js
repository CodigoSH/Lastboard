import { template } from './Avatar.template.js';

class AppAvatar extends HTMLElement {
    static get observedAttributes() {
        return ['src', 'alt', 'initials'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        if (!this.constructor.cssText) {
            const cssResponse = await fetch('/src/components/ui/Avatar/Avatar.css');
            this.constructor.cssText = await cssResponse.text();
        }
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    render() {
        if (!this.constructor.cssText) return;

        const src = this.getAttribute('src');
        const initials = this.getAttribute('initials') || '??';
        const alt = this.getAttribute('alt') || 'User Avatar';

        this.shadowRoot.innerHTML = `
            <style>${this.constructor.cssText}</style>
            ${template({ src, initials, alt })}
        `;
    }
}

if (!customElements.get('app-avatar')) {
    customElements.define('app-avatar', AppAvatar);
}
