
import css from './Select.css' with { type: 'text' };
import {
    SelectOption, selectTriggerTemplate, selectOptionsTemplate,
    selectSearchTemplate, filterSelectOptions,
} from './Select.template';
import { adoptSharedStyles, ensureSharedStylesInDocument } from '../../../services/sharedStyles';

/** Mirrors `.select-dropdown.open { max-height }` in Select.css. */
const DROPDOWN_MAX_HEIGHT = 300;

export class AppSelect extends HTMLElement {
    private _options: SelectOption[] = [];
    private _value: string = '';
    private _searchable = false;
    private _searchPlaceholder = '';
    private listEl: HTMLElement | null = null;
    private isOpen: boolean = false;
    private _boundOutsideClick: (e: Event) => void;
    private dropdownEl: HTMLElement | null = null;
    private _boundScroll: (e: Event) => void;
    private _boundResize: () => void;
    private isInsideDialog: boolean = false;
    /** Set while a dialog dropdown is waiting to be anchored on the next frame. */
    private _pendingAnchor = false;

    static get observedAttributes() {
        return ['value'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._boundOutsideClick = this.handleOutsideClick.bind(this);
        this._boundScroll = (e: Event) => {
            if (this.dropdownEl && this.dropdownEl.contains(e.target as Node)) return;
            this.close();
        };
        this._boundResize = this.close.bind(this);
    }

    connectedCallback() {
        this.ensureGlobalStyles();
        adoptSharedStyles(this.shadowRoot);
        // The dropdown is portalled into <body> when outside a dialog, where an
        // adopted sheet on our shadow root would not reach it.
        ensureSharedStylesInDocument();
        this.render();
        // Check if inside a dialog
        this.isInsideDialog = !!this.closest('dialog');
        document.addEventListener('click', this._boundOutsideClick, true);
        window.addEventListener('scroll', this._boundScroll, true);
        window.addEventListener('resize', this._boundResize);
    }

    disconnectedCallback() {
        this.close();
        document.removeEventListener('click', this._boundOutsideClick, true);
        window.removeEventListener('scroll', this._boundScroll, true);
        window.removeEventListener('resize', this._boundResize);
    }

    /**
     * Positions a dropdown opened inside a <dialog>, where it stays in our
     * shadow root (portalling to <body> would make it inert) and is positioned
     * fixed so no scrolling ancestor can clip it.
     *
     * Two corrections are needed. A dialog with backdrop-filter — ours has one —
     * becomes the containing block for fixed children, so viewport coordinates
     * land offset; rather than guess which ancestor did it, place the element,
     * measure where it actually went and shift by the difference. And when the
     * trigger sits near the bottom of the screen the list is flipped above it
     * instead of running off-screen.
     */
    private anchorInsideDialog() {
        const pending = this._pendingAnchor;
        this._pendingAnchor = false;
        if (!pending || !this.dropdownEl) return;

        // Measure the trigger now, not when the dropdown was created: opening it
        // can scroll the modal body (focus moves), which would leave a rect
        // captured earlier pointing at the wrong place.
        const trigger = this.shadowRoot!.getElementById('trigger');
        if (!trigger) return;
        const anchor = trigger.getBoundingClientRect();

        const gap = 6;
        // scrollHeight, not offsetHeight: the open animation transitions
        // max-height, so the rendered height is still growing at this point and
        // a flipped dropdown would be placed far too high. Cap it the same way
        // the stylesheet does.
        const height = Math.min(this.dropdownEl.scrollHeight, DROPDOWN_MAX_HEIGHT);

        // Fit inside the dialog, not just the viewport. The dialog is usually
        // shorter than the screen, so measuring against the window let the list
        // open downwards and spill out over the backdrop, past the modal's own
        // edge, where it reads as detached and overlaps the footer.
        const dialog = this.closest('dialog');
        const bounds = dialog ? dialog.getBoundingClientRect() : null;
        const limitBottom = bounds ? Math.min(bounds.bottom, window.innerHeight) : window.innerHeight;
        const limitTop = bounds ? Math.max(bounds.top, 0) : 0;

        const roomBelow = limitBottom - anchor.bottom;
        const roomAbove = anchor.top - limitTop;
        const flipAbove = roomBelow < height + gap && roomAbove > roomBelow;
        const wantTop = flipAbove ? anchor.top - gap - height : anchor.bottom + gap;

        // Work out the containing block's offset with a throwaway probe rather
        // than by measuring the dropdown: the dropdown carries the entry
        // transform while it animates, so measuring it would fold those pixels
        // into the correction and leave the list sitting too far from its
        // trigger once the animation settled.
        const probe = document.createElement('div');
        probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;';
        this.shadowRoot!.appendChild(probe);
        const origin = probe.getBoundingClientRect();
        probe.remove();

        this.dropdownEl.style.top = `${wantTop - origin.top}px`;
        this.dropdownEl.style.left = `${anchor.left - origin.left}px`;
        // With right:auto the box would shrink to its content, so match the
        // trigger explicitly (the stylesheet's left/right pair did this before).
        this.dropdownEl.style.width = `${anchor.width}px`;
    }

    private ensureGlobalStyles() {
        if (!document.getElementById('app-select-portal-css')) {
            const style = document.createElement('style');
            style.id = 'app-select-portal-css';
            style.textContent = css;
            document.head.appendChild(style);
        }
    }

    get value() {
        return this._value;
    }

    set value(val: string) {
        if (this._value !== val) {
            this._value = val;
            this.setAttribute('value', val);
            this.updateTriggerDisplay();
        }
    }

    set options(opts: SelectOption[]) {
        this._options = opts;
        this.updateTriggerDisplay();
    }

    /**
     * Opt-in filter box for long lists. Off by default so every other select in
     * the app keeps behaving exactly as before.
     */
    set searchable(on: boolean) {
        this._searchable = !!on;
    }

    set searchPlaceholder(text: string) {
        this._searchPlaceholder = text || '';
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'value' && oldValue !== newValue) {
            this._value = newValue;
            this.updateTriggerDisplay();
        }
    }

