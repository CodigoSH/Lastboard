import { describe, expect, test } from 'bun:test';
import {
    cardHtml, dotTone, drawerHeadHtml, envTabHtml, footerHtml, healthChip, hostErrorHtml, inventoryHtml, logLineHtml, logViewerHtml,
    mountsTabHtml, overviewHtml, portText, reasonText, rowHtml, summaryHtml, summaryTabHtml, type Fmt, type T, type UnitView,
} from './DockerPage.template';
import { attentionList, dockerTotals, projectRows } from '../../../services/dockerOverview';
import type { DockerDetail, HostRows } from '../../../services/dockerPage';
import type { DockerContainer, DockerHost } from '../../../services/dockerShared';

const t: T = (key, params) => `<${key}${params ? ':' + JSON.stringify(params) : ''}>`.replace(/</g, '[').replace(/>/g, ']');
const fmt: Fmt = { date: iso => `D(${iso})`, num: n => `N(${n})`, pct: n => `P(${n})`, bytes: n => `B(${n})`, dec: n => `F(${n})` };

const host: DockerHost = { id: 'h1', name: 'Home <b>box</b>', type: 'tcp', url: 'x' };
const ctr = (over: Partial<DockerContainer> = {}): DockerContainer => ({
    ID: 'abc', Name: '/web', Image: 'nginx:1', Status: 'running', State: 'running', Created: 0, Ports: [], ...over,
});
const detail = (over: Partial<DockerDetail> = {}): DockerDetail => ({
    id: 'abc', name: 'web', image: 'nginx:1', created: '2026-10-01T00:00:00Z', status: 'running', state: 'running',
    started_at: '2026-10-02T00:00:00Z', exit_code: 0, restart_policy: 'always', restart_count: 2,
    ports: [], mounts: [], networks: [], env: [], tty: false, ...over,
});
const view = (c: DockerContainer, over: Partial<UnitView> = {}): UnitView => ({
    hostId: 'h1', hostName: host.name, showHost: false, container: c, selected: false, link: '', face: '', ...over,
});

/** Nothing a container says may become markup. */
const noMarkup = (html: string, payload: string) => {
    expect(html).not.toContain(payload);
    expect(html).toContain('&lt;');
};

describe('what a container controls is escaped', () => {
    const evil = '<img src=x onerror=alert(1)>';

    test('a log line', () => {
        const html = logLineHtml({ t: '2026-10-26T10:00:00.000000000Z', stream: 'err', text: '<b>x</b> ' + evil }, '10:00');
        expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
        noMarkup(html, evil);
        expect(html).toContain('ll--err');
    });

    test('a name, an image, a host and a project in a card and a row', () => {
        const c = ctr({ Name: '/' + evil, Image: evil, Project: evil, Health: 'healthy' });
        const v = view(c, { showHost: true });
        for (const html of [cardHtml(v, t, fmt), rowHtml(v, t, fmt)]) {
            noMarkup(html, evil);
            expect(html).not.toContain('<b>box</b>');
        }
    });

    test('the data attributes of a card cannot be broken out of', () => {
        const html = cardHtml(view(ctr({ Name: '/a" onclick="x' })), t, fmt);
        expect(html).not.toContain('" onclick="x');
        expect(rowHtml(view(ctr({ Name: '/a" onclick="x' })), t, fmt)).not.toContain('" onclick="x');
    });

    test('a group name and a host that failed', () => {
        const u = ctr({ Project: evil });
        const html = inventoryHtml([{ name: evil, units: [{ id: 'h1/web' } as never] }], 'cards', () => view(u), t, fmt, true);
        noMarkup(html, evil);
        noMarkup(hostErrorHtml('docker.connection_error', evil, t), evil);
    });

    test('the drawer: head, facts, ports, mounts, networks and variable names', () => {
        const c = ctr({ Name: '/' + evil, Project: evil });
        noMarkup(drawerHeadHtml({ host, container: c, showHost: true, link: evil, face: '' }, t), evil);
        const d = detail({
            image: evil, health: evil, restart_policy: evil,
            ports: [{ container: evil, host_ip: '0.0.0.0', host_port: '80' }],
            mounts: [{ type: 'bind', source: evil, destination: evil, read_only: true }],
            networks: [{ name: evil, ipv4: evil }],
            env: [evil],
        });
        noMarkup(summaryTabHtml(d, c, undefined, evil, t, fmt), evil);
        noMarkup(mountsTabHtml(d, t), evil);
        noMarkup(envTabHtml(d, t), evil);
    });

    test('the overview: attention list, projects and hosts', () => {
        const rows: HostRows[] = [{ host: { ...host, name: evil }, loaded: true, containers: [ctr({ Name: '/' + evil, Health: 'unhealthy', Project: evil })] }, { host: { ...host, id: 'h2' }, loaded: true, containers: [] }];
        const html = overviewHtml({
            totals: dockerTotals(rows), attention: attentionList(rows), projects: projectRows(rows), hosts: rows, cores: [], mem: [], chart: '', hostNames: { h1: evil }, linkOf: () => '', hostUse: {}, capacity: null,
        }, t, fmt);
        noMarkup(html, evil);
    });
});

