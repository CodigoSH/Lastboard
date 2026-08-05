import { escapeHtml } from '../../../services/escape';

/**
 * Markup for the update modal.
 *
 * Every string arrives already translated: the component resolves i18n and this
 * file stays a pure function of its input, so the timeline can be snapshotted
 * without pulling the i18n singleton (and its fetch/localStorage) into the test.
 */

export type StepStatus = 'pending' | 'running' | 'ok' | 'skipped' | 'error';
export type UpdatePhase = 'idle' | 'available' | 'running' | 'restarting' | 'done' | 'error';

export interface TimelineStep {
    id: string;
    label: string;
    status: StepStatus;
    /** Extra text under the label, e.g. why a step was skipped or how it failed. */
    note?: string;
}

export interface UpdateModalText {
    title: string;
    close: string;
    /** Headline label. Already resolved for the current phase by the component. */
    badge: string;
    install: string;
    changelog: string;
    intro: string;
    runningHint: string;
    restarting: string;
    done: string;
    retry: string;
    dockerTitle: string;
    dockerBody: string;
}

export interface UpdateModalData {
    phase: UpdatePhase;
    currentVersion: string;
    latestVersion: string;
    isDocker: boolean;
    steps: TimelineStep[];
    /** Translated failure message, empty when there is none. */
    errorText: string;
    /** Translated secondary outcome (rollback result), empty when there is none. */
    detailText: string;
    text: UpdateModalText;
    changelogUrl: string;
}

const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_CROSS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_DASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

const dotContent = (status: StepStatus): string => {
    if (status === 'ok') return ICON_CHECK;
    if (status === 'error') return ICON_CROSS;
    if (status === 'skipped') return ICON_DASH;
    return '';
};

/** One timeline entry. The status lives in a class so it can be swapped without
 *  re-rendering the list — a re-render would replay every dot's animation. */
export const stepItem = (step: TimelineStep) => `
    <li class="tl-step is-${step.status}" data-step="${escapeHtml(step.id)}">
        <span class="tl-dot" aria-hidden="true">${dotContent(step.status)}</span>
        <span class="tl-body">
            <span class="tl-label">${escapeHtml(step.label)}</span>
            <span class="tl-note">${step.note ? escapeHtml(step.note) : ''}</span>
        </span>
    </li>
`;

const timeline = (steps: TimelineStep[], busy: boolean) => `
    <ol class="timeline" id="timeline" role="list" aria-live="polite" aria-busy="${busy}">
        ${steps.map(stepItem).join('')}
    </ol>
`;

const dockerBody = (data: UpdateModalData) => `
    <div class="notice">
        <h4 class="notice__title">${escapeHtml(data.text.dockerTitle)}</h4>
        <p class="notice__text">${escapeHtml(data.text.dockerBody)}</p>
    </div>
`;

/**
 * The dialog element itself, rendered once. Only its body is swapped as the
 * update advances, so the element keeps its open state and the entrance
 * animation does not replay on every phase change.
 */
export const shell = () => `<dialog class="dialog-base" id="modal" aria-labelledby="um-title"><div id="modal-body"></div></dialog>`;

export const body = (data: UpdateModalData) => {
    const busy = data.phase === 'running' || data.phase === 'restarting';
    const showTimeline = !data.isDocker;

    // While the update runs there is no way back: there is no cancel endpoint,
    // and half a binary swap cannot be undone on request. Offering a close
    // button would be a lie, so it is not rendered.
    const closeButton = busy ? '' : `
        <button class="modal-close" id="modal-close" aria-label="${escapeHtml(data.text.close)}">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>`;

    let message = '';
    if (data.phase === 'available') message = data.text.intro;
    else if (data.phase === 'running') message = data.text.runningHint;
    else if (data.phase === 'restarting') message = data.text.restarting;
    else if (data.phase === 'done') message = data.text.done;

    const actions = (() => {
        if (busy) return '';
        if (data.phase === 'done') return '';
        if (data.phase === 'error') {
            return `
                <app-button variant="ghost" id="btn-dismiss">${escapeHtml(data.text.close)}</app-button>
                <app-button variant="primary" id="btn-retry">${escapeHtml(data.text.retry)}</app-button>`;
        }
        if (data.isDocker) {
            return `<a class="link-button" href="${escapeHtml(data.changelogUrl)}" target="_blank" rel="noopener noreferrer">
                        <app-button variant="ghost">${escapeHtml(data.text.changelog)}</app-button>
                    </a>`;
        }
        return `
            <a class="link-button" href="${escapeHtml(data.changelogUrl)}" target="_blank" rel="noopener noreferrer">
                <app-button variant="ghost">${escapeHtml(data.text.changelog)}</app-button>
            </a>
            <app-button variant="primary" id="btn-install">${escapeHtml(data.text.install)}</app-button>`;
    })();

    return `
        <div class="modal-header">
            <div class="modal-heading">
                <span class="badge ${data.phase === 'error' ? 'badge--error' : ''}">${escapeHtml(data.text.badge)}</span>
                <h3 class="modal-title" id="um-title">${escapeHtml(data.text.title)}</h3>
            </div>
            ${closeButton}
        </div>

        <div class="versions">
            <span class="versions__from">${escapeHtml(data.currentVersion)}</span>
            <span class="versions__arrow" aria-hidden="true">→</span>
            <span class="versions__to">${escapeHtml(data.latestVersion)}</span>
        </div>

        ${message ? `<p class="modal-message" id="modal-message">${escapeHtml(message)}</p>` : ''}

        ${data.isDocker ? dockerBody(data) : ''}
        ${showTimeline ? timeline(data.steps, busy) : ''}

        <div class="failure" id="failure" ${data.errorText ? '' : 'hidden'}>
            <p class="failure__text" id="failure-text">${escapeHtml(data.errorText)}</p>
            ${data.detailText ? `<p class="failure__detail" id="failure-detail">${escapeHtml(data.detailText)}</p>` : ''}
        </div>

        ${actions ? `<div class="modal-actions">${actions}</div>` : ''}
`;
};
