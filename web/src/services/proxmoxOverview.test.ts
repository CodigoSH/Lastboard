import { describe, expect, test } from 'bun:test';
import {
    attentionList, fleetStores, fleetTotals, guestUnits, unitId, uptimeUnit, weightedCpu, weightedCurve, type LinkOf,
} from './proxmoxOverview';
import type { PxGuest, PxHost, PxNode, PxStore } from './proxmoxApi';

const node = (over: Partial<PxNode> = {}): PxNode => ({
    name: 'pve1', status: 'online', cpu: 10, mem: 40, disk: 20, threads: 8, cores: 4,
    mem_used: 4, mem_total: 10, disk_used: 2, disk_total: 10, uptime: 1000, loadavg: null, guests: 2, ...over,
});
const guest = (over: Partial<PxGuest> = {}): PxGuest => ({
    vmid: 100, name: 'web', kind: 'lxc', node: 'pve1', running: true, cpu: 5, mem: 100, mem_total: 1000, uptime: 10, ...over,
});
const store = (over: Partial<PxStore> = {}): PxStore => ({
    name: 'local', node: 'pve1', kind: 'dir', used: 50, total: 100, percent: 50, shared: false, ...over,
});
const host = (over: Partial<PxHost> = {}): PxHost => ({
    id: 'h1', name: 'Home', cluster: false, caps: { read: true, power: true },
    nodes: [node()], guests: [guest()], stores: [store()], ...over,
});
const noLinks: LinkOf = () => '';
const linked = (...ids: string[]): LinkOf => (h, g) => (ids.includes(unitId(h, g.vmid)) ? `bookmark-${g.vmid}` : '');

describe('weightedCpu', () => {
    test('weighs by cores: 8 at 12 % and 32 at 78 % are not 45 %', () => {
        expect(weightedCpu([{ cpu: 12, cores: 8 }, { cpu: 78, cores: 32 }])).toBeCloseTo(64.8, 5);
    });
    test('a node that reports no cores falls back to the plain mean, and nothing is zero', () => {
        expect(weightedCpu([{ cpu: 10, cores: 0 }, { cpu: 30, cores: 0 }])).toBe(20);
        expect(weightedCpu([])).toBe(0);
    });
});

describe('fleetStores', () => {
    test('a shared store reported by three nodes counts once; a local one per node', () => {
        const h = host({
            nodes: [node({ name: 'a' }), node({ name: 'b' }), node({ name: 'c' })],
            stores: [
                store({ name: 'ceph', node: 'a', shared: true }), store({ name: 'ceph', node: 'b', shared: true }), store({ name: 'ceph', node: 'c', shared: true }),
                store({ name: 'local', node: 'a' }), store({ name: 'local', node: 'b' }),
            ],
        });
        expect(fleetStores([h]).map(s => `${s.name}@${s.node}`)).toEqual(['ceph@a', 'local@a', 'local@b']);
    });
    test('the same shared name on two hypervisors is two stores, and a host that failed has none', () => {
        const a = host({ id: 'a', stores: [store({ name: 'ceph', shared: true })] });
        const b = host({ id: 'b', stores: [store({ name: 'ceph', shared: true })] });
        const bad = host({ id: 'c', error: 'x', stores: [store({ name: 'ghost' })] });
        expect(fleetStores([a, b, bad]).map(s => s.hostId)).toEqual(['a', 'b']);
    });
});

describe('fleetTotals', () => {
    const hosts = [
        host({ guests: [guest(), guest({ vmid: 101, kind: 'qemu', running: false }), guest({ vmid: 102, running: false })], stores: [store({ percent: 40, used: 40 }), store({ name: 'big', percent: 92, used: 92 })] }),
        host({ id: 'h2', name: 'Lab', error: 'down', guests: [guest({ vmid: 200 })] }),
    ];
    test('counts only what answered, and counts an outage apart from a machine turned off', () => {
        const t = fleetTotals(hosts, linked(unitId('h1', 102)));
        expect(t).toMatchObject({ guests: 3, running: 1, stopped: 2, lxc: 2, vm: 1, down: 1, outages: 1, storeCount: 2 });
        expect(t.worstStore?.name).toBe('big');
        expect(t.storeFree).toBe(60 + 8);
        expect(t.cpu).toBe(10);
        expect(t.memUsed).toBe(4);
    });
    test('nothing connected is zeros and no worst store', () => {
        const t = fleetTotals([], noLinks);
        expect(t).toMatchObject({ guests: 0, cpu: 0, worstStore: null, down: 0, attention: 0 });
    });
});

