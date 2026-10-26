/**
 * What a hypervisor has been doing, as the page needs it that is not drawing:
 * the shape of the answers, the requests, and the small rules that decide how
 * a task looks and when its log is asked for again.
 */

export type TaskState = 'running' | 'ok' | 'warning' | 'error';

export interface PxTask {
    upid: string;
    type: string;
    id: string;
    user: string;
    state: TaskState;
    message?: string;
    /** Unix seconds. */
    start: number;
    end?: number;
}

export interface PxTaskLog {
    lines: string[];
    running: boolean;
    truncated: boolean;
}

/** Where a task is asked for: one node, and optionally one guest of it. */
export interface TaskScope {
    host: string;
    node: string;
    vmid?: number;
}

/** How often the list is asked again while it is on screen. */
export const TASKS_MS = 15000;
/** How often a running task's log is asked again while it is open. */
export const TASK_LOG_MS = 3000;

/**
 * The colour level of a task's dot: the same three steps as every other dot on
 * the page, and never the accent, which the operator can set to any colour.
 * A running task is amber too: it has not succeeded yet.
 */
export function taskLevel(state: TaskState): 'up' | 'warn' | 'bad' {
    switch (state) {
        case 'ok': return 'up';
        case 'error': return 'bad';
        default: return 'warn';
    }
}

/** The word a state is announced with. */
export function taskStateKey(state: TaskState): string {
    return `proxmox.task_state_${state}`;
}

/**
 * Proxmox's task types are short internal names. The common ones have a word of
 * their own; any other is shown as it came, so nothing is ever hidden.
 */
const TYPE_KEYS: Record<string, string> = {
    vzdump: 'proxmox.task_type_backup',
    qmstart: 'proxmox.task_type_start',
    vzstart: 'proxmox.task_type_start',
    qmshutdown: 'proxmox.task_type_shutdown',
    vzshutdown: 'proxmox.task_type_shutdown',
    qmstop: 'proxmox.task_type_stop',
    vzstop: 'proxmox.task_type_stop',
    qmreboot: 'proxmox.task_type_reboot',
    vzreboot: 'proxmox.task_type_reboot',
    qmigrate: 'proxmox.task_type_migration',
    vzmigrate: 'proxmox.task_type_migration',
    qmclone: 'proxmox.task_type_clone',
    vzclone: 'proxmox.task_type_clone',
    qmsnapshot: 'proxmox.task_type_snapshot',
    vzsnapshot: 'proxmox.task_type_snapshot',
    aptupdate: 'proxmox.task_type_update',
    imgcopy: 'proxmox.task_type_diskcopy',
};

/** The translation key of a known task type, or null when it has none. */
export function taskTypeKey(type: string): string | null {
    return Object.prototype.hasOwnProperty.call(TYPE_KEYS, type) ? TYPE_KEYS[type] : null;
}

/** How long a task took, in seconds; a running one counts up to `nowSec`. Null when the clock says nonsense. */
export function taskSeconds(task: Pick<PxTask, 'start' | 'end' | 'state'>, nowSec: number): number | null {
    const end = task.state === 'running' || !task.end ? nowSec : task.end;
    const s = end - task.start;
    return Number.isFinite(s) && s >= 0 ? s : null;
}

/**
 * Whether the log of an open task is asked for again.
 *
 * Only while it is still running, on screen, and in a tab somebody is looking
 * at: a finished task's log never changes, and a hidden page asks for nothing.
 */
export function shouldPollLog(s: { running: boolean; open: boolean; hidden: boolean }): boolean {
    return s.running && s.open && !s.hidden;
}

/** The log as plain text, for the clipboard. */
export function taskLogText(lines: string[]): string {
    return lines.join('\n');
}

/** The key a failed request is explained with. */
export function taskErrorKey(err: unknown): string {
    const msg = typeof (err as { message?: unknown })?.message === 'string' ? (err as { message: string }).message.trim() : '';
    return /^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(msg) ? msg : 'proxmox.connection_error';
}

/**
 * How a line of a task's log is tinted. Proxmox writes its own verdicts at the
 * start of a line (`ERROR:`, `TASK ERROR:`, `WARN:`, `TASK WARNINGS:`), so the
 * start is all that is read: a line that merely mentions an error stays plain.
 */
export function logLineLevel(text: string): 'err' | 'warn' | '' {
    if (/^(TASK )?ERROR\b/.test(text)) return 'err';
    if (/^(TASK WARNINGS|WARN)\b/.test(text)) return 'warn';
    return '';
}

/** The refusal that is not a failure: the token simply was not given the system log. */
export const NO_SYSLOG_KEY = 'proxmox.no_syslog_permission';