describe('the summary tab', () => {
    test('the environment tab shows names, one each, and says values are not shown', () => {
        const html = envTabHtml(detail({ env: ['TZ', 'LOG_LEVEL'] }), t);
        expect(html).toContain('<code dir="ltr">TZ</code>');
        expect(html).toContain('dockerpage.env_note');
    });

    test('the exit code and the end time are for a container that is not running', () => {
        const stopped = summaryTabHtml(detail({ state: 'exited', status: 'stopped', exit_code: 137, finished_at: '2026-10-03T00:00:00Z' }), ctr({ State: 'exited' }), undefined, '', t, fmt);
        expect(stopped).toContain('dockerpage.exit_code');
        expect(stopped).toContain('137');
        expect(stopped).toContain('dockerpage.finished');
        const running = summaryTabHtml(detail(), ctr(), undefined, '', t, fmt);
        expect(running).not.toContain('dockerpage.exit_code');
        expect(running).not.toContain('dockerpage.finished');
    });

    test('a running container that exited non-zero before still shows its code', () => {
        expect(summaryTabHtml(detail({ exit_code: 2 }), ctr(), undefined, '', t, fmt)).toContain('dockerpage.exit_code');
    });

    test('live readings only for a running container that has them', () => {
        const s = { CPUPercent: 12.5, MemPercent: 40, MemUsed: 123, MemLimit: 1000 };
        expect(summaryTabHtml(detail(), ctr(), s, '', t, fmt)).toContain('P(12.5)');
        expect(summaryTabHtml(detail(), ctr(), undefined, '', t, fmt)).not.toContain('live3');
        expect(summaryTabHtml(detail({ state: 'exited' }), ctr({ State: 'exited' }), s, '', t, fmt)).not.toContain('P(12.5)');
    });

    test('mounts say whether they are read-only; empty lists say "none"', () => {
        const html = mountsTabHtml(detail({ mounts: [
            { type: 'bind', source: '/a', destination: '/b', read_only: true },
            { type: 'volume', name: 'data', source: '/v', destination: '/d', read_only: false },
        ] }), t);
        expect(html).toContain('mode--ro');
        expect(html).toContain('mode--rw');
        expect(html).toContain('data');
        expect(mountsTabHtml(detail(), t).match(/dockerpage\.none/g)?.length).toBe(2);
    });
});

describe('ports', () => {
    test('are written host first, an IPv6 address bracketed', () => {
        expect(portText({ container: '80/tcp', host_ip: '0.0.0.0', host_port: '8080' })).toBe('0.0.0.0:8080 → 80/tcp');
        expect(portText({ container: '80/tcp', host_ip: '::', host_port: '8080' })).toBe('[::]:8080 → 80/tcp');
    });
    test('a port that is not published is only the container side', () => {
        expect(portText({ container: '5432/tcp', host_ip: '', host_port: '' })).toBe('5432/tcp');
    });
});

describe('the actions', () => {
    const run = ctr();
    const stopped = ctr({ State: 'exited', Status: 'stopped' });

    test('a running container can be restarted and stopped, not started', () => {
        const html = footerHtml({ container: run, canControl: true, busy: false, bookmarkUrl: '', hasChosenIcon: false }, t);
        expect(html).toContain('data-action="restart"');
        expect(html).toContain('data-action="stop"');
        expect(html).not.toContain('data-action="start"');
    });
    test('a stopped one can be started', () => {
        const html = footerHtml({ container: stopped, canControl: true, busy: false, bookmarkUrl: '', hasChosenIcon: false }, t);
        expect(html).toContain('data-action="start"');
        expect(html).not.toContain('data-action="stop"');
    });
    test('without the permission there are no actions at all', () => {
        expect(footerHtml({ container: run, canControl: false, busy: false, bookmarkUrl: '', hasChosenIcon: false }, t)).toBe('');
    });
    test('the agent that serves the page cannot be stopped from it', () => {
        const html = footerHtml({ container: ctr({ Name: '/lastboard-agent' }), canControl: true, busy: false, bookmarkUrl: '', hasChosenIcon: false }, t);
        expect(html).toMatch(/data-action="stop"[^>]*disabled/);
        expect(html).toContain('docker.action_stop_disabled');
        expect(html).not.toMatch(/data-action="restart"[^>]*disabled/);
    });
    test('while an action runs, its buttons are off', () => {
        expect(footerHtml({ container: run, canControl: true, busy: true, bookmarkUrl: '', hasChosenIcon: false }, t).match(/disabled/g)?.length).toBe(2);
    });
});

