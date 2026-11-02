import { afterEach, describe, expect, test } from 'bun:test';
import { forgetReadings, heldReading, holdReading, sharedRead } from './infraReadings';

afterEach(forgetReadings);

describe('what the widgets and the pages share', () => {
    test('whoever asks while a reading is on its way gets that one, and one request is made', async () => {
        let calls = 0;
        let release!: (v: number) => void;
        const read = () => { calls++; return new Promise<number>(r => { release = r; }); };
        const a = sharedRead('k', read), b = sharedRead('k', read);
        release(7);
        expect(await a).toBe(7);
        expect(await b).toBe(7);
        expect(calls).toBe(1);
    });
    test('once it has arrived the next ask is a new request', async () => {
        let calls = 0;
        await sharedRead('k', async () => ++calls);
        await sharedRead('k', async () => ++calls);
        expect(calls).toBe(2);
    });
    test('a request that fails does not keep the others from trying again', async () => {
        await expect(sharedRead('k', () => Promise.reject(new Error('down')))).rejects.toThrow('down');
        expect(await sharedRead('k', async () => 'ok')).toBe('ok');
    });
    test('different things do not share a request', async () => {
        const [a, b] = await Promise.all([sharedRead('a', async () => 1), sharedRead('b', async () => 2)]);
        expect([a, b]).toEqual([1, 2]);
    });
    test('the last reading is held while it is recent, and forgotten when it is not', () => {
        holdReading('docker', ['x'], 1000);
        expect(heldReading('docker', 5000, 3000)?.value).toEqual(['x']);
        expect(heldReading('docker', 5000, 3000)?.at).toBe(1000);
        expect(heldReading('docker', 5000, 9000)).toBeNull();
        expect(heldReading('proxmox')).toBeNull();
    });
    test('a newer reading replaces the held one', () => {
        holdReading('monitor', 1, 1000);
        holdReading('monitor', 2, 2000);
        expect(heldReading<number>('monitor', 5000, 2500)?.value).toBe(2);
    });
});
