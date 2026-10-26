import { escapeHtml } from '../../../services/escape';
import { containerName, type DockerContainer, type DockerHost } from '../../../services/dockerShared';
import { stateLevel, stateKey, type DockerDetail, type HostRows, type LogLine } from '../../../services/dockerPage';

/**
 * The markup of the Docker page, as pure functions.
 *
 * Everything that comes from a container — its name, image, paths, variable
 * names, and above all what it prints — is written by somebody else and goes
 * through escapeHtml here and nowhere else. Text the page itself says arrives
 * through `t`, so these can be read and tested without the i18n singleton.
 */

export type T = (key: string, params?: Record<string, string>) => string;

/** How the page formats what depends on the language. */
export interface Fmt {
    /** A moment, in the app's language. */
    date: (iso: string) => string;
    /** A whole number. */
    num: (n: number) => string;
}

const e = escapeHtml;

const ICON_CPU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3"/></svg>';
const ICON_RAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 17v3M12 17v3M17 17v3M8 11v2M12 11v2M16 11v2"/></svg>';
export const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>';
export const ICON_STOP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
export const ICON_RESTART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2m-.5-4v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/></svg>';
const ICON_SPIN = '<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 2a10 10 0 0 1 10 10"/></svg>';
const ICON_ALERT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';

/** A value that is a machine's, not a sentence: addresses and paths stay left-to-right in any language. */
const tech = (v: string, cls = ''): string => `<span class="tech ${cls}" dir="ltr">${e(v)}</span>`;

// ── The list ───────────────────────────────────────────────────────────────

/** Why a host or a container call failed, in words, naming the host when it is the host's doing. */
export function errorHtml(key: string, hostName: string, t: T): string {
    return `<div class="dp-err" role="alert">
        <span class="dp-err__ico">${ICON_ALERT}</span>
        <span class="dp-err__txt"><b class="dp-err__host">${e(hostName)}</b> ${e(t(key))}</span>
    </div>`;
}

/**
 * One container as a row of the list.
 *
 * The figures (CPU, memory) are NOT in this markup: they change every few
 * seconds and the page writes them into the slots, so that the list itself is
 * only rewritten when a container appears, disappears or changes state.
 */
export function rowHtml(hostId: string, c: DockerContainer, t: T): string {
    const name = containerName(c);
    const state = c.State || c.Status;
    const lvl = stateLevel(state);
    const up = lvl === 'up';
    return `<button type="button" class="card dp-row" data-host="${e(hostId)}" data-name="${e(name)}" data-id="${e(c.ID)}">
        <span class="dot dot--${lvl}" title="${e(t(stateKey(state)))}"></span>
        <span class="dp-row__main">
            <span class="dp-row__name">${e(name) || '—'}</span>
            <span class="dp-row__image">${e(c.Image)}</span>
        </span>
        ${up
            ? `<span class="dp-row__stats">
                   <span class="dp-row__stat" data-cpu="${e(c.ID)}">${ICON_CPU}<span></span></span>
                   <span class="dp-row__stat" data-mem="${e(c.ID)}">${ICON_RAM}<span></span></span>
               </span>`
            : `<span class="dp-row__state">${e(t(stateKey(state)))}</span>`}
    </button>`;
}

/** The list: a group per host, with the host's pill when there is more than one host. */
export function groupsHtml(groups: HostRows[], t: T, query: string): string {
    const several = groups.length > 1;
    const out = groups.map(g => {
        const head = several
            ? `<div class="sec__head"><span class="sec__label">${e(g.host.name)}</span><span class="sec__rule"></span></div>`
            : '';
        let body: string;
        if (g.error) body = errorHtml(g.error, several ? '' : g.host.name, t);
        else if (!g.loaded) body = '';
        else if (!g.containers.length) body = `<div class="dp-empty">${e(t(query.trim() ? 'dockerpage.no_match' : 'docker.no_containers'))}</div>`;
        else body = g.containers.map(c => rowHtml(g.host.id, c, t)).join('');
        return `<section class="dp-group">${head}${body}</section>`;
    });
    return out.join('');
}

// ── The detail ─────────────────────────────────────────────────────────────

export interface HeadData {
    host: DockerHost;
    container: DockerContainer;
    showHost: boolean;
    canControl: boolean;
    busy: boolean;
}

/** Name, state and the three actions. */
export function headHtml(d: HeadData, t: T): string {
    const c = d.container;
    const state = c.State || c.Status;
    const lvl = stateLevel(state);
    const running = lvl !== 'off';
    const dis = d.busy ? ' disabled' : '';
    // The agent that serves this very page must not be stopped from it.
    const isAgent = containerName(c) === 'lastboard-agent';
    const btn = (action: string, icon: string, label: string, off = false) =>
        `<button type="button" class="dp-act" data-action="${action}" title="${e(label)}" aria-label="${e(label)}"${dis}${off ? ' disabled' : ''}>${d.busy ? ICON_SPIN : icon}<span>${e(label)}</span></button>`;
    const actions = !d.canControl ? '' : running
        ? btn('restart', ICON_RESTART, t('docker.action_restart')) + btn('stop', ICON_STOP, isAgent ? t('docker.action_stop_disabled') : t('docker.action_stop'), isAgent)
        : btn('start', ICON_PLAY, t('docker.action_start'));
    return `<div class="dp-head__id">
            <span class="dot dot--${lvl}"></span>
            <span class="dp-head__name">${e(containerName(c)) || '—'}</span>
            <span class="dp-head__state dp-head__state--${lvl}">${e(t(stateKey(state)))}</span>
            ${d.showHost ? `<span class="dp-head__host">${e(d.host.name)}</span>` : ''}
        </div>
        <div class="dp-head__acts">${actions}</div>`;
}

