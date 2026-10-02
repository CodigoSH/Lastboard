/**
 * The body of a guarded update: the new content, what it is based on, and
 * nothing else.
 *
 * A module of its own, with no imports, for two reasons. The test that sends
 * exactly this body to a real server has to be able to import it without
 * dragging in the HTTP client, which needs a browser. And "nothing else" is the
 * point: the old save sent the whole item, so an old position and size went
 * along with the text and put back what another device had just changed.
 */
export function guardedUpdateBody(
    item: { id: number; content: string },
    expected: Record<string, string | null>,
): { content: string; expected: Record<string, string | null> } {
    return { content: item.content, expected };
}
