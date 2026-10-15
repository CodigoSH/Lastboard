import { describe, expect, it } from 'bun:test';
import type { ContainerCfgEntry, DockerContainer } from './dockerShared';
import {
    containerKey, entryOf, inChosenOrder, isShown, mergedOrder, settleOrder, settleRows, showsNew, type ContainerSettings,
} from './dockerContainers';

const c = (name: string, id = 'abcdef0123456789'): DockerContainer => ({
    ID: id, Name: '/' + name, Image: 'img', Status: 'Up', State: 'running', Created: 0, Ports: [],
});

describe('containerKey', () => {
    it('is the host and the name, with the leading slash Docker adds taken off', () => {
        expect(containerKey('h1', c('plex'))).toBe('h1/plex');
    });

    // Updating a container recreates it under a new id. The key must not move with it.
    it('does not change when the container is recreated', () => {
        expect(containerKey('h1', c('plex', '1111111111111111'))).toBe(containerKey('h1', c('plex', '2222222222222222')));
    });

    it('is told apart per host', () => {
        expect(containerKey('h1', c('db'))).not.toBe(containerKey('h2', c('db')));
    });

    // Old content is keyed by an id's first eight characters, which are hex.
    it('can never be taken for an old short id', () => {
        expect(containerKey('h', c('abcd1234'))).toContain('/');
    });
});

describe('entryOf', () => {
    it('reads what is stored under the key', () => {
        const s: ContainerSettings = { containerConfig: { 'h1/plex': { label: 'Movies' } } };
        expect(entryOf(s, 'h1', c('plex')).label).toBe('Movies');
    });

    // The old shape. This is what keeps a board that was saved before working with nobody doing anything.
    it('falls back to the short id that earlier versions stored', () => {
        const s: ContainerSettings = { containerConfig: { abcdef01: { hidden: true } } };
        expect(entryOf(s, 'h1', c('plex', 'abcdef0123456789')).hidden).toBe(true);
    });

    it('prefers the key over the short id', () => {
        const s: ContainerSettings = { containerConfig: { abcdef01: { hidden: true }, 'h1/plex': { hidden: false } } };
        expect(entryOf(s, 'h1', c('plex', 'abcdef0123456789')).hidden).toBe(false);
    });

    it('is empty for a container with nothing set, and for content with no settings at all', () => {
        expect(entryOf({}, 'h1', c('plex'))).toEqual({});
        expect(entryOf({ containerConfig: { other: { hidden: true } } }, 'h1', c('plex'))).toEqual({});
    });

    // The failing case, end to end: hide a container, update it, and it is still hidden.
    it('still finds a hidden container after it was recreated under a new id', () => {
        const s: ContainerSettings = { containerConfig: { [containerKey('h1', c('plex'))]: { hidden: true } } };
        expect(isShown(s, 'h1', c('plex', 'ffffffffffffffff'))).toBe(false);
    });
});

describe('isShown', () => {
    it('shows what nobody chose, by default', () => {
        expect(isShown({}, 'h', c('a'))).toBe(true);
        expect(showsNew({})).toBe(true);
    });

    it('hides what was hidden', () => {
        expect(isShown({ containerConfig: { 'h/a': { hidden: true } } }, 'h', c('a'))).toBe(false);
    });

    it('treats an explicit false as shown, which is how a choice is written with new ones off', () => {
        expect(isShown({ containerConfig: { 'h/a': { hidden: false } } }, 'h', c('a'))).toBe(true);
    });

    describe('with new containers off', () => {
        const off = (cfg: ContainerSettings['containerConfig'] = {}): ContainerSettings => ({ showNew: false, containerConfig: cfg });

        it('does not show a container nobody has seen', () => {
            expect(showsNew(off())).toBe(false);
            expect(isShown(off(), 'h', c('new'))).toBe(false);
        });

        it('shows the ones that were chosen, and not the ones that were hidden', () => {
            const s = off({ 'h/a': { hidden: false }, 'h/b': { hidden: true } });
            expect(isShown(s, 'h', c('a'))).toBe(true);
            expect(isShown(s, 'h', c('b'))).toBe(false);
        });

        // An entry that only carries a name or an address is not a choice to show it.
        it('does not count a name or an address as a choice', () => {
            expect(isShown(off({ 'h/a': { label: 'A', url: 'http://a' } }), 'h', c('a'))).toBe(false);
        });
    });

    it('only an explicit false turns the automatic showing off', () => {
        expect(showsNew({ showNew: undefined })).toBe(true);
        expect(showsNew({ showNew: true })).toBe(true);
        expect(showsNew({ showNew: false })).toBe(false);
    });
});

