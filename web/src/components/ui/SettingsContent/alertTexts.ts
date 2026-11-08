/**
 * The four texts an account can write for its alerts, and the markers they may use.
 *
 * `key` is the field the server stores it under, `label` the caption of the box and `fallback` the
 * translated default, which the box shows as its placeholder: leaving it empty is how an account
 * keeps using that text. The markers are the ones the server fills in (internal/core/alerttext).
 */
export const ALERT_TEXT_FIELDS = [
    { key: 'text_down_title', label: 'settings.alert_text_down_title', fallback: 'alert.down.title' },
    { key: 'text_down_body', label: 'settings.alert_text_down_body', fallback: 'alert.down.body' },
    { key: 'text_up_title', label: 'settings.alert_text_up_title', fallback: 'alert.up.title' },
    { key: 'text_up_body', label: 'settings.alert_text_up_body', fallback: 'alert.up.body' },
] as const;

export const ALERT_TEXT_KEYS: string[] = ALERT_TEXT_FIELDS.map(f => f.key);

export const ALERT_MARKERS = ['service', 'count', 'reason', 'duration'] as const;
