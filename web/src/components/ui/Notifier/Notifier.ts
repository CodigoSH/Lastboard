import { template } from './Notifier.template';
// @ts-ignore
import css from './Notifier.css' with { type: 'text' };

class AppNotifier extends HTMLElement {
    private _boundOpen: () => void;
    private _boundClose: () => void;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._boundOpen = () => this.shift(true);
        this._boundClose = () => this.shift(false);
    }

    connectedCallback() {
        this.render();
        // @ts-ignore
        window.notifier = this;

        window.addEventListener('drawer-open', this._boundOpen);
        window.addEventListener('drawer-close', this._boundClose);
    }

    disconnectedCallback() {
        window.removeEventListener('drawer-open', this._boundOpen);
        window.removeEventListener('drawer-close', this._boundClose);
    }

    shift(isOpen: boolean) {
        const container = this.shadowRoot!.querySelector('.toast-container');
        if (container) {
            if (isOpen) {
                container.classList.add('toast-container--shifted');
            } else {
                container.classList.remove('toast-container--shifted');
            }
        }
    }

    show(message: string, type = 'success') {
        const container = this.shadowRoot!.querySelector('.toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Remove after 3s
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template()}
        `;
    }
}

if (!customElements.get('app-notifier')) {
    customElements.define('app-notifier', AppNotifier);
}
