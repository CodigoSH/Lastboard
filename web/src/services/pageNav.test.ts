import { describe, expect, test } from 'bun:test';
import { PageNav, type HistoryLike } from './pageNav';

/** A browser's history in miniature: entries with a state and an address, and where the person is in them. */
function fakeHistory() {
    const entries: { state: unknown; url: string }[] = [{ state: null, url: '/' }];
    let at = 0;
    const h: HistoryLike & { entries: unknown[]; at: () => number; state: () => unknown; url: () => string; where: () => { pathname: string; search: string; hash: string } } = {
        entries,
        at: () => at,
        state: () => entries[at].state,
        url: () => entries[at].url,
        where: () => { const u = new URL(entries[at].url, 'http://x'); return { pathname: u.pathname, search: u.search, hash: u.hash }; },
        pushState: (state, _t, url) => { const keep = entries[at].url; entries.splice(at + 1); entries.push({ state, url: url ?? keep }); at++; },
        replaceState: (state, _t, url) => { entries[at] = { state, url: url ?? entries[at].url }; },
        go: (d) => { at = Math.max(0, Math.min(entries.length - 1, at + d)); },
        back: () => { at = Math.max(0, at - 1); },
    };
    return h;
}

/** A page over this history, reading the address from it. */
function pageOver(h: ReturnType<typeof fakeHistory>, key = 'docker', tabs?: readonly string[]) {
    return new PageNav(key, h, tabs, h.where);
}

const ov = { tab: 'overview', sel: null };

describe('the history of a full-screen page', () => {
    test('every step is an entry, and Back shows the one before it, then leaves', () => {
        const h = fakeHistory(), nav = pageOver(h);
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
        const h = fakeHistory(), nav = pageOver(h);
        nav.open(ov);
        nav.push({ tab: 'logs', sel: null });
        h.back();
        nav.pop(h.state());
        h.go(1);
        expect(nav.pop(h.state())).toEqual({ kind: 'show', state: { tab: 'logs', sel: null } });
    });
    test('landing where the person already is is not a step, and choosing another item replaces the entry', () => {
        const h = fakeHistory(), nav = pageOver(h, 'proxmox');
        nav.open(ov);
        nav.push({ tab: 'machines', sel: null });
        nav.push({ tab: 'machines', sel: null });
        expect(h.entries.length).toBe(3);
        nav.push({ tab: 'machines', sel: '1' });
        nav.replace({ tab: 'machines', sel: '2' });
        expect(h.entries.length).toBe(4);
        expect(h.state()).toMatchObject({ tab: 'machines', sel: '2' });
        expect(h.url()).toBe('/?view=proxmox&tab=machines&sel=2');
    });
    test('closing the panel by its own button takes its step back, and only when it was a step', () => {
        const h = fakeHistory(), nav = pageOver(h, 'monitor');
        nav.open(ov);
        expect(nav.closePanel()).toBe(false);
        nav.push({ tab: 'services', sel: '7' });
        expect(nav.panelIsAStep).toBe(true);
        expect(nav.closePanel()).toBe(true);
        expect(nav.pop(h.state())).toEqual({ kind: 'show', state: ov });
        expect(nav.panelIsAStep).toBe(false);
    });
    test('closing the page removes every entry it made, and the popstate that follows is not read as a Back', () => {
        const h = fakeHistory(), nav = pageOver(h);
        nav.open(ov);
        nav.push({ tab: 'containers', sel: null });
        nav.push({ tab: 'containers', sel: 'a/b' });
        nav.close();
        expect(h.at()).toBe(0);
        expect(nav.pop(h.state())).toEqual({ kind: 'ignore' });
    });
    test('closing says how many entries it took off, and nothing when there were none', () => {
        const h = fakeHistory(), nav = pageOver(h);
        expect(nav.close()).toBe(0);
        nav.open(ov);
        nav.push({ tab: 'containers', sel: null });
        expect(nav.close()).toBe(2);
        expect(nav.close()).toBe(0);
    });
    test('Forward after closing by the X brings the page back at the step it was left on', () => {
        const h = fakeHistory(), nav = pageOver(h);
        nav.open(ov);
        nav.push({ tab: 'containers', sel: 'a/b' });
        nav.close();
        expect(h.at()).toBe(0);
        h.go(1);
        expect(nav.pop(h.state())).toEqual({ kind: 'show', state: ov });
        h.go(1);
        expect(nav.pop(h.state())).toEqual({ kind: 'show', state: { tab: 'containers', sel: 'a/b' } });
        // and Back out of it still leaves
        h.go(-2);
        expect(nav.pop(h.state())).toEqual({ kind: 'leave' });
    });
    test('Forward after leaving with Back brings the page back too', () => {
        const h = fakeHistory(), nav = pageOver(h);
        nav.open(ov);
        h.back();
        expect(nav.pop(h.state())).toEqual({ kind: 'leave' });
        h.go(1);
        expect(nav.pop(h.state())).toEqual({ kind: 'show', state: ov });
    });
    test("another page's entries are not this page's: landing on one leaves", () => {
        const h = fakeHistory(), nav = pageOver(h);
        nav.open(ov);
        h.pushState({ lbPage: 'proxmox', i: 1, tab: 'overview', sel: null }, '', '/?view=proxmox&tab=overview');
        expect(nav.pop(h.state())).toEqual({ kind: 'leave' });
    });
    test('opening it again while it is open adds nothing', () => {
        const h = fakeHistory(), nav = pageOver(h);
        nav.open(ov);
        nav.open(ov);
        expect(h.entries.length).toBe(2);
    });
});

