import { describe, it, expect } from 'bun:test';
import { isSafeSanitizerUrl } from './htmlSanitizer';

/**
 * Tests for the sanitizer's URL/scheme gate. The full DOM-based sanitize()
 * relies on DOMParser, which is unavailable in bun's zero-dependency test
 * environment, so it is not unit-tested here; this covers the security-critical
 * scheme logic (the part that XSS-11 was about) as a pure function.
 */
const SCHEMES = ['http', 'https', 'mailto'];

describe('isSafeSanitizerUrl', () => {
    it('allows http/https/mailto', () => {
        expect(isSafeSanitizerUrl('http://x.com', SCHEMES)).toBe(true);
        expect(isSafeSanitizerUrl('https://x.com/a?b=1', SCHEMES)).toBe(true);
        expect(isSafeSanitizerUrl('mailto:a@b.com', SCHEMES)).toBe(true);
    });

    it('treats relative paths and anchors as safe (no scheme)', () => {
        expect(isSafeSanitizerUrl('/images/logo.png', SCHEMES)).toBe(true);
        expect(isSafeSanitizerUrl('#section', SCHEMES)).toBe(true);
        expect(isSafeSanitizerUrl('foo/bar.png', SCHEMES)).toBe(true);
    });

    it('blocks javascript: and vbscript:', () => {
        expect(isSafeSanitizerUrl('javascript:alert(1)', SCHEMES)).toBe(false);
        expect(isSafeSanitizerUrl('JavaScript:alert(1)', SCHEMES)).toBe(false);
        expect(isSafeSanitizerUrl('  javascript:alert(1)', SCHEMES)).toBe(false);
        expect(isSafeSanitizerUrl('vbscript:msgbox(1)', SCHEMES)).toBe(false);
    });

    it('allows data: only for images', () => {
        expect(isSafeSanitizerUrl('data:image/png;base64,AAAA', SCHEMES)).toBe(true);
        expect(isSafeSanitizerUrl('data:image/svg+xml,<svg/>', SCHEMES)).toBe(true);
    });

    it('blocks non-image data: URIs, including the no-"script"-substring bypass', () => {
        // Previously passed because it lacks the literal substring "script".
        expect(isSafeSanitizerUrl('data:text/html,<img src=x onerror=alert(1)>', SCHEMES)).toBe(false);
        expect(isSafeSanitizerUrl('data:text/html,<script>alert(1)</script>', SCHEMES)).toBe(false);
    });

    it('blocks unknown schemes', () => {
        expect(isSafeSanitizerUrl('file:///etc/passwd', SCHEMES)).toBe(false);
        expect(isSafeSanitizerUrl('ftp://x', SCHEMES)).toBe(false);
    });
});
