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

const DEFAULT_CONFIG: SanitizerConfig = {
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
        '*': ['style', 'class'],
        'a': ['href', 'title', 'target'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'input': ['type', 'id', 'checked'],
        'label': ['for']
    },
    allowedSchemes: ['http', 'https', 'data', 'mailto']
};

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
        const lower = url.toLowerCase().trim();

        // Block javascript: protocol
        if (lower.startsWith('javascript:')) {
            return true;
        }

        // Block data: URLs that contain scripts
        if (lower.startsWith('data:') && lower.includes('script')) {
            return true;
        }

        // Block vbscript: protocol
        if (lower.startsWith('vbscript:')) {
            return true;
        }

        // Only allow specific schemes if it has a protocol
        if (lower.includes(':')) {
            const scheme = lower.split(':')[0];
            if (!this.config.allowedSchemes.includes(scheme)) {
                return true;
            }
        }

        return false;
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

// Singleton instance
export const htmlSanitizer = new HTMLSanitizer();
