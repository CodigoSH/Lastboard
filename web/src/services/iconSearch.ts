/**
 * Pure icon-search logic, extracted from IconService so it can be unit-tested
 * without instantiating the service or hitting the network.
 *
 * The generic constraint keeps this decoupled from the full IconInfo type:
 * any object with `name` and `provider` works.
 */
export function searchIcons<T extends { name: string; provider: string }>(
    icons: T[],
    query: string,
    limit: number = 12,
): T[] {
    const trimmed = query.trim();
    const results = trimmed
        ? icons.filter((icon) => icon.name.toLowerCase().includes(trimmed.toLowerCase()))
        : icons;

    // Group by provider so a single provider can't dominate the top N.
    const grouped = results.reduce(
        (acc, icon) => {
            if (!acc[icon.provider]) acc[icon.provider] = [];
            acc[icon.provider].push(icon);
            return acc;
        },
        {} as Record<string, T[]>,
    );

    // Take up to `limit` per provider.
    const finalResults: T[] = [];
    for (const providerIcons of Object.values(grouped)) {
        finalResults.push(...providerIcons.slice(0, limit));
    }

    return finalResults;
}
