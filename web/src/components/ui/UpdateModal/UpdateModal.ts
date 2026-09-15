import { shell, body, stepItem, TimelineStep, UpdateModalData } from './UpdateModal.template';
import { adoptSharedStyles } from '../../../services/sharedStyles';
import { i18n } from '../../../services/i18n';
import { updateStore, UpdatePhase, UpdateState } from '../../../store/updateStore';
import { UPDATE_STEPS } from '../../../services/UpdateService';
import css from './UpdateModal.css' with { type: 'text' };

const CHANGELOG_URL = 'https://git.codigosh.com/CodigoSH/Lastboard/releases';

/** How long the finished timeline stays on screen before the page reloads. */
const RELOAD_DELAY_MS = 1400;

/**
 * The one place an update happens.
 *
 * It owns the whole flow — confirmation, progress, restart, outcome — instead of
 * spreading it across a card in the settings panel, a generic confirm dialog and
 * a line of status text. State comes from updateStore, so closing the settings
 * drawer or a background version check cannot disturb a running update.
 */
export class UpdateModal extends HTMLElement {
    private dialog: HTMLDialogElement | null = null;
    private unsubscribeStore: (() => void) | undefined;
    private unsubscribeI18n: (() => void) | undefined;
    private renderedPhase: UpdatePhase | null = null;
    private reloadTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);
    }

    connectedCallback() {
        // The dialog is built once and kept; only its body changes afterwards.
        this.shadowRoot!.innerHTML = `<style>${css}</style>${shell()}`;
        this.dialog = this.shadowRoot!.getElementById('modal') as HTMLDialogElement;

        this.shadowRoot!.addEventListener('click', this.onClick);
        if (this.dialog) {
            // Escape must not abandon a running update: there is nothing to
            // return to, and the process would carry on unobserved.
            this.dialog.addEventListener('cancel', this.onCancel);
        }

        this.unsubscribeStore = updateStore.subscribe(state => this.applyState(state));
        this.unsubscribeI18n = i18n.subscribe(() => {
            if (this.dialog?.open) this.renderBody();
        });
    }

    disconnectedCallback() {
        this.shadowRoot?.removeEventListener('click', this.onClick);
        this.dialog?.removeEventListener('cancel', this.onCancel);
        if (this.unsubscribeStore) this.unsubscribeStore();
        if (this.unsubscribeI18n) this.unsubscribeI18n();
        if (this.reloadTimer) clearTimeout(this.reloadTimer);
    }

    /** Opens the modal on whatever the last check found. */
    open() {
        updateStore.reset();
        this.renderBody();
        if (!this.dialog?.open) this.dialog?.showModal();
    }

    private close() {
        if (updateStore.isBusy()) return;
        this.dialog?.close();
    }

    // ── Events (delegated once, so a re-rendered body never stacks handlers) ──

    private onClick = (e: Event) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        // Clicking the backdrop reports the dialog itself as the target.
        if (target === this.dialog) {
            this.close();
            return;
        }

        const action = target.closest?.('#modal-close, #btn-dismiss, #btn-install, #btn-retry');
        if (!action) return;

        switch (action.id) {
            case 'modal-close':
            case 'btn-dismiss':
                this.close();
                break;
            case 'btn-install':
                this.start();
                break;
            case 'btn-retry':
                updateStore.reset();
                this.renderBody();
                this.start();
                break;
        }
    };

    private onCancel = (e: Event) => {
        if (updateStore.isBusy()) e.preventDefault();
    };

    // ── State → DOM ──

    private applyState(state: UpdateState) {
        if (!this.dialog?.open) return;

        // A new phase is usually a different layout; a step changing inside the
        // same phase is not. Repainting the body for the latter would replay
        // every dot animation and restart the one that is currently pulsing.
        //
        // "Usually", because running and restarting draw the same thing: the
        // timeline, no close button, no actions. Only the sentence underneath
        // differs. Treating them as two layouts repainted the body at the exact
        // moment the list was fullest, and every completed dot popped again at
        // once — measured, one dot animating before, five after. That is the
        // jump, and it lands on the last step of an update nobody can cancel.
        if (state.phase !== this.renderedPhase && !this.sameLayout(state.phase, this.renderedPhase)) {
            this.renderBody();
        } else {
            this.syncSteps(state);
            this.syncMessage(state);
            this.renderedPhase = state.phase;
        }

        if (state.phase === 'done' && !this.reloadTimer) {
            this.reloadTimer = setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
        }
    }

    /**
     * Whether two phases draw the same body. Only the busy pair does: both show
     * the timeline, neither offers a way out.
     */
    private sameLayout(a: UpdatePhase, b: UpdatePhase | null): boolean {
        const busy = (p: UpdatePhase | null) => p === 'running' || p === 'restarting';
        return busy(a) && busy(b);
    }

    /** The one thing that does change between running and restarting. */
    private syncMessage(state: UpdateState) {
        const el = this.shadowRoot?.getElementById('modal-message');
        if (!el) return;
        const text = state.phase === 'restarting'
            ? i18n.t('update.restarting')
            : i18n.t('update.running_hint');
        if (el.textContent !== text) el.textContent = text;
    }

    private syncSteps(state: UpdateState) {
        const root = this.shadowRoot;
        if (!root) return;

        for (const step of this.buildSteps(state)) {
            const li = root.querySelector(`[data-step="${step.id}"]`);
            if (!li) continue;
            if (li.className.trim() !== `tl-step is-${step.status}`) {
                li.outerHTML = stepItem(step);
            }
        }

        const failure = root.getElementById('failure');
        const failureText = root.getElementById('failure-text');
        if (failure && failureText) {
            const message = state.errorKey ? i18n.t(state.errorKey) : '';
            failureText.textContent = message;
            failure.toggleAttribute('hidden', !message);
        }
    }

    // ── Data ──

    private buildSteps(state: UpdateState): TimelineStep[] {
        return UPDATE_STEPS.map(id => {
            const status = state.steps[id];
            let note = '';
            if (id === 'signature' && status === 'skipped') note = i18n.t('update.signature_unsigned');
            if (id === 'restart' && status === 'running') note = i18n.t('update.waiting_for_server');
            return { id, label: i18n.t(`update.step.${id}`), status, note };
        });
    }

    /** Headline label: what is happening now, not what was available earlier. */
    private badgeFor(phase: UpdatePhase): string {
        if (phase === 'error') return i18n.t('update.error_title');
        if (phase === 'running' || phase === 'restarting') return i18n.t('update.running_badge');
        if (phase === 'done') return i18n.t('update.done_badge');
        return i18n.t('settings.update_available');
    }

    private buildData(): UpdateModalData {
        const state = updateStore.getState();
        const info = state.info;

        return {
            phase: state.phase,
            currentVersion: info?.current_version || '',
            latestVersion: info?.latest_version || '',
            isDocker: !!info?.is_docker,
            steps: this.buildSteps(state),
            errorText: state.errorKey ? i18n.t(state.errorKey) : '',
            detailText: state.errorDetail ? i18n.t(state.errorDetail) : '',
            changelogUrl: CHANGELOG_URL,
            text: {
                title: i18n.t('update.modal_title'),
                close: i18n.t('general.close'),
                badge: this.badgeFor(state.phase),
                install: i18n.t('action.update_now'),
                changelog: i18n.t('general.changelog'),
                intro: i18n.t('update.intro'),
                runningHint: i18n.t('update.running_hint'),
                restarting: i18n.t('update.restarting'),
                done: i18n.t('update.done', { version: info?.latest_version || '' }),
                retry: i18n.t('general.retry'),
                dockerTitle: i18n.t('settings.docker_mode'),
                dockerBody: i18n.t('settings.docker_desc'),
            },
        };
    }

    private renderBody() {
        const host = this.shadowRoot?.getElementById('modal-body');
        if (!host) return;
        const data = this.buildData();
        host.innerHTML = body(data);
        this.renderedPhase = data.phase;
    }

    private start() {
        const assetUrl = updateStore.getState().info?.asset_url;
        if (!assetUrl) return;
        updateStore.start(assetUrl);
    }
}

if (!customElements.get('update-modal')) {
    customElements.define('update-modal', UpdateModal);
}
