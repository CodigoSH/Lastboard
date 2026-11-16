import { describe, expect, it } from 'bun:test';
import { boardAddress, navFromSearch, viewAddress, viewFromSearch } from './startupView';

describe('viewFromSearch', () => {
    it('knows the Proxmox page', () => {
        expect(viewFromSearch('?view=proxmox')).toBe('proxmox');
    });

    // Where a tap on an alert notification lands.
    it('knows the status page', () => {
        expect(viewFromSearch('?view=monitor')).toBe('monitor');
    });

    it('knows the Docker page and the settings', () => {
        expect(viewFromSearch('?view=docker')).toBe('docker');
        expect(viewFromSearch('?view=settings')).toBe('settings');
    });

    it('finds it among other parameters', () => {
        expect(viewFromSearch('?a=1&view=proxmox&b=2')).toBe('proxmox');
    });

    // The answer comes from a closed list: an address cannot name anything else.
    it('answers nothing for a page it does not know', () => {
        expect(viewFromSearch('?view=admin')).toBeNull();
        expect(viewFromSearch('?view=PROXMOX')).toBeNull();
        expect(viewFromSearch('?view=proxmox%00')).toBeNull();
        expect(viewFromSearch('?view=')).toBeNull();
        expect(viewFromSearch('?view=__proto__')).toBeNull();
    });

    it('answers nothing without the parameter', () => {
        expect(viewFromSearch('')).toBeNull();
        expect(viewFromSearch('?dashboard=2')).toBeNull();
    });
});

describe('boardAddress', () => {
    it('leaves a clean path when view was the only parameter', () => {
        expect(boardAddress('/', '?view=proxmox', '')).toBe('/');
    });

    it('takes the page, its tab and its panel, and keeps the rest', () => {
        expect(boardAddress('/', '?view=docker&tab=logs&sel=h%2Fa&x=1', '#t')).toBe('/?x=1#t');
    });

    it('keeps everything else the address carried', () => {
        expect(boardAddress('/', '?view=proxmox&x=1', '#top')).toBe('/?x=1#top');
    });

    it('leaves an address without the parameter as it was', () => {
        expect(boardAddress('/board', '?x=1', '')).toBe('/board?x=1');
    });
});

describe('navFromSearch', () => {
    it('reads the page, its tab and its panel', () => {
        expect(navFromSearch('?view=docker&tab=containers&sel=h1%2Fjellyfin')).toEqual({ view: 'docker', tab: 'containers', sel: 'h1/jellyfin' });
        expect(navFromSearch('?view=proxmox')).toEqual({ view: 'proxmox', tab: null, sel: null });
    });
    it('answers nothing for a page it does not know, whatever else the address says', () => {
        expect(navFromSearch('?view=admin&tab=logs&sel=x')).toEqual({ view: null, tab: null, sel: null });
        expect(navFromSearch('?tab=logs')).toEqual({ view: null, tab: null, sel: null });
    });
    it('drops a tab that cannot be one, and a panel that is too long or has control characters', () => {
        expect(navFromSearch('?view=docker&tab=Logs').tab).toBeNull();
        expect(navFromSearch('?view=docker&tab=a%20b').tab).toBeNull();
        expect(navFromSearch('?view=docker&tab=' + 'a'.repeat(41)).tab).toBeNull();
        expect(navFromSearch('?view=docker&sel=' + 'x'.repeat(201)).sel).toBeNull();
        expect(navFromSearch('?view=docker&sel=a%00b').sel).toBeNull();
        expect(navFromSearch('?view=docker&sel=' + 'x'.repeat(200)).sel).toHaveLength(200);
    });
});

describe('viewAddress', () => {
    const at = { pathname: '/', search: '', hash: '' };
    it('writes the page and where in it', () => {
        expect(viewAddress(at, 'docker', 'logs', 'h/a b')).toBe('/?view=docker&tab=logs&sel=h%2Fa+b');
        expect(viewAddress(at, 'settings', '', null)).toBe('/?view=settings');
    });
    it('replaces what the address said before and keeps the rest', () => {
        expect(viewAddress({ pathname: '/', search: '?x=1&view=proxmox&tab=storage&sel=1', hash: '#h' }, 'docker', 'overview', null)).toBe('/?x=1&view=docker&tab=overview#h');
    });
    it('reads back as what was written', () => {
        const w = viewAddress(at, 'proxmox', 'machines', 'pve|106');
        expect(navFromSearch(w.slice(1))).toEqual({ view: 'proxmox', tab: 'machines', sel: 'pve|106' });
    });
});
