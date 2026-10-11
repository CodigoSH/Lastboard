import { template } from './DashboardSwitcher.template';
import { dashboardStore } from '../../../store/dashboardStore';
import { Dashboard } from '../../../types';
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

            // Manage order button
            const manageBtn = target.closest('.switcher-manage-btn') as HTMLElement;
            if (manageBtn) {
                e.stopPropagation();
                this.state.dropdownActive = false;
                this.render();
                const modal = document.createElement('dashboard-manager-modal');
                document.body.appendChild(modal);
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
