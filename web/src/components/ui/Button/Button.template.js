/**
 * Button Component Template
 * @param {Object} props { variant }
 * @returns {string} HTML Template
 */
export const template = ({ variant }) => `
    <button class="btn btn--${variant}">
        <slot></slot>
    </button>
`;
