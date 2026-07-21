/**
 * Shared HTML-escaping helpers.
 *
 * Single source of truth for turning untrusted values into safe HTML text and
 * safe URL/attribute values. Previously each component shipped its own copy of
 * `esc()` (with subtle differences), and several templates had none — the root
 * cause of the scattered escaping issues. Import from here instead of inlining.
 */

/** Escapes a value for safe interpolation into HTML text or a quoted attribute. */
export const escapeHtml = (value: unknown): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

/**
 * Sanitizes a URL destined for navigation (href). Only absolute http(s) links
 * or the in-page anchor '#' are allowed; anything else (javascript:, data:, …)
 * collapses to '#'. The result is HTML-escaped so it is safe inside an attribute.
 */
export const safeUrl = (url: string): string => {
    if (!url) return '#';
    const trimmed = String(url).trim();
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('http://') || lower.startsWith('https://') || trimmed === '#') {
        return escapeHtml(trimmed);
    }
    return '#';
};

/**
 * Sanitizes a URL destined for an <img src>. Allows absolute http(s) and inline
 * image data URIs only; anything else yields '' so the alt/placeholder shows
 * instead of executing an injected value. The result is HTML-escaped.
 */
export const safeImageSrc = (url: string): string => {
    if (!url) return '';
    const trimmed = String(url).trim();
    const lower = trimmed.toLowerCase();
    const scheme = lower.match(/^([a-z][a-z0-9+.-]*):/);
    if (!scheme) {
        // Relative path (e.g. /images/logo.png) — no scheme, safe.
        return escapeHtml(trimmed);
    }
    if (
        lower.startsWith('http://') ||
        lower.startsWith('https://') ||
        lower.startsWith('data:image/')
    ) {
        return escapeHtml(trimmed);
    }
    return '';
};
