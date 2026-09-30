/**
 * Whether a click on a modal <dialog> landed on its backdrop.
 *
 * `event.target === dialog` is not the test: the dialog's own padding and the
 * gaps between its fields are the dialog too, so a click between two inputs
 * closed the modal and threw away what had been typed. The backdrop is what
 * lies outside the dialog's box, so that is what is asked.
 */
export function isOutside(box: { left: number; right: number; top: number; bottom: number }, x: number, y: number): boolean {
    return x < box.left || x > box.right || y < box.top || y > box.bottom;
}

export function isBackdropClick(dialog: HTMLDialogElement, event: MouseEvent): boolean {
    // Only a click aimed at the dialog element itself can be on the backdrop;
    // anything inside it has a more specific target. A keyboard "click" on a
    // button reports 0,0, which the target check already excludes.
    if (event.target !== dialog) return false;
    return isOutside(dialog.getBoundingClientRect(), event.clientX, event.clientY);
}
