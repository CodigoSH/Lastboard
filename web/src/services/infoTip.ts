/**
 * What a setting or a field means, behind a small round "i" beside its name.
 *
 * The sentence used to sit under every field and every row; here it is one
 * hover, one tap or one Tab away, and the rows are one line each. A button,
 * so it takes focus from the keyboard and from a tap, and its accessible name
 * is the sentence itself.
 *
 * Opening it is done once for the whole document, through the shadow roots
 * (`composedPath`): a mouse opens it by resting on it and closes it by
 * leaving; a tap or a click opens it and keeps it open until the next tap
 * anywhere else or Escape; the keyboard opens it on focus. Closed tips are not
 * drawn at all, so one near an edge never widens the page, and an open one
 * that would run past the window opens the other way.
 */
import { escapeHtml } from './escape';

const ICON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`;

/** The "i" and its sentence. `help` is plain text. */
export function infoTip(help: string): string {
    return `<button type="button" class="tip" data-tip>${ICON}<span class="tip-text" role="tooltip">${escapeHtml(help)}</span></button>`;
}

let open: HTMLElement | null = null;
let pinned: HTMLElement | null = null;

function place(tip: HTMLElement): void {
    tip.classList.remove('to-end');
    const text = tip.querySelector<HTMLElement>('.tip-text');
    if (!text) return;
    const r = text.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    const rtl = getComputedStyle(tip).direction === 'rtl';
    if ((!rtl && r.right > width - 8) || (rtl && r.left < 8)) tip.classList.add('to-end');
}

function show(tip: HTMLElement): void {
    if (open && open !== tip) hide(open);
    open = tip;
    tip.classList.add('open');
    tip.setAttribute('aria-expanded', 'true');
    place(tip);
}

function hide(tip: HTMLElement): void {
    tip.classList.remove('open', 'to-end');
    tip.setAttribute('aria-expanded', 'false');
    if (open === tip) open = null;
    if (pinned === tip) pinned = null;
}

/** The tip an event happened on, looking through shadow roots. */
function tipOf(event: Event): HTMLElement | null {
    for (const node of event.composedPath()) {
        if (node instanceof HTMLElement && node.hasAttribute('data-tip')) return node;
    }
    return null;
}

export function installInfoTips(doc: Document = document): void {
    doc.addEventListener('pointerover', (event) => {
        const tip = tipOf(event);
        if (tip && event.pointerType === 'mouse') show(tip);
    });
    doc.addEventListener('pointerout', (event) => {
        const tip = tipOf(event);
        if (!tip || event.pointerType !== 'mouse' || pinned === tip) return;
        const to = event.relatedTarget;
        if (to instanceof Node && tip.contains(to)) return;
        hide(tip);
    });
    doc.addEventListener('click', (event) => {
        const tip = tipOf(event);
        if (tip) {
            // Inside a form or a label it is still only a tip: never a submit, never a checkbox.
            event.preventDefault();
            event.stopPropagation();
            if (pinned === tip) hide(tip);
            else { show(tip); pinned = tip; }
            return;
        }
        if (open) hide(open);
    }, true);
    doc.addEventListener('focusin', (event) => {
        const tip = tipOf(event);
        if (tip && tip.matches(':focus-visible')) show(tip);
    });
    doc.addEventListener('focusout', (event) => {
        const tip = tipOf(event);
        if (tip && pinned !== tip) hide(tip);
    });
    doc.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !open) return;
        hide(open);
        // A tip inside a dialog closes before the dialog does.
        event.preventDefault();
        event.stopPropagation();
    }, true);
}
