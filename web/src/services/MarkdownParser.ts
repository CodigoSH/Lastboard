export class MarkdownParser {
    /**
     * Allow only http/https/mailto (and relative) URLs in generated links and
     * images; anything else (javascript:, data:, vbscript:, …) collapses to '#'.
     * Makes the parser safe by itself instead of relying on the downstream
     * sanitizer (defense in depth). The input is already HTML-entity escaped by
     * parse(), so quotes cannot break out of the attribute here.
     */
    private static safeLinkUrl(url: string): string {
        const lower = url.trim().toLowerCase();
        const scheme = lower.match(/^([a-z][a-z0-9+.-]*):/);
        if (!scheme) return url; // relative path or anchor
        if (scheme[1] === 'http' || scheme[1] === 'https' || scheme[1] === 'mailto') return url;
        return '#';
    }

    static parse(markdown: string): string {
        if (!markdown) return '';

        let html = markdown
            // Escape HTML characters to prevent XSS (basic)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        // Code Blocks (fenced)
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

        // Blockquotes
        html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Horizontal Rule
        html = html.replace(/^---$/gim, '<hr />');

        // Unordered Lists
        html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<ul><li>$1</li></ul>');
        html = html.replace(/<\/ul>\s*<ul>/gim, ''); // Merge adjacent lists

        // Ordered Lists
        html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<ol><li>$1</li></ol>');
        html = html.replace(/<\/ol>\s*<ol>/gim, ''); // Merge adjacent lists

        // Checkboxes (GitHub style). They carry a name only because a form
        // field without one makes the browser warn that it can't be autofilled
        // — which is beside the point for a box that is disabled and drawn
        // from your text, but the warning is real and the attribute is free.
        html = html.replace(/^\s*\[ \]\s+(.*$)/gim, '<div class="checklist-item"><input type="checkbox" name="task" disabled> $1</div>');
        html = html.replace(/^\s*\[x\]\s+(.*$)/gim, '<div class="checklist-item"><input type="checkbox" name="task" checked disabled> $1</div>');

        // Inline Code
        html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

        // Images
        html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/gim, (_m, alt, url) =>
            `<img src="${MarkdownParser.safeLinkUrl(url)}" alt="${alt}" style="max-width:100%"/>`);

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (_m, text, url) =>
            `<a href="${MarkdownParser.safeLinkUrl(url)}" target="_blank">${text}</a>`);

        // Bold
        html = html.replace(/\*\*([^*]+)\*\*/gim, '<strong>$1</strong>');
        html = html.replace(/__([^_]+)__/gim, '<strong>$1</strong>');

        // Italic
        html = html.replace(/\*([^*]+)\*/gim, '<em>$1</em>');
        html = html.replace(/_([^_]+)_/gim, '<em>$1</em>');

        // Paragraphs (naive implementation: double newline -> p)
        // We need to be careful not to break pre/code blocks which are already handled
        // A simple approach is to replace double newlines with <br><br> for now or wrap non-block elements
        html = html.replace(/\n\n/gim, '<br><br>');
        html = html.replace(/\n/gim, '<br>');

        return html;
    }
}
