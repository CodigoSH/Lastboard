/**
 * Markup for the color picker (trigger button + popover dialog). Kept as a pure
 * string function so its structure can be snapshot-tested without a DOM. The
 * stylesheet is injected by the caller (the popover needs its own copy because
 * it renders in the top layer).
 *
 * triggerLabel is passed in rather than translated here so this stays a pure
 * function: importing the i18n singleton would drag fetch/localStorage into
 * every snapshot test.
 */
export const colorPickerTemplate = (value: string, css: string, triggerLabel = ''): string => `
            <style>${css}</style>

            <button class="color-trigger" id="trigger" aria-label="${triggerLabel}">
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
                    <input type="text" class="hex-input" id="hex-input" value="${value}" maxlength="7">
                </div>
            </dialog>
        `;
