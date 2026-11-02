import { escapeHtml } from '../../../services/escape';
import { logLineLevel, taskLevel, taskStateKey, taskTypeKey, type PxTask, type TaskGroup } from '../../../services/proxmoxTasks';
import { faceHtml, icon } from '../infra/infra.template';

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

/** How many tasks the list shows before it offers the rest in a window of their own: as many as the other lists of a panel. */
export const TASK_LINES = 15;

/** The list: its rows, or the empty state. Beyond TASK_LINES it offers "view all", unless it is asked for all of them. */
export function tasksListHtml(tasks: PxTask[], secondsOf: (task: PxTask) => number | null, t: T, fmt: Fmt, all = false): string {
    if (!tasks.length) return `<div class="empty">${e(t('proxmox.tasks_empty'))}</div>`;
    const shown = all ? tasks : tasks.slice(0, TASK_LINES);
    const more = !all && tasks.length > shown.length
        ? `<button type="button" class="more" data-tp-all>${e(t('monitorpage.view_all'))}<span class="n">${tasks.length}</span></button>`
        : '';
    return `<div class="card tasks">${shown.map(k => taskRowHtml(k, secondsOf(k), t, fmt)).join('')}</div>${more}`;
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

/** A machine as the tasks tab names it: its words and its face. */
export interface TaskGroupItem { group: TaskGroup; name: string; face: string }

/** How many of a card's figures the table also has. */
const lastOf = (g: TaskGroup, fmt: Fmt): string => fmt.time(g.last);

/**
 * A machine in the tasks tab: one card for all its tasks, with their number where the
 * eye lands first. Choosing it opens the machine's panel on its Tasks tab, which is
 * where each task is listed.
 */
export function taskGroupCardHtml(it: TaskGroupItem, t: T, fmt: Fmt, num: (n: number) => string): string {
    const g = it.group;
    return `<button type="button" class="card card--btn unit unit--tasks${g.level === 'bad' ? ' is-off' : ''}" data-tg="${e(g.id)}">
        <div class="unit__h">${faceHtml(it.face)}<span class="unit__n" title="${e(it.name)}">${e(it.name) || '—'}</span><span class="unit__tail">${g.running ? `<span class="chip chip--warn">${e(t('proxmox.task_state_running'))}</span>` : ''}<span class="dot dot--${TONE[g.level]}${g.running ? ' dot--pulse' : ''}"></span></span></div>
        <div class="unit__st unit__st--out"><div class="ocount"><b>${e(num(g.count))}</b><span>${e(t('proxmox.tasks'))}</span></div>
            <div class="orow"><span>${e(t('proxmoxpage.tasks_failed'))}</span><b>${e(num(g.failed))}</b></div>
            <div class="orow"><span>${e(t('monitorpage.out_last'))}</span><b>${e(lastOf(g, fmt))}</b></div></div>
    </button>`;
}

/** The same, as a table: machine, how many tasks, how many failed, the last one, and whether one is running. */
export function taskGroupTableHtml(items: TaskGroupItem[], t: T, fmt: Fmt, num: (n: number) => string): string {
    const head = `<div class="tr tr--h" aria-hidden="true"><span></span><span>${e(t('proxmoxpage.tasks_machine'))}</span><span>${e(t('proxmox.tasks'))}</span><span>${e(t('proxmoxpage.tasks_failed'))}</span><span>${e(t('monitorpage.out_last'))}</span><span>${e(t('dockerpage.state'))}</span></div>`;
    const rows = items.map(({ group: g, name }) => `<button type="button" class="tr" data-tg="${e(g.id)}"><span class="dot dot--${TONE[g.level]}${g.running ? ' dot--pulse' : ''}"></span><span class="nm" title="${e(name)}">${e(name)}</span><span class="cell cell--n">${e(num(g.count))}</span><span class="cell cell--n">${e(num(g.failed))}</span><span class="cell">${e(lastOf(g, fmt))}</span><span class="cell">${g.running ? `<span class="chip chip--warn">${e(t('proxmox.task_state_running'))}</span>` : '—'}</span></button>`).join('');
    return `<div class="tbl tbl--tasks">${head}${rows}</div>`;
}

/** The tab's body: a card for each machine, or the table of them, or the empty state. */
export function taskGroupsHtml(items: TaskGroupItem[], view: 'cards' | 'list', t: T, fmt: Fmt, num: (n: number) => string): string {
    if (!items.length) return `<div class="empty">${e(t('proxmox.tasks_empty'))}</div>`;
    return view === 'cards'
        ? `<div class="cards">${items.map(it => taskGroupCardHtml(it, t, fmt, num)).join('')}</div>`
        : taskGroupTableHtml(items, t, fmt, num);
}
