
import { WIDGET_REGISTRY, WidgetDefinition } from '../../../widgets/registry';
import { addWidgetTemplate } from './AddWidgetModal.template';
import css from './AddWidgetModal.css' with { type: 'text' };

class AddWidgetModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    open() {
        if (this.dialog) this.dialog.showModal();
    }

    close() {
        if (this.dialog) this.dialog.close();
    }

    selectWidget(widget: WidgetDefinition) {
        this.dispatchEvent(new CustomEvent('widget-selected', {
            detail: widget,
            bubbles: true,
            composed: true
        }));
        this.close();
    }

    render() {
        if (!this.shadowRoot) return;

        this.shadowRoot.innerHTML = addWidgetTemplate(css);

        this.dialog = this.shadowRoot.querySelector('dialog');

        this.shadowRoot.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                const widget = WIDGET_REGISTRY.find(w => w.id === id);
                if (widget) this.selectWidget(widget);
            });
        });
    }
}

customElements.define('add-widget-modal', AddWidgetModal);
