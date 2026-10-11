import { SecretChange, secretChange } from './secretField';

/**
 * Where a Docker agent host's token is kept: one secret per host, in the
 * widget's secret store. Must give the same name as dockerSecretName in
 * internal/web/api/widget_api_secrets.go — the server reads it by this name.
 */
export function dockerSecretName(hostId: string): string {
    const safe = [...hostId.toLowerCase()].map(ch => /[a-z0-9_.-]/.test(ch) ? ch : '-').join('');
    return `docker.${safe}`.slice(0, 64);
}

/**
 * What becomes of a host's token when its form is saved. Only an agent host has
 * one; a host that stopped being an agent drops the token it had. The box shows
 * dots for a saved token, so dots alone change nothing, something typed
 * replaces it, and an emptied box removes it.
 */
export function hostTokenChange(i: { type: string; raw: string; saved: boolean }): SecretChange {
    if (i.type !== 'agent') return i.saved ? { action: 'clear' } : { action: 'keep' };
    return secretChange(i.raw, i.saved);
}
