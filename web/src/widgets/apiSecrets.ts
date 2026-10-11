import { SecretChange, secretChange, secretsPatch } from '../services/secretField';

/**
 * What the API widget's settings form does with credentials, decided without
 * the DOM so it can be tested.
 *
 * A guided preset has one key, stored as the secret "key"; its URL and headers
 * are templates that name it. An advanced widget has headers: the NAMES stay in
 * the widget, each VALUE is the secret "header.<name in lower case>".
 */

export interface HeaderRow {
    name: string;
    /** What the value box holds: the dots, something typed, or nothing. */
    raw: string;
    /** Whether a value was saved for this name when the form opened. */
    saved: boolean;
}

export interface ApiSecretsInput {
    preset: boolean;
    rows: HeaderRow[];
    keyRaw: string;
    keySaved: boolean;
    /** The names the widget listed before this edit. */
    previousHeaderNames: string[];
    /** A key was saved before this edit. */
    hadKey: boolean;
}

export interface ApiSecretsPlan {
    /** Header names to store in the widget; empty for a preset. */
    headerNames: string[];
    /** What to send to the secret store, or null when nothing changes. */
    patch: { set: Record<string, string>; clear: string[] } | null;
}

/** A header name that something would send, and that fits a secret's name. */
export const HEADER_NAME = /^[A-Za-z][A-Za-z0-9._-]{0,56}$/;

export const headerSecretName = (name: string) => `header.${name.toLowerCase()}`;

export function planApiSecrets(i: ApiSecretsInput): ApiSecretsPlan {
    const changes: Record<string, SecretChange> = {};

    if (i.preset) {
        changes.key = secretChange(i.keyRaw, i.keySaved);
        for (const n of i.previousHeaderNames) changes[headerSecretName(n)] = { action: 'clear' };
        return { headerNames: [], patch: secretsPatch(changes) };
    }

    const names: string[] = [];
    const seen = new Set<string>();
    for (const row of i.rows) {
        const name = row.name.trim();
        if (!HEADER_NAME.test(name) || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        names.push(name);
        changes[headerSecretName(name)] = secretChange(row.raw, row.saved);
    }
    // A header that is gone takes its value with it.
    for (const n of i.previousHeaderNames) {
        if (!seen.has(n.toLowerCase())) changes[headerSecretName(n)] = { action: 'clear' };
    }
    if (i.hadKey) changes.key = { action: 'clear' };
    return { headerNames: names, patch: secretsPatch(changes) };
}
