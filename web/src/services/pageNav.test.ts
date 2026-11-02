import { describe, expect, test } from 'bun:test';
import { PageNav, type HistoryLike } from './pageNav';

/** A browser's history in miniature: a list of entries and where the person is in it. */
function fakeHistory() {
    const entries: unknown[] = [null];
    let at = 0;
    const h: HistoryLike & { entries: unknown[]; at: () => number; state: () => unknown } = {
        entries,
        at: () => at,
        state: () => entries[at],
        pushState: (s) => { entries.splice(at + 1); entries.push(s); at++; },
        replaceState: (s) => { entries[at] = s; },
        go: (d) => { at = Math.max(0, Math.min(entries.length - 1, at + d)); },
        back: () => { at = Math.max(0, at - 1); },
    };
    return h;
}

const ov = { tab: 'overview', sel: null };

describe('the history of a full-screen page', () => {
    test('every step is an entry, and Back shows the one before it, then leaves', () => {
        const h = fakeHistory(), nav = new PageNav('docker', h);
        nav.open(ov);
        nav.push({ tab: 'containers', sel: null });
        nav.push({ tab: 'containers', sel: 'h1/jellyfin' });
        expect(h.entries.length).toBe(4);

        h.back();
        expect(nav.pop(h.state())).toEqual({ kind: 'show', state: { tab: 'containers', sel: null } });
        h.back();
        expect(nav.pop(h.state())).toEqual({ kind: 'show', state: ov });
        h.back();
        expect(nav.pop(h.state())).toEqual({ kind: 'leave' });
    });
    test('Forward shows what Back left, so the page is a place you can walk through both ways', () => {
        const h = fakeHistory(), nav = new PageNav('docker', h);
        nav.open(ov);
        nav.push({ tab: 'logs', sel: null });
        h.back();
        nav.pop(h.state());
        h.go(1);
        expect(nav.pop(h.state())).toEqual({ kind: 'show', state: { tab: 'logs', sel: null } });
    });
    test('landing where the person already is is not a step, and choosing another item replaces the entry', () => {
        const h = fakeHistory(), nav = new PageNav('proxmox', h);
        nav.open(ov);
        nav.push({ tab: 'machines', sel: null });
        nav.push({ tab: 'machines', sel: null });
        expect(h.entries.length).toBe(3);
        nav.push({ tab: 'machines', sel: '1' });
        nav.replace({ tab: 'machines', sel: '2' });
        expect(h.entries.length).toBe(4);
        expect(h.state()).toMatchObject({ tab: 'machines', sel: '2' });
    });
    test('closing the panel by its own button takes its step back, and only when it was a step', () => {
        const h = fakeHistory(), nav = new PageNav('monitor', h);
        nav.open(ov);
        expect(nav.closePanel()).toBe(false);
        nav.push({ tab: 'services', sel: '7' });
        expect(nav.panelIsAStep).toBe(true);
        expect(nav.closePanel()).toBe(true);
        expect(nav.pop(h.state())).toEqual({ kind: 'show', state: ov });
        expect(nav.panelIsAStep).toBe(false);
    });
    test('closing the page removes every entry it made, and the popstate that follows is not read as a Back', () => {
        const h = fakeHistory(), nav = new PageNav('docker', h);
        nav.open(ov);
        nav.push({ tab: 'containers', sel: null });
        nav.push({ tab: 'containers', sel: 'a/b' });
        nav.close();
        expect(h.at()).toBe(0);
        expect(nav.pop(h.state())).toEqual({ kind: 'ignore' });
    });
    test("another page's entries are not this page's: landing on one leaves", () => {
        const h = fakeHistory(), nav = new PageNav('docker', h);
        nav.open(ov);
        expect(nav.pop({ lbPage: 'proxmox', i: 1, tab: 'overview', sel: null })).toEqual({ kind: 'leave' });
    });
    test('opening it again while it is open adds nothing', () => {
        const h = fakeHistory(), nav = new PageNav('docker', h);
        nav.open(ov);
        nav.open(ov);
        expect(h.entries.length).toBe(2);
    });
});
