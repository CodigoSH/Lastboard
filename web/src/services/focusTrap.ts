/**
 * Minimal focus management for modal dialogs built from plain overlay <div>s.
 *
 * The native <dialog> element (opened with showModal()) already traps focus,
 * routes Escape and restores focus on close, so it does NOT need this. Use this
 * only for the custom-div modals (DashboardManagerModal, MobileReorderModal),
 * which render an overlay/sheet inside their shadow root.
 *
 * On creation it remembers what had focus, moves focus into the dialog, keeps
 * Tab cycling within it and routes Escape to `onEscape`. Call release() when the
 * dialog closes to detach the listener and restore focus to the opener.
 */

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface FocusTrap {
    release(): void;
}

export interface FocusTrapOptions {
    /** Called when Escape is pressed inside the dialog. */
    onEscape?: () => void;
    /** Element to focus on open. Defaults to the first focusable element. */
    initialFocus?: HTMLElement | null;
}

/**
 * Traps keyboard focus within `container` (typically the modal sheet, which may
 * live inside a shadow root). Returns a handle whose release() restores focus.
 */
export function createFocusTrap(container: HTMLElement, options: FocusTrapOptions = {}): FocusTrap {
    // Capture the opener from the top-level document (for a trigger nested in
    // another shadow root this resolves to its host, which is the closest we can
    // restore to). The container's own shadow root has no focus yet, so reading
    // from it would lose the opener entirely.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusable = (): HTMLElement[] =>
        Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
            el => el.getClientRects().length > 0,
        );

    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            options.onEscape?.();
            return;
        }
        if (e.key !== 'Tab') return;

        const items = focusable();
        if (items.length === 0) {
            e.preventDefault();
            return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = (container.getRootNode() as ShadowRoot | Document).activeElement;

        if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    };

    container.addEventListener('keydown', onKeydown);

    // Defer so the dialog is laid out (getClientRects) before we pick a target.
    const initial = options.initialFocus ?? null;
    requestAnimationFrame(() => (initial ?? focusable()[0] ?? container).focus());

    return {
        release() {
            container.removeEventListener('keydown', onKeydown);
            previouslyFocused?.focus?.();
        },
    };
}
