import { describe, it, expect } from 'bun:test';
import {
    selectTriggerTemplate, selectOptionsTemplate, selectSearchTemplate,
    filterSelectOptions, SelectOption,
} from './Select.template';

/**
 * Snapshot characterization for the Select templates. Freezes the rendered
 * markup so any future refactor that changes the output is caught.
 */
describe('Select templates', () => {
    it('renders the closed trigger with the display label', () => {
        const out = selectTriggerTemplate('English');
        expect(out).toContain('class="select-wrapper"');
        expect(out).toContain('English');
        expect(out).toMatchSnapshot();
    });

    it('renders the option list, marking the selected option', () => {
        const options: SelectOption[] = [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Espanol' },
        ];
        const out = selectOptionsTemplate(options, 'es');
        // selected option carries the 'selected' class
        expect(out).toContain('data-value="es"');
        expect(out).toMatch(/select-option selected"[\s\S]*data-value="es"/);
        // non-selected does not
        expect(out).toMatch(/select-option "[\s\S]*data-value="en"/);
        expect(out).toMatchSnapshot();
    });

    it('renders an empty string for no options', () => {
        expect(selectOptionsTemplate([], '')).toBe('');
    });

    it('renders the search box with an escaped placeholder', () => {
        const out = selectSearchTemplate('Search a service…');
        expect(out).toContain('id="select-search-input"');
        expect(out).toContain('placeholder="Search a service…"');
        expect(out).toMatchSnapshot();
    });
});

describe('filterSelectOptions', () => {
    const options: SelectOption[] = [
        { value: '', label: 'Advanced (custom)' },
        { value: '', label: 'Media', header: true },
        { value: 'jellyfin', label: 'Jellyfin' },
        { value: 'sonarr', label: 'Sonarr' },
        { value: '', label: 'Infrastructure', header: true },
        { value: 'proxmox', label: 'Proxmox VE' },
    ];

    it('returns the list untouched for an empty query', () => {
        expect(filterSelectOptions(options, '')).toEqual(options);
        expect(filterSelectOptions(options, '   ')).toEqual(options);
    });

    it('matches case-insensitively on any part of the label', () => {
        expect(filterSelectOptions(options, 'PROX').map(o => o.value)).toEqual(['proxmox']);
        expect(filterSelectOptions(options, 'arr').map(o => o.value)).toEqual(['sonarr']);
    });

    it('drops category headers while searching', () => {
        expect(filterSelectOptions(options, 'a').some(o => o.header)).toBe(false);
    });

    it('returns nothing when no option matches', () => {
        expect(filterSelectOptions(options, 'zzz')).toEqual([]);
    });
});
