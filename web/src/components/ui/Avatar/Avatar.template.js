/**
 * Avatar Component Template
 * @param {Object} props { src, initials, alt }
 * @returns {string} HTML Template
 */
export const template = ({ src, initials, alt }) => `
    <div class="avatar" title="${alt}">
        ${src
        ? `<img src="${src}" alt="${alt}" class="avatar__img">`
        : `<span class="avatar__initials">${initials}</span>`
    }
    </div>
`;
