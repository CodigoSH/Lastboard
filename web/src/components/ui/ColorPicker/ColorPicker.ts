import css from './ColorPicker.css' with { type: 'text' };
import { colorPickerTemplate } from './ColorPicker.template';
import { i18n } from '../../../services/i18n';

/**
 * A colour swatch that opens the device's own colour picker.
 *
 * This was a hand-built HSV popover with a saturation area, a hue slider and a
 * hex field. Being ours, it looked identical on every device and integrated
 * with none of them, and its drag targets were small enough to be awkward with
 * a finger. The native input gets the platform picker for free — the system one
 * on Android and iOS — and the notepad widget already used one, so there were
 * two ways to pick a colour in the same app.
 *
 * The element's contract is unchanged: a `value` property and attribute holding
 * `#rrggbb`, a `trigger-opacity` attribute, and composed `input`/`change`
 * events. Callers place it inside their own swatch at zero opacity, so it is an
 * invisible hit area and they keep drawing the visible colour themselves.
 */
export class ColorPicker extends HTMLElement {
    static get observedAttributes() {
        return ['value', 'trigger-opacity'];
    }

    private _value: string = '#e8520e';
    private _input: HTMLInputElement | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.bindEvents();
        this.updateTriggerOpacity(this.getAttribute('trigger-opacity') ?? '');
    }

    get value() { return this._value; }
    set value(val: string) {
        if (this._value === val) return;
        this._value = val;
        if (this._input) this._input.value = val;
    }

    attributeChangedCallback(name: string, oldVal: string, newVal: string) {
        if (name === 'value' && oldVal !== newVal) {
            this.value = newVal;
        } else if (name === 'trigger-opacity' && oldVal !== newVal) {
            this.updateTriggerOpacity(newVal);
        }
    }

    private updateTriggerOpacity(opacity: string) {
        if (this._input && opacity !== '') {
            this._input.style.opacity = opacity;
        }
    }

    render() {
        if (!this.shadowRoot) return;
        // The input shows only a colour, so it needs an explicit accessible
        // name for screen readers.
        this.shadowRoot.innerHTML = colorPickerTemplate(this._value, css, i18n.t('action.choose_color'));
        this._input = this.shadowRoot.querySelector('#native');
    }

    bindEvents() {
        if (!this._input) return;

        // `input` fires continuously while the picker is open, `change` when it
        // is dismissed. Both are re-dispatched from the host: a native `change`
        // is composed: false, so it would stop at the shadow boundary and never
        // reach the listeners the settings panel and the modals put on their
        // own root.
        this._input.addEventListener('input', () => {
            this._value = this._input!.value;
            this.dispatchEvent(new CustomEvent('input', {
                detail: { value: this._value },
                bubbles: true,
                composed: true,
            }));
        });

        this._input.addEventListener('change', () => {
            this._value = this._input!.value;
            this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        });
    }
}

customElements.define('app-color-picker', ColorPicker);
