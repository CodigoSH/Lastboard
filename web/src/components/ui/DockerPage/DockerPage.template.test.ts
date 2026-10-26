import { describe, expect, test } from 'bun:test';
import { errorHtml, groupsHtml, headHtml, logLineHtml, overviewHtml, portText, rowHtml, type Fmt, type T } from './DockerPage.template';
import type { DockerDetail, HostRows } from '../../../services/dockerPage';
import type { DockerContainer, DockerHost } from '../../../services/dockerShared';

const t: T = (key, params) => `<${key}${params ? ':' + JSON.stringify(params) : ''}>`.replace(/</g, '[').replace(/>/g, ']');
const fmt: Fmt = { date: iso => `D(${iso})`, num: n => `N(${n})` };

const host: DockerHost = { id: 'h1', name: 'Home <b>box</b>', type: 'tcp', url: 'x' };
const ctr = (over: Partial<DockerContainer> = {}): DockerContainer => ({
    ID: 'abc', Name: '/web', Image: 'nginx:1', Status: 'running', State: 'running', Created: 0, Ports: [], ...over,
});
const detail = (over: Partial<DockerDetail> = {}): DockerDetail => ({
    id: 'abc', name: 'web', image: 'nginx:1', created: '2026-10-01T00:00:00Z', status: 'running', state: 'running',
    started_at: '2026-10-02T00:00:00Z', exit_code: 0, restart_policy: 'always', restart_count: 2,
    ports: [], mounts: [], networks: [], env: [], tty: false, ...over,
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

    test('a name, an image and a host in the list', () => {
        const rowsOf: HostRows[] = [{ host, containers: [ctr({ Name: '/' + evil, Image: evil })], loaded: true }];
        const html = groupsHtml([rowsOf[0], { ...rowsOf[0], host: { ...host, id: 'h2' } }], t, '');
        noMarkup(html, evil);
        expect(html).not.toContain('<b>box</b>');
    });

    test('the data attributes of a row cannot be broken out of', () => {
        const html = rowHtml('h1', ctr({ Name: '/a" onclick="x' }), t);
        expect(html).not.toContain('" onclick="x');
    });

    test('paths, addresses, networks and variable names in the overview', () => {
        const html = overviewHtml(detail({
            image: evil,
            ports: [{ container: evil, host_ip: '0.0.0.0', host_port: '80' }],
            mounts: [{ type: 'bind', source: evil, destination: evil, read_only: true }],
            networks: [{ name: evil, ipv4: evil }],
            env: [evil],
            health: evil,
            restart_policy: evil,
        }), t, fmt);
        noMarkup(html, evil);
    });

    test('an error naming a host', () => {
        noMarkup(errorHtml('docker.agent_too_old', evil, t), evil);
    });
});

describe('the overview', () => {
    test('shows the names of the environment, one chip each, and says values are not shown', () => {
        const html = overviewHtml(detail({ env: ['SECRET_PASSWORD', 'TZ'] }), t, fmt);
        expect(html).toContain('SECRET_PASSWORD');
        expect(html).toContain('TZ');
        expect(html).toContain('dockerpage.env_note');
        expect(html.match(/class="chip"/g)).toHaveLength(2);
    });

    test('the exit code and the end time are for a container that is not running', () => {
        const up = overviewHtml(detail(), t, fmt);
        expect(up).not.toContain('dockerpage.exit_code');
        const down = overviewHtml(detail({ state: 'exited', exit_code: 137, finished_at: '2026-10-03T00:00:00Z' }), t, fmt);
        expect(down).toContain('dockerpage.exit_code');
        expect(down).toContain('137');
        expect(down).toContain('D(2026-10-03T00:00:00Z)');
    });

    test('a running container that exited non-zero before still shows its code', () => {
        expect(overviewHtml(detail({ exit_code: 1 }), t, fmt)).toContain('dockerpage.exit_code');
    });

    test('mounts say whether they are read-only', () => {
        const html = overviewHtml(detail({ mounts: [
            { type: 'bind', source: '/srv', destination: '/data', read_only: true },
            { type: 'volume', name: 'db', source: '/var/lib/x', destination: '/db', read_only: false },
        ] }), t, fmt);
        expect(html).toContain('dockerpage.read_only');
        expect(html).toContain('dockerpage.read_write');
        expect(html).toContain('>db<');
    });

    test('empty lists say "none" instead of leaving a hole', () => {
        const html = overviewHtml(detail(), t, fmt);
        expect(html.match(/dockerpage\.none/g)?.length).toBe(4);
    });
});

