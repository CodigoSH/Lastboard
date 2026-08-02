import shared from '../styles/shared.css' with { type: 'text' };

/**
 * Shared stylesheet for shadow-DOM components.
 *
 * Built once and adopted by every shadow root that asks for it, so the
 * primitives in styles/shared.css exist a single time in memory instead of
 * being re-parsed inside each component's <style> block.
 *
 * Adopted sheets are independent of innerHTML, so components can keep
 * rewriting their markup — including their own <style> — without losing these.
 * They also sit *before* the component's own rules in the cascade, so a
 * component can still override a primitive when it genuinely needs to.
 */
let sheet: CSSStyleSheet | null = null;

function getSheet(): CSSStyleSheet | null {
    if (sheet) return sheet;
    // Guard the constructor: it is unavailable in non-DOM contexts such as the
    // test runner, where components are never actually mounted.
    if (typeof CSSStyleSheet === 'undefined') return null;
    try {
        const s = new CSSStyleSheet();
        s.replaceSync(shared);
        sheet = s;
        return sheet;
    } catch {
        return null;
    }
}

/** Adopts the shared primitives into a shadow root. Safe to call repeatedly. */
export function adoptSharedStyles(root: ShadowRoot | null): void {
    if (!root) return;
    const s = getSheet();
    if (!s) return;
    if (root.adoptedStyleSheets.includes(s)) return;
    root.adoptedStyleSheets = [s, ...root.adoptedStyleSheets];
}

/**
 * Reveals scrollbars once a dialog's body has stopped resizing.
 *
 * A dialog's first layout can come out a few pixels taller than its settled
 * one: the bar appears, narrows the content, a line of text wraps, and the next
 * pass fits without it. The browser sorts this out in a few frames, but the bar
 * is visible meanwhile and reads as a glitch on every open.
 *
 * Elements marked `.scroll-when-settled` start with the scroll hidden; this
 * watches their height and reveals it when two consecutive frames agree,
 * capped so it can never wait indefinitely. Call it right after showModal().
 */
export function revealScrollWhenSettled(root: ShadowRoot | null): void {
    if (!root || typeof requestAnimationFrame === 'undefined') return;
    const bodies = Array.from(root.querySelectorAll<HTMLElement>('.scroll-when-settled'));
    if (!bodies.length) return;

    bodies.forEach(b => b.classList.remove('is-settled'));

    let previous = -1;
    let frames = 0;
    const check = () => {
        const height = bodies.reduce((sum, b) => sum + b.scrollHeight, 0);
        if (height === previous || frames++ > 40) {
            bodies.forEach(b => b.classList.add('is-settled'));
            return;
        }
        previous = height;
        requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
}

/**
 * Same primitives, but in the main document.
 *
 * Needed for nodes a component portals out of its shadow root — the select
 * dropdown ends up in <body> so it can escape ancestor clipping, and an
 * adopted sheet on the shadow root would not follow it there.
 */
export function ensureSharedStylesInDocument(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('app-shared-css')) return;
    const style = document.createElement('style');
    style.id = 'app-shared-css';
    style.textContent = shared;
    document.head.appendChild(style);
}
