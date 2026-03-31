import { template } from './DashboardSwitcher.template';
import { dashboardStore } from '../../../store/dashboardStore';
import { eventBus, EVENTS } from '../../../services/EventBus';
import { i18n } from '../../../services/i18n';
import { Dashboard } from '../../../types';
// @ts-ignore
import css from './DashboardSwitcher.css' with { type: 'text' };

interface DashboardSwitcherState {
    dropdownActive: boolean;
    dashboards: Dashboard[];
    currentDashboardId: number | null;
}

class DashboardSwitcher extends HTMLElement {
    private state: DashboardSwitcherState = {
        dropdownActive: false,
        dashboards: [],
        currentDashboardId: null
    };

    private _unsubscribeDashboard: (() => void) | undefined;
    private _windowClickHandler: ((e: Event) => void) | undefined;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupListeners();
        
        this._unsubscribeDashboard = dashboardStore.subscribe((storeState) => {
            const sameDashboards = JSON.stringify(this.state.dashboards) === JSON.stringify(storeState.dashboards);
            const sameId = this.state.currentDashboardId === storeState.currentDashboardId;
            
            if (!sameDashboards || !sameId) {
                this.state.dashboards = storeState.dashboards;
                this.state.currentDashboardId = storeState.currentDashboardId;
                this.render();
            }
        });
    }

    disconnectedCallback() {
        if (this._unsubscribeDashboard) {
            this._unsubscribeDashboard();
        }
        if (this._windowClickHandler) {
            window.removeEventListener('click', this._windowClickHandler);
        }
    }

    setupListeners() {
        const root = this.shadowRoot!;

        root.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;

            // Trigger Button
            const trigger = target.closest('.switcher-trigger');
            if (trigger) {
                e.stopPropagation();
                this.state.dropdownActive = !this.state.dropdownActive;
                this.render();
                return;
            }

            // Inside dropdown
            const btn = target.closest('.switcher-action-btn') as HTMLElement;
            if (btn) {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = Number(btn.dataset.id);
                
                if (action === 'rename') {
                    const dashName = this.state.dashboards.find(d => d.id === id)?.name || '';
                    this.dispatchEvent(new CustomEvent('dashboard-rename', {
                        detail: { id, name: dashName },
                        bubbles: true,
                        composed: true
                    }));
                } else if (action === 'delete') {
                    if (this.state.dashboards.length <= 1) {
                        eventBus.emit(EVENTS.NOTIFY, {
                            type: 'error',
                            message: i18n.t('dashboard.cannot_delete_last') || 'You cannot delete your only dashboard'
                        });
                    } else {
                        this.dispatchEvent(new CustomEvent('dashboard-delete', {
                            detail: { id },
                            bubbles: true,
                            composed: true
                        }));
                    }
                }
                
                this.state.dropdownActive = false;
                this.render();
                return;
            }

            const item = target.closest('.switcher-item') as HTMLElement;
            if (item) {
                e.stopPropagation();
                const action = item.dataset.action;
                const id = item.dataset.id;
                
                if (id && !action) {
                    dashboardStore.switchDashboard(Number(id));
                }
                
                this.state.dropdownActive = false;
                this.render();
                return;
            }
        });

        // Window click to close dropdown
        this._windowClickHandler = (e: Event) => {
            if (this.state.dropdownActive) {
                const path = e.composedPath();
                if (!path.includes(this)) {
                    this.state.dropdownActive = false;
                    this.render();
                }
            }
        };
        
        window.addEventListener('click', this._windowClickHandler);
    }

    render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({
                dashboards: this.state.dashboards,
                currentDashboardId: this.state.currentDashboardId,
                dropdownActive: this.state.dropdownActive
            })}
        `;
    }
}

if (!customElements.get('dashboard-switcher')) {
    customElements.define('dashboard-switcher', DashboardSwitcher);
}
