import { escapeHtml } from '../../../services/escape';

export interface SelectOption {
    value: string;
    label: string;
    icon?: string;
    /** When true this entry is a non-selectable category heading, not an option. */
    header?: boolean;
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
                        ${escapeHtml(displayLabel)}
                    </div>
                    <svg class="select-icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
        `;

/**
 * Search box shown at the top of a searchable dropdown. Sits outside the
 * scrolling list so it stays put while the results move.
 */
export const selectSearchTemplate = (placeholder: string): string => `
            <div class="select-search">
                <input type="text" id="select-search-input" autocomplete="off" spellcheck="false"
                       placeholder="${escapeHtml(placeholder)}" />
            </div>
        `;

/**
 * Narrows a list of options to those matching a query. Category headers are
 * dropped while searching: a flat list of hits reads better than groups that
 * may have gone empty. An empty query returns the list untouched.
 */
export const filterSelectOptions = (options: SelectOption[], query: string): SelectOption[] => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(opt => !opt.header && opt.label.toLowerCase().includes(q));
};

/**
 * Markup for the open dropdown's option list.
 */
export const selectOptionsTemplate = (options: SelectOption[], selectedValue: string): string =>
    options.map(opt => opt.header
        ? `<div class="select-header">${escapeHtml(opt.label)}</div>`
        : `
            <div class="select-option ${opt.value === selectedValue ? 'selected' : ''}"
                 data-value="${escapeHtml(opt.value)}">
                 ${escapeHtml(opt.label)}
            </div>
        `).join('');
