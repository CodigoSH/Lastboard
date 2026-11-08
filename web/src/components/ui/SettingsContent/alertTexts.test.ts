import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';
import { ALERT_MARKERS, ALERT_TEXT_FIELDS, ALERT_TEXT_KEYS } from './alertTexts';

const en = JSON.parse(readFileSync('web/public/locales/en.json', 'utf-8')) as Record<string, string>;
const monitorGo = readFileSync('internal/web/api/monitor.go', 'utf-8');
const alertGo = readFileSync('internal/core/alerttext/alerttext.go', 'utf-8');

describe('alert texts', () => {
    // The page and the server name the fields; a rename on one side would make a box save into nothing.
    it('uses the field names the server stores', () => {
        for (const key of ALERT_TEXT_KEYS) {
            expect(monitorGo).toContain(`json:"${key},omitempty"`);
        }
        expect(ALERT_TEXT_KEYS.length).toBe(4);
    });

    it('has a caption and a translated default for every box', () => {
        for (const f of ALERT_TEXT_FIELDS) {
            expect(en[f.label]).toBeTruthy();
            expect(en[f.fallback]).toBeTruthy();
        }
    });

    // The markers the page lists are the ones the server fills in, no more and no fewer.
    it('lists the markers the server fills in', () => {
        const filled = [...alertGo.matchAll(/"(service|count|reason|duration)":/g)].map(m => m[1]);
        expect(new Set(filled)).toEqual(new Set(ALERT_MARKERS));
    });

    it('shows the default of a box with all its markers', () => {
        expect(en['alert.down.title']).toContain('{service}');
        expect(en['alert.down.body']).toContain('{count}');
        expect(en['alert.up.body']).toContain('{duration}');
    });
});
