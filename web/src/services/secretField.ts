/**
 * A saved secret's field, as the house shows every one (the alert token, the Proxmox
 * token secret): a password
 * box, dots when one is saved, no way to reveal it and no button to remove it.
 * The administrator can see THAT there is a token, never WHAT it is. Typing
 * replaces it; emptying the box takes it away.
 *
 * The page never receives the token, so the dots are only a sign. They have to
 * be told apart from something typed, and that is all this decides.
 */

export const SECRET_MASK = '••••••••';

export type SecretChange =
    | { action: 'keep' }
    | { action: 'clear' }
    | { action: 'set'; token: string };

/**
 * What a change in the box means. The box starts as the mask when a token is
 * saved, empty when not. Anything typed over or beside the dots is a new token
 * (a token never contains a dot of this kind); the dots alone, whole or
 * partly erased, are the sign and change nothing; an empty box is an empty token.
 */
export function secretChange(raw: string, hasToken: boolean): SecretChange {
    const typed = raw.replace(/•/g, '').trim();
    if (typed) return { action: 'set', token: typed };
    if (raw === '') return hasToken ? { action: 'clear' } : { action: 'keep' };
    return { action: 'keep' };
}

/**
 * The body that saves a widget's secrets, from what became of each field.
 *
 * Only what was typed travels; a field left as its dots, or empty when there
 * was nothing, sends nothing; an emptied one is a clear, named. Returns null
 * when there is nothing to send, so a save that touched no secret makes no
 * request.
 */
export function secretsPatch(changes: Record<string, SecretChange>): { set: Record<string, string>; clear: string[] } | null {
    const set: Record<string, string> = {};
    const clear: string[] = [];
    for (const [name, change] of Object.entries(changes)) {
        if (change.action === 'set') set[name] = change.token;
        else if (change.action === 'clear') clear.push(name);
    }
    return Object.keys(set).length || clear.length ? { set, clear } : null;
}
