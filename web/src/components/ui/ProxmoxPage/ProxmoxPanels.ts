import { eventBus, EVENTS } from '../../../services/EventBus';
import { escapeHtml } from '../../../services/escape';
import { whenVisible } from '../../../services/whenVisible';
import { copyText } from '../../../services/copyText';
import { atBottom } from '../../../services/dockerPage';
import {
    groupTasksByMachine, NO_SYSLOG_KEY, shouldPollLog, taskErrorKey, taskLogText, taskSeconds, TASKS_MS, TASK_LOG_MS,
    type PxTask, type PxTaskLog, type TaskScope,
} from '../../../services/proxmoxTasks';
import { fetchJournal, fetchTaskLog, fetchTasks } from '../../../services/proxmoxTasksApi';
import { icon } from '../infra/infra.template';
import { errorHtml, logLinesHtml, taskGroupsHtml, tasksListHtml, typeLabel, type Fmt, type T } from './ProxmoxTasks.template';

/**
 * The two readings of a node that run on their own clock: its tasks, with the
 * log of one of them, and its system log.
 *
 * Each is one persistent element that the page moves between the place where it
 * is wanted (a tab, or the drawer). It keeps its own state, its own requests and
 * its own timers, and stops asking the moment nobody is looking at it — so the
 * page does not need to know what a UPID is.
 */

const e = escapeHtml;

const errorKey = (key: string): string => (key === 'proxmox.forbidden' ? 'proxmox.tasks_forbidden' : key);

/** The tasks of one node, or of one machine on it. */
export class TaskPanel {
    readonly el: HTMLElement;
    private scope: TaskScope | null = null;
    private tasks: PxTask[] = [];
    private loaded = false;
    private err = '';
    private html = '';
    private seq = 0;
    private timer: ReturnType<typeof setInterval> | null = null;
    private open: PxTask | null = null;
    private log: PxTaskLog | null = null;
    private logErr = '';
    private logText = '';
    private logSeq = 0;
    private logTimer: ReturnType<typeof setInterval> | null = null;

    constructor(private readonly t: T, private readonly fmt: Fmt) {
        this.el = document.createElement('div');
        this.el.className = 'panel-tasks';
        this.el.addEventListener('click', (ev) => {
            const el = ev.target as HTMLElement;
            const row = el.closest<HTMLElement>('[data-upid]');
            if (row?.dataset.upid) { this.dialog()?.close(); this.openLog(row.dataset.upid); return; }
            if (el.closest('[data-tp-all]')) { this.openAll(); return; }
            if (el.closest('[data-tp-close]') || el === this.dialog()) { this.dialog()?.close(); return; }
            if (el.closest('[data-tp-back]')) { this.closeLog(); return; }
            if (el.closest('[data-tp-copy]')) void this.copy();
        });
    }

    get active(): boolean { return this.scope !== null; }

    /** The node, or the machine, whose tasks to read. The same scope again changes nothing. */
    show(scope: TaskScope | null) {
        const same = !!scope && !!this.scope && scope.host === this.scope.host && scope.node === this.scope.node && scope.vmid === this.scope.vmid;
        if (same) return;
        this.stop();
        if (!scope) return;
        this.scope = scope;
        this.shell();
        this.timer = setInterval(whenVisible(() => { void this.load(); }), TASKS_MS);
        void this.load();
    }

    stop() {
        this.seq++;
        this.logSeq++;
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        if (this.logTimer) { clearInterval(this.logTimer); this.logTimer = null; }
        this.scope = null;
        this.tasks = [];
        this.loaded = false;
        this.err = '';
        this.html = '';
        this.open = null;
        this.log = null;
        this.el.innerHTML = '';
    }

    /** Words are written into the shell once, so a change of language writes it again. */
    relabel() {
        if (!this.scope) return;
        this.shell();
        this.html = '';
        this.paintList();
        if (this.open) this.showLog();
    }

