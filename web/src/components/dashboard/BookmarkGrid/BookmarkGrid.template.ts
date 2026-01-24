/**
 * BookmarkGrid Component Template
 */

interface Bookmark {
    url: string;
    icon?: string;
    label: string;
    [key: string]: any;
}

export const template = ({ bookmarks }: { bookmarks: Bookmark[] }) => `
    ${bookmarks.map(b => `
        <a href="${b.url}" class="bookmark-grid__card" target="_blank">
            <div class="bookmark-grid__icon-container">
                ${b.icon || `<svg class="bookmark-grid__icon-svg" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`}
            </div>
            <span class="bookmark-grid__label">${b.label}</span>
        </a>
    `).join('')}
`;
