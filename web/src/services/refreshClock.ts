/**
 * The pause of a full-screen page's own refresh while the browser asks to save data.
 *
 * The pages refresh on their own; a phone on a limited connection, or with Data Saver on, asks
 * for less traffic, so the refresh nobody asked for stands down. The button, and opening the page,
 * still read.
 */

type Connection = { connection?: { saveData?: boolean } };

/** Whether the browser asks to save data: Data Saver, or a connection the person marked as limited. */
export const savingData = (nav: Connection = navigator as unknown as Connection): boolean => nav?.connection?.saveData === true;

/**
 * The tick of a refresh nobody asked for: it does nothing while the page is hidden
 * (as whenVisible) and while the browser asks to save data. The button, and opening
 * the page, still read.
 */
export const whenRefreshing = (
    tick: () => unknown,
    saving: () => boolean = savingData,
    hidden: () => boolean = () => typeof document !== 'undefined' && document.hidden,
) => (): void => {
    if (!hidden() && !saving()) void tick();
};
