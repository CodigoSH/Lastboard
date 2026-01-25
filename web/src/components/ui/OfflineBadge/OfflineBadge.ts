import { template } from './OfflineBadge.template';
// @ts-ignore
import css from './OfflineBadge.css' with { type: 'text' };
import { dashboardStore } from '../../../store/dashboardStore';

class OfflineBadge extends HTMLElement {
    private unsubscribe: (() => void) | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.unsubscribe = dashboardStore.subscribe((state) => {
            if (state.isOffline) {
                this.classList.add('visible');
            } else {
                this.classList.remove('visible');
            }
        });
    }

    disconnectedCallback() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template()}
        `;
    }
}

if (!customElements.get('offline-badge')) {
    customElements.define('offline-badge', OfflineBadge);
}
