import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { install, StandIns } from '../testing/standIns';

// A preference that could not be saved is taken back — all of it. Only the
// nested copy used to be restored, while the flat copies (accent, language,
// project name, logo) kept the value that failed, and the next unrelated save
// built its request from them and stored it after all.

let browser: StandIns;
const posted: any[] = [];
let failNext = false;

beforeAll(() => {
    browser = install();
    browser.setFetch(async (_url, init) => {
        if (failNext) { failNext = false; throw new TypeError('network down'); }
        posted.push(JSON.parse(String(init?.body)));
        return new Response('{}', { status: 200 });
    });
});
afterAll(() => { browser.restore(); });

describe('userStore.updatePreferences', () => {
    test('a failed change is rolled back everywhere, so the next save does not carry it', async () => {
        const { userStore } = await import('./userStore');
        (userStore as any).user = {
            id: 1, username: 'u', role: 'user',
            accent_color: 'orange', language: 'en', project_name: 'Lastboard', project_logo: '',
            preferences: { theme: 'dark', accent_color: 'orange', language: 'en', grid_columns: 12 },
        };

        failNext = true;
        await expect(userStore.updatePreferences({ accent_color: 'red', language: 'es', project_name: 'Mine' })).rejects.toThrow();
        const afterFailure: any = userStore.getUser();
        expect(afterFailure.accent_color).toBe('orange');
        expect(afterFailure.language).toBe('en');
        expect(afterFailure.project_name).toBe('Lastboard');

        await userStore.updatePreferences({ theme: 'light' });
        expect(posted.at(-1)).toMatchObject({ accent_color: 'orange', language: 'en', project_name: 'Lastboard', theme: 'light' });

        await browser.settle();
    });
});
