/**
 * Avatar Component Template
 */

export const template = ({ src, initials, alt }: { src?: string, initials: string, alt: string }) => `
    <div class="avatar" title="${alt}">
        ${src
        ? `<img src="${src}" alt="${alt}" class="avatar__img">`
        : `<span class="avatar__initials">${initials}</span>`
    }
    </div>
`;