describe('the address says what is on screen', () => {
    test('every step writes its address, and Back and Forward read it', () => {
        const h = fakeHistory(), nav = pageOver(h, 'docker', ['overview', 'containers', 'logs']);
        nav.open(ov);
        expect(h.url()).toBe('/?view=docker&tab=overview');
        nav.push({ tab: 'containers', sel: 'h1/jellyfin' });
        expect(h.url()).toBe('/?view=docker&tab=containers&sel=h1%2Fjellyfin');
        h.back();
        expect(nav.pop(h.state())).toEqual({ kind: 'show', state: ov });
    });
    test('an entry a reload left behind opens nothing: it is the address that counts, not what the entry stored', () => {
        // Docker was open and the browser was reloaded: the entry still says it is a Docker step, but the address was cleaned to the board.
        const h = fakeHistory(), nav = pageOver(h);
        h.pushState({ lbPage: 'docker', i: 1, tab: 'overview', sel: null }, '', '/');
        const drawer = pageOver(h, 'settings');
        drawer.open({ tab: '', sel: null });
        drawer.close();
        expect(h.at()).toBe(1);
        expect(nav.pop(h.state())).toEqual({ kind: 'ignore' });
    });
    test('a tab the page does not have is read as its first, and a missing one too', () => {
        const h = fakeHistory(), nav = pageOver(h, 'docker', ['overview', 'containers']);
        h.pushState(null, '', '/?view=docker&tab=nope');
        expect(nav.pop(h.state())).toEqual({ kind: 'show', state: { tab: 'overview', sel: null } });
        h.pushState(null, '', '/?view=docker');
        expect(nav.pop(h.state())).toEqual({ kind: 'show', state: { tab: 'overview', sel: null } });
    });
    test('a page that was loaded from its address takes the step the entry numbers, so closing takes off the right number', () => {
        const h = fakeHistory(), nav = pageOver(h);
        h.pushState({ lbPage: 'docker', i: 3, tab: 'logs', sel: null }, '', '/?view=docker&tab=logs');
        expect(nav.pop(h.state())).toEqual({ kind: 'show', state: { tab: 'logs', sel: null } });
        expect(nav.close()).toBe(3);
    });
    test('a page over the board for one panel leaves the address alone, and Back from it leaves', () => {
        const h = fakeHistory(), nav = pageOver(h);
        nav.open({ tab: 'overview', sel: 'h1/a' }, true);
        expect(h.url()).toBe('/');
        nav.replace({ tab: 'overview', sel: 'h1/b' });
        expect(h.url()).toBe('/');
        expect(h.entries.length).toBe(2);
        h.back();
        expect(nav.pop(h.state())).toEqual({ kind: 'leave' });
    });
    test('the address keeps whatever else it carried', () => {
        const h = fakeHistory();
        h.replaceState(null, '', '/?x=1#t');
        const nav = pageOver(h);
        nav.open(ov);
        expect(h.url()).toBe('/?x=1&view=docker&tab=overview#t');
    });
});
