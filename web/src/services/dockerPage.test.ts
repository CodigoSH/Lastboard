import { describe, expect, test } from 'bun:test';
import {
    atBottom, dockerErrorKey, findSelected, level, logDate, logsToText, matches, mergeLogLines, overflow, pageErrorKey,
    DockerPageError, sortContainers, stateKey, stateLevel, tally, visibleGroups, MAX_LOG_LINES, type HostRows, type LogLine,
} from './dockerPage';
import type { DockerContainer, DockerHost } from './dockerShared';

const t = (n: number) => `2026-10-26T10:00:${String(n % 60).padStart(2, '0')}.${String(n).padStart(9, '0')}Z`;
const line = (n: number, over: Partial<LogLine> = {}): LogLine => ({ t: t(n), stream: 'out', text: `line ${n}`, ...over });

const host = (id: string, name = id): DockerHost => ({ id, name, type: 'tcp', url: 'x' });
const ctr = (name: string, state = 'running', over: Partial<DockerContainer> = {}): DockerContainer => ({
    ID: `id-${name}`, Name: `/${name}`, Image: `img/${name}:1`, Status: state, State: state, Created: 0, Ports: [], ...over,
});
const rows = (h: DockerHost, containers: DockerContainer[], over: Partial<HostRows> = {}): HostRows => ({ host: h, containers, loaded: true, ...over });

describe('mergeLogLines', () => {
    test('adds only what is newer than the last line', () => {
        const have = [line(1), line(2)];
        expect(mergeLogLines(have, [line(2), line(3)]).map(l => l.text)).toEqual(['line 1', 'line 2', 'line 3']);
    });

    test('an older line that arrives late does not go behind newer ones', () => {
        const have = [line(5)];
        expect(mergeLogLines(have, [line(3), line(4)])).toEqual(have);
    });

    test('with nothing shown yet, everything is taken', () => {
        expect(mergeLogLines([], [line(1), line(2)])).toHaveLength(2);
    });

    test('drops the OLDEST lines past the limit and keeps the newest', () => {
        const have = [line(1), line(2), line(3)];
        const out = mergeLogLines(have, [line(4), line(5)], 4);
        expect(out.map(l => l.text)).toEqual(['line 2', 'line 3', 'line 4', 'line 5']);
    });

    test('never grows past the default limit', () => {
        let have: LogLine[] = [];
        have = mergeLogLines(have, Array.from({ length: MAX_LOG_LINES }, (_, i) => line(i)));
        have = mergeLogLines(have, [line(MAX_LOG_LINES), line(MAX_LOG_LINES + 1)]);
        expect(have).toHaveLength(MAX_LOG_LINES);
        expect(have[have.length - 1].text).toBe(`line ${MAX_LOG_LINES + 1}`);
        expect(have[0].text).toBe('line 2');
    });

    test('returns the same array when nothing is added', () => {
        const have = [line(1)];
        expect(mergeLogLines(have, [])).toBe(have);
    });
});

describe('overflow', () => {
    test('counts what falls off the front', () => {
        expect(overflow(1999, 1)).toBe(0);
        expect(overflow(2000, 3)).toBe(3);
        expect(overflow(10, 5, 12)).toBe(3);
    });
});

describe('atBottom', () => {
    test('is true at the end and within a few pixels of it', () => {
        expect(atBottom(500, 300, 800)).toBe(true);
        expect(atBottom(490, 300, 800)).toBe(true);
    });
    test('is false for a reader who scrolled up', () => {
        expect(atBottom(100, 300, 800)).toBe(false);
        expect(atBottom(470, 300, 800)).toBe(false);
    });
    test('a box that does not scroll is at its bottom', () => {
        expect(atBottom(0, 300, 200)).toBe(true);
    });
});

describe('logsToText', () => {
    test('is the plain text, one line each, with or without the time', () => {
        const ls = [line(1), line(2, { stream: 'err', text: 'boom <b>x</b>' })];
        expect(logsToText(ls, null)).toBe('line 1\nboom <b>x</b>');
        expect(logsToText(ls, x => `[${x.slice(11, 19)}]`)).toBe('[10:00:01] line 1\n[10:00:02] boom <b>x</b>');
    });
});

describe('logDate', () => {
    test('reads nine fractional digits', () => {
        expect(logDate('2026-10-26T10:00:01.123456789Z')?.toISOString()).toBe('2026-10-26T10:00:01.123Z');
    });
    test('gives null for what is not a time', () => {
        expect(logDate('nope')).toBeNull();
    });
});

