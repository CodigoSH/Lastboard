import { template } from './Button.template';
// @ts-ignore
import css from './Button.css' with { type: 'text' };
import { i18n } from '../../../services/i18n';

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
        this.addEventListener('click', this.handleClick.bind(this));
    }

    handleClick(e: Event) {
        if (this.getAttribute('type') === 'submit') {
            // Manually find parent form and submit
            const form = this.closest('form');
            if (form) {
                // Use requestSubmit to trigger validation and 'submit' event
                // (form.submit() bypasses both)
                if (form.requestSubmit) {
                    form.requestSubmit();
                } else {
                    form.submit();
                }
            }
        }
    }

    attributeChangedCallback() {
        this.render();
    }

    private _loading: boolean = false;

    set loading(v: boolean) {
        this._loading = v;
        this.render();
    }

    get loading() {
        return this._loading;
    }

    render() {
        const variant = this.getAttribute('variant') || 'ghost';
        // Simple loading text replacement for now
        const content = this._loading ? i18n.t('general.loading') : '<slot></slot>';

        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            <button class="btn btn--${variant}" ${this._loading ? 'disabled' : ''}>
                ${content}
            </button>
        `;
    }
}

if (!customElements.get('app-button')) {
    customElements.define('app-button', AppButton);
}

