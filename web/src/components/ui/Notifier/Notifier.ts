import { template } from './Notifier.template';
// @ts-ignore
import css from './Notifier.css' with { type: 'text' };

class AppNotifier extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        // @ts-ignore
        window.notifier = this;
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