    private shell() {
        const t = this.t;
        this.el.innerHTML = `
            <div class="tp-list"></div>
            <dialog class="mdl" data-tp-dlg aria-label="${e(t('proxmox.tasks'))}">
                <div class="mdl__h"><h3>${e(t('proxmox.tasks'))}<span class="mdl__n tp-n"></span></h3><button type="button" class="ibtn" data-tp-close aria-label="${e(t('general.close'))}" title="${e(t('general.close'))}">${icon('x', 16)}</button></div>
                <div class="mdl__b tp-all"></div>
            </dialog>
            <div class="logv tp-log" hidden>
                <div class="logv__bar">
                    <button type="button" class="tg" data-tp-back>${icon('chevL', 12)}<span>${e(t('general.back'))}</span></button>
                    <span class="tp-title tech"></span>
                    <span class="tp-running" hidden><span class="dot dot--warn dot--pulse"></span>${e(t('proxmox.task_state_running'))}</span>
                    <span class="logv__gap"></span>
                    <button type="button" class="tg" data-tp-copy disabled>${icon('copy', 12)}<span>${e(t('dockerpage.copy'))}</span></button>
                </div>
                <div class="logv__note tp-cut" hidden>${e(t('proxmox.task_log_cut'))}</div>
                <div class="logbox tp-box" role="log" aria-live="off" tabindex="0"></div>
            </div>`;
    }

    private q<E extends HTMLElement>(sel: string): E | null { return this.el.querySelector<E>(sel); }

    private dialog(): HTMLDialogElement | null { return this.q<HTMLDialogElement>('[data-tp-dlg]'); }

    /** Every task the hypervisor listed, in a window of their own: choosing one closes it and opens that task's log. */
    private openAll() {
        const dlg = this.dialog();
        if (!dlg) return;
        this.paintAll();
        if (!dlg.open) dlg.showModal();
    }

    private paintAll() {
        const body = this.q('.tp-all'), n = this.q('.tp-n');
        if (!body || !n) return;
        const now = Math.floor(Date.now() / 1000);
        n.textContent = String(this.tasks.length);
        body.innerHTML = tasksListHtml(this.tasks, (k) => taskSeconds(k, now), this.t, this.fmt, true);
    }

    private async load() {
        const scope = this.scope;
        if (!scope) return;
        const seq = ++this.seq;
        try {
            const tasks = await fetchTasks(scope);
            if (seq !== this.seq) return;
            this.tasks = tasks;
            this.err = '';
        } catch (err) {
            if (seq !== this.seq) return;
            this.err = taskErrorKey(err);
        }
        this.loaded = true;
        this.paintList();
    }

    /** Written only when what it says changed, so a refresh keeps the scroll and the eye where they were. */
    private paintList() {
        const el = this.q('.tp-list');
        if (!el) return;
        const t = this.t;
        const now = Math.floor(Date.now() / 1000);
        let html: string;
        if (this.err) html = errorHtml(errorKey(this.err), t);
        else if (!this.loaded) html = `<div class="empty">${e(t('general.loading'))}</div>`;
        else html = tasksListHtml(this.tasks, (k) => taskSeconds(k, now), t, this.fmt);
        if (html === this.html) return;
        this.html = html;
        el.innerHTML = html;
        // The window, if it is open, keeps up with the list behind it.
        if (this.dialog()?.open) this.paintAll();
    }

    private openLog(upid: string) {
        const task = this.tasks.find(k => k.upid === upid);
        if (!task || !this.scope) return;
        this.open = task;
        this.log = null;
        this.logErr = '';
        this.logText = '';
        this.showLog();
        void this.loadLog(true);
    }

    private closeLog() {
        this.open = null;
        this.log = null;
        this.logSeq++;
        if (this.logTimer) { clearInterval(this.logTimer); this.logTimer = null; }
        this.q('.tp-log')?.setAttribute('hidden', '');
        this.q('.tp-list')?.removeAttribute('hidden');
        void this.load();
    }

    private showLog() {
        const task = this.open;
        if (!task) return;
        this.q('.tp-list')?.setAttribute('hidden', '');
        this.q('.tp-log')?.removeAttribute('hidden');
        const title = this.q('.tp-title');
        if (title) title.textContent = [typeLabel(task.type, this.t), task.id].filter(Boolean).join(' · ');
        this.paintLog(true);
    }

    private async loadLog(first = false) {
        const scope = this.scope;
        const task = this.open;
        if (!scope || !task) return;
        const seq = ++this.logSeq;
        const wasRunning = this.log?.running ?? false;
        try {
            const log = await fetchTaskLog(scope, task.upid);
            if (seq !== this.logSeq) return;
            this.log = log;
            this.logErr = '';
        } catch (err) {
            if (seq !== this.logSeq) return;
            this.logErr = taskErrorKey(err);
        }
        this.paintLog(first);
        this.syncLogTimer();
        // The task has just finished: the list behind the log should say so too.
        if (wasRunning && this.log && !this.log.running) void this.load();
    }

