/**
 * SectionGroup Component Template
 * @param {Object} props { title }
 * @returns {string} HTML Template
 */
export const template = ({ title }) => `
    <div class="section-group__header">
        <span class="section-group__title">${title}</span>
        <div class="section-group__line"></div>
    </div>
    <div class="section-group__content">
        <slot></slot>
    </div>
`;
