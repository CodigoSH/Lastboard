import { describe, it, expect } from 'bun:test';
import { escapeHtml, safeUrl, safeImageSrc } from './escape';

describe('escapeHtml', () => {
    it('escapes the five HTML-significant characters', () => {
        expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#039;');
    });

    it('neutralizes a tag-injection payload', () => {
        expect(escapeHtml('"><img src=x onerror=alert(1)>')).toBe(
            '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;'
        );
    });

    it('coerces null/undefined to empty string', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });

    it('leaves plain text untouched', () => {
        expect(escapeHtml('Madrid')).toBe('Madrid');
    });
});

describe('safeUrl', () => {
    it('allows http and https', () => {
        expect(safeUrl('http://example.com')).toBe('http://example.com');
        expect(safeUrl('https://example.com/path?q=1')).toBe('https://example.com/path?q=1');
    });

    it('allows the in-page anchor', () => {
        expect(safeUrl('#')).toBe('#');
    });

    it('rejects javascript: and data: to #', () => {
        expect(safeUrl('javascript:alert(1)')).toBe('#');
        expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
        expect(safeUrl('  JavaScript:alert(1)')).toBe('#');
    });

    it('escapes a quote that would break the attribute', () => {
        expect(safeUrl('https://x/"><img onerror=alert(1)>')).toBe(
            'https://x/&quot;&gt;&lt;img onerror=alert(1)&gt;'
        );
    });

    it('empty/falsy yields #', () => {
        expect(safeUrl('')).toBe('#');
    });
});

describe('safeImageSrc', () => {
    it('allows http, https and data:image', () => {
        expect(safeImageSrc('https://cdn/x.png')).toBe('https://cdn/x.png');
        expect(safeImageSrc('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    });

    it('rejects non-image data URIs and scripts to empty', () => {
        expect(safeImageSrc('data:text/html,<script>alert(1)</script>')).toBe('');
        expect(safeImageSrc('javascript:alert(1)')).toBe('');
    });

    it('escapes a quote that would break the src attribute', () => {
        expect(safeImageSrc('https://x/"><img onerror=alert(1)>')).toBe(
            'https://x/&quot;&gt;&lt;img onerror=alert(1)&gt;'
        );
    });
});
