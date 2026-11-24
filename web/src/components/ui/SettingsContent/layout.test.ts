import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The section templates import the i18n singleton and cannot be rendered here, so what keeps
// Preferences inside a phone's width is read from their source.
const sources = ['SettingsContent.template.ts', 'notifyChannels.template.ts'].map(f => ({
    file: f,
    code: readFileSync(join(import.meta.dir, f), 'utf8'),
}));

describe('Preferences on a narrow screen', () => {
    it('no grid of cards is given a bare 1fr column inline', () => {
        // The stylesheet's minmax(0, 1fr) lets a card narrow to the panel. An inline "1fr" means
        // minmax(auto, 1fr): a line that will not wrap, such as a channel's last error, widened the
        // card past the panel, 604px in a 357px drawer.
        for (const { file, code } of sources) {
            expect({ file, found: code.match(/grid-template-columns:\s*1fr/g) ?? [] }).toEqual({ file, found: [] });
        }
    });

    it('a title with an add button beside it lets the button drop below it', () => {
        // "Notificaciones" and its button did not fit side by side at 375px.
        const headers = sources.flatMap(({ code }) =>
            code.match(/<div style="display:\s*flex;[^"]*">\s*<h3[^\n]*\n[^\n]*<app-button[^>]*data-action="(?:add-|open-add-)[^"]*"/g) ?? []);
        // Users, Proxmox, Docker and the alert channels: finding fewer means the pattern stopped matching.
        expect(headers.length).toBe(4);
        for (const h of headers) expect({ h: h.slice(0, 120), wraps: /flex-wrap:\s*wrap/.test(h) }).toEqual({ h: h.slice(0, 120), wraps: true });
    });
});
