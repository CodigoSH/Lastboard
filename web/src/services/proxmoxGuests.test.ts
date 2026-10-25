import { describe, expect, it } from 'bun:test';
import {
    arrangedIds, guestEntry, guestKey, guestLabel, hasChosenOrder, inGuestOrder, isGuestShown, settleGuestOrder, settleGuests,
    showsNewGuests, visibleGuests, type GuestSettings,
} from './proxmoxGuests';

const g = (host: string, vmid: number, node = 'pve') => ({ host, vmid, node, name: `vm${vmid}` });

describe('guestKey', () => {
    it('is the hypervisor and the machine id', () => {
        expect(guestKey('h1', 101)).toBe('h1/101');
    });

    // A machine migrated to another node keeps its id. Its settings must not move.
    it('does not depend on the node the machine is on', () => {
        const s: GuestSettings = { guestConfig: { [guestKey('h1', 101)]: { hidden: true } } };
        expect(isGuestShown(s, 'h1', 101)).toBe(false);
        expect(visibleGuests(s, [g('h1', 101, 'pve1')])).toHaveLength(0);
        expect(visibleGuests(s, [g('h1', 101, 'pve2')])).toHaveLength(0);
    });

    // Two clusters may both have a machine 100.
    it('tells apart the same id on two hypervisors', () => {
        const s: GuestSettings = { guestConfig: { [guestKey('h1', 100)]: { hidden: true } } };
        expect(isGuestShown(s, 'h1', 100)).toBe(false);
        expect(isGuestShown(s, 'h2', 100)).toBe(true);
    });
});

describe('isGuestShown', () => {
    it('shows a machine nobody has touched', () => {
        expect(isGuestShown({}, 'h1', 5)).toBe(true);
    });

    it('hides a machine that was hidden', () => {
        expect(isGuestShown({ guestConfig: { 'h1/5': { hidden: true } } }, 'h1', 5)).toBe(false);
    });

    // With new machines off, absence means hidden: only an explicit choice shows one.
    it('flips the meaning of an unseen machine when new ones are not shown', () => {
        const s: GuestSettings = { showNew: false, guestConfig: { 'h1/5': { hidden: false } } };
        expect(showsNewGuests(s)).toBe(false);
        expect(isGuestShown(s, 'h1', 5)).toBe(true);
        expect(isGuestShown(s, 'h1', 6)).toBe(false);
    });

    // Content saved before this existed has no showNew: it must keep meaning "on".
    it('treats content that never heard of the switch as on', () => {
        expect(showsNewGuests({})).toBe(true);
        expect(showsNewGuests({ showNew: true })).toBe(true);
    });
});

describe('guestLabel', () => {
    it('uses the name somebody gave it, else the hypervisor\'s', () => {
        const s: GuestSettings = { guestConfig: { 'h1/5': { label: 'Media' } } };
        expect(guestLabel(s, 'h1', 5, 'vm5')).toBe('Media');
        expect(guestLabel(s, 'h1', 6, 'vm6')).toBe('vm6');
        expect(guestEntry(s, 'h2', 5)).toEqual({});
    });
});

describe('inGuestOrder', () => {
    it('follows the chosen order and puts the unknown after, as listed', () => {
        const list = [{ vmid: 1 }, { vmid: 2 }, { vmid: 3 }, { vmid: 4 }];
        expect(inGuestOrder(list, ['3', '1']).map(x => x.vmid)).toEqual([3, 1, 2, 4]);
    });

    it('leaves the list alone without an order', () => {
        const list = [{ vmid: 2 }, { vmid: 1 }];
        expect(inGuestOrder(list, undefined)).toBe(list);
    });
});

