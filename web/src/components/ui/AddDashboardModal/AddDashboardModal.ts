import { template } from './AddDashboardModal.template';
import { dashboardStore } from '../../../store/dashboardStore';
// @ts-ignore
import css from './AddDashboardModal.css' with { type: 'text' };

interface AddDashboardModalState {
    name: string;
    error: string;
    loading: boolean;
}

class AddDashboardModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private state: AddDashboardModalState = {
        name: '',
        error: '',
        loading: false
    };

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupListeners();
        
        // Auto-focus input when opened
        requestAnimationFrame(() => {
            const input = this.shadowRoot!.getElementById('dashboard-name');
            if (input) input.focus();
        });
    }

    setupListeners() {
        const root = this.shadowRoot!;
        
        root.addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.id === 'dashboard-name') {
                this.state.name = target.value;
                if (this.state.error) {
                    this.state.error = '';
                    this.render();
                }
            }
        });

        root.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            if (target.closest('#modal-close')) {
                e.preventDefault();
                this.close();
            } else if (target.closest('#confirm-btn')) {
                e.preventDefault();
                this.handleSubmit();
            }
        });

        root.addEventListener('keydown', (e: Event) => {
            const keyEvent = e as KeyboardEvent;
            if (keyEvent.key === 'Escape') {
                this.close();
            } else if (keyEvent.key === 'Enter') {
                e.preventDefault();
                this.handleSubmit();
            }
        });
    }

    async handleSubmit() {
        const name = this.state.name.trim();
        if (!name) {
            this.state.error = 'Name cannot be empty';
            this.render();
            return;
        }

        this.state.loading = true;
        this.render();

        try {
            await dashboardStore.createDashboard(name);
            this.close();
        } catch (error: any) {
            this.state.error = error.message || 'Error creating dashboard';
            this.state.loading = false;
            this.render();
        }
    }

    close() {
        this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({ name: this.state.name, error: this.state.error })}
        `;
        
        this.dialog = this.shadowRoot!.getElementById('modal') as HTMLDialogElement;
        
        // Setup listeners again since DOM was replaced
        this.setupListeners();
        
        this.dialog.showModal();
        
        requestAnimationFrame(() => {
            const input = this.shadowRoot!.getElementById('dashboard-name') as HTMLInputElement;
            // only set focus, avoid wiping out value or selection on re-render
            if (input && document.activeElement !== input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        });
    }
}

if (!customElements.get('add-dashboard-modal')) {
    customElements.define('add-dashboard-modal', AddDashboardModal);
}