describe('inChosenOrder', () => {
    const list = [c('a'), c('b'), c('c'), c('d')];
    const names = (l: DockerContainer[]) => l.map(x => x.Name.slice(1));

    it('leaves the list as the host gave it when no order was chosen', () => {
        expect(names(inChosenOrder(list, undefined))).toEqual(['a', 'b', 'c', 'd']);
        expect(names(inChosenOrder(list, []))).toEqual(['a', 'b', 'c', 'd']);
    });

    it('follows the chosen order', () => {
        expect(names(inChosenOrder(list, ['c', 'a', 'd', 'b']))).toEqual(['c', 'a', 'd', 'b']);
    });

    it('puts a container the order does not know after the ones it does, in listed order', () => {
        expect(names(inChosenOrder(list, ['d', 'b']))).toEqual(['d', 'b', 'a', 'c']);
    });

    it('ignores names in the order that are not running, and repeated ones', () => {
        expect(names(inChosenOrder(list, ['gone', 'b', 'b', 'a']))).toEqual(['b', 'a', 'c', 'd']);
    });

    it('does not touch the list it was given', () => {
        const before = names(list);
        inChosenOrder(list, ['d', 'c', 'b', 'a']);
        expect(names(list)).toEqual(before);
    });
});

describe('mergedOrder', () => {
    it('is the list as it stands', () => {
        expect(mergedOrder(['b', 'a'], undefined)).toEqual(['b', 'a']);
    });

    it('keeps a stored name that is not on the list now, after the ones that are', () => {
        expect(mergedOrder(['b', 'a'], ['a', 'gone', 'b'])).toEqual(['b', 'a', 'gone']);
    });
});

describe('settleRows', () => {
    const row = (key: string, over: object = {}) => ({ key, sid: '', visible: true, label: '', url: '', ...over });

    it('stores nothing for a container left as it was', () => {
        expect(settleRows({}, [row('h/a')], true)).toEqual({});
    });

    it('stores hidden for an unticked row, and the absence of it for a ticked one', () => {
        expect(settleRows({}, [row('h/a', { visible: false })], true)).toEqual({ 'h/a': { hidden: true } });
        expect(settleRows({ 'h/a': { hidden: true } }, [row('h/a')], true)).toEqual({});
    });

    it('with new ones off, writes a ticked row as an explicit choice', () => {
        expect(settleRows({}, [row('h/a'), row('h/b', { visible: false })], false))
            .toEqual({ 'h/a': { hidden: false }, 'h/b': { hidden: true } });
    });

    // Turning it back on drops the marks that only mattered while it was off.
    it('with new ones on again, clears the explicit choice', () => {
        expect(settleRows({ 'h/a': { hidden: false } }, [row('h/a')], true)).toEqual({});
    });

    it('moves what was stored under the short id to the key, and removes the old entry', () => {
        const out = settleRows({ abcdef01: { label: 'Alpha', hidden: true } }, [row('h/a', { sid: 'abcdef01', visible: false, label: 'Alpha' })], true);
        expect(out).toEqual({ 'h/a': { label: 'Alpha', hidden: true } });
    });

    it('carries a legacy entry over even when the row says nothing new about it', () => {
        const out = settleRows({ abcdef01: { url: 'http://x' } }, [row('h/a', { sid: 'abcdef01', url: 'http://x' })], true);
        expect(out).toEqual({ 'h/a': { url: 'http://x' } });
    });

    // Older content may hold fields nothing reads any more (a chosen icon). They are not this
    // screen's to delete, so they travel with the entry.
    it('keeps fields it does not know when it moves an entry to its key', () => {
        const stored = { abcdef01: { label: 'Alpha', icon: 'whale' } } as Record<string, ContainerCfgEntry>;
        const out = settleRows(stored, [row('h/a', { sid: 'abcdef01', label: 'Alpha' })], true);
        expect({ ...out['h/a'] } as object).toEqual({ label: 'Alpha', icon: 'whale' });
    });

    it('stores a name and an address only when they were typed', () => {
        expect(settleRows({}, [row('h/a', { label: 'A', url: 'http://a' })], true)).toEqual({ 'h/a': { label: 'A', url: 'http://a' } });
        expect(settleRows({ 'h/a': { label: 'A', url: 'http://a' } }, [row('h/a')], true)).toEqual({});
    });

    // A host that did not answer drew no rows: its containers keep everything.
    it('leaves the entries of containers that had no row alone', () => {
        const stored = { 'down/x': { label: 'X', hidden: true } };
        expect(settleRows(stored, [row('h/a', { visible: false })], true)).toEqual({ 'down/x': { label: 'X', hidden: true }, 'h/a': { hidden: true } });
    });

    it('does not change what it was given', () => {
        const stored = { 'h/a': { hidden: true } };
        settleRows(stored, [row('h/a')], true);
        expect(stored).toEqual({ 'h/a': { hidden: true } });
    });
});

describe('settleOrder', () => {
    it('is nothing when nothing was ever arranged', () => {
        expect(settleOrder(undefined, {})).toBeUndefined();
        expect(settleOrder(undefined, { h: [] })).toBeUndefined();
    });

    it('stores the order of a host that has rows, and keeps the one of a host that has none', () => {
        expect(settleOrder({ down: ['x', 'y'] }, { h: ['b', 'a'], down: [] })).toEqual({ down: ['x', 'y'], h: ['b', 'a'] });
    });

    it('keeps a name that is not running now after the ones that are', () => {
        expect(settleOrder({ h: ['a', 'gone', 'b'] }, { h: ['b', 'a'] })).toEqual({ h: ['b', 'a', 'gone'] });
    });
});
