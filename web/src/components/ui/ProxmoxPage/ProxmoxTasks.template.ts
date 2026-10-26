import { escapeHtml } from '../../../services/escape';
import { logLineLevel, taskLevel, taskStateKey, taskTypeKey, type PxTask } from '../../../services/proxmoxTasks';

/**
 * The markup of the tasks view, as pure functions.
 *
 * Everything in a task comes from the hypervisor — its type, the guest, the
 * user who started it, the message it ended with and every line of its log —
 * and goes through escapeHtml here and nowhere else. Text the page itself says
 * arrives through `t`, so these can be read and tested without the i18n
 * singleton.
 */

export type T = (key: string, params?: Record<string, string>) => string;

/** How the view formats what depends on the language. */
export interface Fmt {
    /** A moment, from Unix seconds. */
    time: (sec: number) => string;
    /** A length of time, from seconds. */
    span: (sec: number) => string;
}

const e = escapeHtml;

const ICON_ALERT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';

/** The task's type in words, or as Proxmox wrote it. */
export function typeLabel(type: string, t: T): string {
    const key = taskTypeKey(type);
    return key ? t(key) : type;
}

/** One task as a row; `seconds` is its duration, already worked out (null when unknown). */
export function taskRowHtml(task: PxTask, seconds: number | null, t: T, fmt: Fmt): string {
    const level = taskLevel(task.state);
    const state = t(taskStateKey(task.state));
    const label = typeLabel(task.type, t);
    return `<button type="button" class="card tk" data-upid="${e(task.upid)}">
        <span class="dot dot--${level}${task.state === 'running' ? ' dot--pulse' : ''}" role="img" title="${e(state)}" aria-label="${e(state)}"></span>
        <span class="tk__main">
            <span class="tk__line">
                <span class="tk__type">${e(label)}</span>
                ${task.id ? `<span class="tk__id" dir="ltr">${e(task.id)}</span>` : ''}
            </span>
            <span class="tk__meta">
                <span class="tk__user" dir="ltr">${e(task.user)}</span>
                <span class="tk__when">${e(fmt.time(task.start))}</span>
                ${seconds === null ? '' : `<span class="tk__dur">${e(fmt.span(seconds))}</span>`}
            </span>
            ${task.message ? `<span class="tk__msg tk__msg--${task.state}">${e(task.message)}</span>` : ''}
        </span>
    </button>`;
}

/** A failure, in words. */
export function errorHtml(key: string, t: T): string {
    return `<div class="tk-err" role="alert">
        <span class="tk-err__ico">${ICON_ALERT}</span>
        <span class="tk-err__txt">${e(t(key))}</span>
    </div>`;
}

/** The list: its rows, or the empty state. */
export function tasksListHtml(tasks: PxTask[], secondsOf: (task: PxTask) => number | null, t: T, fmt: Fmt): string {
    if (!tasks.length) return `<div class="state">${e(t('proxmox.tasks_empty'))}</div>`;
    return tasks.map(k => taskRowHtml(k, secondsOf(k), t, fmt)).join('');
}

/** One line of a log. */
export function logLineHtml(text: string): string {
    const lvl = logLineLevel(text);
    return `<div class="ll${lvl ? ` ll--${lvl}` : ''}"><span class="ll__x">${e(text)}</span></div>`;
}

/** All the lines of a log. */
export function logLinesHtml(lines: string[]): string {
    return lines.map(logLineHtml).join('');
}
