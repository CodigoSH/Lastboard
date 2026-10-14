import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { install, StandIns } from '../testing/standIns';

// The "Check for updates" button asks the server to look again instead of
// repeating what it remembered; everything else — the dot in the bar, opening
// the panel — takes the shared answer.

let browser: StandIns;
const asked: string[] = [];

beforeAll(() => {
    browser = install();
    browser.setFetch(async (url) => {
        asked.push(String(url));
        return new Response(JSON.stringify({ available: false, current_version: 'v1', latest_version: 'v1' }), { status: 200 });
    });
});
afterAll(() => { browser.restore(); });

describe('updateService.check', () => {
    test('only a press of the button asks the server to look again', async () => {
        // Another test replaces this module for the whole process (bun cannot undo
        // that), so the real one is asked for under a name of its own.
        const specifier = './UpdateService.ts?real'; // a variable, so the type checker does not look for that file
        const { updateService } = (await import(specifier)) as typeof import('./UpdateService');
        await updateService.check(true);
        await updateService.check(false);
        await updateService.check(true, true);
        await updateService.check(false, true);
        expect(asked).toEqual([
            '/api/system/update/check?beta=true',
            '/api/system/update/check?beta=false',
            '/api/system/update/check?beta=true&fresh=1',
            '/api/system/update/check?beta=false&fresh=1',
        ]);
    });
});
