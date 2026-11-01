import { describe, expect, test } from 'bun:test';
import {
    attentionHtml, cardHtml, guestFooterHtml, guestHeadHtml, guestSummaryHtml, inventoryHtml, nodeCardHtml, overviewHtml, reasonText,
    rowHtml, storageTabHtml, storeRowHtml, storeSummaryHtml, summaryHtml, type Fmt, type GuestDrawer, type GuestView, type T,
} from './ProxmoxPage.template';
import { attentionList, fleetNodes, fleetStores, fleetTotals, type LinkOf } from '../../../services/proxmoxOverview';
import type { PxGuest, PxHost, PxNode, PxStore } from '../../../services/proxmoxApi';

const t: T = (key, params) => `[${key}${params ? ':' + JSON.stringify(params) : ''}]`;
const fmt: Fmt = { num: n => `N(${n})`, pct: n => `P(${n})`, bytes: n => `B(${n})`, dec: n => `D(${n})`, span: s => `S(${s})` };
const tfmt = { time: (s: number) => `T(${s})`, span: (s: number) => `S(${s})` };
const evil = '<img src=x onerror=alert(1)>';

const node = (o: Partial<PxNode> = {}): PxNode => ({ name: 'pve1', status: 'online', cpu: 10, mem: 40, disk: 20, threads: 8, cores: 4, mem_used: 4, mem_total: 10, disk_used: 2, disk_total: 10, uptime: 5, loadavg: null, guests: 1, ...o });
const guest = (o: Partial<PxGuest> = {}): PxGuest => ({ vmid: 100, name: 'web', kind: 'lxc', node: 'pve1', running: true, cpu: 5, mem: 100, mem_total: 1000, uptime: 10, ...o });
const store = (o: Partial<PxStore> = {}): PxStore => ({ name: 'local', node: 'pve1', kind: 'dir', used: 50, total: 100, percent: 50, shared: false, ...o });
const host = (o: Partial<PxHost> = {}): PxHost => ({ id: 'h1', name: 'Home', cluster: false, caps: { read: true, power: true }, nodes: [node()], guests: [guest()], stores: [store()], ...o });
const view = (g: PxGuest, o: Partial<GuestView> = {}): GuestView => ({ hostId: 'h1', hostName: 'Home', showHost: false, guest: g, link: '', face: '', selected: false, ...o });
const drawer = (v: GuestView, o: Partial<GuestDrawer> = {}): GuestDrawer => ({ view: v, hostName: 'Home', chart: '', canPower: true, busy: false, bookmarkUrl: '', hasChosenIcon: false, uptime: '1d', ...o });
const noLinks: LinkOf = () => '';

describe('what a hypervisor says is escaped', () => {
    test('a machine in a card, a row and the drawer', () => {
        const g = guest({ name: evil, node: evil });
        const v = view(g, { link: evil, face: 'x" onerror="y', hostName: evil, showHost: true });
        for (const html of [cardHtml(v, t, fmt), rowHtml(v, t, fmt), guestHeadHtml(drawer(v, { hostName: evil }), t), guestSummaryHtml(drawer(v), t, fmt)]) {
            expect(html).not.toContain(evil);
            expect(html).not.toContain('" onerror="y');
        }
    });
    test('a node, a store and the attention list', () => {
        const h = host({ name: evil, nodes: [node({ name: evil, mem: 99 })], stores: [store({ name: evil, kind: evil, percent: 99 })], guests: [guest({ name: evil, running: false })] });
        const link: LinkOf = () => evil;
        const html = attentionHtml(attentionList([h], link), true, t, fmt)
            + nodeCardHtml(fleetNodes([h])[0], true, t, fmt) + storeRowHtml(fleetStores([h])[0], true, t, fmt)
            + storeSummaryHtml(fleetStores([h])[0], t, fmt) + storageTabHtml(fleetStores([h]), true, t, fmt);
        expect(html).not.toContain(evil);
        expect(html).toContain('&lt;');
    });
    test('the data attributes of a card cannot be broken out of', () => {
        expect(cardHtml(view(guest(), { hostId: 'a" onclick="x' }), t, fmt)).not.toContain('" onclick="x');
    });
});

