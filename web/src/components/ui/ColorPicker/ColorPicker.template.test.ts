import { describe, it, expect } from 'bun:test';
import { colorPickerTemplate } from './ColorPicker.template';

/**
 * Snapshot characterization for the ColorPicker markup. The stylesheet is
 * passed empty so the snapshot stays focused on structure.
 */
describe('ColorPicker template', () => {
    it('renders a native colour input carrying the current hex value', () => {
        const out = colorPickerTemplate('#0078D4', '');
        expect(out).toContain('type="color"');
        expect(out).toContain('value="#0078D4"');
        expect(out).toMatchSnapshot();
    });

    it('gives the input an accessible name when one is supplied', () => {
        // The control shows only a colour, so without this label a screen
        // reader announces a nameless input.
        const out = colorPickerTemplate('#0078D4', '', 'Elegir color');
        expect(out).toContain('aria-label="Elegir color"');
    });

    // The value reaches the markup from an attribute the caller sets, and the
    // accent colour behind it comes out of the database — so it is user input,
    // and it lands inside a quoted attribute.
    it('escapes the value and the label instead of interpolating them raw', () => {
        const out = colorPickerTemplate('" onfocus="alert(1)', '', '" onfocus="alert(2)');
        expect(out).not.toContain('onfocus="alert(1)"');
        expect(out).not.toContain('onfocus="alert(2)"');
        expect(out).toContain('&quot;');
    });
});
