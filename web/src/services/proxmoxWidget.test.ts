import { describe, expect, test } from 'bun:test';
import { proxmoxShell, worstNode, type WGuest, type WidgetInput } from './proxmoxWidget';

const g = (over: Partial<WGuest> = {}): WGuest => ({ host: 'h1', vmid: 100, name: 'plex', kind: 'lxc', node: 'pve', running: true, cpu: 12.34, mem: 500, mem_total: 1000, disk: 2, disk_total: 10, ...over });
const input = (over: Partial<WidgetInput> = {}): WidgetInput => ({
    nodes: [{ name: 'pve', cpu: 30, mem: 60, disk: 20 }], guests: [g()], settings: {}, metrics: { cpu: true, mem: true, disk: true },
    showSummary: true, showAll: true, faceOf: () => '', linked: () => false, t: k => `[${k}]`, num: n => String(n), ...over,
});

describe('the Proxmox widget says', () => {
    test('a running machine with the three readings it can give', () => {
        const spec = proxmoxShell(input());
        expect(spec.rows[0].metrics.map(m => m.text)).toEqual(['12.3%', '50%', '20%']);
        expect(spec.rows[0].sel).toBe('guest|h1|100');
        expect(spec.rows[0].sub).toBe('LXC 100');
    });
    test('only the readings that are on — in the rows and in the totals alike', () => {
        const spec = proxmoxShell(input({ metrics: { cpu: true, mem: false, disk: false } }));
        expect(spec.rows[0].metrics).toHaveLength(1);
        expect(spec.summary).toHaveLength(1);
        expect(spec.summary[0].label).toBe('[widget.telemetry.cpu]');
    });
    test('a machine that does not say how big its disk is has no disk figure, not a zero', () => {
        const spec = proxmoxShell(input({ guests: [g({ kind: 'qemu', disk: 0, disk_total: 0 }), g({ vmid: 101, disk: undefined, disk_total: undefined })] }));
        for (const r of spec.rows) expect(r.metrics.map(m => m.label)).not.toContain('[widget.proxmox.disk]');
    });
    test('the totals speak for the node under most pressure, and without the node name', () => {
        const nodes = [{ name: 'quiet', cpu: 5, mem: 10, disk: 10 }, { name: 'busy', cpu: 40, mem: 92, disk: 30 }];
        expect(worstNode(nodes)?.name).toBe('busy');
        const spec = proxmoxShell(input({ nodes }));
        expect(spec.summary.map(m => m.text)).toEqual(['40%', '92%', '30%']);
        expect(JSON.stringify(spec)).not.toContain('busy');
    });
    test('the totals can be switched off', () => {
        expect(proxmoxShell(input({ showSummary: false })).summary).toEqual([]);
    });
    test('a stopped machine says so; one that a bookmark depends on is an outage and comes first', () => {
        const spec = proxmoxShell(input({
            guests: [g({ vmid: 1, name: 'a' }), g({ vmid: 2, name: 'b', running: false }), g({ vmid: 3, name: 'c', running: false })],
            linked: x => x.vmid === 3,
        }));
        expect(spec.rows.map(r => r.name)).toEqual(['c', 'b', 'a']);
        expect(spec.rows[0].flag).toBe(true);
        expect(spec.rows[0].tone).toBe('bad');
        expect(spec.rows[1].tone).toBe('off');
        expect(spec.rows[1].note).toBe('[docker.state_stopped]');
        expect(spec.rows[1].metrics).toEqual([]);
    });
    test('once somebody arranged the machines that is the order, and a name given here is the name', () => {
        const spec = proxmoxShell(input({
            guests: [g({ vmid: 1, name: 'a' }), g({ vmid: 2, name: 'b', running: false })],
            settings: { guestOrder: { h1: ['2', '1'] }, guestConfig: { 'h1/2': { label: 'Mine' } } },
        }));
        expect(spec.rows.map(r => r.name)).toEqual(['Mine', 'a']);
    });
    test('a machine that was hidden is not drawn, nor counted', () => {
        const spec = proxmoxShell(input({ guests: [g({ vmid: 1 }), g({ vmid: 2 })], settings: { guestConfig: { 'h1/2': { hidden: true } } } }));
        expect(spec.rows).toHaveLength(1);
        expect(spec.foot).toContain('1/1');
    });
    test('the link to the page only when it is on', () => {
        expect(proxmoxShell(input()).seeAll).toBe('[widget.see_all]');
        expect(proxmoxShell(input({ showAll: false })).seeAll).toBeUndefined();
    });
    test('a state or an empty list replaces the body', () => {
        expect(proxmoxShell(input({ state: 'Loading' })).state).toBe('Loading');
        expect(proxmoxShell(input({ guests: [] })).state).toBe('[widget.proxmox.empty]');
    });
});
