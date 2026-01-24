import { template } from './BookmarkGrid.template.js';

class BookmarkGrid extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.bookmarks = [];
    }

    set data(value) {
        this.bookmarks = value;
        this.render();
    }

    get data() {
        return this.bookmarks;
    }

    async connectedCallback() {
        if (!this.constructor.cssText) {
            const cssResponse = await fetch('/src/components/dashboard/BookmarkGrid/BookmarkGrid.css');
            this.constructor.cssText = await cssResponse.text();
        }
        this.render();
    }

    render() {
        if (!this.constructor.cssText) return; // Wait for CSS load

        this.shadowRoot.innerHTML = `
            <style>${this.constructor.cssText}</style>
            ${template({ bookmarks: this.bookmarks })}
        `;
    }
}

if (!customElements.get('bookmark-grid')) {
    customElements.define('bookmark-grid', BookmarkGrid);
}
