/**
 * Markup for the color picker: a native colour input that fills the host.
 *
 * The picker used to be a hand-built HSV popover — saturation area, hue slider
 * and hex field in a <dialog>. It looked the same on every device precisely
 * because it was ours, and its drag targets were small enough to be awkward on
 * a phone. A native input hands the job to the platform, which on Android and
 * iOS means the system picker people already know.
 *
 * Kept as a pure string function so its structure can be snapshot-tested
 * without a DOM. The stylesheet is injected by the caller.
 *
 * triggerLabel is passed in rather than translated here so this stays a pure
 * function: importing the i18n singleton would drag fetch/localStorage into
 * every snapshot test.
 */
import { escapeHtml } from '../../../services/escape';

export const colorPickerTemplate = (value: string, css: string, triggerLabel = ''): string => `
            <style>${css}</style>

            <input type="color" class="color-native" id="native"
                   value="${escapeHtml(value)}" aria-label="${escapeHtml(triggerLabel)}">
            <slot></slot>
        `;