    private updateTriggerDisplay() {
        if (!this.shadowRoot) return;
        const valueEl = this.shadowRoot.querySelector('.select-value');
        if (valueEl) {
            const selectedOpt = this._options.find(o => !o.header && o.value === this._value)
            || this._options.find(o => !o.header);
            valueEl.textContent = selectedOpt ? selectedOpt.label : 'Select...';
        }
    }

    private toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    private open() {
        if (this.isOpen) return;
        this.close();

        this.isOpen = true;
        this.setAttribute('open', '');

        this.dropdownEl = document.createElement('div');
        this.dropdownEl.className = 'select-dropdown' + (this._searchable ? ' select-dropdown--searchable' : '');

        if (this._searchable) {
            this.dropdownEl.innerHTML =
                selectSearchTemplate(this._searchPlaceholder) + `<div class="select-list"></div>`;
            this.listEl = this.dropdownEl.querySelector('.select-list');
            this.paintOptions(this._options);

            const input = this.dropdownEl.querySelector('#select-search-input') as HTMLInputElement | null;
            input?.addEventListener('click', (e) => e.stopPropagation());
            input?.addEventListener('input', () => {
                this.paintOptions(filterSelectOptions(this._options, input.value));
            });
            input?.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const first = this.listEl?.querySelector('.select-option') as HTMLElement | null;
                const val = first?.dataset.value;
                if (val !== undefined) this.selectOption(val);
            });
        } else {
            this.listEl = this.dropdownEl;
            this.paintOptions(this._options);
        }

        if (this.isInsideDialog) {
            // Inside a dialog the dropdown stays in our shadow root — portalling
            // it to <body> would make it inert. It used to be positioned
            // absolutely against the select, which meant any scrolling ancestor
            // clipped it, and that is why those modals could not scroll at all.
            // Fixed positioning escapes the clip.
            this.dropdownEl.style.position = 'fixed';
            this.dropdownEl.style.right = 'auto';
            this.dropdownEl.style.marginTop = '0';
            this.shadowRoot!.appendChild(this.dropdownEl);
            this._pendingAnchor = true;
        } else {
            // Outside dialog: append to body as portal for proper overflow
            // Position BEFORE appending to prevent animation glitch
            const trigger = this.shadowRoot!.getElementById('trigger');
            if (trigger) {
                const rect = trigger.getBoundingClientRect();
                this.dropdownEl.style.position = 'fixed';
                this.dropdownEl.style.top = `${rect.bottom + 6}px`;
                this.dropdownEl.style.left = `${rect.left}px`;
                this.dropdownEl.style.width = `${rect.width}px`;
                this.dropdownEl.style.zIndex = '99999';
            }
            document.body.appendChild(this.dropdownEl);
        }

        requestAnimationFrame(() => {
            if (this.dropdownEl) {
                this.dropdownEl.classList.add('open');
                // Anchor after 'open' is applied: while closed the dropdown
                // carries the entry transform, so measuring first placed it a
                // few pixels off.
                this.anchorInsideDialog();
                (this.dropdownEl.querySelector('#select-search-input') as HTMLInputElement | null)?.focus();
            }
        });
    }

    /** Fills the option list and wires the click handlers for those options. */
    private paintOptions(options: SelectOption[]) {
        if (!this.listEl) return;
        this.listEl.innerHTML = selectOptionsTemplate(options, this._value);
        this.listEl.querySelectorAll('.select-option').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = (e.currentTarget as HTMLElement).dataset.value;
                if (val !== undefined) this.selectOption(val);
            });
        });
    }

    private close() {
        if (this.dropdownEl) {
            this.dropdownEl.remove();
            this.dropdownEl = null;
        }
        this.listEl = null;
        this.isOpen = false;
        this.removeAttribute('open');
    }

    private handleOutsideClick(e: Event) {
        if (!this.isOpen) return;

        const path = e.composedPath();
        if (path.includes(this)) return;
        if (this.dropdownEl && path.includes(this.dropdownEl)) return;

        this.close();
    }

    private selectOption(val: string) {
        this._value = val;
        this.setAttribute('value', val);
        this.updateTriggerDisplay();
        this.dispatchEvent(new CustomEvent('change', { detail: val, bubbles: true }));
        this.close();
    }

    render() {
        if (!this.shadowRoot) return;

        const selectedOpt = this._options.find(o => !o.header && o.value === this._value)
            || this._options.find(o => !o.header);
        const displayLabel = selectedOpt ? selectedOpt.label : 'Select...';

        this.shadowRoot.innerHTML = `
            <style>${css}</style>${selectTriggerTemplate(displayLabel)}`;

        this.shadowRoot.getElementById('trigger')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
    }
}

if (!customElements.get('app-select')) {
    customElements.define('app-select', AppSelect);
}
