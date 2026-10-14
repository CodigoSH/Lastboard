/**
 * Looking a city up by name.
 *
 * One service answers everything the clock and the weather widget need — the
 * place, its coordinates and its time zone — so a clock no longer asks two
 * other services for the zone. Kept apart from the widget so it can be tested
 * without pulling in the i18n singleton (which touches fetch and localStorage).
 */
import { isSupportedTimeZone } from './timeZone';

export interface City {
    name: string;
    /** Region and country, as they read in the list: "Madrid, Spain". */
    detail: string;
    latitude: number;
    longitude: number;
    /** IANA name, or '' when the service did not say. */
    timezone: string;
}

interface GeocodingResult {
    name?: string;
    admin1?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
}

/** Up to five cities matching what was typed, named in `language`. */
export async function searchCities(query: string, language: string): Promise<City[]> {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=${encodeURIComponent(language)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`geocoding answered ${res.status}`);
    const data: { results?: GeocodingResult[] } = await res.json();
    return (data.results ?? []).map(r => ({
        name: r.name ?? '',
        detail: [r.admin1, r.country].filter(Boolean).join(', '),
        latitude: r.latitude ?? 0,
        longitude: r.longitude ?? 0,
        timezone: r.timezone ?? '',
    }));
}

/**
 * The time zone of the best match for a city typed by hand, or 'local' — the
 * browser's own zone — when there is none: no city, a city nobody knows, a
 * service that is down, or a zone this browser does not recognise.
 */
export async function resolveCityTimezone(city: string, language: string): Promise<string> {
    const name = city.trim();
    if (!name) return 'local';
    try {
        const [best] = await searchCities(name, language);
        return best && isSupportedTimeZone(best.timezone) ? best.timezone : 'local';
    } catch {
        return 'local';
    }
}

export interface ClockZoneInput {
    /** What is in the city box now. */
    city: string;
    /** What the clock was configured with before this save. */
    previousCity?: string;
    previousTimezone?: string;
    /** The zone of a city picked from the list during this edit, if one was. */
    picked: string | null;
    language: string;
}

/**
 * The zone a clock should be saved with.
 *
 * A clock that is saved without its city changing keeps the zone it has: the
 * form does not carry the zone, so anything that looked the city up again on
 * every save replaced a good zone with whatever that lookup returned — 'local',
 * whenever it failed — just because someone turned the seconds off.
 */
export async function clockTimezone(input: ClockZoneInput): Promise<string> {
    const city = input.city.trim();
    if (!city) return 'local';
    if (input.picked) return input.picked;
    if (city === (input.previousCity ?? '').trim() && input.previousTimezone) return input.previousTimezone;
    return resolveCityTimezone(city, input.language);
}