describe('a machine', () => {
    test('running has meters; stopped says so, and says what depends on it', () => {
        expect(cardHtml(view(guest()), t, fmt)).toContain('mrow');
        const off = cardHtml(view(guest({ running: false }), { link: 'photos' }), t, fmt);
        expect(off).toContain('is-off');
        expect(off).toContain('photos');
        expect(off).not.toContain('mrow');
        expect(off).toContain('dot--bad');
    });
    test('a hot machine is amber, a stopped one without a bookmark is just grey', () => {
        expect(cardHtml(view(guest({ cpu: 95 })), t, fmt)).toContain('dot--warn');
        expect(cardHtml(view(guest({ running: false })), t, fmt)).not.toMatch(/dot dot--(ok|warn|bad)/);
    });
    test('the inventory has a head row only in the list view and a group pill only when grouped', () => {
        const u = { id: 'h1/100' } as never;
        const groups = [{ name: 'pve1', units: [u] }];
        expect(inventoryHtml(groups, 'list', () => view(guest()), t, fmt, false)).toContain('tr--h');
        expect(inventoryHtml(groups, 'cards', () => view(guest()), t, fmt, false)).not.toContain('tr--h');
        expect(inventoryHtml(groups, 'cards', () => view(guest()), t, fmt, true)).toContain('gpill');
        expect(inventoryHtml(groups, 'cards', () => view(guest()), t, fmt, false)).not.toContain('gpill');
    });
});

describe('the actions', () => {
    test('stop for what runs, start for what is stopped, nothing without the permission', () => {
        expect(guestFooterHtml(drawer(view(guest())), t)).toContain('act--bad');
        const stopped = guestFooterHtml(drawer(view(guest({ running: false }))), t);
        expect(stopped).toContain('docker.action_start');
        expect(stopped).not.toContain('act--bad');
        expect(guestFooterHtml(drawer(view(guest()), { canPower: false }), t)).not.toContain('data-power');
    });
    test('the bookmark and the icon buttons appear only when they mean something', () => {
        const none = guestFooterHtml(drawer(view(guest()), { canPower: false }), t);
        expect(none).toBe('');
        const all = guestFooterHtml(drawer(view(guest()), { canPower: false, bookmarkUrl: 'https://x', hasChosenIcon: true }), t);
        expect(all).toContain('data-open="https://x"');
        expect(all).toContain('data-icon-clear');
    });
    test('the buttons are off while the action runs', () => {
        expect(guestFooterHtml(drawer(view(guest()), { busy: true }), t)).toMatch(/data-power="1" disabled/);
    });
});

describe('the overview', () => {
    const hosts = [host({ guests: [guest(), guest({ vmid: 2, running: false })], stores: [store({ percent: 97 })] })];
    const totals = fleetTotals(hosts, noLinks);
    const base = { totals, attention: attentionList(hosts, noLinks), nodes: fleetNodes(hosts), stores: fleetStores(hosts), hosts, cpuSpark: [], chart: '', latest: null, ranges: [{ id: '24h', label: '1d' }], range: '24h' };
    test('says how many run, lists what needs a look, and has no tasks box without tasks', () => {
        const html = overviewHtml(base, t, fmt, tfmt);
        expect(html).toContain('N(1)');
        expect(html).toContain('data-go="store"');
        expect(html).not.toContain('proxmoxpage.latest_tasks');
        expect(html).toContain('dockerpage.collecting');
    });
    test('a calm fleet says so', () => {
        expect(attentionHtml([], false, t, fmt)).toContain('infra.all_ok');
    });
    test('the header counts warnings only when there are some', () => {
        expect(summaryHtml(fleetTotals([host()], noLinks), t, fmt)).not.toContain('dot--bad');
        expect(summaryHtml(totals, t, fmt)).toContain('dot--bad');
    });
    test('the reason of an item names the number it is about', () => {
        const item = attentionList(hosts, noLinks)[0];
        expect(reasonText(item, t, fmt)).toContain('P(97)');
    });
});
