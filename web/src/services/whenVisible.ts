/**
 * Wraps a polling callback so a tab nobody is looking at stops asking the
 * server: a tick that lands while the page is hidden does nothing, and the
 * next one after it is shown picks the data up again.
 */
export const whenVisible = (tick: () => unknown) => (): void => {
    if (!document.hidden) void tick();
};