describe('visibleGuests', () => {
    const all = [g('a', 1), g('a', 2), g('b', 1), g('b', 2)];

    it('is only the filtered list until somebody arranges something', () => {
        const s: GuestSettings = { guestConfig: { 'a/2': { hidden: true } } };
        expect(hasChosenOrder(s)).toBe(false);
        expect(visibleGuests(s, all).map(x => guestKey(x.host, x.vmid))).toEqual(['a/1', 'b/1', 'b/2']);
    });

    it('arranges each hypervisor on its own and keeps the hypervisors in their order', () => {
        const s: GuestSettings = { guestOrder: { a: ['2', '1'], b: ['2', '1'] } };
        expect(hasChosenOrder(s)).toBe(true);
        expect(visibleGuests(s, all).map(x => guestKey(x.host, x.vmid))).toEqual(['a/2', 'a/1', 'b/2', 'b/1']);
    });

    it('does not bring back a hidden machine that the order names', () => {
        const s: GuestSettings = { guestOrder: { a: ['2', '1'] }, guestConfig: { 'a/2': { hidden: true } } };
        expect(visibleGuests(s, all.filter(x => x.host === 'a')).map(x => x.vmid)).toEqual([1]);
    });

    it('ignores an empty order', () => {
        expect(hasChosenOrder({ guestOrder: { a: [] } })).toBe(false);
    });
});

describe('settleGuests', () => {
    const row = (key: string, visible: boolean, label = '') => ({ key, visible, label });

    it('stores only what says something', () => {
        const cfg = settleGuests(undefined, [row('a/1', true), row('a/2', false), row('a/3', true, 'Media')], true);
        expect(cfg).toEqual({ 'a/2': { hidden: true }, 'a/3': { label: 'Media' } });
    });

    it('drops a mark that was undone', () => {
        const cfg = settleGuests({ 'a/1': { hidden: true } }, [row('a/1', true)], true);
        expect(cfg).toEqual({});
    });

    it('writes an explicit choice when new machines are not shown', () => {
        const cfg = settleGuests(undefined, [row('a/1', true), row('a/2', false)], false);
        expect(cfg).toEqual({ 'a/1': { hidden: false }, 'a/2': { hidden: true } });
    });

    // A hypervisor that did not answer draws no rows; what was set on its machines stays.
    it('keeps what it was given for a hypervisor that drew nothing', () => {
        const cfg = settleGuests({ 'down/9': { label: 'NAS', hidden: true } }, [row('a/1', true)], true);
        expect(cfg['down/9']).toEqual({ label: 'NAS', hidden: true });
    });

    it('does not change what it was given', () => {
        const stored = { 'a/1': { hidden: true } };
        settleGuests(stored, [row('a/1', true)], true);
        expect(stored).toEqual({ 'a/1': { hidden: true } });
    });
});

describe('settleGuestOrder', () => {
    it('stores the order as the rows stand, and a machine that is gone keeps its place after', () => {
        const order = settleGuestOrder({ a: ['9', '1'] }, { a: ['2', '1'] });
        expect(order).toEqual({ a: ['2', '1', '9'] });
    });

    it('keeps the order of a hypervisor that drew no rows', () => {
        expect(settleGuestOrder({ down: ['3', '4'] }, { a: ['1'] })).toEqual({ down: ['3', '4'], a: ['1'] });
    });

    it('stores nothing when there is nothing to store', () => {
        expect(settleGuestOrder(undefined, { a: [] })).toBeUndefined();
    });
});

describe('arrangedIds', () => {
    // Saving the screen after hiding one machine must not count as arranging them.
    it('stores nothing for the order Proxmox listed them in', () => {
        expect(arrangedIds(['1', '2', '3'], ['1', '2', '3'], undefined)).toEqual([]);
        expect(arrangedIds(['1', '2', '3'], ['1', '2', '3'], [])).toEqual([]);
    });

    it('stores an order somebody changed', () => {
        expect(arrangedIds(['3', '1', '2'], ['1', '2', '3'], undefined)).toEqual(['3', '1', '2']);
    });

    // They arranged it once and put it back: that is a choice, and the old one must go.
    it('stores the natural order when an arrangement was already stored', () => {
        expect(arrangedIds(['1', '2', '3'], ['1', '2', '3'], ['3', '1', '2'])).toEqual(['1', '2', '3']);
    });

    it('stores the order when the machines are not the ones Proxmox lists', () => {
        expect(arrangedIds(['1', '2'], ['1', '2', '3'], undefined)).toEqual(['1', '2']);
    });
});