describe('attentionList', () => {
    test('worst first: a host down, an outage, a nearly full store, then what is only hot', () => {
        const hosts = [
            host({
                nodes: [node({ mem: 91 })],
                guests: [guest({ vmid: 1, cpu: 95 }), guest({ vmid: 2, running: false }), guest({ vmid: 3, running: false })],
                stores: [store({ name: 'full', percent: 96 }), store({ name: 'tight', percent: 91 })],
            }),
            host({ id: 'h2', name: 'Lab', error: 'x' }),
        ];
        const l = attentionList(hosts, linked(unitId('h1', 2)));
        expect(l.map(i => `${i.kind}:${i.reason}:${i.tone}`)).toEqual([
            'host:host_down:bad', 'guest:outage:bad', 'store:store_full:bad',
            'guest:cpu:warn', 'store:store_full:warn', 'node:node_mem:warn',
        ]);
        expect(l[1].link).toBe('bookmark-2');
        // Machine 3 was turned off and nothing depends on it: it is not an alarm.
        expect(l.some(i => i.ref === '3')).toBe(false);
    });
    test('thresholds are inclusive and a stopped machine is never "hot"', () => {
        const h = host({ nodes: [node({ mem: 85 })], guests: [guest({ cpu: 90 }), guest({ vmid: 2, running: false, cpu: 99 })], stores: [store({ percent: 90 })] });
        expect(attentionList([h], noLinks).map(i => i.reason).sort()).toEqual(['cpu', 'node_mem', 'store_full']);
        const cool = host({ nodes: [node({ mem: 84.9 })], guests: [guest({ cpu: 89.9 })], stores: [store({ percent: 89.9 })] });
        expect(attentionList([cool], noLinks)).toEqual([]);
    });
});

describe('guestUnits', () => {
    test('one per machine, keyed by hypervisor and id, grouped by node, readings only while running', () => {
        const hosts = [host({ guests: [guest({ cpu: 12, mem: 5 }), guest({ vmid: 101, running: false, cpu: 0, node: 'pve2' })] }), host({ id: 'h2', guests: [guest()] })];
        const u = guestUnits(hosts, linked(unitId('h1', 101)));
        expect(u.map(x => x.id)).toEqual(['h1/100', 'h1/101', 'h2/100']);
        expect(u[0]).toMatchObject({ level: 'up', group: 'pve1', cpu: 12, mem: 5, attention: false });
        expect(u[1]).toMatchObject({ level: 'off', attention: true, group: 'pve2', cpu: undefined });
        expect(u[1].haystack).toContain('bookmark-101');
        expect(u[0].haystack).toContain('lxc');
    });
});

describe('weightedCurve', () => {
    test('weighs by cores and the shortest series sets the length', () => {
        expect(weightedCurve([{ cores: 1, cpu: [10, 20, 30] }, { cores: 3, cpu: [50, 60] }])).toEqual([40, 50]);
    });
    test('empty series are ignored and nothing at all is no curve', () => {
        expect(weightedCurve([{ cores: 4, cpu: [] }, { cores: 4, cpu: [10, 20] }])).toEqual([10, 20]);
        expect(weightedCurve([])).toEqual([]);
        expect(weightedCurve([{ cores: 2, cpu: [] }])).toEqual([]);
    });
});

describe('uptimeUnit', () => {
    const DAY = 86400;
    test('minutes, hours, days, months, years — each where it reads best', () => {
        expect(uptimeUnit(59)).toEqual({ value: 0, unit: 'minute' });
        expect(uptimeUnit(30 * 60)).toEqual({ value: 30, unit: 'minute' });
        expect(uptimeUnit(3 * 3600)).toEqual({ value: 3, unit: 'hour' });
        expect(uptimeUnit(42 * DAY)).toEqual({ value: 42, unit: 'day' });
        expect(uptimeUnit(59 * DAY)).toEqual({ value: 59, unit: 'day' });
        expect(uptimeUnit(60 * DAY)).toEqual({ value: 1, unit: 'month' });
        expect(uptimeUnit(200 * DAY)).toEqual({ value: 6, unit: 'month' });
        expect(uptimeUnit(729 * DAY)).toEqual({ value: 23, unit: 'month' });
        expect(uptimeUnit(730 * DAY)).toEqual({ value: 2, unit: 'year' });
        expect(uptimeUnit(400 * DAY).unit).toBe('month');
        expect(uptimeUnit(1000 * DAY)).toEqual({ value: 2.7, unit: 'year' });
    });
    test('nonsense is nothing, not NaN', () => {
        expect(uptimeUnit(NaN)).toEqual({ value: 0, unit: 'minute' });
        expect(uptimeUnit(-5)).toEqual({ value: 0, unit: 'minute' });
    });
});
