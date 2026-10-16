import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { chosenIcon, iconKey, withIcon } from './proxmoxIcons';

describe('iconKey', () => {
    it('is the host, the node and the machine, as the server stores it', () => {
        expect(iconKey('px1', 'pve', 100)).toBe('px1|pve|100');
    });

    it('tells apart the same machine number on two hosts', () => {
        expect(iconKey('a', 'pve', 100)).not.toBe(iconKey('b', 'pve', 100));
    });
});

describe('withIcon', () => {
    // The relation that was broken: what the page writes after a choice is what the page reads.
    it('writes under the key the reader looks up', () => {
        const icons = withIcon({}, 'px1', 'pve', 100, '/api/icons/abc');
        expect(chosenIcon({ id: 'px1', icons }, 'pve', 100)).toBe('/api/icons/abc');
    });

    it('removes the choice for an empty icon, and the reader then finds none', () => {
        const icons = withIcon({ 'px1|pve|100': '/api/icons/abc' }, 'px1', 'pve', 100, '');
        expect(chosenIcon({ id: 'px1', icons }, 'pve', 100)).toBe('');
        expect(Object.keys(icons)).toEqual([]);
    });

    it('leaves the other machines and the other hosts alone', () => {
        const before = { 'px1|pve|101': 'x', 'px2|pve|100': 'y' };
        const icons = withIcon(before, 'px1', 'pve', 100, 'z');
        expect(icons).toEqual({ 'px1|pve|101': 'x', 'px2|pve|100': 'y', 'px1|pve|100': 'z' });
    });

    it('does not edit the map it was given, and copes with none', () => {
        const before = { 'px1|pve|100': 'x' };
        withIcon(before, 'px1', 'pve', 100, '');
        expect(before).toEqual({ 'px1|pve|100': 'x' });
        expect(withIcon(undefined, 'h', 'n', 1, 'i')).toEqual({ 'h|n|1': 'i' });
    });
});

describe('chosenIcon', () => {
    it('is empty for a machine with no choice, and for a host with no icons at all', () => {
        expect(chosenIcon({ id: 'px1', icons: { 'px1|pve|1': 'x' } }, 'pve', 2)).toBe('');
        expect(chosenIcon({ id: 'px1' }, 'pve', 1)).toBe('');
    });

    // The older key, kept by what a page wrote before hosts had ids, is not a choice.
    it('does not read the key from before a Proxmox was a list of hosts', () => {
        expect(chosenIcon({ id: 'px1', icons: { 'pve|1': 'x' } }, 'pve', 1)).toBe('');
    });
});

/**
 * Guards the writers. The helper above is only as good as the places that use it:
 * a template literal that spells `node|vmid` out again is how the page came to file
 * an icon where nothing looked. Comments are dropped before looking, and the walk
 * has to find the page, or it is reading the wrong tree.
 */
describe('nothing spells the older icon key out again', () => {
    const root = join(import.meta.dir, '..');
    const files: string[] = [];
    const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
            const p = join(dir, name);
            if (statSync(p).isDirectory()) walk(p);
            else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) files.push(p);
        }
    };
    walk(root);

    it('reads the tree it is meant to', () => {
        expect(files.some(f => f.endsWith('ProxmoxPage.ts'))).toBe(true);
        expect(files.some(f => f.endsWith('ProxmoxWidget.ts'))).toBe(true);
    });

    it('has no `${…node}|${…vmid}` outside iconKey', () => {
        const bare = /`\$\{[\w.]+\.node\}\|\$\{[\w.]+\.vmid\}`/;
        const hits: string[] = [];
        for (const f of files) {
            const code = readFileSync(f, 'utf8').split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
            code.forEach((l, i) => { if (bare.test(l)) hits.push(`${f}:${i + 1}`); });
        }
        expect(hits).toEqual([]);
    });
});