describe('the face and the bookmark of a container', () => {
    const stopped = ctr({ State: 'exited', Status: 'stopped', ExitCode: 0 });

    test('a card wears its face, its bookmark pill, and its state dot last, at the far edge', () => {
        const html = cardHtml(view(ctr(), { link: 'Plex', face: '/api/icons/p' }), t, fmt);
        expect(html).toContain('<img src="/api/icons/p"');
        expect(html).toContain('chip--link');
        const tail = html.slice(html.indexOf('unit__tail'));
        expect(tail.indexOf('chip--link')).toBeLessThan(tail.indexOf('class="dot'));
        expect(html.slice(0, html.indexOf('unit__tail'))).not.toContain('class="dot');
    });

    test('without a face the card still has its place for one', () => {
        expect(cardHtml(view(ctr()), t, fmt)).toContain('face face--none');
    });

    test('a stopped container that a bookmark depends on is red and says what goes with it', () => {
        expect(dotTone(stopped)).toBe('');
        expect(dotTone(stopped, true)).toBe('bad');
        const html = cardHtml(view(stopped, { link: 'Plex' }), t, fmt);
        expect(html).toContain('proxmox.stopped_breaks');
        expect(html).toContain('Plex');
        expect(cardHtml(view(stopped), t, fmt)).not.toContain('proxmox.stopped_breaks');
    });

    test('the attention list names the service that stops responding', () => {
        const rows: HostRows[] = [{ host, loaded: true, containers: [stopped] }];
        const html = overviewHtml({
            totals: dockerTotals(rows, {}, () => 'Plex'), attention: attentionList(rows, () => 'Plex'), projects: [], hosts: rows,
            cores: [], mem: [], chart: '', hostNames: {}, linkOf: () => 'Plex', hostUse: {}, capacity: null,
        }, t, fmt);
        expect(html).toContain('attn__row');
        expect(html).toContain('proxmox.stopped_breaks');
        expect(attentionList(rows)).toEqual([]);
    });

    test('the panel head offers the icon, and the footer the bookmark and the way back to the default', () => {
        const head = drawerHeadHtml({ host, container: ctr(), showHost: false, link: 'Plex', face: '/api/icons/p' }, t);
        expect(head).toContain('data-icon="1"');
        expect(head).toContain('chip--link');
        const foot = footerHtml({ container: ctr(), canControl: false, busy: false, bookmarkUrl: 'http://p', hasChosenIcon: true }, t);
        expect(foot).toContain('data-open="http://p"');
        expect(foot).toContain('data-icon-clear');
        expect(foot).not.toContain('data-action');
    });

    test('the summary warns about a stopped container with a bookmark', () => {
        const html = summaryTabHtml(detail({ state: 'exited', status: 'stopped' }), stopped, undefined, 'Plex', t, fmt);
        expect(html).toContain('role="alert"');
        expect(html).toContain('Plex');
        expect(summaryTabHtml(detail({ state: 'exited', status: 'stopped' }), stopped, undefined, '', t, fmt)).not.toContain('role="alert"');
    });
});

