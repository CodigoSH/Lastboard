import { describe, expect, test } from 'bun:test';
import { attentionList, attentionReason, dockerTotals, dockerUnits, projectRows, pushHistory } from './dockerOverview';
import type { DockerContainer, DockerHost } from './dockerShared';
import type { HostRows } from './dockerPage';

const host: DockerHost = { id: 'h1', name: 'nas', type: 'local' };
const c = (name: string, over: Partial<DockerContainer> = {}): DockerContainer => ({
    ID: `id-${name}`.padEnd(12, '0'), Name: name, Image: `img/${name}`, Status: 'running', State: 'running', Created: 1, Ports: [], ...over,
});
const rows = (containers: DockerContainer[]): HostRows[] => [{ host, containers, loaded: true }];

describe('attentionReason', () => {
    test('what needs looking at', () => {
        expect(attentionReason(c('a', { Health: 'unhealthy' }))).toBe('unhealthy');
        expect(attentionReason(c('a', { State: 'restarting', Status: 'restarting' }))).toBe('restarting');
        expect(attentionReason(c('a', { State: 'paused', Status: 'paused' }))).toBe('paused');
        expect(attentionReason(c('a', { State: 'exited', Status: 'stopped', ExitCode: 137 }))).toBe('failed');
    });
    test('what does not', () => {
        expect(attentionReason(c('a'))).toBeNull();
        expect(attentionReason(c('a', { Health: 'healthy' }))).toBeNull();
        expect(attentionReason(c('a', { Health: 'starting' }))).toBeNull();
        // Stopped on purpose, or never run: not a warning.
        expect(attentionReason(c('a', { State: 'exited', Status: 'stopped', ExitCode: 0 }))).toBeNull();
        expect(attentionReason(c('a', { State: 'created', Status: 'stopped' }))).toBeNull();
        expect(attentionReason(c('a', { State: 'exited', Status: 'stopped', ExitCode: null }))).toBeNull();
    });
    test('a running container is never "failed" even with a stale exit code', () => {
        expect(attentionReason(c('a', { ExitCode: 1 }))).toBeNull();
    });
});

describe('attentionList', () => {
    test('worst first, then by name', () => {
        const l = attentionList(rows([
            c('z', { State: 'exited', Status: 'stopped', ExitCode: 1 }),
            c('b', { Health: 'unhealthy' }),
            c('a', { State: 'restarting', Status: 'restarting' }),
            c('ok'),
            c('a2', { Health: 'unhealthy' }),
        ]));
        expect(l.map(x => `${x.name}:${x.reason}`)).toEqual(['a2:unhealthy', 'b:unhealthy', 'a:restarting', 'z:failed']);
        expect(l[3].exitCode).toBe(1);
    });
});

describe('dockerUnits', () => {
    test('one per container, with project, state and readings', () => {
        const list = dockerUnits(rows([c('web', { Project: 'media', Health: 'unhealthy' }), c('db', { State: 'exited', Status: 'stopped' })]),
            { 'id-web000000': { CPUPercent: 12, MemPercent: 1, MemUsed: 500, MemLimit: 1000 } });
        expect(list.map(x => x.id)).toEqual(['h1/web', 'h1/db']);
        expect(list[0]).toMatchObject({ level: 'up', attention: true, group: 'media', cpu: 12, mem: 500 });
        expect(list[1]).toMatchObject({ level: 'off', attention: false, group: '' });
        expect(list[0].haystack).toContain('nas');
        expect(list[0].haystack).toContain('media');
        expect(list[0].haystack).toContain('img/web');
    });
});

describe('dockerTotals', () => {
    test('counts, cores in use and the memory ceiling', () => {
        const t = dockerTotals(rows([
            c('a', { Project: 'p' }), c('b', { Project: 'p' }), c('d', { State: 'exited', Status: 'stopped', ExitCode: 2 }), c('e'),
        ]), {
            'id-a00000000': { CPUPercent: 150, MemPercent: 0, MemUsed: 100, MemLimit: 400 },
            'id-b00000000': { CPUPercent: 50, MemPercent: 0, MemUsed: 200, MemLimit: 800 },
        });
        expect(t).toMatchObject({ total: 4, running: 3, stopped: 1, attention: 1, projects: 1, memUsed: 300, memLimit: 800, reporting: 2 });
        expect(t.cores).toBeCloseTo(2, 5);
    });
    test('the same project name on two hosts is two projects', () => {
        const two: HostRows[] = [
            { host, containers: [c('a', { Project: 'p' })], loaded: true },
            { host: { ...host, id: 'h2' }, containers: [c('a', { Project: 'p' })], loaded: true },
        ];
        expect(dockerTotals(two).projects).toBe(2);
    });
    test('empty is zero, not NaN', () => {
        expect(dockerTotals([])).toEqual({ total: 0, running: 0, stopped: 0, attention: 0, projects: 0, cores: 0, memUsed: 0, memLimit: 0, reporting: 0 });
    });
});

describe('projectRows', () => {
    test('how many of each project are up; containers with no project are not rows', () => {
        const r = projectRows(rows([
            c('a', { Project: 'media' }), c('b', { Project: 'media', State: 'exited', Status: 'stopped' }), c('x'), c('z', { Project: 'apps' }),
        ]));
        expect(r.map(x => `${x.name}:${x.running}/${x.total}`)).toEqual(['apps:1/1', 'media:1/2']);
    });
});

describe('pushHistory', () => {
    const p = (t: number) => ({ t, cores: 1, memUsed: 1, running: 1 });
    test('appends and keeps the newest', () => {
        let h = [] as ReturnType<typeof pushHistory>;
        for (let i = 1; i <= 5; i++) h = pushHistory(h, p(i), 3);
        expect(h.map(x => x.t)).toEqual([3, 4, 5]);
    });
    test('a late reading does not fold the line back', () => {
        const h = pushHistory([p(10)], p(5));
        expect(h.map(x => x.t)).toEqual([10]);
        expect(pushHistory(h, p(10)).map(x => x.t)).toEqual([10]);
    });
});
