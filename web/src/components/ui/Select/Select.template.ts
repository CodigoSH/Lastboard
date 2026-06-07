export interface SelectOption {
    value: string;
    label: string;
    icon?: string;
}

/**
 * Markup for the closed select trigger (without the <style> tag, which the
 * component injects separately). Kept as a pure string function so its output
 * can be snapshot-tested without a DOM.
 */
export const selectTriggerTemplate = (displayLabel: string): string => `
            <div class="select-wrapper">
                <div class="select-trigger" id="trigger">
                    <div class="select-value">
                        ${displayLabel}
                    </div>
                    <svg class="select-icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
        `;

/**
 * Markup for the open dropdown's option list.
 */
export const selectOptionsTemplate = (options: SelectOption[], selectedValue: string): string =>
    options.map(opt => `
            <div class="select-option ${opt.value === selectedValue ? 'selected' : ''}"
                 data-value="${opt.value}">
                 ${opt.label}
            </div>
        `).join('');
