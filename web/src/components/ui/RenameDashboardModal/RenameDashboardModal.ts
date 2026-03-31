import { template } from './RenameDashboardModal.template';
import { dashboardStore } from '../../../store/dashboardStore';
// @ts-ignore
import css from './RenameDashboardModal.css' with { type: 'text' };

interface RenameDashboardModalState {
    id: number;
    name: string;
    error: string;
    loading: boolean;
}

class RenameDashboardModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private state: RenameDashboardModalState = {
        id: -1,
        name: '',
        error: '',
        loading: false
    };

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.state.id = Number(this.dataset.id || '-1');
        this.state.name = this.dataset.name || '';
        this.render();
        this.setupListeners();
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

        if (this.state.id === -1) {
            this.state.error = 'Invalid dashboard ID';
            this.render();
            return;
        }

        this.state.loading = true;
        this.render();

        try {
            await dashboardStore.renameDashboard(this.state.id, name);
            this.close();
        } catch (error: any) {
            this.state.error = error.message || 'Error renaming dashboard';
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
            if (input && document.activeElement !== input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        });
    }
}

if (!customElements.get('rename-dashboard-modal')) {
    customElements.define('rename-dashboard-modal', RenameDashboardModal);
}
