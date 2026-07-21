/**
 * Avatar Component Template
 */

import { escapeHtml, safeImageSrc } from '../../../services/escape';

export const template = ({ src, initials, alt }: { src?: string, initials: string, alt: string }) => `
    <div class="avatar" title="${escapeHtml(alt)}">
        ${src
        ? `<img src="${safeImageSrc(src)}" alt="${escapeHtml(alt)}" class="avatar__img">`
        : `<span class="avatar__initials">${escapeHtml(initials)}</span>`
    }
    </div>
`;
