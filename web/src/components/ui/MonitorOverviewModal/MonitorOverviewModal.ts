import { apiService } from '../../../services/apiService';
import { eventBus, EVENTS } from '../../../services/EventBus';
import { shell, loadingBody, emptyBody, listBody, OverviewRow } from './MonitorOverviewModal.template';
import css from './MonitorOverviewModal.css' with { type: 'text' };

/**
 * MonitorOverviewModal
 * Status-page view: every monitored bookmark with its 24h status, uptime and a
 * mini heartbeat. Rows open the detail drawer.
 */
class MonitorOverviewModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private rows: OverviewRow[] | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async open() {
        this.rows = null;
        this._renderShell(loadingBody());
        this.dialog?.showModal();

        try {
            this.rows = await apiService.get<OverviewRow[]>('/api/monitor/overview');
        } catch {
            this.rows = [];
        }
        // Update only the body so the dialog doesn't re-animate.
        this._setBody(this.rows.length ? listBody(this.rows) : emptyBody());
    }

    private _renderShell(body: string) {
        this.shadowRoot!.innerHTML = `<style>${css}</style>${shell(body)}`;
        this.dialog = this.shadowRoot!.getElementById('modal') as HTMLDialogElement;

        const closeBtn = this.shadowRoot!.getElementById('modal-close');
        if (closeBtn) closeBtn.onclick = () => this.dialog?.close();
        if (this.dialog) {
            this.dialog.onclick = (e) => { if (e.target === this.dialog) this.dialog?.close(); };
            this.dialog.oncancel = () => this.dialog?.close();
        }
        this._wireList();
    }

    private _setBody(html: string) {
        const el = this.shadowRoot!.getElementById('mov-body');
        if (el) el.innerHTML = html;
        this._wireList();
    }

    private _wireList() {
        const list = this.shadowRoot!.querySelector('.mov-list');
        if (!list) return;
        (list as HTMLElement).onclick = (e) => {
            const rowEl = (e.target as HTMLElement).closest('.mov-row') as HTMLElement | null;
            if (!rowEl) return;
            const id = parseInt(rowEl.dataset.id || '', 10);
            if (Number.isNaN(id)) return;
            this.dialog?.close();
            eventBus.emit(EVENTS.SHOW_MONITOR_HISTORY, { itemId: id, name: rowEl.dataset.name || '' });
        };
    }
}

if (!customElements.get('monitor-overview-modal')) {
    customElements.define('monitor-overview-modal', MonitorOverviewModal);
}

export { MonitorOverviewModal };