    /** The log is asked again exactly while it is open, running and on a visible page. */
    private syncLogTimer() {
        const want = shouldPollLog({ running: this.log?.running === true, open: !!this.open, hidden: false });
        if (want && !this.logTimer) this.logTimer = setInterval(whenVisible(() => { void this.loadLog(); }), TASK_LOG_MS);
        if (!want && this.logTimer) { clearInterval(this.logTimer); this.logTimer = null; }
    }

    private paintLog(toBottom: boolean) {
        const box = this.q('.tp-box');
        if (!box) return;
        const log = this.log;
        const t = this.t;
        let html: string;
        if (this.logErr) html = errorHtml(errorKey(this.logErr), t);
        else if (!log) html = `<div class="empty">${e(t('general.loading'))}</div>`;
        else if (!log.lines.length) html = `<div class="empty">${e(t('proxmox.task_log_empty'))}</div>`;
        else html = logLinesHtml(log.lines);
        if (html !== this.logText) {
            // Follow the end only when the reader is at it: reading up the log is not interrupted.
            const stay = toBottom || atBottom(box.scrollTop, box.clientHeight, box.scrollHeight);
            const keep = box.scrollTop;
            box.innerHTML = html;
            this.logText = html;
            box.scrollTop = stay ? box.scrollHeight : keep;
        }
        const running = this.q('.tp-running');
        if (running) running.hidden = log?.running !== true;
        const cut = this.q('.tp-cut');
        if (cut) cut.hidden = log?.truncated !== true;
        const copy = this.q<HTMLButtonElement>('[data-tp-copy]');
        if (copy) copy.disabled = !log || !log.lines.length;
    }

    private async copy() {
        const lines = this.log?.lines;
        if (!lines?.length) return;
        if (await copyText(taskLogText(lines))) eventBus.emit(EVENTS.NOTIFY, { message: this.t('dockerpage.copied'), type: 'success' });
    }
}

/** What the tasks tab needs to say about a machine: its name and its face. */
export interface TaskMachine { name: string; face: string }

/**
 * The tasks of one node gathered by machine: a card for each, with how many it has.
 * Choosing one hands it to the page, which opens that machine's panel on its tasks.
 */
export class TaskGroups {
    readonly el: HTMLElement;
    private scope: { host: string; node: string } | null = null;
    private tasks: PxTask[] = [];
    private loaded = false;
    private err = '';
    private html = '';
    private seq = 0;
    private view: 'cards' | 'list' = 'cards';
    private timer: ReturnType<typeof setInterval> | null = null;

    constructor(
        private readonly t: T,
        private readonly fmt: Fmt,
        private readonly num: (n: number) => string,
        private readonly describe: (host: string, node: string, id: string) => TaskMachine,
        private readonly choose: (host: string, node: string, id: string) => void,
    ) {
        this.el = document.createElement('div');
        this.el.className = 'panel-taskgroups';
        this.el.addEventListener('click', (ev) => {
            const g = (ev.target as HTMLElement).closest<HTMLElement>('[data-tg]');
            if (g && this.scope) this.choose(this.scope.host, this.scope.node, g.dataset.tg || '');
        });
    }

    show(scope: { host: string; node: string } | null) {
        if (scope && this.scope && scope.host === this.scope.host && scope.node === this.scope.node) return;
        this.stop();
        if (!scope) return;
        this.scope = scope;
        this.timer = setInterval(whenVisible(() => { void this.load(); }), TASKS_MS);
        void this.load();
    }

    stop() {
        this.seq++;
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        this.scope = null;
        this.tasks = [];
        this.loaded = false;
        this.err = '';
        this.html = '';
        this.el.innerHTML = '';
    }

    setView(view: 'cards' | 'list') {
        if (view === this.view) return;
        this.view = view;
        this.paint();
    }

    /** The words are written again when the language changes. */
    relabel() { this.html = ''; this.paint(); }

    private async load() {
        const scope = this.scope;
        if (!scope) return;
        const seq = ++this.seq;
        try {
            const tasks = await fetchTasks(scope);
            if (seq !== this.seq) return;
            this.tasks = tasks;
            this.err = '';
        } catch (err) {
            if (seq !== this.seq) return;
            this.err = taskErrorKey(err);
        }
        this.loaded = true;
        this.paint();
    }

