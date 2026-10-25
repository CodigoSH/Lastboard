import { describe, expect, it } from 'bun:test';
import { viewFromSearch, withoutView } from './startupView';

describe('viewFromSearch', () => {
    it('knows the Proxmox page', () => {
        expect(viewFromSearch('?view=proxmox')).toBe('proxmox');
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

describe('withoutView', () => {
    it('leaves a clean path when view was the only parameter', () => {
        expect(withoutView('/', '?view=proxmox', '')).toBe('/');
    });

    it('keeps everything else the address carried', () => {
        expect(withoutView('/', '?view=proxmox&x=1', '#top')).toBe('/?x=1#top');
    });

    it('leaves an address without the parameter as it was', () => {
        expect(withoutView('/board', '?x=1', '')).toBe('/board?x=1');
    });
});
