/**
 * The marks of the products of this house, which no public icon library has.
 *
 * They are served by this server itself (`/images/brand/`), so they are offered
 * with no network and to an account that may not look icons up on the Internet,
 * and they are listed first so a search for the product's own name finds them
 * before anything else.
 *
 * The addresses are part of what bookmarks store: a file here is never renamed
 * or removed, or the bookmarks that name it lose their icon.
 */

export const OWN_PROVIDER = 'CodigoSH';

export const OWN_ICON_BASE = '/images/brand/';

/** The names are those the products' containers go by, so the detector proposes them. */
export const OWN_ICON_NAMES = ['lastboard', 'lasthelp', 'lastboard-agent', 'codigosh'] as const;

export interface OwnIcon { name: string; url: string; provider: string; format: 'svg' }

export function ownIcons(): OwnIcon[] {
    return OWN_ICON_NAMES.map(name => ({ name, url: `${OWN_ICON_BASE}${name}.svg`, provider: OWN_PROVIDER, format: 'svg' as const }));
}

/** An address that is one of these marks, which needs no copy kept elsewhere. */
export function isOwnIcon(source: string): boolean {
    return source.startsWith(OWN_ICON_BASE);
}
