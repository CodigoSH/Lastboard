/**
 * The alert token's field, as the house shows every saved secret: a password
 * box, dots when one is saved, no way to reveal it and no button to remove it.
 * The administrator can see THAT there is a token, never WHAT it is. Typing
 * replaces it; emptying the box takes it away.
 *
 * The page never receives the token, so the dots are only a sign. They have to
 * be told apart from something typed, and that is all this decides.
 */

export const TOKEN_MASK = '••••••••';

export type TokenChange =
    | { action: 'keep' }
    | { action: 'clear' }
    | { action: 'set'; token: string };

/**
 * What a change in the box means. The box starts as the mask when a token is
 * saved, empty when not. Anything typed over or beside the dots is a new token
 * (a token never contains a dot of this kind); the dots alone, whole or
 * partly erased, are the sign and change nothing; an empty box is an empty token.
 */
export function tokenChange(raw: string, hasToken: boolean): TokenChange {
    const typed = raw.replace(/•/g, '').trim();
    if (typed) return { action: 'set', token: typed };
    if (raw === '') return hasToken ? { action: 'clear' } : { action: 'keep' };
    return { action: 'keep' };
}
