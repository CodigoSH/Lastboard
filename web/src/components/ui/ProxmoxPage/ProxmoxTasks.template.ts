import { escapeHtml } from '../../../services/escape';
import { logLineLevel, taskLevel, taskStateKey, taskTypeKey, type PxTask } from '../../../services/proxmoxTasks';
import { icon } from '../infra/infra.template';

/**
 * The markup of the tasks and the system log, as pure functions.
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

/** The task's type in words, or as Proxmox wrote it. */
export function typeLabel(type: string, t: T): string {
    const key = taskTypeKey(type);
    return key ? t(key) : type;
}

const TONE = { up: 'ok', warn: 'warn', bad: 'bad' } as const;

/** One task as a row; `seconds` is its duration, already worked out (null when unknown). */
export function taskRowHtml(task: PxTask, seconds: number | null, t: T, fmt: Fmt): string {
    const tone = TONE[taskLevel(task.state)];
    const state = t(taskStateKey(task.state));
    const label = typeLabel(task.type, t);
    return `<button type="button" class="task" data-upid="${e(task.upid)}">
        <span class="dot dot--${tone}${task.state === 'running' ? ' dot--pulse' : ''}" role="img" title="${e(state)}" aria-label="${e(state)}"></span>
        <span class="task__main">
            <b>${e(label)}${task.id ? ` <span class="tech" dir="ltr">${e(task.id)}</span>` : ''}</b>
            <small><span class="tech" dir="ltr">${e(task.user)}</span> · ${e(fmt.time(task.start))}${task.message ? ` · <span class="why why--${task.state}">${e(task.message)}</span>` : ''}</small>
        </span>
        <span class="task__r">${seconds === null ? '' : e(fmt.span(seconds))}</span>
    </button>`;
}

/** A failure, in words. */
export function errorHtml(key: string, t: T): string {
    return `<div class="err" role="alert">${icon('alert', 18)}<span>${e(t(key))}</span></div>`;
}

/** The list: its rows, or the empty state. */
export function tasksListHtml(tasks: PxTask[], secondsOf: (task: PxTask) => number | null, t: T, fmt: Fmt): string {
    if (!tasks.length) return `<div class="empty">${e(t('proxmox.tasks_empty'))}</div>`;
    return `<div class="card tasks">${tasks.map(k => taskRowHtml(k, secondsOf(k), t, fmt)).join('')}</div>`;
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
