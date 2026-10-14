import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { clockTimezone, resolveCityTimezone, searchCities } from './cityGeocoder';

const realFetch = globalThis.fetch;
let calls: string[] = [];
let answer: () => Response = () => new Response('{}');

beforeAll(() => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
        calls.push(String(input));
        return answer();
    }) as typeof fetch;
});
afterAll(() => { globalThis.fetch = realFetch; });

const madrid = {
    results: [
        { name: 'Madrid', admin1: 'Madrid', country: 'Spain', latitude: 40.4165, longitude: -3.7026, timezone: 'Europe/Madrid' },
        { name: 'Madrid', admin1: 'Cundinamarca', country: 'Colombia', latitude: 4.7, longitude: -74.2, timezone: 'America/Bogota' },
    ],
};

describe('searchCities', () => {
    test('reads the name, the place, the coordinates and the time zone of each result', async () => {
        calls = [];
        answer = () => new Response(JSON.stringify(madrid));
        const found = await searchCities('Madrid', 'en');
        expect(found).toHaveLength(2);
        expect(found[0]).toEqual({
            name: 'Madrid', detail: 'Madrid, Spain', latitude: 40.4165, longitude: -3.7026, timezone: 'Europe/Madrid',
        });
        expect(found[1].timezone).toBe('America/Bogota');
    });

    test('asks one service, in the language of the interface', async () => {
        calls = [];
        answer = () => new Response(JSON.stringify(madrid));
        await searchCities('São Paulo', 'pt');
        expect(calls).toHaveLength(1);
        const url = new URL(calls[0]);
        expect(url.host).toBe('geocoding-api.open-meteo.com');
        expect(url.searchParams.get('name')).toBe('São Paulo');
        expect(url.searchParams.get('language')).toBe('pt');
    });

    test('an answer with no results is an empty list, not an error', async () => {
        answer = () => new Response('{"generationtime_ms":0.5}');
        expect(await searchCities('zzzz', 'en')).toEqual([]);
    });

    test('a server error is reported, so the caller can say so instead of "no results"', async () => {
        answer = () => new Response('nope', { status: 500 });
        await expect(searchCities('Madrid', 'en')).rejects.toThrow();
    });
});

describe('resolveCityTimezone', () => {
    test('is the zone of the first result', async () => {
        calls = [];
        answer = () => new Response(JSON.stringify(madrid));
        expect(await resolveCityTimezone('Madrid', 'en')).toBe('Europe/Madrid');
        // The control: no other service is asked. The old route went through two
        // others, one of which the page's security policy blocks.
        expect(calls.every(u => new URL(u).host === 'geocoding-api.open-meteo.com')).toBe(true);
    });

    test('is "local" for a city nobody knows, for no city and when the service is down', async () => {
        answer = () => new Response('{}');
        expect(await resolveCityTimezone('zzzz', 'en')).toBe('local');
        expect(await resolveCityTimezone('', 'en')).toBe('local');
        answer = () => new Response('x', { status: 503 });
        expect(await resolveCityTimezone('Madrid', 'en')).toBe('local');
    });

    test('never takes a zone the browser does not understand', async () => {
        answer = () => new Response(JSON.stringify({ results: [{ name: 'X', latitude: 1, longitude: 1, timezone: 'Not/AZone' }] }));
        expect(await resolveCityTimezone('X', 'en')).toBe('local');
    });
});

describe('clockTimezone', () => {
    const base = { previousCity: 'Madrid', previousTimezone: 'Europe/Madrid', picked: null as string | null, language: 'en' };

    test('keeps the zone the clock already has when the city was not touched', async () => {
        calls = [];
        // The service is down, as it was for the route this replaced: it must not matter.
        answer = () => new Response('x', { status: 503 });
        expect(await clockTimezone({ ...base, city: 'Madrid' })).toBe('Europe/Madrid');
        // And it does not even ask: nothing changed, so nothing to look up.
        expect(calls).toHaveLength(0);
    });

    test('a city picked from the list brings its own zone', async () => {
        expect(await clockTimezone({ ...base, city: 'Tokyo', picked: 'Asia/Tokyo' })).toBe('Asia/Tokyo');
    });

    test('a city typed by hand is looked up', async () => {
        answer = () => new Response(JSON.stringify({ results: [{ name: 'Lima', latitude: 1, longitude: 1, timezone: 'America/Lima' }] }));
        expect(await clockTimezone({ ...base, city: 'Lima' })).toBe('America/Lima');
    });

    test('no city means the browser\'s own zone', async () => {
        expect(await clockTimezone({ ...base, city: '' })).toBe('local');
    });

    test('a clock with no zone yet and the same city is resolved once', async () => {
        answer = () => new Response(JSON.stringify(madrid));
        expect(await clockTimezone({ ...base, previousTimezone: undefined, city: 'Madrid' })).toBe('Europe/Madrid');
    });
});
