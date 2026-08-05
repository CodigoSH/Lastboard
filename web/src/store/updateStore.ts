import { updateService, UpdateEvent, UpdateInfo, UPDATE_STEPS, UpdateStepId } from '../services/UpdateService';

export type StepStatus = 'pending' | 'running' | 'ok' | 'skipped' | 'error';

/**
 * Where the process is. The modal renders one layout per phase:
 *   idle        nothing to show
 *   available   an update exists, waiting for the user to start it
 *   running     steps are being performed and reported
 *   restarting  the new binary is installed and the server is coming back
 *   done        the new version answered; the page is about to reload
 *   error       a step failed; the timeline shows which one
 */
export type UpdatePhase = 'idle' | 'available' | 'running' | 'restarting' | 'done' | 'error';

export interface UpdateState {
    phase: UpdatePhase;
    info: UpdateInfo | null;
    steps: Record<UpdateStepId, StepStatus>;
    /** i18n key of the failure, if any. */
    errorKey: string | null;
    /** i18n key of a secondary outcome, e.g. whether a failed install rolled back. */
    errorDetail: string | null;
}

type Listener = (state: UpdateState) => void;

const freshSteps = (): Record<UpdateStepId, StepStatus> =>
    UPDATE_STEPS.reduce((acc, id) => {
        acc[id] = 'pending';
        return acc;
    }, {} as Record<UpdateStepId, StepStatus>);

/** How long to wait for the new binary to answer before giving up. */
const RESTART_POLL_INTERVAL_MS = 1000;
const RESTART_TIMEOUT_MS = 90_000;

/**
 * Translates a refusal that arrived before the update started.
 *
 * The updater states its own reasons as i18n keys — not the first admin, a
 * directory it cannot write to, a rejected asset URL — and those are passed
 * straight through. What the auth middleware turns down never gets that far: it
 * answers 401/403 with plain English, which used to land on the generic "the
 * update failed" and sent the user looking for a problem with the release. An
 * expired session or a stale CSRF cookie is a different thing entirely, and the
 * way out of it is to reload, so it says so.
 */
function refusalKey(error: any): string {
    const code = (error?.message || '').trim();
    if (/^(notifier\.|auth\.)/.test(code)) return code;
    if (error?.status === 401 || error?.status === 403) return 'notifier.update_session_expired';
    return 'notifier.update_failed';
}

/**
 * Holds the state of an update while it runs.
 *
 * It lives outside the settings panel on purpose: the panel re-renders itself
 * whenever anything about the user or the available version changes, and the
 * progress used to be plain DOM inside it — so a background update check landing
 * mid-install wiped the progress the user was reading.
 */
class UpdateStore {
    private state: UpdateState = {
        phase: 'idle',
        info: null,
        steps: freshSteps(),
        errorKey: null,
        errorDetail: null,
    };
    private listeners: Listener[] = [];

    getState(): UpdateState {
        return this.state;
    }

    subscribe(listener: Listener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l(this.state));
    }

    private set(patch: Partial<UpdateState>) {
        this.state = { ...this.state, ...patch };
        this.notify();
    }

    /** True once the update is past the point where it could be called off. */
    isBusy(): boolean {
        return this.state.phase === 'running' || this.state.phase === 'restarting';
    }

    /** Records what the last check found, so the modal can be opened later. */
    setInfo(info: UpdateInfo | null) {
        if (this.isBusy()) return;
        this.set({
            info,
            phase: info?.available || info?.is_docker ? 'available' : 'idle',
        });
    }

    /** Clears a finished attempt so the modal can be opened again. */
    reset() {
        if (this.isBusy()) return;
        this.set({
            phase: this.state.info?.available || this.state.info?.is_docker ? 'available' : 'idle',
            steps: freshSteps(),
            errorKey: null,
            errorDetail: null,
        });
    }

    private applyEvent(event: UpdateEvent) {
        const id = event.step as UpdateStepId;
        if (!UPDATE_STEPS.includes(id)) return;

        const steps = { ...this.state.steps, [id]: event.status as StepStatus };

        if (event.status === 'error') {
            this.set({
                steps,
                phase: 'error',
                errorKey: event.error || 'notifier.update_failed',
                errorDetail: event.detail || null,
            });
            return;
        }

        // The backend announces the restart and then replaces itself, so this is
        // the last event that ever arrives on a successful run.
        if (id === 'restart' && event.status === 'running') {
            this.set({ steps, phase: 'restarting' });
            return;
        }

        this.set({ steps });
    }

    /**
     * Runs the update and drives the state until the new version is serving.
     *
     * Never rejects: everything the user needs to know ends up in the state, and
     * the modal is the only thing watching.
     */
    async start(assetUrl: string): Promise<void> {
        if (this.isBusy()) return;

        this.set({ phase: 'running', steps: freshSteps(), errorKey: null, errorDetail: null });

        const previousVersion = this.state.info?.current_version || '';

        try {
            await updateService.perform(assetUrl, ev => this.applyEvent(ev));
        } catch (e: any) {
            this.set({ phase: 'error', errorKey: refusalKey(e) });
            return;
        }

        // A failed step already moved us to 'error'; nothing left to wait for.
        if (this.state.phase === 'error') return;

        // The stream ended cleanly, so the binary is installed and the server is
        // on its way out — even if the restart event never made it through.
        if (this.state.phase !== 'restarting') {
            this.set({ phase: 'restarting', steps: { ...this.state.steps, restart: 'running' } });
        }

        await this.waitForRestart(previousVersion);
    }

    /**
     * Waits until a *different* version answers.
     *
     * The old process only exits a moment after replying, so "the server
     * responds" is not enough to call the restart done — it would go green while
     * still talking to the binary being replaced. A changed version is the one
     * signal that means the new build is actually serving.
     */
    private async waitForRestart(previousVersion: string): Promise<void> {
        const deadline = Date.now() + RESTART_TIMEOUT_MS;

        while (Date.now() < deadline) {
            await new Promise(r => setTimeout(r, RESTART_POLL_INTERVAL_MS));
            try {
                const version = await updateService.runningVersion();
                if (version && version !== previousVersion) {
                    this.set({
                        steps: { ...this.state.steps, restart: 'ok' },
                        phase: 'done',
                    });
                    return;
                }
            } catch {
                // Connection refused while the process is being replaced: expected.
            }
        }

        this.set({
            steps: { ...this.state.steps, restart: 'error' },
            phase: 'error',
            errorKey: 'notifier.update_restart_timeout',
        });
    }
}

export const updateStore = new UpdateStore();
