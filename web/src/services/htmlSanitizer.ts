/**
 * Native HTML Sanitizer
 *
 * Sanitizes HTML content to prevent XSS attacks without external dependencies.
 * Uses browser's native DOMParser and whitelist approach.
 */

export interface SanitizerConfig {
    allowedTags: string[];
    allowedAttrs: { [tag: string]: string[] };
    allowedSchemes: string[];
}

/**
 * Exported so the policy itself can be asserted. The sanitizer's own methods
 * need a DOM, which the test runner deliberately doesn't have, so what is
 * checkable here is the allowlist — and it is worth checking: an attribute
 * silently dropped from it is exactly how a task-list checkbox ended up
 * clickable when it was written to be disabled.
 */
export const DEFAULT_CONFIG: SanitizerConfig = {
    allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'div', 'span',
        'strong', 'b', 'em', 'i', 'u', 's', 'strike',
        'a', 'img',
        'ul', 'ol', 'li',
        'pre', 'code', 'blockquote',
        'label', 'input'
    ],
    allowedAttrs: {
        '*': ['class'],
        'a': ['href', 'title', 'target'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        // `disabled` matters: the only input allowed through is the checkbox a
        // task list is drawn with, and it is marked disabled precisely because
        // ticking it saves nothing. Stripping the attribute left a box you
        // could click that quietly reverted on the next render. `name` is here
        // so the browser stops reporting a form field it cannot identify;
        // unlike `id`, already allowed, a name on an input clobbers nothing.
        'input': ['type', 'id', 'name', 'checked', 'disabled'],
        'label': ['for']
    },
    allowedSchemes: ['http', 'https', 'mailto']
};

/**
 * Pure URL-safety check used by the sanitizer. Extracted so it can be unit
 * tested without a DOM (the rest of the sanitizer depends on DOMParser).
 *
 * Rules: relative/anchor URLs (no scheme) are safe; `data:` is allowed ONLY for
 * images (`data:image/…`); any other scheme must appear in `allowedSchemes`.
 * This replaces the previous naive `data:` + substring-'script' heuristic.
 */
export function isSafeSanitizerUrl(url: string, allowedSchemes: string[]): boolean {
    const lower = url.toLowerCase().trim();
    const schemeMatch = lower.match(/^([a-z][a-z0-9+.-]*):/);
    if (!schemeMatch) {
        // No scheme → relative path or in-page anchor, safe.
        return true;
    }
    const scheme = schemeMatch[1];
    if (scheme === 'data') {
        return lower.startsWith('data:image/');
    }
    return allowedSchemes.includes(scheme);
}

export class HTMLSanitizer {
    private config: SanitizerConfig;

    constructor(config?: Partial<SanitizerConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Sanitize HTML string using native browser APIs
     */
    sanitize(html: string): string {
        if (!html || typeof html !== 'string') {
            return '';
        }

        // Use DOMParser (native API) to parse HTML safely
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Recursively clean the document
        this.cleanNode(doc.body);

        return doc.body.innerHTML;
    }

    private cleanNode(node: Node): void {
        // Process child nodes in reverse (so removal doesn't affect iteration)
        const children = Array.from(node.childNodes);

        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];

            // Text nodes are safe
            if (child.nodeType === Node.TEXT_NODE) {
                continue;
            }

            // Comment nodes - remove
            if (child.nodeType === Node.COMMENT_NODE) {
                node.removeChild(child);
                continue;
            }

            // Element nodes - validate
            if (child.nodeType === Node.ELEMENT_NODE) {
                const element = child as Element;
                const tagName = element.tagName.toLowerCase();

                // Check if tag is allowed
                if (!this.config.allowedTags.includes(tagName)) {
                    node.removeChild(child);
                    continue;
                }

                // Clean attributes
                this.cleanAttributes(element);

                // Recursively clean children
                this.cleanNode(element);
            } else {
                // Unknown node type - remove
                node.removeChild(child);
            }
        }
    }

    private cleanAttributes(element: Element): void {
        const tagName = element.tagName.toLowerCase();
        const allowedAttrs = [
            ...(this.config.allowedAttrs['*'] || []),
            ...(this.config.allowedAttrs[tagName] || [])
        ];

        // Get all attributes (need to convert to array as we'll be modifying)
        const attrs = Array.from(element.attributes);

        for (const attr of attrs) {
            const attrName = attr.name.toLowerCase();

            // Remove if not in whitelist
            if (!allowedAttrs.includes(attrName)) {
                element.removeAttribute(attr.name);
                continue;
            }

            // Special validation for href and src (prevent javascript: protocol)
            if (attrName === 'href' || attrName === 'src') {
                const value = attr.value.trim();

                // Check for dangerous protocols
                if (this.isDangerousUrl(value)) {
                    element.removeAttribute(attr.name);
                    continue;
                }
            }

            // Validate style attribute (prevent expression() and other CSS attacks)
            if (attrName === 'style') {
                const safeStyle = this.sanitizeStyle(attr.value);
                if (safeStyle !== attr.value) {
                    element.setAttribute('style', safeStyle);
                }
            }

            // Special handling for input type
            if (tagName === 'input' && attrName === 'type') {
                const value = attr.value.toLowerCase();
                if (value !== 'checkbox') {
                    element.setAttribute('type', 'checkbox');
                }
            }
        }
    }

    private isDangerousUrl(url: string): boolean {
        return !isSafeSanitizerUrl(url, this.config.allowedSchemes);
    }

    private sanitizeStyle(style: string): string {
        // Remove dangerous CSS properties
        const dangerous = [
            'behavior',
            'expression',
            'moz-binding',
            '-o-link',
            '-o-link-source',
            'import',
            '@import'
        ];

        let cleaned = style;
        for (const prop of dangerous) {
            const regex = new RegExp(prop, 'gi');
            cleaned = cleaned.replace(regex, '');
        }

        // Remove url() with javascript:
        cleaned = cleaned.replace(/url\s*\(\s*['"]?javascript:/gi, 'url(about:blank');

        return cleaned;
    }
}

// Singleton instance (Markdown / general use)
export const htmlSanitizer = new HTMLSanitizer();

/**
 * Sanitizer for the Notepad's rich contenteditable output. It allows the extra
 * formatting the editor legitimately produces (horizontal rules, font colors,
 * inline styles for text color / image sizing) that the default config would
 * strip. Event handlers (onerror, onclick, …) and <script> are still removed —
 * any attribute/tag outside the allowlist is dropped, and style values pass
 * through sanitizeStyle(). This closes the stored-XSS in the Notepad without
 * losing the user's formatting.
 */
export const notepadSanitizer = new HTMLSanitizer({
    allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'div', 'span', 'hr', 'font',
        'strong', 'b', 'em', 'i', 'u', 's', 'strike',
        'a', 'img',
        'ul', 'ol', 'li',
        'pre', 'code', 'blockquote',
        'label', 'input'
    ],
    allowedAttrs: {
        '*': ['class', 'style'],
        'a': ['href', 'title', 'target'],
        'img': ['src', 'alt', 'title', 'width', 'height', 'style'],
        'font': ['color', 'face'],
        // `disabled` matters: the only input allowed through is the checkbox a
        // task list is drawn with, and it is marked disabled precisely because
        // ticking it saves nothing. Stripping the attribute left a box you
        // could click that quietly reverted on the next render. `name` is here
        // so the browser stops reporting a form field it cannot identify;
        // unlike `id`, already allowed, a name on an input clobbers nothing.
        'input': ['type', 'id', 'name', 'checked', 'disabled'],
        'label': ['for']
    },
    allowedSchemes: ['http', 'https', 'mailto']
});
