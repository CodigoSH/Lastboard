import {
    PERM_GROUPS, PROFILE_IDS, effective, isBlocked, profileOf, summary,
    type BoolKey, type Grants, type LevelKey, type PermDef, type ProfileName,
} from '../../../services/accountAccess';

/**
 * The account dialog: one window, in order — the account, the profile, the
 * permissions (folded away), and what it all comes to. Creating and editing use
 * the same one; editing opens it filled.
 *
 * Pure: the text arrives through `t`, so a test can read it without the
 * translation singleton. The three containers that change as the choice does
 * (profiles, permissions, summary) have their own functions and are repainted
 * on their own, so what has been typed in the fields above is never redrawn.
 */
export type T = (key: string) => string;

const ICON_CLOSE = `<svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

/** Characters, as the server counts them. */
export const MAX_LABEL = 24;

export const userDialogTemplate = (t: T, pwToggle: string) => `
    <dialog id="user-modal" class="user-dialog">
        <div class="modal-header">
            <h3 class="modal-title" id="user-modal-title"></h3>
            <button class="modal-close" data-action="close-modal" data-modal="user-modal" aria-label="${t('general.close')}">${ICON_CLOSE}</button>
        </div>
        <input type="hidden" id="user-id">

        <section class="user-dialog__step">
            <h4 class="user-dialog__step-title"><span class="user-dialog__num">1</span>${t('users.step_account')}</h4>
            <div class="user-dialog__fields">
                <div class="settings-content__form-group">
                    <label class="settings-content__label" for="user-username">${t('auth.username')}</label>
                    <input type="text" id="user-username" class="settings-content__input" autocomplete="off">
                </div>
                <div class="settings-content__form-group">
                    <label class="settings-content__label" for="user-password" id="user-password-label">${t('auth.password')}</label>
                    <div class="pw-wrap">
                        <input type="password" id="user-password" class="settings-content__input" autocomplete="new-password">
                        ${pwToggle}
                    </div>
                </div>
                <div class="settings-content__form-group user-dialog__wide">
                    <label class="settings-content__label" for="user-label">${t('users.label')}</label>
                    <input type="text" id="user-label" class="settings-content__input" maxlength="${MAX_LABEL}" placeholder="${t('users.label_placeholder')}" autocomplete="off">
                    <p class="settings-content__text-dim user-dialog__hint">${t('users.label_hint')}</p>
                </div>
            </div>
        </section>

        <section class="user-dialog__step">
            <h4 class="user-dialog__step-title"><span class="user-dialog__num">2</span>${t('users.step_profile')}</h4>
            <div id="user-profiles" class="user-dialog__profiles" role="radiogroup" aria-label="${t('users.step_profile')}"></div>
            <details class="user-dialog__custom" id="user-custom">
                <summary>${t('users.customize')}</summary>
                <div id="user-perms"></div>
            </details>
        </section>

        <section class="user-dialog__step">
            <h4 class="user-dialog__step-title"><span class="user-dialog__num">3</span>${t('users.step_summary')}</h4>
            <div id="user-summary" class="user-dialog__summary" aria-live="polite"></div>
        </section>

        <div class="user-dialog__actions">
            <app-button variant="primary" data-action="save-user" id="user-save"></app-button>
        </div>
    </dialog>
`;

/** The four cards, the chosen one marked. */
export const userProfilesTemplate = (t: T, selected: ProfileName) =>
    [...PROFILE_IDS, 'custom' as const].map(id => `
        <button type="button" class="user-dialog__profile${id === selected ? ' is-selected' : ''}" role="radio"
                aria-checked="${id === selected}" data-action="user-profile" data-profile="${id}">
            <span class="user-dialog__profile-name">${t(`users.profile.${id}`)}</span>
            <span class="user-dialog__profile-desc">${t(`users.profile.${id}_desc`)}</span>
        </button>`).join('');

const boolRow = (t: T, g: Grants, p: PermDef) => {
    const key = p.key as BoolKey;
    const blocked = isBlocked(g, key);
    return `
        <div class="user-dialog__perm${blocked ? ' is-blocked' : ''}">
            <div class="user-dialog__perm-info">
                <span class="user-dialog__perm-name">${t(`users.perm.${key}`)}</span>
                <span class="user-dialog__perm-desc">${t(`users.perm.${key}_desc`)}</span>
            </div>
            <label class="toggle-switch">
                <input type="checkbox" data-change="user-perm" data-perm="${key}" ${effective(g, key) ? 'checked' : ''} ${blocked ? 'disabled' : ''}>
                <span class="slider"></span>
            </label>
        </div>`;
};

const levelRow = (t: T, g: Grants, p: PermDef) => {
    const key = p.key as LevelKey;
    return `
        <div class="user-dialog__perm">
            <div class="user-dialog__perm-info">
                <span class="user-dialog__perm-name">${t(`users.perm.${key}`)}</span>
                <span class="user-dialog__perm-desc">${t(`users.perm.${key}_desc`)}</span>
            </div>
            <div class="settings-content__segmented-control user-dialog__levels" role="radiogroup" aria-label="${t(`users.perm.${key}`)}">
                ${[0, 1, 2].map(l => `
                <button type="button" class="settings-content__segment${g[key] === l ? ' active' : ''}" role="radio"
                        aria-checked="${g[key] === l}" data-action="user-level" data-perm="${key}" data-level="${l}">${t(`users.level.${l}`)}</button>`).join('')}
            </div>
        </div>`;
};

/** Every permission, by area. A switch whose parent is off is shown off and cannot be touched. */
export const userPermsTemplate = (t: T, g: Grants) =>
    PERM_GROUPS.map(group => `
        <div class="user-dialog__group">
            <div class="user-dialog__group-title">${t(`users.group.${group.id}`)}</div>
            ${group.perms.map(p => (p.kind === 'level' ? levelRow(t, g, p) : boolRow(t, g, p))).join('')}
        </div>`).join('');

/** "Will be able to / Will not be able to", and the one line about what no account is ever given. */
export const userSummaryTemplate = (t: T, g: Grants) => {
    const s = summary(g);
    const name = (i: { key: string; level?: number }) =>
        i.level ? `${t(`users.perm.${i.key}`)} — ${t(`users.level.${i.level}`)}` : t(`users.perm.${i.key}`);
    const list = (items: typeof s.can, cls: string) =>
        items.length
            ? `<ul class="user-dialog__list ${cls}">${items.map(i => `<li>${name(i)}</li>`).join('')}</ul>`
            : `<p class="settings-content__text-dim user-dialog__hint">${t('users.summary_nothing')}</p>`;
    return `
        <div class="user-dialog__summary-col">
            <div class="user-dialog__summary-head">${t('users.summary_can')}</div>
            ${list(s.can, 'is-can')}
        </div>
        <div class="user-dialog__summary-col">
            <div class="user-dialog__summary-head">${t('users.summary_cannot')}</div>
            ${list(s.cannot, 'is-cannot')}
        </div>
        <p class="settings-content__text-dim user-dialog__hint user-dialog__never">${t('users.summary_never')}</p>`;
};

/** The name the list shows for the profile a set of permissions amounts to. */
export const profileLabel = (t: T, g: Grants) => t(`users.profile.${profileOf(g)}`);
