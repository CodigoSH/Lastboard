import type { User } from '../types';

/**
 * Whether the account may use something, as /api/me tells it.
 *
 * Only a convenience for leaving out what could not be used: every route
 * checks for itself. When the server says nothing (the demo has no accounts)
 * nothing is taken away.
 */
export function accessAllows(user: Pick<User, 'access'> | null | undefined, cap: string): boolean {
    const can = user?.access?.can;
    if (!can) return true;
    return can[cap] === true;
}
