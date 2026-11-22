import { template } from './Avatar.template';
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

    private unsubscribeI18n?: () => void;

    connectedCallback() {
        // Its default text is a phrase of the language, and on a page that draws it before the language has arrived (the
        // setup wizard) the first drawing has only the key to show. Subscribing draws it now, which is what the service
        // does on subscribing, and again when the language is there and whenever it changes.
        this.unsubscribeI18n = i18n.subscribe(() => this.render());
    }

    disconnectedCallback() {
        this.unsubscribeI18n?.();
        this.unsubscribeI18n = undefined;
    }

    attributeChangedCallback(_name: string, oldValue: string, newValue: string) {
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
