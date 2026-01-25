import { template } from './SectionGroup.template';
import { dashboardStore } from '../../../store/dashboardStore';
// @ts-ignore
import css from './SectionGroup.css' with { type: 'text' };

class SectionGroup extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    private _unsubscribe: (() => void) | undefined;
    private isEditing: boolean = false;

    connectedCallback() {
        this.render();
        this._unsubscribe = dashboardStore.subscribe((state) => {
            if (this.isEditing !== state.isEditing) {
                this.isEditing = state.isEditing;
                if (this.isEditing) {
                    this.classList.add('edit-mode');
                } else {
                    this.classList.remove('edit-mode');
                }
            }
        });
    }

    disconnectedCallback() {
        if (this._unsubscribe) this._unsubscribe();
    }

    static get observedAttributes() {
        return ['title'];
    }

    attributeChangedCallback() {
        this.render();
    }

    render() {
        const title = this.getAttribute('title') || 'Section';

        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({ title })}
        `;
    }
}

if (!customElements.get('section-group')) {
    customElements.define('section-group', SectionGroup);
}