describe('what a state looks like', () => {
    test('green running, amber when it needs a look, red when failing, grey stopped — never an accent one', () => {
        expect(dotTone(ctr())).toBe('ok');
        expect(dotTone(ctr({ Health: 'unhealthy' }))).toBe('bad');
        expect(dotTone(ctr({ State: 'restarting', Status: 'restarting' }))).toBe('warn');
        expect(dotTone(ctr({ State: 'paused', Status: 'paused' }))).toBe('warn');
        expect(dotTone(ctr({ State: 'exited', Status: 'stopped', ExitCode: 1 }))).toBe('bad');
        expect(dotTone(ctr({ State: 'exited', Status: 'stopped', ExitCode: 0 }))).toBe('');
        expect(cardHtml(view(ctr()), t, fmt)).not.toContain('accent');
    });

    test('a health chip only when the container has a check', () => {
        expect(healthChip('', t)).toBe('');
        expect(healthChip(undefined, t)).toBe('');
        expect(healthChip('unhealthy', t)).toContain('chip--bad');
        expect(healthChip('starting', t)).toContain('chip--warn');
        expect(healthChip('healthy', t)).toContain('chip--ok');
    });

    test('a stopped card says how it ended, a running one has meters', () => {
        const stopped = cardHtml(view(ctr({ State: 'exited', Status: 'stopped', ExitCode: 137 })), t, fmt);
        expect(stopped).toContain('N(137)');
        expect(stopped).toContain('is-off');
        expect(stopped).not.toContain('mrow');
        expect(cardHtml(view(ctr(), { stats: { CPUPercent: 5, MemPercent: 10, MemUsed: 9, MemLimit: 90 } }), t, fmt)).toContain('mrow');
    });

    test('the reason an item is on the attention list is in words', () => {
        expect(reasonText('failed', 137, t)).toContain('"code":"137"');
        expect(reasonText('unhealthy', undefined, t)).toContain('why_unhealthy');
    });
});

describe('the indicators against the real host', () => {
    const rows: HostRows[] = [{ host, loaded: true, containers: [ctr()] }];
    const o = { totals: dockerTotals(rows, { abc: { CPUPercent: 200, MemPercent: 0, MemUsed: 4e9, MemLimit: 8e9 } }), attention: [], projects: [], hosts: rows, cores: [2], mem: [], chart: '', hostNames: {}, linkOf: () => '', hostUse: {} };
    test('with the size of the host the CPU is a share of its cores, and says how many it has', () => {
        const html = overviewHtml({ ...o, capacity: { cores: 8, mem: 16e9 } }, t, fmt);
        expect(html).toContain('N(25)');
        expect(html).toContain('host_threads:{&quot;count&quot;:&quot;N(8)&quot;}');
        expect(html).toContain('&quot;limit&quot;:&quot;B(16000000000)&quot;');
        expect(html).not.toContain('bar_scale');
    });
    test('without it the CPU is read against the chart and says so', () => {
        const html = overviewHtml({ ...o, capacity: null }, t, fmt);
        expect(html).toContain('bar_scale');
        expect(html).not.toContain('host_threads');
    });
});

describe('the header and the groups', () => {
    test('the summary counts, and a warnings count only when there are warnings', () => {
        const rows: HostRows[] = [{ host, loaded: true, containers: [ctr(), ctr({ Name: '/b', State: 'exited', Status: 'stopped' })] }];
        const calm = summaryHtml(dockerTotals(rows), t, fmt);
        expect(calm).toContain('N(1)');
        expect(calm).not.toContain('dot--bad');
        const bad: HostRows[] = [{ host, loaded: true, containers: [ctr({ Health: 'unhealthy' })] }];
        expect(summaryHtml(dockerTotals(bad), t, fmt)).toContain('dot--bad');
    });

    test('a group head only when grouping, and the nameless group is called "no project"', () => {
        const u = { id: 'h1/web' } as never;
        const v = () => view(ctr());
        expect(inventoryHtml([{ name: '', units: [u] }], 'cards', v, t, fmt, false)).not.toContain('gpill');
        const html = inventoryHtml([{ name: '', units: [u] }], 'cards', v, t, fmt, true);
        expect(html).toContain('dockerpage.no_project');
    });

    test('the list view has a head row and rows; cards have neither', () => {
        const u = { id: 'h1/web' } as never;
        const list = inventoryHtml([{ name: '', units: [u] }], 'list', () => view(ctr()), t, fmt, false);
        expect(list).toContain('tr--h');
        expect(list).toContain('class="tr');
        expect(inventoryHtml([{ name: '', units: [u] }], 'cards', () => view(ctr()), t, fmt, false)).not.toContain('tr--h');
    });

    test('the selected container wears it', () => {
        expect(cardHtml(view(ctr(), { selected: true }), t, fmt)).toContain('is-sel');
        expect(cardHtml(view(ctr()), t, fmt)).not.toContain('is-sel');
    });

    test('the log viewer has the four controls the page drives', () => {
        const html = logViewerHtml(t, '1000');
        for (const id of ['lg-follow', 'lg-ts', 'lg-more', 'lg-copy', 'lg-box', 'lg-state', 'lg-note']) expect(html).toContain(`id="${id}"`);
    });
});
