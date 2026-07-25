import '../MonitorDetail/MonitorDetail';
import { i18n } from '../../../services/i18n';
import css from './MonitorHistoryDrawer.css' with { type: 'text' };

/**
 * MonitorHistoryDrawer
 * Slide-in shell hosting a shared <monitor-detail>. Opened by clicking a
 * bookmark's status dot for a quick, in-context peek without leaving the board.
 */
class MonitorHistoryDrawer extends HTMLElement {
    private isOpen = false;
    private _built = false;
    private _keydown: (e: KeyboardEvent) => void;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._keydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        };
    }

    connectedCallback() {
        this._build();
        window.addEventListener('keydown', this._keydown);
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this._keydown);
    }

    private _build() {
        if (this._built) return;
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            <div class="mhd-drawer__overlay"></div>
            <aside class="mhd-drawer__panel" role="dialog" aria-modal="true" aria-label="${i18n.t('settings.monitoring') || 'Monitoring'}">
                <button class="mhd-drawer__close" aria-label="${i18n.t('general.close') || 'Close'}">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
                <monitor-detail></monitor-detail>
            </aside>`;
        this.shadowRoot!.addEventListener('click', (e) => {
            const t = e.target as HTMLElement;
            if (t.closest('.mhd-drawer__close') || t.classList.contains('mhd-drawer__overlay')) {
                this.close();
            }
        });
        this._built = true;
    }

    private _detail() {
        return this.shadowRoot!.querySelector('monitor-detail') as (HTMLElement & {
            load: (id: number, name: string) => void; stop: () => void;
        }) | null;
    }

    open(itemId: number, name: string) {
        this._build();
        this.isOpen = true;
        this.setAttribute('open', '');
        document.body.style.overflow = 'hidden';
        this._detail()?.load(itemId, name);
    }

    close() {
        this.isOpen = false;
        this.removeAttribute('open');
        document.body.style.overflow = '';
        this._detail()?.stop();
    }
}

if (!customElements.get('monitor-history-drawer')) {
    customElements.define('monitor-history-drawer', MonitorHistoryDrawer);
}

export { MonitorHistoryDrawer };
