import { afterEach, describe, expect, test } from 'bun:test';
import {
    DEMO_STOPPED_VMID,
    buildOverview,
    buildSeries,
    isRunning,
    resetDemoProxmox,
    setRunning,
} from './demoProxmox';

const at = (hours: number, minutes = 0) => new Date(2026, 0, 1, hours, minutes).getTime();

afterEach(() => resetDemoProxmox());

describe('the demo overview', () => {
    test('has the shape the page and the widget read', () => {
        const o = buildOverview(at(12));
        expect(Object.keys(o).sort()).toEqual(['caps', 'cluster', 'guests', 'nodes', 'stores']);
        expect(o.caps).toEqual({ read: true, power: true });
        // One node: a demo that claimed a cluster would draw a heading nobody
        // in the demo owns.
        expect(o.cluster).toBe(false);
        expect(o.nodes).toHaveLength(1);
    });

    test('the same minute always gives the same numbers', () => {
        expect(buildOverview(at(9, 30))).toEqual(buildOverview(at(9, 30)));
    });

    test('numbers drift between one minute and the next', () => {
        const a = buildOverview(at(9, 30)).guests.map(g => g.cpu);
        const b = buildOverview(at(9, 31)).guests.map(g => g.cpu);
        expect(a).not.toEqual(b);
    });

    test('load is a percentage, not a fraction', () => {
        // A fraction here would draw every bar at 1% and the demo would look
        // like an idle machine nobody uses.
        const node = buildOverview(at(12)).nodes[0];
        for (const v of [node.cpu, node.mem, node.disk]) {
            expect(v).toBeGreaterThan(1);
            expect(v).toBeLessThanOrEqual(100);
        }
    });

    test('one machine is stopped, and it is the one a bookmark points at', () => {
        const o = buildOverview(at(12));
        const stopped = o.guests.filter(g => !g.running);
        expect(stopped.map(g => g.vmid)).toEqual([DEMO_STOPPED_VMID]);
    });

    test('a stopped machine reports no load at all', () => {
        const plex = buildOverview(at(12)).guests.find(g => g.vmid === DEMO_STOPPED_VMID)!;
        expect(plex.cpu).toBe(0);
        expect(plex.mem).toBe(0);
        expect(plex.uptime).toBe(0);
        // Its size is still known: the page prints it beside the state.
        expect(plex.mem_total).toBeGreaterThan(0);
    });

    test('a storage is nearly full, so a red bar can be seen at least once', () => {
        const worst = Math.max(...buildOverview(at(12)).stores.map(s => s.percent));
        expect(worst).toBeGreaterThanOrEqual(90);
    });

    test('every storage reports a used figure that fits in its total', () => {
        for (const s of buildOverview(at(12)).stores) {
            expect(s.used).toBeLessThanOrEqual(s.total);
        }
    });

    test('the machines carry the names the demo board bookmarks', () => {
        const names = buildOverview(at(12)).guests.map(g => g.name);
        for (const n of ['plex', 'jellyfin', 'nextcloud', 'immich', 'uptime-kuma']) {
            expect(names).toContain(n);
        }
    });
});

describe('starting and stopping in the demo', () => {
    test('a machine started in the demo really comes up', () => {
        expect(isRunning(DEMO_STOPPED_VMID)).toBe(false);
        setRunning(DEMO_STOPPED_VMID, true);
        expect(isRunning(DEMO_STOPPED_VMID)).toBe(true);

        const plex = buildOverview(at(12)).guests.find(g => g.vmid === DEMO_STOPPED_VMID)!;
        expect(plex.running).toBe(true);
        expect(plex.cpu).toBeGreaterThan(0);
    });

    test('stopping a running one works the same way round', () => {
        setRunning(100, false);
        expect(buildOverview(at(12)).guests.find(g => g.vmid === 100)!.running).toBe(false);
    });

    test('the reset puts the visit back where it started', () => {
        setRunning(DEMO_STOPPED_VMID, true);
        resetDemoProxmox();
        expect(isRunning(DEMO_STOPPED_VMID)).toBe(false);
    });
});

describe('the demo series', () => {
    test('is already cut down to the sixty points the server would send', () => {
        for (const range of ['1h', '24h', '7d']) {
            const s = buildSeries(range, 100, at(12));
            expect(s.cpu).toHaveLength(60);
            expect(s.mem).toHaveLength(60);
            expect(s.points).toBe(60);
        }
    });

    test('says how many raw points the host kept, which is not the same number', () => {
        expect(buildSeries('1h', 100, at(12)).raw).toBe(60);
        expect(buildSeries('24h', 100, at(12)).raw).toBe(1440);
        expect(buildSeries('7d', 100, at(12)).raw).toBe(336);
    });

    test('a stopped machine falls to the floor and stays there', () => {
        const s = buildSeries('24h', DEMO_STOPPED_VMID, at(12));
        expect(s.cpu.slice(0, 20).some(v => v > 0)).toBe(true);
        expect(s.cpu.slice(40)).toEqual(new Array(20).fill(0));
    });

    test('a machine started in the demo draws a live line again', () => {
        setRunning(DEMO_STOPPED_VMID, true);
        const s = buildSeries('24h', DEMO_STOPPED_VMID, at(12));
        expect(s.cpu.slice(40).every(v => v === 0)).toBe(false);
    });

    test('never leaves the range a percentage can occupy', () => {
        const s = buildSeries('7d', 105, at(12));
        for (const v of [...s.cpu, ...s.mem]) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(100);
        }
    });

    test('the node series, asked without a machine, still comes back drawn', () => {
        const s = buildSeries('24h', undefined, at(12));
        expect(s.cpu).toHaveLength(60);
        expect(s.cpu.some(v => v > 0)).toBe(true);
    });
});
