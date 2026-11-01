import { describe, expect, test } from 'bun:test';
import { countUnits, groupUnits, isSortKey, isStatusFilter, passes, sortUnits, type InfraUnit } from './infraUnits';

const u = (name: string, over: Partial<InfraUnit> = {}): InfraUnit => ({
    id: name, name, level: 'up', attention: false, group: '', haystack: name.toLowerCase(), ...over,
});

describe('passes', () => {
    const list = [
        u('web', { haystack: 'web nginx media' }),
        u('db', { level: 'off' }),
        u('api', { attention: true }),
        u('cache', { level: 'off', attention: true }),
    ];
    const names = (q: string, s: Parameters<typeof passes>[2]) => list.filter(x => passes(x, q, s)).map(x => x.name);

    test('every chip', () => {
        expect(names('', 'all')).toEqual(['web', 'db', 'api', 'cache']);
        expect(names('', 'up')).toEqual(['web', 'api']);
        expect(names('', 'off')).toEqual(['db', 'cache']);
        // A warning is not a state: a stopped container with a failed exit counts here too.
        expect(names('', 'warn')).toEqual(['api', 'cache']);
    });
    test('the text matches the haystack, trimmed and without case', () => {
        expect(names('  NGINX ', 'all')).toEqual(['web']);
        expect(names('nope', 'all')).toEqual([]);
    });
    test('text and chip both have to pass', () => {
        expect(names('a', 'warn')).toEqual(['api', 'cache']);
        expect(names('web', 'off')).toEqual([]);
    });
});

describe('sortUnits', () => {
    const list = [
        u('b', { level: 'off', cpu: 1 }),
        u('a', { level: 'up', cpu: 5, mem: 10 }),
        u('c', { level: 'warn', cpu: 9, mem: 30 }),
        u('d', { level: 'up' }),
    ];
    const order = (k: Parameters<typeof sortUnits>[1]) => sortUnits(list, k).map(x => x.name).join('');
    test('by name, state, cpu and memory', () => {
        expect(order('name')).toBe('abcd');
        expect(order('state')).toBe('cadb');
        expect(order('cpu')).toBe('cabd');
        expect(order('mem')).toBe('cabd');
    });
    test('a unit with no reading goes after those with one, and the input is untouched', () => {
        expect(sortUnits(list, 'mem').map(x => x.name).slice(0, 2)).toEqual(['c', 'a']);
        expect(list.map(x => x.name).join('')).toBe('bacd');
    });
});

describe('groupUnits', () => {
    const list = [u('x', { group: 'media' }), u('y'), u('z', { group: 'apps' }), u('w', { group: 'media' })];
    test('named groups alphabetical, the nameless one last', () => {
        const g = groupUnits(list, true);
        expect(g.map(x => x.name)).toEqual(['apps', 'media', '']);
        expect(g[1].units.map(x => x.name)).toEqual(['x', 'w']);
    });
    test('ungrouped is one nameless group with everything, in order', () => {
        const g = groupUnits(list, false);
        expect(g).toHaveLength(1);
        expect(g[0].units.map(x => x.name)).toEqual(['x', 'y', 'z', 'w']);
    });
    test('nothing grouped but grouping on gives no empty group', () => {
        expect(groupUnits([], true)).toEqual([]);
    });
});

describe('countUnits', () => {
    test('counts what each chip would show', () => {
        const c = countUnits([u('a'), u('b', { level: 'off' }), u('c', { attention: true }), u('d', { level: 'off', attention: true })]);
        expect(c).toEqual({ all: 4, up: 2, off: 2, warn: 2 });
    });
});

describe('guards for stored values', () => {
    test('only known values pass', () => {
        expect(isStatusFilter('warn')).toBe(true);
        expect(isStatusFilter('x')).toBe(false);
        expect(isStatusFilter(null)).toBe(false);
        expect(isSortKey('mem')).toBe(true);
        expect(isSortKey('size')).toBe(false);
    });
});
