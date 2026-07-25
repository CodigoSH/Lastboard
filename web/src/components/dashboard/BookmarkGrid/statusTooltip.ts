/**
 * A single, body-portaled tooltip for bookmark status dots. Portaling to <body>
 * (rather than inside the grid's shadow DOM) keeps position:fixed honest — no
 * transformed ancestor shifts it. The grid owns the hover logic and data; this
 * module only shows/positions/updates the floating card.
 */

let tipEl: HTMLDivElement | null = null;

const STYLE_ID = 'status-tooltip-portal-css';
const CSS = `
.status-tooltip {
    position: fixed;
    z-index: 100000;
    min-width: 160px;
    max-width: 240px;
    background: var(--surface-solid, #1b1e24);
    border: 1px solid var(--border, #2c313a);
    border-radius: 10px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
    padding: 10px 12px;
    font-family: var(--font-sans, system-ui);
    color: var(--text-main, #e8eaed);
    opacity: 0;
    transform: translateY(-4px);
    transition: opacity 0.12s ease, transform 0.12s ease;
    pointer-events: none;
}
.status-tooltip.open { opacity: 1; transform: translateY(0); }
.status-tooltip__status {
    display: flex; align-items: center; gap: 7px;
    font-size: 13px; font-weight: 600; margin-bottom: 8px;
}
.status-tooltip__dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.status-tooltip__status--up { color: var(--success-color, #2fb344); }
.status-tooltip__status--down { color: var(--danger-color, #e5484d); }
.status-tooltip__status--pending, .status-tooltip__status--unknown { color: var(--text-dim, #9aa0aa); }
.status-tooltip__rows { display: flex; flex-direction: column; gap: 4px; }
.status-tooltip__row { display: flex; justify-content: space-between; gap: 16px; font-size: 12px; }
.status-tooltip__row-label { color: var(--text-dim, #9aa0aa); }
.status-tooltip__row-value { color: var(--text-main, #e8eaed); font-weight: 500; font-variant-numeric: tabular-nums; }
.status-tooltip__hint { margin-top: 8px; font-size: 11px; color: var(--text-dim, #9aa0aa); opacity: 0.75; }
`;

function ensure(): HTMLDivElement {
    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS;
        document.head.appendChild(style);
    }
    if (!tipEl) {
        tipEl = document.createElement('div');
        tipEl.className = 'status-tooltip';
        document.body.appendChild(tipEl);
    }
    return tipEl;
}

/** Show or move the tooltip anchored below (or above) an element. */
export function showStatusTip(anchor: Element, html: string) {
    const tip = ensure();
    tip.innerHTML = html;
    tip.style.visibility = 'hidden';
    tip.classList.add('open');

    const r = anchor.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));
    let top = r.bottom + 8;
    if (top + th > window.innerHeight - 8) top = r.top - th - 8; // flip above

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.style.visibility = 'visible';
}

/** Replace the tooltip content in place (e.g. once lazy data arrives). */
export function updateStatusTip(html: string) {
    if (tipEl && tipEl.classList.contains('open')) tipEl.innerHTML = html;
}

export function hideStatusTip() {
    if (tipEl) tipEl.classList.remove('open');
}
