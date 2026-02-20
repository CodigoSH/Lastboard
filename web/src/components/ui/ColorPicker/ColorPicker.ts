// @ts-ignore
import css from './ColorPicker.css' with { type: 'text' };

export class ColorPicker extends HTMLElement {
    static get observedAttributes() {
        return ['value', 'trigger-opacity'];
    }

    private _value: string = '#0078D4';
    private _h: number = 210;
    private _s: number = 100;
    private _v: number = 83; // Approx for #0078D4

    private _popover: HTMLElement | null = null;
    private _satArea: HTMLElement | null = null;
    private _satCursor: HTMLElement | null = null;
    private _hueSlider: HTMLElement | null = null;
    private _hueCursor: HTMLElement | null = null;
    private _hexInput: HTMLInputElement | null = null;
    private _preview: HTMLElement | null = null;

    private _isDraggingSat = false;
    private _isDraggingHue = false;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.bindEvents();
        // Initialize internal HSV from initial hex attribute or property
        this.hexToHsv(this._value);
        this.updateUI();
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.updatePositionRef);
        window.removeEventListener('scroll', this.updatePositionRef, true);
        window.removeEventListener('mousemove', this.onMouseMoveSat);
        window.removeEventListener('mouseup', this.onMouseUpSat);
        window.removeEventListener('mousemove', this.onMouseMoveHue);
        window.removeEventListener('mouseup', this.onMouseUpHue);
    }

    get value() { return this._value; }
    set value(val: string) {
        if (this._value !== val) {
            this._value = val;
            this.hexToHsv(val);
            this.updateUI();
            if (this._hexInput) this._hexInput.value = val;
        }
    }

    attributeChangedCallback(name: string, oldVal: string, newVal: string) {
        if (name === 'value' && oldVal !== newVal) {
            this.value = newVal;
        } else if (name === 'trigger-opacity' && oldVal !== newVal) {
            this.updateTriggerOpacity(newVal);
        }
    }

    private updateTriggerOpacity(opacity: string) {
        if (this.shadowRoot) {
            const trigger = this.shadowRoot.getElementById('trigger');
            if (trigger) {
                trigger.style.opacity = opacity;
            }
        }
    }

    render() {
        if (!this.shadowRoot) return;
        this.shadowRoot.innerHTML = `
            <style>${css}</style>

            <button class="color-trigger" id="trigger">
                <slot></slot>
            </button>

            <dialog class="popover" id="popover">
                <style>${css}</style>
                <div class="saturation-area" id="sat-area">
                    <div class="saturation-white"></div>
                    <div class="saturation-black"></div>
                    <div class="saturation-cursor" id="sat-cursor"></div>
                </div>

                <div class="hue-slider" id="hue-slider">
                    <div class="hue-cursor" id="hue-cursor"></div>
                </div>

                <div class="controls">
                    <div class="color-preview" id="preview"></div>
                    <input type="text" class="hex-input" id="hex-input" value="${this._value}" maxlength="7">
                </div>
            </dialog>
        `;

        this._popover = this.shadowRoot.querySelector('#popover');
        this._satArea = this.shadowRoot.querySelector('#sat-area');
        this._satCursor = this.shadowRoot.querySelector('#sat-cursor');
        this._hueSlider = this.shadowRoot.querySelector('#hue-slider');
        this._hueCursor = this.shadowRoot.querySelector('#hue-cursor');
        this._hexInput = this.shadowRoot.querySelector('#hex-input');
        this._preview = this.shadowRoot.querySelector('#preview');
    }

    bindEvents() {
        const trigger = this.shadowRoot?.querySelector('#trigger');
        trigger?.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent closing immediately
            this.togglePicker();
        });

        // Close dialog when clicking on backdrop
        this._popover?.addEventListener('click', (e) => {
            const dialogElement = e.target as HTMLDialogElement;
            // If clicked directly on the dialog element (backdrop), close it
            if (dialogElement === this._popover) {
                this.closePopover();
            }
        });

        // Saturation Events
        this._satArea?.addEventListener('mousedown', (e) => {
            this._isDraggingSat = true;
            this.handleSatDrag(e);
            window.addEventListener('mousemove', this.onMouseMoveSat);
            window.addEventListener('mouseup', this.onMouseUpSat);
        });

        // Hue Events
        this._hueSlider?.addEventListener('mousedown', (e) => {
            this._isDraggingHue = true;
            this.handleHueDrag(e);
            window.addEventListener('mousemove', this.onMouseMoveHue);
            window.addEventListener('mouseup', this.onMouseUpHue);
        });

        // Hex Input
        this._hexInput?.addEventListener('input', (e) => {
            const val = (e.target as HTMLInputElement).value;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                this.value = val;
                this.emitChange();
                // Close picker after entering a valid hex color
                setTimeout(() => this.closePopover(), 300);
            }
        });
    }

    // --- Drag Handlers ---

    private onMouseMoveSat = (e: MouseEvent) => {
        if (this._isDraggingSat) this.handleSatDrag(e);
    }
    private onMouseUpSat = () => {
        this._isDraggingSat = false;
        window.removeEventListener('mousemove', this.onMouseMoveSat);
        window.removeEventListener('mouseup', this.onMouseUpSat);
        this.emitChange();
        // Close picker after selecting a color
        setTimeout(() => this.closePopover(), 150);
    }

    private onMouseMoveHue = (e: MouseEvent) => {
        if (this._isDraggingHue) this.handleHueDrag(e);
    }
    private onMouseUpHue = () => {
        this._isDraggingHue = false;
        window.removeEventListener('mousemove', this.onMouseMoveHue);
        window.removeEventListener('mouseup', this.onMouseUpHue);
        this.emitChange();
        // Close picker after selecting a color
        setTimeout(() => this.closePopover(), 150);
    }

    private handleSatDrag(e: MouseEvent) {
        if (!this._satArea) return;
        const rect = this._satArea.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        // Clamp
        x = Math.max(0, Math.min(x, rect.width));
        y = Math.max(0, Math.min(y, rect.height));

        this._s = (x / rect.width) * 100;
        this._v = 100 - (y / rect.height) * 100;

        this.updateColorFromHsv();
        this.updateUI();
    }

    private handleHueDrag(e: MouseEvent) {
        if (!this._hueSlider) return;
        const rect = this._hueSlider.getBoundingClientRect();
        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));

        this._h = (x / rect.width) * 360;
        this.updateColorFromHsv();
        this.updateUI();
    }

    // --- Logic ---

    private togglePicker() {
        const isVisible = this._popover?.classList.contains('visible');
        if (isVisible) this.closePopover();
        else this.openPopover();
    }

    private openPopover() {
        if (!this._popover || !this.shadowRoot) return;

        const dialogElement = this._popover as HTMLDialogElement;

        // Use dialog.showModal() to open in top layer
        try {
            dialogElement.showModal();
        } catch (e) {
            console.error('Failed to show color picker dialog:', e);
            return;
        }

        this._popover.classList.add('visible');

        requestAnimationFrame(() => {
            this.updatePosition();
        });

        // Refresh UI
        this.hexToHsv(this._value);
        this.updateUI();

        window.addEventListener('resize', this.updatePositionRef);
        window.addEventListener('scroll', this.updatePositionRef, true);
    }

    private updatePositionRef = () => {
        // Debounce or just update? For simplicity, update or close.
        // Often easier to close on scroll in mobile/modals, but let's try to stick.
        if (this._popover?.classList.contains('visible')) {
            this.updatePosition();
        }
    };

    private updatePosition() {
        if (!this._popover) return;

        const rect = this.getBoundingClientRect();
        const popoverRect = this._popover.getBoundingClientRect();

        // Calculate Top
        let top = rect.bottom + 8;
        // Check if it fits below
        if (top + 300 > window.innerHeight) {
            // Flip to top
            top = rect.top - 8 - (popoverRect.height || 310);
        }

        // Calculate Left - center horizontally on trigger
        let left = rect.left + (rect.width / 2) - 120; // 120 is half of popover width (240px)

        // Ensure it doesn't go off-screen horizontally
        const maxLeft = window.innerWidth - 240 - 8;
        left = Math.max(8, Math.min(left, maxLeft));

        // Apply positioning
        this._popover.style.top = `${top}px`;
        this._popover.style.left = `${left}px`;
    }

    private closePopover() {
        if (!this._popover) return;

        const dialogElement = this._popover as HTMLDialogElement;

        this._popover.classList.remove('visible');

        // Wait for transition to finish before closing dialog
        const handleTransitionEnd = () => {
            if (!this._popover) return;
            dialogElement.close();
        };

        this._popover.addEventListener('transitionend', handleTransitionEnd, { once: true });

        window.removeEventListener('resize', this.updatePositionRef);
        window.removeEventListener('scroll', this.updatePositionRef, true);
    }

    private emitChange() {
        this.dispatchEvent(new CustomEvent('input', {
            detail: { value: this._value },
            bubbles: true,
            composed: true
        }));
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }

    private updateColorFromHsv() {
        this._value = this.hsvToHex(this._h, this._s, this._v);
    }

    private updateUI() {
        if (!this._satCursor || !this._hueCursor || !this._hexInput || !this._preview || !this._satArea) return;

        // Update Cursors
        this._satCursor.style.left = `${this._s}%`;
        this._satCursor.style.top = `${100 - this._v}%`;
        this._hueCursor.style.left = `${(this._h / 360) * 100}%`;

        // Update Backgrounds
        // Saturation area bg color is purely Hue
        const hueColor = this.hsvToHex(this._h, 100, 100);
        this._satArea.style.backgroundColor = hueColor;

        this._hexInput.value = this._value;
        this._preview.style.backgroundColor = this._value;

        // Also update cursor colors for contrast if needed? White border usually works.
    }

    // --- Helpers ---

    private hexToHsv(hex: string) {
        // Expand shorthand
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return;

        const r = parseInt(result[1], 16) / 255;
        const g = parseInt(result[2], 16) / 255;
        const b = parseInt(result[3], 16) / 255;

        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, v = max;

        const d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0; // achromatic
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        this._h = h * 360;
        this._s = s * 100;
        this._v = v * 100;
    }

    private hsvToHex(h: number, s: number, v: number) {
        s /= 100;
        v /= 100;

        const i = Math.floor(h / 60);
        const f = h / 60 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        let r = 0, g = 0, b = 0;

        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }

        const toHex = (x: number) => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
}

customElements.define('app-color-picker', ColorPicker);