describe('errors', () => {
    test('the keys the server names pass through', () => {
        for (const k of ['docker.unauthorized', 'docker.not_found', 'docker.agent_too_old', 'docker.admin_only', 'docker.connection_error']) {
            expect(dockerErrorKey(k)).toBe(k);
            expect(dockerErrorKey(` ${k}\n`)).toBe(k);
        }
    });
    test('anything else is "could not connect"', () => {
        expect(dockerErrorKey('<html>502 Bad Gateway</html>')).toBe('docker.connection_error');
        expect(dockerErrorKey('')).toBe('docker.connection_error');
    });
    test('an old agent is not worded as a connection failure', () => {
        expect(pageErrorKey(new DockerPageError('docker.agent_too_old\n', 502))).toBe('docker.agent_too_old');
        expect(pageErrorKey(new Error('x'))).toBe('docker.connection_error');
    });
});

describe('states', () => {
    test('green running, amber in between, grey otherwise', () => {
        expect(stateLevel('running')).toBe('up');
        expect(stateLevel('restarting')).toBe('warn');
        expect(stateLevel('paused')).toBe('warn');
        expect(stateLevel('exited')).toBe('off');
        expect(stateLevel('created')).toBe('off');
        expect(stateLevel('')).toBe('off');
    });
    test('names a state with the keys the widget already has', () => {
        expect(stateKey('running')).toBe('docker.state_running');
        expect(stateKey('exited')).toBe('docker.state_stopped');
        expect(stateKey('paused')).toBe('docker.state_paused');
    });
    test('a reading is coloured at 60 and 90', () => {
        expect(level(59.9)).toBe('ok');
        expect(level(60)).toBe('warn');
        expect(level(90)).toBe('bad');
    });
});

describe('the list', () => {
    const a = host('a', 'Alpha');
    const b = host('b', 'Beta');
    const all = [
        rows(a, [ctr('zeta'), ctr('alpha', 'exited'), ctr('mid')]),
        rows(b, [ctr('web', 'running', { Image: 'nginx:1' })], {}),
    ];

    test('filters by name, image or the start of the id', () => {
        expect(matches(ctr('Jellyfin'), 'jelly')).toBe(true);
        expect(matches(ctr('x', 'running', { Image: 'nginx:1' }), 'NGINX')).toBe(true);
        expect(matches(ctr('x'), 'id-x')).toBe(true);
        expect(matches(ctr('x'), 'd-x')).toBe(false);
        expect(matches(ctr('x'), '  ')).toBe(true);
    });

    test('running first, then by name; a stopped one goes last', () => {
        const names = sortContainers(all[0].containers).map(c => c.Name);
        expect(names).toEqual(['/mid', '/zeta', '/alpha']);
    });

    test('every host keeps its group, with only the matches', () => {
        const out = visibleGroups(all, 'web');
        expect(out.map(g => g.host.id)).toEqual(['a', 'b']);
        expect(out[0].containers).toHaveLength(0);
        expect(out[1].containers).toHaveLength(1);
    });

    test('counts what is running and what is not, across hosts', () => {
        expect(tally(all)).toEqual({ running: 3, total: 4, stopped: 1 });
    });

    test('a host that failed has no containers and adds nothing to the count', () => {
        expect(tally([rows(a, [], { error: 'docker.unauthorized' })])).toEqual({ running: 0, total: 0, stopped: 0 });
    });
});

describe('findSelected', () => {
    const a = host('a');
    test('finds a container by host and name, not by id', () => {
        const before = [rows(a, [ctr('web', 'running', { ID: 'old' })])];
        const after = [rows(a, [ctr('web', 'running', { ID: 'new' })])];
        const sel = { hostId: 'a', name: 'web' };
        expect(findSelected(before, sel)?.container.ID).toBe('old');
        expect(findSelected(after, sel)?.container.ID).toBe('new');
    });
    test('is null for nothing, another host or a name that is gone', () => {
        const all = [rows(a, [ctr('web')])];
        expect(findSelected(all, null)).toBeNull();
        expect(findSelected(all, { hostId: 'b', name: 'web' })).toBeNull();
        expect(findSelected(all, { hostId: 'a', name: 'db' })).toBeNull();
    });
});
