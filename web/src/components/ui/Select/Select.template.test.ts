import { describe, it, expect } from 'bun:test';
import { selectTriggerTemplate, selectOptionsTemplate, SelectOption } from './Select.template';

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
});
