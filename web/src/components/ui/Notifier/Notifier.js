import { template } from './Notifier.template.js';

class AppNotifier extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        window.notifier = this;
    }

    show(message, type = 'success') {
        const container = this.shadowRoot.querySelector('.toast-container');
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

    async render() {
        // Load external styles
        const cssResponse = await fetch('/src/components/ui/Notifier/Notifier.css');
        const cssText = await cssResponse.text();

        this.shadowRoot.innerHTML = `
            <style>${cssText}</style>
            ${template()}
        `;
    }
}

if (!customElements.get('app-notifier')) {
    customElements.define('app-notifier', AppNotifier);
}
