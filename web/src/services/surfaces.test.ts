import { describe, expect, test } from 'bun:test';
import { Surfaces, nextPopstate, type Surface, type SurfaceName } from './surfaces';

/** Four surfaces that only write down what they were asked, and say how many history entries closing takes off. */
function rig(entries: Partial<Record<SurfaceName, number>> = {}) {
    const log: string[] = [];
    const views = {} as Record<SurfaceName, Surface>;
    for (const n of ['monitor', 'proxmox', 'docker', 'drawer'] as SurfaceName[]) {
        views[n] = {
            open: () => { log.push(`open ${n}`); },
            close: () => { log.push(`close ${n}`); return entries[n] ?? 1; },
        };
    }
    // `land()` is the browser finishing the jump back.
    let land: () => void = () => { };
    const settled = () => new Promise<void>(res => { log.push('wait'); land = res; });
    const s = new Surfaces(views, settled);
    return { s, log, land: () => land() };
}
const tick = () => new Promise(r => setTimeout(r, 0));

describe('moving between what takes the screen', () => {
    test('an icon opens its surface, and the same icon again goes back to the board', async () => {
        const { s, log } = rig();
        await s.toggle('docker');
        expect(s.current).toBe('docker');
        await s.toggle('docker');
        expect(s.current).toBeNull();
        expect(log).toEqual(['open docker', 'close docker']);
    });

    test('another icon closes the one that is up, waits for the browser to land, and only then opens', async () => {
        const { s, log, land } = rig();
        await s.toggle('docker');
        const moving = s.toggle('proxmox');
        await tick();
        // Opening before the jump back lands is what would carry the new page's entry away with it.
        expect(log).toEqual(['open docker', 'close docker', 'wait']);
        expect(s.current).toBeNull();
        land();
        await moving;
        expect(log).toEqual(['open docker', 'close docker', 'wait', 'open proxmox']);
        expect(s.current).toBe('proxmox');
    });

    test('it does not wait when the one that closed had no entries to take off', async () => {
        const { s, log } = rig({ drawer: 0 });
        await s.toggle('drawer');
        await s.toggle('monitor');
        expect(log).toEqual(['open drawer', 'close drawer', 'open monitor']);
    });

    test('pressing icons quickly: the last one wins and each surface opens at most once', async () => {
        const { s, log, land } = rig();
        await s.toggle('docker');
        const first = s.toggle('proxmox');
        await tick();
        void s.toggle('monitor');
        void s.toggle('drawer');
        land();
        await first;
        expect(log.filter(l => l.startsWith('open'))).toEqual(['open docker', 'open drawer']);
        expect(s.current).toBe('drawer');
    });

    test('going back to the board while a switch is in flight cancels the switch', async () => {
        const { s, log, land } = rig();
        await s.toggle('docker');
        const moving = s.toggle('proxmox');
        await tick();
        s.closeActive();
        land();
        await moving;
        expect(log.filter(l => l.startsWith('open'))).toEqual(['open docker']);
        expect(s.current).toBeNull();
    });

    test('a surface that closes on its own is noted, so the next press opens instead of closing', async () => {
        const { s, log } = rig();
        await s.toggle('docker');
        s.note('docker', false);   // its X, or the browser's Back
        expect(s.current).toBeNull();
        await s.toggle('docker');
        expect(log).toEqual(['open docker', 'open docker']);
    });

    test('noting that another one closed does not clear the one that is up', async () => {
        const { s } = rig();
        await s.toggle('docker');
        s.note('proxmox', false);
        expect(s.current).toBe('docker');
    });

    test('closeActive on the board does nothing', () => {
        const { s, log } = rig();
        s.closeActive();
        expect(log).toEqual([]);
    });
});

describe('waiting for the browser', () => {
    test('resolves on the popstate and lets go of the listener', async () => {
        const listeners = new Set<() => void>();
        const target = {
            addEventListener: (_: string, f: any) => { listeners.add(f); },
            removeEventListener: (_: string, f: any) => { listeners.delete(f); },
        };
        const p = nextPopstate(target, 1000);
        expect(listeners.size).toBe(1);
        [...listeners][0]!();
        await p;
        expect(listeners.size).toBe(0);
    });

    test('resolves anyway when no popstate ever comes', async () => {
        const target = { addEventListener: () => { }, removeEventListener: () => { } };
        const t0 = Date.now();
        await nextPopstate(target, 20);
        expect(Date.now() - t0).toBeGreaterThanOrEqual(15);
    });
});
