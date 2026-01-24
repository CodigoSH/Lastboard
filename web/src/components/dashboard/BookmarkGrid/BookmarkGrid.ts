import { template } from './BookmarkGrid.template';
// @ts-ignore
import css from './BookmarkGrid.css' with { type: 'text' };

interface Bookmark {
    url: string;
    icon?: string;
    label: string;
}

class BookmarkGrid extends HTMLElement {
    bookmarks: Bookmark[];
    _originalData: Bookmark[] | null = null; // For search filtering

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.bookmarks = [];
    }

    set data(value: Bookmark[]) {
        this.bookmarks = value;
        this.render();
    }

    get data(): Bookmark[] {
        return this.bookmarks;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        // CSS is imported via Bun text loader
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template({ bookmarks: this.bookmarks })}
        `;
    }
}

if (!customElements.get('bookmark-grid')) {
    customElements.define('bookmark-grid', BookmarkGrid);
}