const kv = (k: string, v: string, wide = false): string =>
    `<div class="kv${wide ? ' kv--wide' : ''}"><span class="kv__k">${e(k)}</span><span class="kv__v">${v}</span></div>`;

const sec = (label: string, body: string, note = ''): string =>
    `<section class="dp-sec"><div class="sec__head"><span class="sec__label">${e(label)}</span><span class="sec__rule"></span></div>${note ? `<p class="dp-note">${e(note)}</p>` : ''}${body}</section>`;

/** `0.0.0.0:8080 → 80/tcp`; an IPv6 address is bracketed, an unpublished port is only the container's. */
export function portText(p: { container: string; host_ip: string; host_port: string }): string {
    if (!p.host_port) return p.container;
    const ip = p.host_ip.includes(':') ? `[${p.host_ip}]` : (p.host_ip || '0.0.0.0');
    return `${ip}:${p.host_port} → ${p.container}`;
}

const HEALTH_KEYS: Record<string, string> = {
    healthy: 'dockerpage.health_healthy',
    unhealthy: 'dockerpage.health_unhealthy',
    starting: 'dockerpage.health_starting',
};

/** The overview tab: the facts first, then ports, mounts, networks and the names of the environment. */
export function overviewHtml(d: DockerDetail, t: T, fmt: Fmt): string {
    const running = stateLevel(d.state) !== 'off';
    const date = (iso?: string) => (iso ? e(fmt.date(iso)) : '—');
    const health = d.health
        ? `<span class="hl hl--${e(d.health)}">${e(HEALTH_KEYS[d.health] ? t(HEALTH_KEYS[d.health]) : d.health)}</span>`
        : '—';
    const facts = [
        kv(t('dockerpage.state'), e(t(stateKey(d.state)))),
        kv(t('dockerpage.health'), health),
        kv(t('dockerpage.started'), date(d.started_at)),
        // A stopped container is asked how it ended; a running one has not.
        !running || d.exit_code !== 0 ? kv(t('dockerpage.exit_code'), tech(String(d.exit_code))) : '',
        !running && d.finished_at ? kv(t('dockerpage.finished'), date(d.finished_at)) : '',
        kv(t('dockerpage.restart_policy'), tech(d.restart_policy || 'no')),
        kv(t('dockerpage.restarts'), e(fmt.num(d.restart_count))),
        kv(t('dockerpage.created'), date(d.created)),
        d.tty ? kv(t('dockerpage.terminal'), e(t('dockerpage.yes'))) : '',
        kv(t('dockerpage.image'), tech(d.image), true),
    ].join('');

    const none = `<div class="dp-none">${e(t('dockerpage.none'))}</div>`;

    const ports = d.ports.length
        ? `<ul class="dp-list">${d.ports.map(p => `<li>${tech(portText(p))}</li>`).join('')}</ul>`
        : none;

    const mounts = d.mounts.length
        ? `<ul class="dp-list">${d.mounts.map(m => `<li class="dp-mount">
              <span class="dp-mount__dest">${tech(m.destination)}</span>
              <span class="dp-mount__mode dp-mount__mode--${m.read_only ? 'ro' : 'rw'}">${e(t(m.read_only ? 'dockerpage.read_only' : 'dockerpage.read_write'))}</span>
              <span class="dp-mount__src">${m.type ? `<span class="dp-mount__type">${e(m.type)}</span>` : ''}${tech(m.name || m.source)}</span>
          </li>`).join('')}</ul>`
        : none;

    const nets = d.networks.length
        ? `<ul class="dp-list">${d.networks.map(n => `<li class="dp-net"><span>${e(n.name)}</span>${n.ipv4 ? tech(n.ipv4) : ''}</li>`).join('')}</ul>`
        : none;

    const env = d.env.length
        ? `<div class="dp-chips">${d.env.map(n => `<span class="chip">${tech(n)}</span>`).join('')}</div>`
        : none;

    return `<div class="dp-facts">${facts}</div>
        ${sec(t('dockerpage.ports'), ports)}
        ${sec(t('dockerpage.mounts'), mounts)}
        ${sec(t('dockerpage.networks'), nets)}
        ${sec(t('dockerpage.env'), env, t('dockerpage.env_note'))}`;
}

// ── The log ────────────────────────────────────────────────────────────────

/**
 * One log line. The text is the container's, so it is escaped; the stream says
 * whether it is an error line, and `stamp` is the time as the person reads it.
 */
export function logLineHtml(l: LogLine, stamp: string): string {
    const err = l.stream === 'err';
    return `<div class="ll${err ? ' ll--err' : ''}"><time class="ll__t" datetime="${e(l.t)}">${e(stamp)}</time><span class="ll__x">${e(l.text)}</span></div>`;
}
