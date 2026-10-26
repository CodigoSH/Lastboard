import { adoptSharedStyles } from '../../../services/sharedStyles';
import { i18n } from '../../../services/i18n';
import { eventBus, EVENTS } from '../../../services/EventBus';
import { escapeHtml } from '../../../services/escape';
import { isTypingTarget, opensSearch } from '../../../services/searchShortcut';
import { whenVisible } from '../../../services/whenVisible';
import { userStore } from '../../../store/userStore';
import { accessAllows } from '../../../services/access';
import { fetchDockerSettings, hostsForWidget } from '../../../services/dockerHosts';
import { fetchContainers, hostErrorKey, containerName } from '../../../services/dockerShared';
import {
    fetchDetail, fetchLogs, fetchStats, runAction, pageErrorKey, visibleGroups, tally, findSelected, level,
    mergeLogLines, overflow, atBottom, logsToText, logDate, stateLevel, MAX_LOG_LINES,
    type DockerDetail, type HostRows, type LogLine, type ContainerStats, type ContainerAction,
} from '../../../services/dockerPage';
import { groupsHtml, headHtml, overviewHtml, logLineHtml, errorHtml, type T, type Fmt } from './DockerPage.template';
import css from './DockerPage.css' with { type: 'text' };

const ICON_CONTAINER = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 7.7c0-.6-.4-1.2-.8-1.5l-6.3-3.9a1.72 1.72 0 0 0-1.7 0l-10.3 6c-.5.2-.9.8-.9 1.4v6.6c0 .5.4 1.2.8 1.5l6.3 3.9a1.72 1.72 0 0 0 1.7 0l10.3-6c.5-.3.9-1 .9-1.5Z"/><path d="M10 21.9V14L2.1 9.1"/><path d="m10 14 11.9-6.9"/><path d="M14 19.8v-8.1"/><path d="M18 17.5V9.4"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
const ICON_BACK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
const ICON_SEARCH = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
const ICON_COPY = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const ICON_DOWN = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';

const LIST_MS = 10000;
const LOG_MS = 3000;
const FIRST_TAIL = 100;
const MORE_TAIL = 1000;
const FOLLOW_KEY = 'docker.logFollow';
const STAMPS_KEY = 'docker.logTimestamps';

function readFlag(key: string, fallback: boolean): boolean {
    try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : v === '1';
    } catch { return fallback; }
}
function writeFlag(key: string, on: boolean): void {
    try { localStorage.setItem(key, on ? '1' : '0'); } catch { /* a private window: it holds for this visit */ }
}

type Tab = 'overview' | 'logs';

/**
 * The Docker containers of the account, as a page of the board.
 *
 * Laid out like the other full-screen pages: the list on the start side, the
 * selected container beside it. What the widget cannot do in a tile is here —
 * the details of one container and its log — and it reads them through the same
 * hosts and the same permissions, so a member only sees what the account may.
 */
class DockerPage extends HTMLElement {
    private groups: HostRows[] = [];
    private stats = new Map<string, ContainerStats>();
    private loaded = false;
    private fatal = '';
    private noHosts = false;
    private query = '';
    private sel: { hostId: string; name: string } | null = null;
    private tab: Tab = 'overview';
    private detail: DockerDetail | null = null;
    private detailErr = '';
    private lines: LogLine[] = [];
    private logsErr = '';
    private logsLoaded = false;
    private truncated = false;
    private loadedTail = FIRST_TAIL;
    private follow = readFlag(FOLLOW_KEY, true);
    private stamps = readFlag(STAMPS_KEY, true);
    private busy = new Set<string>();
    private view: 'list' | 'detail' = 'list';
    /** History entries this page has put on the stack: the page, and a container on a phone. */
    private depth = 0;

    private loading = false;
    private polling = false;
    private detailSeq = 0;
    private logSeq = 0;
    private listTimer: ReturnType<typeof setInterval> | null = null;
    private logTimer: ReturnType<typeof setInterval> | null = null;

    // What was last written into each region, so a refresh that changes nothing writes nothing.
    private lastList = '';
    private lastHead = '';
    private lastOverview = '';
    private lastStatus = '';

