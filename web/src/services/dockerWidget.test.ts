import { describe, expect, test } from 'bun:test';
import { dockerEntries, dockerShell, type DockerWidgetInput, type WHost } from './dockerWidget';
import type { DockerContainer, DockerHost } from './dockerShared';

const host = (id = 'h1', name = 'Home'): DockerHost => ({ id, name, type: 'local', enabled: true } as unknown as DockerHost);
const ctr = (over: Partial<DockerContainer> & { Name: string }): DockerContainer => ({ ID: over.Name + 'id'.padEnd(12, '0'), Image: 'img:1', Status: 'running', State: 'running', Created: 0, Ports: [], ...over } as DockerContainer);
const hostRows = (containers: DockerContainer[], over: Partial<WHost> = {}): WHost => ({ host: host(), containers, failed: false, everLoaded: true, ...over });
const input = (hosts: WHost[], over: Partial<DockerWidgetInput> = {}): DockerWidgetInput => ({
    hosts, stats: {}, sizes: {}, use: {}, settings: {}, metrics: { cpu: true, mem: true, disk: false }, showAll: true,
    faceOf: () => '', linkOf: () => '', t: k => `[${k}]`, num: n => String(n), ...over,
});

describe('the Docker widget says', () => {
    test('a running container with its CPU and memory, and only those two', () => {
        const c = ctr({ Name: '/plex' });
        const spec = dockerShell(input([hostRows([c])], { stats: { [c.ID]: { CPUPercent: 12.34, MemPercent: 40, MemUsed: 0, MemLimit: 0 } } }));
        expect(spec.rows[0].metrics.map(m => m.text)).toEqual(['12.3%', '40%']);
        expect(spec.rows[0].sel).toBe('h1/plex');
        expect(spec.rows[0].name).toBe('plex');
    });
    test('the readings that are off are not drawn, in the rows nor in the totals', () => {
        const c = ctr({ Name: '/plex' });
        const spec = dockerShell(input([hostRows([c])], {
            stats: { [c.ID]: { CPUPercent: 10, MemPercent: 40, MemUsed: 0, MemLimit: 0 } }, metrics: { cpu: false, mem: true, disk: false },
            use: { h1: { cpu: 5, mem: 30 } },
        }));
        expect(spec.rows[0].metrics.map(m => m.label)).toEqual(['[widget.telemetry.ram]']);
        expect(spec.summary.map(m => m.label)).toEqual(['[widget.telemetry.ram]']);
    });
    test('the CPU bar reads against the host cores while the figure is what Docker says', () => {
        const c = ctr({ Name: '/plex' });
        const spec = dockerShell(input([hostRows([c])], { stats: { [c.ID]: { CPUPercent: 200, MemPercent: 1, MemUsed: 0, MemLimit: 0 } }, sizes: { h1: { cores: 8, mem_total: 1 } } }));
        expect(spec.rows[0].metrics[0].text).toBe('200%');
        expect(spec.rows[0].metrics[0].pct).toBe(25);
    });
    test('the totals are the busiest host, and absent while no host has said how big it is', () => {
        const c = ctr({ Name: '/a' });
        expect(dockerShell(input([hostRows([c])])).summary).toEqual([]);
        const two = dockerShell(input([hostRows([c]), hostRows([ctr({ Name: '/b' })], { host: host('h2', 'Lab') })], { use: { h1: { cpu: 10, mem: 20 }, h2: { cpu: 60, mem: 5 } } }));
        expect(two.summary.map(m => m.text)).toEqual(['60%', '20%']);
    });
    test('what needs attention comes first until somebody arranges them', () => {
        const ok = ctr({ Name: '/a' });
        const sick = ctr({ Name: '/b', Health: 'unhealthy' } as Partial<DockerContainer> & { Name: string });
        const order = dockerEntries(input([hostRows([ok, sick])])).map(e => e.c.Name);
        expect(order).toEqual(['/b', '/a']);
        const arranged = dockerEntries(input([hostRows([ok, sick])], { settings: { containerOrder: { h1: ['a', 'b'] } } })).map(e => e.c.Name);
        expect(arranged).toEqual(['/a', '/b']);
    });
    test('a stopped container a bookmark depends on is an outage, marked; one nobody depends on is just off', () => {
        const dep = ctr({ Name: '/dep', Status: 'exited', State: 'exited' });
        const idle = ctr({ Name: '/idle', Status: 'exited', State: 'exited' });
        const spec = dockerShell(input([hostRows([dep, idle])], { linkOf: (_h, n) => (n === 'dep' ? 'Plex' : '') }));
        const by = Object.fromEntries(spec.rows.map(r => [r.name, r]));
        expect(by.dep.tone).toBe('bad');
        expect(by.dep.flag).toBe(true);
        expect(by.idle.tone).toBe('off');
        expect(by.idle.flag).toBe(false);
        expect(by.idle.metrics).toEqual([]);
    });
    test('a name given here is the name, and a hidden one is neither drawn nor counted', () => {
        const a = ctr({ Name: '/a' }), b = ctr({ Name: '/b' });
        const spec = dockerShell(input([hostRows([a, b])], { settings: { containerConfig: { 'h1/a': { label: 'Mine' }, 'h1/b': { hidden: true } } } }));
        expect(spec.rows.map(r => r.name)).toEqual(['Mine']);
        expect(spec.foot).toContain('1/1');
    });
    test('a host that never answered has a line of its own; one that went quiet keeps its rows', () => {
        const spec = dockerShell(input([hostRows([], { failed: true, everLoaded: false, errorKey: 'docker.unauthorized' })]));
        expect(spec.rows).toHaveLength(1);
        expect(spec.rows[0].note).toBe('[docker.unauthorized]');
        const c = ctr({ Name: '/a' });
        const quiet = dockerShell(input([hostRows([c], { failed: true })]));
        expect(quiet.rows[0].note).toBe('[docker.host_unreachable]');
    });
    test('the host is named on a row only when there is more than one', () => {
        const a = ctr({ Name: '/a' });
        expect(dockerShell(input([hostRows([a])])).rows[0].sub).toBe('img:1');
        const two = dockerShell(input([hostRows([a]), hostRows([ctr({ Name: '/b' })], { host: host('h2', 'Lab') })]));
        expect(two.rows[0].sub).toContain('Home');
    });
    test('the link to the page only when it is on, and a state replaces the body', () => {
        const a = ctr({ Name: '/a' });
        expect(dockerShell(input([hostRows([a])], { showAll: false })).seeAll).toBeUndefined();
        expect(dockerShell(input([hostRows([a])])).seeAll).toBe('[widget.see_all]');
        expect(dockerShell(input([hostRows([a])], { state: 'Loading' })).state).toBe('Loading');
        expect(dockerShell(input([hostRows([])])).state).toBe('[docker.no_containers]');
    });
});