    private paint() {
        const scope = this.scope;
        if (!scope) return;
        const t = this.t;
        let html: string;
        if (this.err) html = errorHtml(errorKey(this.err), t);
        else if (!this.loaded) html = `<div class="empty">${e(t('general.loading'))}</div>`;
        else {
            const items = groupTasksByMachine(this.tasks).map(group => ({ group, ...this.describe(scope.host, scope.node, group.id) }));
            html = taskGroupsHtml(items, this.view, t, this.fmt, this.num);
        }
        if (html === this.html) return;
        this.html = html;
        this.el.innerHTML = html;
    }
}

/** The last lines of a node's system log. */
export class JournalPanel {
    readonly el: HTMLElement;
    private target: { host: string; node: string } | null = null;
    private lines: string[] | null = null;
    private err = '';
    private seq = 0;

    constructor(private readonly t: T) {
        this.el = document.createElement('div');
        this.el.className = 'panel-journal';
        this.el.addEventListener('click', (ev) => {
            const el = ev.target as HTMLElement;
            if (el.closest('[data-sj-refresh]')) { void this.load(true); return; }
            if (el.closest('[data-sj-copy]')) void this.copy();
        });
    }

    get active(): boolean { return this.target !== null; }

    show(target: { host: string; node: string } | null) {
        if (target && this.target && target.host === this.target.host && target.node === this.target.node) return;
        this.stop();
        if (!target) return;
        this.target = target;
        this.shell();
        this.paint(true);
        void this.load(true);
    }

    stop() {
        this.seq++;
        this.target = null;
        this.lines = null;
        this.err = '';
        this.el.innerHTML = '';
    }

    relabel() {
        if (!this.target) return;
        this.shell();
        this.paint(false);
    }

    private shell() {
        const t = this.t;
        this.el.innerHTML = `
            <div class="logv">
                <div class="logv__bar">
                    <span class="logv__gap"></span>
                    <button type="button" class="tg" data-sj-refresh>${icon('refresh', 12)}<span>${e(t('monitor.refresh'))}</span></button>
                    <button type="button" class="tg" data-sj-copy disabled>${icon('copy', 12)}<span>${e(t('dockerpage.copy'))}</span></button>
                </div>
                <div class="sj-body"></div>
            </div>`;
    }

    private async load(toBottom: boolean) {
        const target = this.target;
        if (!target) return;
        const seq = ++this.seq;
        const btn = this.el.querySelector<HTMLButtonElement>('[data-sj-refresh]');
        if (btn) btn.disabled = true;
        try {
            const lines = await fetchJournal(target.host, target.node);
            if (seq !== this.seq) return;
            this.lines = lines;
            this.err = '';
        } catch (err) {
            if (seq !== this.seq) return;
            this.err = taskErrorKey(err);
        }
        this.paint(toBottom);
    }

    private paint(toBottom: boolean) {
        const body = this.el.querySelector('.sj-body');
        if (!body) return;
        const t = this.t;
        let html: string;
        if (this.err === NO_SYSLOG_KEY) {
            // Not a failure: the system log is optional, and says what it takes.
            html = `<div class="note">${e(t('proxmox.syslog_optional'))}</div>`;
        } else if (this.err) {
            html = errorHtml(this.err, t);
        } else if (!this.lines) {
            html = `<div class="empty">${e(t('general.loading'))}</div>`;
        } else if (!this.lines.length) {
            html = `<div class="empty">${e(t('proxmox.syslog_empty'))}</div>`;
        } else {
            html = `<div class="logbox sj-box" role="log" aria-live="off" tabindex="0">${logLinesHtml(this.lines)}</div>`;
        }
        body.innerHTML = html;
        const box = this.el.querySelector('.sj-box');
        if (box && toBottom) box.scrollTop = box.scrollHeight;
        const refresh = this.el.querySelector<HTMLButtonElement>('[data-sj-refresh]');
        // A refresh while nothing has answered yet would only race itself.
        if (refresh) refresh.disabled = !this.lines && !this.err;
        const copy = this.el.querySelector<HTMLButtonElement>('[data-sj-copy]');
        if (copy) copy.disabled = !this.lines?.length;
    }

    private async copy() {
        const lines = this.lines;
        if (!lines?.length) return;
        if (await copyText(taskLogText(lines))) eventBus.emit(EVENTS.NOTIFY, { message: this.t('dockerpage.copied'), type: 'success' });
    }
}