    private _listening = false;
    private _unsubscribeI18n: (() => void) | undefined;
    private readonly _keydown: (e: KeyboardEvent) => void;
    private readonly _popstate: () => void;
    private readonly _visibility: () => void;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        adoptSharedStyles(this.shadowRoot);

        this._keydown = (e: KeyboardEvent) => {
            if (!this.hasAttribute('open')) return;
            // A confirmation answers its own Escape; closing the page under it would be a second effect of one key.
            if (document.querySelector('confirmation-modal')?.shadowRoot?.querySelector('dialog[open]')) return;
            if (e.key === 'Escape') { this.close(); return; }
            const typing = isTypingTarget(e.composedPath()[0] as Element | undefined, 'dp-search');
            if (!opensSearch(e, { locked: false, typing })) return;
            const input = this.$('dp-search') as HTMLInputElement | null;
            if (!input) return;
            e.preventDefault();
            input.focus();
            input.select();
        };

        // Back: only ours while we have entries on the stack.
        this._popstate = () => {
            if (this.depth <= 0) return;
            this.depth--;
            if (!this.hasAttribute('open')) return;
            if (this.depth > 0 && this.view === 'detail') { this.toList(); return; }
            this.closeQuietly();
        };

        // A tab that was hidden asks again as soon as it is shown, instead of waiting out the timer.
        this._visibility = () => {
            if (document.visibilityState !== 'visible' || !this.hasAttribute('open')) return;
            void this.load();
            void this.pollLogs();
        };
    }

    connectedCallback() {
        if (!this._listening) {
            this._listening = true;
            this.shadowRoot!.addEventListener('click', this.onClick);
            this.shadowRoot!.addEventListener('input', this.onInput);
        }
        this.build();
        window.addEventListener('keydown', this._keydown);
        window.addEventListener('popstate', this._popstate);
        document.addEventListener('visibilitychange', this._visibility);
        this._unsubscribeI18n = i18n.subscribe(() => {
            // Every label is written into the shell, so a language change is one of the two moments it is written again.
            this.build();
            if (this.hasAttribute('open')) this.paintAll(true);
        });
    }

    disconnectedCallback() {
        window.removeEventListener('keydown', this._keydown);
        window.removeEventListener('popstate', this._popstate);
        document.removeEventListener('visibilitychange', this._visibility);
        this.stopTimers();
        if (this._unsubscribeI18n) this._unsubscribeI18n();
    }

    // ── Opening and closing ──

    open() {
        this.setAttribute('open', '');
        // A full-screen page is a place: Back leaves it rather than leaving Lastboard.
        if (this.depth === 0) { history.pushState({ lbDocker: 'page' }, ''); this.depth = 1; }
        eventBus.emit(EVENTS.DOCKER_PAGE_CHANGED, { open: true });
        this.view = 'list';
        this.loaded = false;
        this.paintAll(true);
        void this.load(true);
        if (this.listTimer) clearInterval(this.listTimer);
        this.listTimer = setInterval(whenVisible(() => this.load()), LIST_MS);
        this.syncPolling();
    }

    private closeQuietly() {
        this.removeAttribute('open');
        eventBus.emit(EVENTS.DOCKER_PAGE_CHANGED, { open: false });
        this.stopTimers();
        // Nothing the page asked for is still wanted: a late answer must not paint a closed page.
        this.detailSeq++;
        this.logSeq++;
    }

    close() {
        // Closing by the X or by Escape takes our entries off the stack with it. Zeroing first
        // is what stops the popstate this causes from being read as the user going back.
        const steps = this.depth;
        this.depth = 0;
        this.closeQuietly();
        if (steps > 0) history.go(-steps);
    }

    private stopTimers() {
        if (this.listTimer) { clearInterval(this.listTimer); this.listTimer = null; }
        if (this.logTimer) { clearInterval(this.logTimer); this.logTimer = null; }
    }

    private toList() {
        this.view = 'list';
        this.syncLayout();
        this.syncPolling();
    }

    // ── Small helpers ──

    private $(id: string): HTMLElement | null {
        return this.shadowRoot?.getElementById(id) ?? null;
    }

    private readonly t: T = (key, params) => i18n.t(key, params);

    private readonly fmt: Fmt = {
        date: (iso) => {
            const d = logDate(iso);
            return d ? i18n.formatDateTime(d, { dateStyle: 'medium', timeStyle: 'medium' }) : '—';
        },
        num: (n) => i18n.formatNumber(n),
    };

    private stamp = (t: string): string => {
        const d = logDate(t);
        return d ? i18n.formatDateTime(d, {
            month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3,
        }) : '';
    };

    private isNarrow(): boolean {
        return window.innerWidth <= 640;
    }

    private mayControl(): boolean {
        const user = userStore.getUser();
        return !!user && accessAllows(user, 'docker_control');
    }

    private current() {
        return findSelected(this.groups, this.sel);
    }

    /** Whether the detail is on screen: beside the list, or in place of it on a phone. */
    private detailVisible(): boolean {
        return !!this.sel && (!this.isNarrow() || this.view === 'detail');
    }

    // ── Shell ──

    private build() {
        const t = this.t;
        const q = escapeHtml(t('docker.search_containers'));
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            <div class="dp">
                <header class="dp__header">
                    <button type="button" class="dp__back" id="dp-back" hidden
                            aria-label="${escapeHtml(t('general.back'))}" title="${escapeHtml(t('general.back'))}">${ICON_BACK}</button>
                    <div class="dp__title">${ICON_CONTAINER}<span>${escapeHtml(t('widget.docker.name'))}</span></div>
                    <div class="dp__status" id="dp-status"></div>
                    <button type="button" class="dp__close" id="dp-close"
                            aria-label="${escapeHtml(t('general.close'))}" title="${escapeHtml(t('general.close'))}">${ICON_CLOSE}</button>
                </header>
                <div class="dp__layout" id="dp-layout" data-view="${this.view}">
                    <aside class="dp__list">
                        <div class="sec__head dp__listhead">
                            <span class="sec__label">${escapeHtml(t('docker.containers'))}</span>
                            <span class="sec__rule"></span>
                            <span class="search">${ICON_SEARCH}
                                <input id="dp-search" type="search" placeholder="${q}" aria-label="${q}" autocomplete="off" />
                            </span>
                        </div>
                        <div class="dp__rows" id="dp-rows"></div>
                    </aside>
                    <section class="dp__detail">
                        <div class="dp-hint" id="dp-hint">${escapeHtml(t('dockerpage.select_hint'))}</div>
                        <div class="dp-pane" id="dp-pane" hidden>
                            <div class="dp-head" id="dp-head"></div>
                            <div class="dp-tabs" role="tablist">
                                <button type="button" class="dp-tab" role="tab" data-tab="overview" id="dp-tab-overview">${escapeHtml(t('dockerpage.tab_overview'))}</button>
                                <button type="button" class="dp-tab" role="tab" data-tab="logs" id="dp-tab-logs">${escapeHtml(t('dockerpage.tab_logs'))}</button>
                            </div>
                            <div class="dp-overview" id="dp-overview"></div>
                            <div class="dp-logs" id="dp-logs" hidden>
                                <div class="dp-logbar">
                                    <button type="button" class="tg" id="dp-follow" aria-pressed="false">${ICON_DOWN}<span>${escapeHtml(t('dockerpage.follow'))}</span></button>
                                    <button type="button" class="tg" id="dp-ts" aria-pressed="false"><span>${escapeHtml(t('dockerpage.timestamps'))}</span></button>
                                    <span class="dp-logbar__gap"></span>
                                    <button type="button" class="tg" id="dp-more"><span>${escapeHtml(t('dockerpage.load_more', { count: i18n.formatNumber(MORE_TAIL) }))}</span></button>
                                    <button type="button" class="tg" id="dp-copy">${ICON_COPY}<span>${escapeHtml(t('dockerpage.copy'))}</span></button>
                                </div>
                                <div class="dp-lognote" id="dp-lognote" hidden>${escapeHtml(t('dockerpage.logs_truncated'))}</div>
                                <div class="logbox" id="dp-logbox" role="log" aria-live="off" tabindex="0"></div>
                                <div class="dp-logstate" id="dp-logstate" hidden></div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>`;
        const input = this.$('dp-search') as HTMLInputElement | null;
        if (input) input.value = this.query;
        // The regions are new and empty: nothing written before is still there.
        this.lastList = this.lastHead = this.lastOverview = this.lastStatus = '';
    }

    // ── Events ──

    private readonly onInput = (e: Event) => {
        const el = e.target as HTMLElement;
        if (el.id !== 'dp-search') return;
        this.query = (el as HTMLInputElement).value;
        this.paintList();
    };

    private readonly onClick = (e: Event) => {
        const el = e.target as HTMLElement;
        if (el.closest('#dp-close')) { this.close(); return; }
        if (el.closest('#dp-back')) {
            if (this.depth > 1) history.back(); else this.toList();
            return;
        }
        const row = el.closest('.dp-row') as HTMLElement | null;
        if (row) { this.select(row.dataset.host || '', row.dataset.name || ''); return; }
        const act = el.closest('.dp-act') as HTMLButtonElement | null;
        if (act && !act.disabled) { this.act(act.dataset.action as ContainerAction); return; }
        const tab = el.closest('[data-tab]') as HTMLElement | null;
        if (tab) { this.setTab(tab.dataset.tab === 'logs' ? 'logs' : 'overview'); return; }
        if (el.closest('#dp-follow')) {
            this.follow = !this.follow;
            writeFlag(FOLLOW_KEY, this.follow);
            this.paintLogBar();
            this.syncPolling();
            if (this.follow) { void this.pollLogs(true); }
            return;
        }
        if (el.closest('#dp-ts')) {
            this.stamps = !this.stamps;
            writeFlag(STAMPS_KEY, this.stamps);
            this.paintLogBar();
            return;
        }
        if (el.closest('#dp-more')) { void this.loadLogs(MORE_TAIL); return; }
        if (el.closest('#dp-copy')) { void this.copyLogs(); }
    };

    // ── Selection ──

    private select(hostId: string, name: string) {
        if (this.sel && this.sel.hostId === hostId && this.sel.name === name) {
            if (this.isNarrow()) this.enterDetail();
            return;
        }
        this.sel = { hostId, name };
        this.resetSelected();
        this.enterDetail();
        this.markSelected();
        this.paintDetail();
        void this.loadDetail();
        if (this.tab === 'logs') void this.loadLogs(FIRST_TAIL);
        this.syncPolling();
    }

    /** On a phone the detail takes the screen, and Back returns to the list. */
    private enterDetail() {
        if (!this.isNarrow() || this.view === 'detail') return;
        this.view = 'detail';
        history.pushState({ lbDocker: 'detail' }, '');
        this.depth++;
        this.syncLayout();
        this.syncPolling();
    }

    /** What belongs to the container that was chosen before is dropped, so none of it is shown under the new name. */
    private resetSelected() {
        this.detail = null;
        this.detailErr = '';
        this.lines = [];
        this.logsErr = '';
        this.logsLoaded = false;
        this.truncated = false;
        this.loadedTail = FIRST_TAIL;
        this.detailSeq++;
        this.logSeq++;
        this.lastHead = this.lastOverview = '';
        const box = this.$('dp-logbox');
        if (box) box.innerHTML = '';
        this.paintLogMeta();
    }

    private setTab(tab: Tab) {
        if (tab === this.tab) return;
        this.tab = tab;
        this.paintTabs();
        if (tab === 'logs') {
            // The log is drawn when it is shown, not on every refresh of the page: it has a scroll position of its own.
            if (this.logsLoaded) this.paintLogs(true); else this.paintLogMeta();
        }
        if (tab === 'logs' && !this.logsLoaded && this.sel) void this.loadLogs(FIRST_TAIL);
        this.syncPolling();
    }

    // ── Data ──

    private async load(fresh = false) {
        if (this.loading) return;
        this.loading = true;
        try {
            const settings = await fetchDockerSettings(fresh);
            const hosts = hostsForWidget(settings.hosts);
            this.noHosts = hosts.length === 0;
            this.fatal = '';
            const previous = new Map(this.groups.map(g => [g.host.id, g]));
            this.groups = await Promise.all(hosts.map(async (host): Promise<HostRows> => {
                try {
                    return { host, containers: await fetchContainers(host), loaded: true };
                } catch (err) {
                    // A host that fails shows why in its own place; the others still draw.
                    return { host, containers: [], error: hostErrorKey(err), loaded: previous.get(host.id)?.loaded ?? true };
                }
            }));
        } catch {
            this.groups = [];
            this.fatal = 'docker.connection_error';
        }
        this.loading = false;
        this.loaded = true;
        if (!this.hasAttribute('open')) return;

        // A container that is gone is gone; one whose host did not answer is only out of sight.
        if (this.sel && !this.current()) {
            const g = this.groups.find(x => x.host.id === this.sel!.hostId);
            if (!g || (!g.error && g.loaded)) {
                this.sel = null;
                this.resetSelected();
                if (this.view === 'detail') { this.view = 'list'; this.syncLayout(); }
                this.syncPolling();
            }
        }
        this.paintAll();
        void this.loadStats();
        if (this.current()) void this.loadDetail();
    }

    private async loadStats() {
        await Promise.all(this.groups.map(async g => {
            const ids = g.containers.filter(c => stateLevel(c.State || c.Status) === 'up').map(c => c.ID);
            // What is no longer running has no reading; keeping the old one would show it as alive.
            for (const c of g.containers) if (!ids.includes(c.ID)) this.stats.delete(c.ID);
            if (!ids.length || g.error) return;
            try {
                const all = await fetchStats(g.host, ids);
                for (const id of ids) {
                    if (all[id]) this.stats.set(id, all[id]); else this.stats.delete(id);
                }
            } catch { /* no number is better than a wrong one */ }
        }));
        if (this.hasAttribute('open')) this.applyStats();
    }

    private async loadDetail() {
        const cur = this.current();
        if (!cur) return;
        const seq = ++this.detailSeq;
        try {
            const d = await fetchDetail(cur.host, cur.container.ID);
            if (seq !== this.detailSeq) return;
            this.detail = d;
            this.detailErr = '';
            // An agent that was updated since the log was refused can answer now; do not make the person re-select.
            if (this.logsErr === 'docker.agent_too_old' || this.logsErr === 'docker.not_found') {
                this.logsErr = '';
                this.logsLoaded = false;
                if (this.tab === 'logs') void this.loadLogs(FIRST_TAIL);
            }
        } catch (err) {
            if (seq !== this.detailSeq) return;
            this.detail = null;
            this.detailErr = pageErrorKey(err);
        }
        this.paintDetail();
        // A daemon that no longer has it: the list is the one that knows.
        if (this.detailErr === 'docker.not_found') void this.load();
    }

    /** Reads the log afresh: the last `tail` lines, replacing what is shown. */
    private async loadLogs(tail: number) {
        const cur = this.current();
        if (!cur) return;
        const seq = ++this.logSeq;
        try {
            const b = await fetchLogs(cur.host, cur.container.ID, { tail });
            if (seq !== this.logSeq) return;
            this.lines = b.lines.slice(-MAX_LOG_LINES);
            this.truncated = b.truncated;
            this.logsErr = '';
            this.loadedTail = tail;
        } catch (err) {
            if (seq !== this.logSeq) return;
            this.lines = [];
            this.logsErr = pageErrorKey(err);
        }
        this.logsLoaded = true;
        this.paintLogs(true);
    }

    /** What the follow timer asks: only the lines after the last one shown. */
    private async pollLogs(immediate = false) {
        if (this.polling || !this.hasAttribute('open') || this.tab !== 'logs' || !this.detailVisible()) return;
        if (!immediate && !this.follow) return;
        // An agent that does not know the call will not learn it by being asked every three seconds.
        if (this.logsErr === 'docker.agent_too_old' || this.logsErr === 'docker.not_found') return;
        const cur = this.current();
        if (!cur) return;
        if (!this.logsLoaded) { void this.loadLogs(this.loadedTail); return; }
        this.polling = true;
        const seq = this.logSeq;
        const after = this.lines.length ? this.lines[this.lines.length - 1].t : undefined;
        try {
            const b = await fetchLogs(cur.host, cur.container.ID, { after });
            if (seq !== this.logSeq) return;
            const wasError = this.logsErr;
            this.logsErr = '';
            if (b.truncated && !this.truncated) { this.truncated = true; this.paintLogMeta(); }
            if (b.lines.length) this.appendLogs(b.lines);
            else if (wasError) this.paintLogs(false);
        } catch (err) {
            if (seq !== this.logSeq) return;
            this.logsErr = pageErrorKey(err);
            this.paintLogMeta();
        } finally {
            this.polling = false;
        }
    }

    private async copyLogs() {
        const text = logsToText(this.lines, this.stamps ? this.stamp : null);
        let ok = false;
        try {
            await navigator.clipboard.writeText(text);
            ok = true;
        } catch {
            // Over plain http the clipboard API is not offered; a hidden field and the old command still work.
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:fixed;inset-block-start:0;inset-inline-start:0;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            try { ok = document.execCommand('copy'); } catch { ok = false; }
            ta.remove();
        }
        if (ok) eventBus.emit(EVENTS.NOTIFY, { message: this.t('dockerpage.copied'), type: 'success' });
    }

    // ── Actions ──

    private act(action: ContainerAction) {
        const cur = this.current();
        if (!cur || !this.mayControl()) return;
        const { host, container } = cur;
        const name = containerName(container);
        const run = async () => {
            this.busy.add(container.ID);
            this.paintHead();
            try {
                await runAction(host, container.ID, action);
                eventBus.emit(EVENTS.NOTIFY, { message: this.t('docker.action_success'), type: 'success' });
                // The daemon takes a moment to report the new state.
                await new Promise(r => setTimeout(r, 600));
            } catch (err) {
                const key = pageErrorKey(err);
                eventBus.emit(EVENTS.NOTIFY, {
                    message: this.t(key === 'docker.connection_error' ? 'docker.action_error' : key),
                    type: 'error',
                });
            }
            this.busy.delete(container.ID);
            await this.load();
            this.paintHead();
        };
        if (action === 'start') { void run(); return; }
        eventBus.emit(EVENTS.SHOW_CONFIRMATION, {
            title: this.t(action === 'stop' ? 'docker.action_stop' : 'docker.action_restart'),
            message: this.t(action === 'stop' ? 'dockerpage.confirm_stop' : 'dockerpage.confirm_restart', { name }),
            onConfirm: () => { void run(); },
        });
    }

    // ── Polling of the log ──

    /** The log timer runs exactly while there is a log in front of somebody who asked it to follow. */
    private syncPolling() {
        const want = this.hasAttribute('open') && this.tab === 'logs' && this.follow && this.detailVisible();
        if (want && !this.logTimer) this.logTimer = setInterval(whenVisible(() => this.pollLogs()), LOG_MS);
        if (!want && this.logTimer) { clearInterval(this.logTimer); this.logTimer = null; }
    }

    // ── Painting ──

    private paintAll(force = false) {
        if (force) this.lastList = this.lastHead = this.lastOverview = this.lastStatus = '';
        this.paintStatus();
        this.paintList();
        this.paintDetail();
        if (force && this.tab === 'logs') {
            if (this.logsLoaded) this.paintLogs(true); else this.paintLogMeta();
        }
        this.syncLayout();
    }

    private syncLayout() {
        const layout = this.$('dp-layout');
        if (layout) layout.dataset.view = this.view;
        const back = this.$('dp-back') as HTMLElement | null;
        if (back) back.hidden = !(this.isNarrow() && this.view === 'detail');
    }

    private paintStatus() {
        const el = this.$('dp-status');
        if (!el) return;
        const tl = tally(this.groups);
        const html = this.loaded && !this.fatal && !this.noHosts
            ? `<span class="stat stat--up"><b>${tl.running}</b>/${tl.total} ${escapeHtml(this.t('docker.state_running'))}</span>
               <span class="stat stat--down">${escapeHtml(this.t('dockerpage.stopped_count'))}: <b>${tl.stopped}</b></span>`
            : '';
        if (html === this.lastStatus) return;
        this.lastStatus = html;
        el.innerHTML = html;
    }

    private paintList() {
        const rows = this.$('dp-rows');
        if (!rows) return;
        const t = this.t;
        let html: string;
        if (!this.loaded) html = `<div class="dp-empty">${escapeHtml(t('general.loading'))}</div>`;
        else if (this.fatal) html = errorHtml(this.fatal, '', t);
        else if (this.noHosts) html = `<div class="dp-empty">${escapeHtml(t('docker.no_hosts_configured'))}<br><small>${escapeHtml(t('docker.configure_hint'))}</small></div>`;
        else html = groupsHtml(visibleGroups(this.groups, this.query), t, this.query);

        if (html !== this.lastList) {
            // A list that is rewritten must not jump back to the top.
            const top = rows.scrollTop;
            rows.innerHTML = html;
            rows.scrollTop = top;
            this.lastList = html;
        }
        this.markSelected();
        this.applyStats();
        this.paintStatus();
    }

    private markSelected() {
        const rows = this.$('dp-rows');
        if (!rows) return;
        rows.querySelectorAll<HTMLElement>('.dp-row').forEach(r => {
            const on = !!this.sel && r.dataset.host === this.sel.hostId && r.dataset.name === this.sel.name;
            r.classList.toggle('dp-row--active', on);
            if (on) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current');
        });
    }

    /** Writes the readings into their slots; the rows themselves are not touched. */
    private applyStats() {
        const rows = this.$('dp-rows');
        if (!rows) return;
        const pct = (v: number) => i18n.formatNumber(Math.round(v * 10) / 10, { maximumFractionDigits: 1 }) + '%';
        const put = (slot: HTMLElement | null, v: number | null) => {
            const out = slot?.querySelector('span');
            if (!slot || !out) return;
            const text = v === null ? '—' : pct(v);
            if (out.textContent !== text) out.textContent = text;
            slot.classList.toggle('is-warn', v !== null && level(v) === 'warn');
            slot.classList.toggle('is-bad', v !== null && level(v) === 'bad');
        };
        rows.querySelectorAll<HTMLElement>('[data-cpu]').forEach(cpu => {
            const s = this.stats.get(cpu.dataset.cpu || '');
            put(cpu, s ? s.CPUPercent : null);
            put(cpu.nextElementSibling as HTMLElement | null, s ? s.MemPercent : null);
        });
    }

    private paintTabs() {
        for (const tab of ['overview', 'logs'] as const) {
            const b = this.$(`dp-tab-${tab}`);
            if (!b) continue;
            b.classList.toggle('dp-tab--active', this.tab === tab);
            b.setAttribute('aria-selected', String(this.tab === tab));
        }
        const ov = this.$('dp-overview');
        const lg = this.$('dp-logs');
        if (ov) ov.hidden = this.tab !== 'overview';
        if (lg) lg.hidden = this.tab !== 'logs';
    }

    private paintHead() {
        const head = this.$('dp-head');
        const cur = this.current();
        if (!head || !cur) return;
        const html = headHtml({
            host: cur.host,
            container: cur.container,
            showHost: this.groups.length > 1,
            canControl: this.mayControl(),
            busy: this.busy.has(cur.container.ID),
        }, this.t);
        if (html === this.lastHead) return;
        this.lastHead = html;
        head.innerHTML = html;
    }

    private paintDetail() {
        const cur = this.current();
        const hint = this.$('dp-hint') as HTMLElement | null;
        const pane = this.$('dp-pane') as HTMLElement | null;
        if (!hint || !pane) return;
        // The container is chosen but its host is not answering right now: what was drawn stays.
        const show = !!this.sel && (!!cur || !!this.detail);
        hint.hidden = show;
        pane.hidden = !show;
        if (!show || !cur) return;
        this.paintHead();
        this.paintTabs();
        const ov = this.$('dp-overview');
        if (!ov) return;
        const t = this.t;
        const html = this.detail
            ? overviewHtml(this.detail, t, this.fmt)
            : this.detailErr
                ? errorHtml(this.detailErr, cur.host.name, t)
                : `<div class="dp-empty">${escapeHtml(t('general.loading'))}</div>`;
        if (html === this.lastOverview) return;
        const top = ov.scrollTop;
        this.lastOverview = html;
        ov.innerHTML = html;
        ov.scrollTop = top;
    }

    // ── The log ──

    private paintLogBar() {
        const set = (id: string, on: boolean) => {
            const b = this.$(id);
            if (!b) return;
            b.classList.toggle('tg--on', on);
            b.setAttribute('aria-pressed', String(on));
        };
        set('dp-follow', this.follow);
        set('dp-ts', this.stamps);
        const box = this.$('dp-logbox');
        if (box) box.classList.toggle('logbox--no-ts', !this.stamps);
        const more = this.$('dp-more') as HTMLButtonElement | null;
        if (more) more.disabled = this.loadedTail >= MORE_TAIL;
        const copy = this.$('dp-copy') as HTMLButtonElement | null;
        if (copy) copy.disabled = !this.lines.length;
    }

    /** The note, the empty state and the error — everything about the log that is not a line of it. */
    private paintLogMeta() {
        const note = this.$('dp-lognote') as HTMLElement | null;
        if (note) note.hidden = !this.truncated;
        const state = this.$('dp-logstate') as HTMLElement | null;
        const box = this.$('dp-logbox') as HTMLElement | null;
        const cur = this.current();
        if (!state || !box) return;
        let html = '';
        if (this.logsErr && cur) html = errorHtml(this.logsErr, cur.host.name, this.t);
        else if (!this.logsLoaded) html = `<div class="dp-empty">${escapeHtml(this.t('general.loading'))}</div>`;
        else if (!this.lines.length) html = `<div class="dp-empty">${escapeHtml(this.t('dockerpage.logs_empty'))}</div>`;
        if (state.innerHTML !== html) state.innerHTML = html;
        state.hidden = !html;
        box.hidden = !!html;
        this.paintLogBar();
    }

    /** Draws the whole log: on a fresh read, on a change of language, on opening the tab. */
    private paintLogs(toBottom: boolean) {
        const box = this.$('dp-logbox');
        if (!box) return;
        box.innerHTML = this.lines.map(l => logLineHtml(l, this.stamp(l.t))).join('');
        this.paintLogMeta();
        if (toBottom) box.scrollTop = box.scrollHeight;
    }

    /** Adds what a poll brought, drops what falls off the front, and follows only a reader who is at the end. */
    private appendLogs(incoming: LogLine[]) {
        const box = this.$('dp-logbox');
        const before = this.lines.length;
        const last = before ? this.lines[before - 1].t : '';
        const fresh = last ? incoming.filter(l => l.t > last) : incoming;
        if (!fresh.length) return;
        const drop = overflow(before, fresh.length);
        this.lines = mergeLogLines(this.lines, fresh);
        if (!box) return;
        // Decided before writing: afterwards the box is taller and every reader looks as if they had scrolled up.
        const stick = atBottom(box.scrollTop, box.clientHeight, box.scrollHeight);
        box.insertAdjacentHTML('beforeend', fresh.map(l => logLineHtml(l, this.stamp(l.t))).join(''));
        for (let i = 0; i < drop && box.firstElementChild; i++) box.firstElementChild.remove();
        if (before === 0) this.paintLogMeta(); else this.paintLogBar();
        if (stick) box.scrollTop = box.scrollHeight;
    }
}

if (!customElements.get('docker-page')) {
    customElements.define('docker-page', DockerPage);
}

export { DockerPage };