describe('ports', () => {
    test('are written host first, an IPv6 address bracketed', () => {
        expect(portText({ container: '80/tcp', host_ip: '0.0.0.0', host_port: '8080' })).toBe('0.0.0.0:8080 → 80/tcp');
        expect(portText({ container: '80/tcp', host_ip: '::', host_port: '8080' })).toBe('[::]:8080 → 80/tcp');
    });
    test('a port that is not published is only the container side', () => {
        expect(portText({ container: '80/tcp', host_ip: '', host_port: '' })).toBe('80/tcp');
    });
});

describe('the header and its actions', () => {
    const base = { host, container: ctr(), showHost: false, busy: false };

    test('a running container can be restarted and stopped, not started', () => {
        const html = headHtml({ ...base, canControl: true }, t);
        expect(html).toContain('data-action="restart"');
        expect(html).toContain('data-action="stop"');
        expect(html).not.toContain('data-action="start"');
    });

    test('a stopped one can be started', () => {
        const html = headHtml({ ...base, container: ctr({ State: 'exited', Status: 'exited' }), canControl: true }, t);
        expect(html).toContain('data-action="start"');
        expect(html).not.toContain('data-action="stop"');
    });

    test('without the permission there are no actions at all', () => {
        expect(headHtml({ ...base, canControl: false }, t)).not.toContain('data-action');
    });

    test('the agent that serves the page cannot be stopped from it', () => {
        const html = headHtml({ ...base, container: ctr({ Name: '/lastboard-agent' }), canControl: true }, t);
        expect(html).toMatch(/data-action="stop"[^>]* disabled/);
    });

    test('while an action runs, its buttons are off', () => {
        expect(headHtml({ ...base, canControl: true, busy: true }, t)).toMatch(/data-action="restart"[^>]*disabled/);
    });
});

describe('the list groups', () => {
    const rowsOf = (h: DockerHost, over: Partial<HostRows> = {}): HostRows => ({ host: h, containers: [ctr()], loaded: true, ...over });

    test('a pill per host only when there is more than one', () => {
        expect(groupsHtml([rowsOf(host)], t, '')).not.toContain('sec__label');
        expect(groupsHtml([rowsOf(host), rowsOf({ ...host, id: 'h2' })], t, '')).toContain('sec__label');
    });

    test('a host that failed shows why in its own group, the other still draws', () => {
        const html = groupsHtml([rowsOf(host, { containers: [], error: 'docker.agent_too_old' }), rowsOf({ ...host, id: 'h2', name: 'ok' })], t, '');
        expect(html).toContain('docker.agent_too_old');
        expect(html).toContain('data-name="web"');
    });

    test('only a running container has a slot for its readings', () => {
        expect(rowHtml('h', ctr(), t)).toContain('data-cpu="abc"');
        expect(rowHtml('h', ctr({ State: 'exited', Status: 'exited' }), t)).not.toContain('data-cpu');
    });

    test('a state is a green, amber or grey dot, never an accent one', () => {
        expect(rowHtml('h', ctr(), t)).toContain('dot--up');
        expect(rowHtml('h', ctr({ State: 'restarting' }), t)).toContain('dot--warn');
        expect(rowHtml('h', ctr({ State: 'exited' }), t)).toContain('dot--off');
    });
});
