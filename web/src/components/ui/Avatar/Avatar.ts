import { template } from './Avatar.template';
// @ts-ignore
import css from './Avatar.css' with { type: 'text' };
import { i18n } from '../../../services/i18n';

class AppAvatar extends HTMLElement {
    static get observedAttributes() {
        return ['src', 'alt', 'initials'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    render() {
        const src = this.getAttribute('src');
        const initials = this.getAttribute('initials') || '??';
        const alt = this.getAttribute('alt') || i18n.t('general.user_avatar');

        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({ src: src || undefined, initials, alt })}
        `;
    }
}

if (!customElements.get('app-avatar')) {
    customElements.define('app-avatar', AppAvatar);
}
