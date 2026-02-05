
// @ts-ignore
import css from './Select.css' with { type: 'text' };

export class AppSelect extends HTMLElement {
    private _options: { value: string; label: string; icon?: string }[] = [];
    private _value: string = '';
    private isOpen: boolean = false;
    private _boundOutsideClick: any;
    private dropdownEl: HTMLElement | null = null;
    private _boundScroll: any;
    private _boundResize: any;
    private isInsideDialog: boolean = false;

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

    set options(opts: { value: string; label: string; icon?: string }[]) {
        this._options = opts;
        this.updateTriggerDisplay();
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
            const selectedOpt = this._options.find(o => o.value === this._value) || this._options[0];
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
        this.dropdownEl.className = 'select-dropdown';

        this.dropdownEl.innerHTML = this._options.map(opt => `
            <div class="select-option ${opt.value === this._value ? 'selected' : ''}" 
                 data-value="${opt.value}">
                 ${opt.label}
            </div>
        `).join('');

        this.dropdownEl.querySelectorAll('.select-option').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = (e.currentTarget as HTMLElement).dataset.value;
                if (val) this.selectOption(val);
            });
        });

        if (this.isInsideDialog) {
            // Inside dialog: append to shadow DOM to avoid inertness
            this.dropdownEl.style.position = 'absolute';
            this.dropdownEl.style.left = '0';
            this.dropdownEl.style.right = '0';
            this.dropdownEl.style.top = '100%';
            this.dropdownEl.style.marginTop = '6px';
            this.shadowRoot!.appendChild(this.dropdownEl);
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
            }
        });
    }

    private positionPortal() {
        if (!this.dropdownEl || !this.shadowRoot) return;
        const trigger = this.shadowRoot.getElementById('trigger');
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        let top = rect.bottom + 6;
        let left = rect.left;

        const dropdownHeight = 300;
        if (top + dropdownHeight > window.innerHeight && rect.top - dropdownHeight > 0) {
            top = rect.top - 6 - dropdownHeight;
        }

        this.dropdownEl.style.position = 'fixed';
        this.dropdownEl.style.top = `${top}px`;
        this.dropdownEl.style.left = `${left}px`;
        this.dropdownEl.style.width = `${rect.width}px`;
        this.dropdownEl.style.zIndex = '99999';
    }

    private close() {
        if (this.dropdownEl) {
            this.dropdownEl.remove();
            this.dropdownEl = null;
        }
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

        const selectedOpt = this._options.find(o => o.value === this._value) || this._options[0];
        const displayLabel = selectedOpt ? selectedOpt.label : 'Select...';

        this.shadowRoot.innerHTML = `
            <style>${css}</style>
            <div class="select-wrapper">
                <div class="select-trigger" id="trigger">
                    <div class="select-value">
                        ${displayLabel}
                    </div>
                    <svg class="select-icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
        `;

        this.shadowRoot.getElementById('trigger')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
    }
}

if (!customElements.get('app-select')) {
    customElements.define('app-select', AppSelect);
}
