import { describe, it, expect } from 'bun:test';
import { colorPickerTemplate } from './ColorPicker.template';

/**
 * Snapshot characterization for the ColorPicker markup. The stylesheet is
 * passed empty so the snapshot stays focused on structure.
 */
describe('ColorPicker template', () => {
    it('renders the trigger and popover with the current hex value', () => {
        const out = colorPickerTemplate('#0078D4', '');
        expect(out).toContain('class="color-trigger"');
        expect(out).toContain('class="popover"');
        expect(out).toContain('id="sat-area"');
        expect(out).toContain('id="hue-slider"');
        expect(out).toContain('value="#0078D4"');
        expect(out).toMatchSnapshot();
    });

    it('gives the trigger an accessible name when one is supplied', () => {
        // The trigger renders only a colour swatch, so without this label a
        // screen reader announces a nameless button.
        const out = colorPickerTemplate('#0078D4', '', 'Elegir color');
        expect(out).toContain('aria-label="Elegir color"');
    });
});
