/**
 * Notifier Component Template
 *
 * The container is anchored bottom-center (see Notifier.css) so it is never
 * occluded by the right-side preferences drawer and keeps a single, constant
 * position on both desktop and mobile. Toasts are appended here at runtime.
 */
export const template = () => `
    <div class="toast-container" role="region" aria-live="polite" aria-atomic="false"></div>
`;
