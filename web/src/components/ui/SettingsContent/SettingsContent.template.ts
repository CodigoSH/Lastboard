import { i18n } from '../../../services/i18n';
import { escapeHtml as esc, safeImageSrc } from '../../../services/escape';
import { SECRET_MASK } from '../../../services/secretField';
import type { AccountDockerHost } from '../../../services/dockerHostList';
import { roleOrLabel } from '../../../services/accountAccess';
import { userDialogTemplate, MAX_LABEL } from './userDialog.template';
import { userAgentLabel, type BrowserId, type OsId } from '../../../services/userAgentLabel';

const ICON_EDIT = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

const pwToggle = () => `<button type="button" class="pw-toggle" aria-label="${i18n.t('auth.toggle_password')}">
    <svg style="display:none" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
    <svg style="display:block" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
</button>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
interface User {
    initials?: string;
    avatar_url?: string;
    username?: string;
    role?: string;
    label?: string;
    is_admin?: boolean;
}

interface Prefs {
    accent_color: string;
    language: string;
    [key: string]: any;
}

const t = (key: string) => i18n.t(key);
const roleText = (role?: string) => (role || '').toLowerCase() === 'user' ? i18n.t('settings.role_user') : i18n.t('settings.role_admin');

/** One sign-in of this account, as the server lists it. */
export interface SessionRow {
    id: number;
    current: boolean;
    last_seen: string;
    user_agent: string;
    ip: string;
}

/** `idle` until the first answer, so the card does not flash a message. */
export interface SessionsView {
    status: 'idle' | 'ready' | 'error';
    items: SessionRow[];
}

const BROWSER_NAMES: Record<Exclude<BrowserId, 'unknown'>, string> = {
    firefox: 'Firefox', chrome: 'Chrome', edge: 'Edge', safari: 'Safari', opera: 'Opera',
};
const OS_NAMES: Record<Exclude<OsId, 'unknown'>, string> = {
    windows: 'Windows', macos: 'macOS', linux: 'Linux', android: 'Android', ios: 'iOS', chromeos: 'ChromeOS',
};

/** "Firefox on Linux"; the names are products, so only the joining words are translated. */
export const deviceName = (userAgent: string): string => {
    const { browser, os } = userAgentLabel(userAgent);
    if (browser === 'unknown' && os === 'unknown') return i18n.t('sessions.unknown_device');
    const b = browser === 'unknown' ? i18n.t('sessions.unknown_browser') : BROWSER_NAMES[browser];
    if (os === 'unknown') return b;
    return i18n.t('sessions.device', { browser: b, os: OS_NAMES[os] });
};

const sessionRowTemplate = (s: SessionRow) => {
    const seen = i18n.formatDateTime(s.last_seen, { dateStyle: 'medium', timeStyle: 'short' });
    return `
            <div class="settings-content__action-row">
                <div class="settings-content__action-info">
                    <h3>${esc(deviceName(s.user_agent))}</h3>
                    ${s.ip ? `<p>${esc(s.ip)}</p>` : ''}
                    ${seen ? `<p>${esc(i18n.t('sessions.last_active', { date: seen }))}</p>` : ''}
                </div>
                ${s.current
                    ? `<span class="user-role-tag">${i18n.t('sessions.this_device')}</span>`
                    : `<app-button data-action="close-session" data-session-id="${s.id}">${i18n.t('sessions.close')}</app-button>`}
            </div>`;
};

export const sessionsCardTemplate = (view: SessionsView) => `
        <div class="bento-card" id="sessions-card">
            <h3 class="settings-content__title">${i18n.t('sessions.title')}</h3>
            ${view.status === 'error'
                ? `<p class="settings-content__text-dim">${i18n.t('sessions.load_error')}</p>`
                : view.status === 'ready' && view.items.length > 0
                    ? `<div class="settings-content__action-group">${view.items.map(sessionRowTemplate).join('')}
            </div>
            ${view.items.some(s => !s.current) ? `<div class="settings-content__form-actions">
                <app-button data-action="close-other-sessions">${i18n.t('sessions.close_others')}</app-button>
            </div>` : ''}`
                    : ''}
        </div>
`;

export const accountTemplate = (user: User, sessions: SessionsView = { status: 'idle', items: [] }) => `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.profile')}</h3>
            <div class="settings-content__profile-header">
                <div class="settings-content__avatar-container" style="cursor: pointer;" data-action="click-file" data-file="avatar-upload" role="button" tabindex="0" aria-label="${i18n.t('action.change_image')}">
                    <app-avatar initials="${esc(user.initials || '??')}" src="${safeImageSrc(user.avatar_url || '')}" style="width: 80px; height: 80px; font-size: 32px;"></app-avatar>
                    <div class="settings-content__edit-overlay">${i18n.t('action.change_image')}</div>
                </div>
                <input type="file" id="avatar-upload" style="display: none;" accept="image/*" data-change="avatar">
                <div class="settings-content__profile-info">
                    <span class="settings-content__profile-name">${user.username || i18n.t('settings.default_user')}</span>
                    <span class="mono-tag">${esc(roleOrLabel(user.label, roleText(user.role)))}</span>
                </div>
            </div>
            
            <div class="settings-content__form-container" style="margin-top: 32px;">
                <div class="settings-content__form-group">
                    <label class="settings-content__label">${i18n.t('auth.username')}</label>
                    <div class="settings-content__input-row">
                        <input type="text" id="username-input" class="settings-content__input" value="${user.username || ''}" placeholder="${i18n.t('auth.username')}">
                        <app-button variant="primary" data-action="update-username">${i18n.t('settings.save_username')}</app-button>
                    </div>
                    <p class="settings-content__text-dim" style="font-size: 10px; margin: 4px 0 0 0;">${i18n.t('settings.username_relogin_hint')}</p>
                </div>
                ${user.is_admin ? `
                <div class="settings-content__form-group">
                    <label class="settings-content__label" for="own-label-input">${i18n.t('users.label')}</label>
                    <div class="settings-content__input-row">
                        <input type="text" id="own-label-input" class="settings-content__input" maxlength="${MAX_LABEL}" value="${esc(user.label || '')}" placeholder="${i18n.t('users.label_placeholder')}" autocomplete="off">
                        <app-button variant="primary" data-action="save-own-label">${i18n.t('users.save_label')}</app-button>
                    </div>
                    <p class="settings-content__text-dim" style="font-size: 10px; margin: 4px 0 0 0;">${i18n.t('users.label_own_hint')}</p>
                </div>` : ''}
            </div>
        </div>

        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.system_password')}</h3>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${i18n.t('settings.current_password')}</label>
                <div class="pw-wrap">
                    <input type="password" id="current-password" class="settings-content__input" placeholder="${i18n.t('settings.password_placeholder')}">
                    ${pwToggle()}
                </div>
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${i18n.t('settings.new_password')}</label>
                <div class="pw-wrap">
                    <input type="password" id="new-password" class="settings-content__input" placeholder="••••••••">
                    ${pwToggle()}
                </div>
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${i18n.t('settings.confirm_password')}</label>
                <div class="pw-wrap">
                    <input type="password" id="confirm-password" class="settings-content__input" placeholder="••••••••">
                    ${pwToggle()}
                </div>
            </div>
            <div class="settings-content__form-actions">
                <app-button variant="primary" data-action="update-password">${i18n.t('settings.change_password')}</app-button>
            </div>
        </div>

        ${sessionsCardTemplate(sessions)}
    </div>
`;

// Look & Feel: everything that changes how the dashboard looks (accent, theme,
// background) lives in one card. Language and units moved to Personalization,
// which is where the rest of the per-panel preferences are.
export const themeTemplate = (prefs: Prefs, colorMap: Record<string, string>, colors: string[]) => `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
             <h3 class="settings-content__title">${i18n.t('settings.appearance')}</h3>
             <label class="settings-content__label">${i18n.t('settings.studio_accent')}</label>
             <div class="settings-content__color-grid">
                ${colors.map(c => `
                    <div class="settings-content__color-swatch ${prefs.accent_color === c ? 'settings-content__color-swatch--active' : ''}"
                         style="background-color: ${colorMap[c]}"
                         data-action="set-accent" data-color="${esc(c)}">
                         ${prefs.accent_color === c ? '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>' : ''}
                    </div>
                `).join('')}
                <div class="settings-content__color-swatch settings-content__color-swatch--custom ${prefs.accent_color.startsWith('#') ? 'settings-content__color-swatch--active' : ''}" 
                     style="background-color: ${prefs.accent_color.startsWith('#') ? prefs.accent_color : 'transparent'}">
                     <svg viewBox="0 0 24 24" style="z-index: 5; fill: white; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); pointer-events: none;">
                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                     </svg>
                     <app-color-picker class="settings-content__swatch-picker" trigger-opacity="0" value="${prefs.accent_color.startsWith('#') ? prefs.accent_color : '#e8520e'}"
                            data-change="accent-picker"></app-color-picker>
                </div>
             </div>

            <div class="settings-content__flex-row settings-content__section-spacer">
                <!-- Dashboard Background -->
                <div class="settings-content__flex-col">
                    <label class="settings-content__label">${i18n.t('settings.dashboard_background')}</label>
                    <div class="settings-content__background-container" data-action="click-file" data-file="background-upload" role="button" tabindex="0" aria-label="${i18n.t('settings.dashboard_background')}">
                        <img class="settings-content__background-preview ${prefs.dashboard_background ? 'active' : ''}" 
                             src="${prefs.dashboard_background || ''}" alt="${i18n.t('settings.dashboard_background')}">
                        <div class="settings-content__background-placeholder ${prefs.dashboard_background ? 'hidden' : ''}">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            <span>${i18n.t('action.change_image')}</span>
                        </div>
                        ${prefs.dashboard_background ? `
                            <button class="settings-content__background-remove"
                                    data-action="remove-background"
                                    title="${i18n.t('settings.remove_background')}">
                                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>
                            </button>
                        ` : ''}
                    </div>
                    <input type="file" id="background-upload" style="display: none;" accept="image/*" data-change="background">
                    <p style="font-size: 10px; color: var(--text-dim); margin: 4px 0 0 0;">${i18n.t('settings.background_size_hint')}</p>
                </div>

                <div class="settings-content__flex-col">
                    <div class="settings-content__form-group" style="margin-bottom: 0;">
                        <label class="settings-content__label">${i18n.t('settings.theme')}</label>
                        <div class="settings-content__segmented-control">
                            <button class="settings-content__segment ${!prefs.theme || prefs.theme === 'dark' ? 'active' : ''}"
                                    data-action="set-theme" data-theme="dark">
                                🌙 ${i18n.t('settings.dark')}
                            </button>
                            <button class="settings-content__segment ${prefs.theme === 'light' ? 'active' : ''}"
                                    data-action="set-theme" data-theme="light">
                                ☀️ ${i18n.t('settings.light')}
                            </button>
                            <button class="settings-content__segment ${prefs.theme === 'system' ? 'active' : ''}"
                                    data-action="set-theme" data-theme="system">
                                🖥️ ${i18n.t('settings.theme_system')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

// One card per topic, each titled after what it holds: the panel's identity,
// its language/units, and its grid.
export const personalizationTemplate = (prefs: Prefs) => `
    <div class="bento-grid">
        <!-- Branding -->
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.project_name_and_logo')}</h3>

            <div class="settings-content__form-group" style="margin-bottom: 0;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <div style="position: relative; flex-shrink: 0;">
                        <button type="button" class="settings-logo-btn" data-action="open-logo-picker" title="${i18n.t('settings.project_logo')}">
                            <img src="${safeImageSrc(prefs.project_logo || '/images/logo.png')}" alt="" style="width:36px;height:36px;object-fit:contain;border-radius:4px;">
                        </button>
                        ${prefs.project_logo ? `
                        <button type="button" class="settings-logo-remove" data-action="remove-logo" title="${i18n.t('action.remove')}">×</button>
                        ` : ''}
                    </div>
                    <input type="text"
                           id="project-name-input"
                           class="settings-content__input"
                           value="${prefs.project_name || 'Lastboard'}"
                           placeholder="${i18n.t('app.title')}"
                           data-change="project-name">
                </div>
            </div>
        </div>

        <!-- Language & Region -->
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.personalization')}</h3>

            <div class="settings-content__form-group">
                <label class="settings-content__label">${i18n.t('settings.language')}</label>
                <app-select id="language-select" value="${prefs.language}"></app-select>
            </div>

            <div class="settings-content__form-group" style="margin-bottom: 0;">
                <label class="settings-content__label">${i18n.t('settings.unit_system')}</label>
                <app-select id="unit-system-select" value="${prefs.unit_system || 'metric'}"></app-select>
            </div>
        </div>

        <!-- Grid -->
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.grid_layout')}</h3>

            <div class="settings-content__personalization-grid">
                <div class="settings-content__slider-group">
                    <div class="settings-content__slider-header">
                        <label class="settings-content__slider-label">${i18n.t('settings.grid_columns')}</label>
                        <span class="settings-content__slider-value" id="val-grid_columns">${prefs.grid_columns || 12}</span>
                    </div>
                    <input type="range"
                           min="3" max="16" step="1"
                           value="${prefs.grid_columns || 12}"
                           data-input="update-columns"
                           data-change="commit-columns">
                </div>
            </div>
            
            <p class="settings-content__text-dim" style="font-size: 11px; margin-top: 24px; font-family: var(--font-mono);">
                ${i18n.t('settings.density_desc')}
            </p>
        </div>
    </div>
`;

export const usersTemplate = (users: any[]) => `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 class="settings-content__title" style="margin: 0;">${i18n.t('settings.users')}</h3>
                <app-button variant="primary" data-action="open-add-user" style="width: auto; padding: 0 16px;">+ ${i18n.t('action.add_user')}</app-button>
            </div>

            <div class="settings-content__user-list">
                ${(users || []).map(u => `
                    <div class="settings-content__user-item">
                        <div class="user-info">
                            <app-avatar
                                initials="${esc(u.username.substring(0, 2).toUpperCase())}"
                                src="${safeImageSrc(u.avatar_url || '')}"
                                style="margin: 0; width: 36px; height: 36px; font-size: 13px; border-radius: 50%; outline: 1px solid var(--border);">
                            </app-avatar>
                            <div class="user-details">
                                <div class="user-name">${esc(u.username)}</div>
                                <div class="user-role-tag">${esc(roleOrLabel(u.label, roleText(u.role)))}</div>
                                ${u.role?.toLowerCase() === 'admin' || !u.profile ? '' : `<div class="user-profile-name">${i18n.t('users.profile.' + u.profile)}</div>`}
                            </div>
                        </div>
                        <div class="user-actions">
                             ${u.role?.toLowerCase() === 'admin' ? '' : `<button class="user-action-btn edit" data-action="edit-user" data-user-id="${u.id}" title="${i18n.t('general.edit')}">
                                ${ICON_EDIT}
                             </button>`}
                             <button class="user-action-btn delete" data-action="delete-user" data-user-id="${u.id}" title="${i18n.t('general.delete')}">
                                ${ICON_TRASH}
                             </button>
                        </div>
                    </div>
                `).join('')}
            </div>
             ${(users || []).length === 0 ? `<p class="settings-content__text-dim">${i18n.t('settings.no_users')}</p>` : ''}
        </div>
    </div>
    
    ${userDialogTemplate(t, pwToggle())}
`;

/**
 * Monitoring and its alerts, in one section.
 *
 * They used to be two entries in the sidebar, which left Alerts as a screen
 * with a single switch on it while Monitoring carried everything else. They
 * are one subject — alerts only mean anything with 24/7 recording on, and the
 * docs already treat them together — so they are one section with two cards.
 *
 * Within each card the settings that save themselves come first and the
 * buttons after, separated: a switch that takes effect as you flip it and a
 * button that deletes your history should not look like the same kind of
 * thing.
 */
export const monitoringTemplate = (monitoring: {
    mode: string; interval_sec: number; alerts_enabled: boolean;
    notify_type: string; notify_url: string; notify_has_token: boolean; fail_threshold: number;
}, loaded: boolean, failed: boolean, mayAlert = true) => {
    // Until the server has answered there is nothing true to draw. The switches
    // used to be painted from the placeholder, so this section claimed 24/7 and
    // alerts were off before it knew — and a switch flipped in that window saved
    // that claim over the real configuration.
    if (!loaded) {
        return `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.monitoring')}</h3>
            <p class="settings-content__text-dim" style="font-size:13px;margin:0;">
                ${failed ? i18n.t('settings.monitoring_unavailable') : i18n.t('general.loading')}
            </p>
        </div>
    </div>
`;
    }
    const on24 = monitoring.mode === 'background';
    return `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.monitoring')}</h3>
            <div class="settings-content__action-group">
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.monitoring_mode')}</h3>
                        <p>${i18n.t('settings.monitoring_mode_desc')}</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="monitoring-toggle" data-change="monitoring-toggle" ${on24 ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                <!-- Hidden with a class, not with an inline display: an inline
                     "display: flex" here beat the row's own layout and left this
                     dropdown out of line with every other control. -->
                <div class="settings-content__action-row ${on24 ? '' : 'settings-content__action-row--hidden'}"
                     id="monitoring-interval-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.monitoring_interval')}</h3>
                    </div>
                    <app-select id="monitoring-interval" value="${monitoring.interval_sec}"></app-select>
                </div>
            </div>
            <div class="settings-content__action-group settings-content__action-group--actions">
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('monitor.overview_title')}</h3>
                    </div>
                    <app-button variant="primary" data-action="open-monitor-overview">${i18n.t('monitor.view_overview')}</app-button>
                </div>
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('monitor.clear_all')}</h3>
                        <p>${i18n.t('settings.monitoring_clear_desc')}</p>
                    </div>
                    <app-button data-action="clear-monitor-data" style="border-color: var(--danger-color); color: var(--danger-color); background: transparent;">${i18n.t('monitor.clear_data')}</app-button>
                </div>
            </div>
        </div>

        ${mayAlert ? `<div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.notifications')}</h3>
            ${!on24 ? `<p class="settings-content__text-dim" style="font-size:13px;margin:0 0 14px;">${i18n.t('settings.alerts_requires_247')}</p>` : ''}
            <div class="settings-content__action-group">
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.alerts')}</h3>
                        <p>${i18n.t('settings.alerts_desc')}</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="alerts-toggle" data-change="alerts-toggle" ${monitoring.alerts_enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                ${monitoring.alerts_enabled ? `
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.notify_method')}</h3>
                    </div>
                    <app-select id="notify-type" value="${esc(monitoring.notify_type)}"></app-select>
                </div>
                ${monitoring.notify_type && monitoring.notify_type !== 'none' ? `
                <div class="settings-content__form-group">
                    <label class="settings-content__label">${i18n.t('settings.notify_url')}</label>
                    <input type="text" id="notify-url" class="settings-content__input" data-change="notify-url" value="${esc(monitoring.notify_url)}" spellcheck="false" placeholder="${monitoring.notify_type === 'ntfy' ? 'https://ntfy.sh/mi-tema' : monitoring.notify_type === 'gotify' ? 'https://gotify.midominio.com' : 'https://…'}" />
                    <p class="settings-content__text-dim" style="font-size: 11px; margin: 5px 0 0 0;">${i18n.t('settings.notify_url_desc')}</p>
                </div>
                <div class="settings-content__form-group" style="margin-top: 14px;">
                    <label class="settings-content__label">${i18n.t('settings.notify_token')}</label>
                    <input type="password" id="notify-token" class="settings-content__input" data-change="notify-token" value="${monitoring.notify_has_token ? SECRET_MASK : ''}" spellcheck="false" autocomplete="new-password" placeholder="" />
                    <p class="settings-content__text-dim" style="font-size: 11px; margin: 5px 0 0 0;">${monitoring.notify_has_token ? i18n.t('settings.notify_token_saved') : i18n.t('settings.notify_token_desc')}</p>
                </div>
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.fail_threshold')}</h3>
                        <p>${i18n.t('settings.fail_threshold_desc')}</p>
                    </div>
                    <app-select id="fail-threshold" value="${monitoring.fail_threshold}"></app-select>
                </div>
                ` : ''}
                ` : ''}
            </div>
            ${monitoring.alerts_enabled && monitoring.notify_type && monitoring.notify_type !== 'none' ? `
            <div class="settings-content__action-group settings-content__action-group--actions">
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.notify_test')}</h3>
                    </div>
                    <app-button variant="primary" data-action="test-notify">${i18n.t('settings.notify_test_btn')}</app-button>
                </div>
            </div>` : ''}
        </div>` : ''}
    </div>
`;
};

/**
 * The connection to the hypervisor.
 *
 * Unlike the monitoring card, this one does not save on every keystroke: a
 * half-typed address plus a token is a credential sent to a host nobody meant
 * to name. The fields are collected and saved together, and the save is
 * followed by a real read, so the answer is not "saved" but "this is what the
 * token can see and do" — which is the only thing the operator wants to know.
 *
 * The secret is never drawn: the server does not send it back (proxmox.go says
 * why), so an empty box with a "stored" hint means "leave it alone".
 */
export interface PxSettingsHost {
    id: string; name: string; url: string; token_id: string;
    insecure: boolean; enabled: boolean; has_secret: boolean;
}

export type PxHostStatus = {
    state: 'idle' | 'testing' | 'ok' | 'error';
    nodes?: number; guests?: number; power?: boolean; key?: string;
};

/**
 * The hypervisors, as a list.
 *
 * They were a card each, with every field on screen at once, which turned four
 * connections into a page nobody could see the end of. This is the shape the
 * user list already uses here: a row you can read at a glance, and a dialog for
 * the moment you actually want to type.
 */
const proxmoxRow = (h: PxSettingsHost, i: number, status: PxHostStatus | undefined) => {
    const state = !h.enabled ? 'off'
        : status?.state === 'ok' ? 'up'
            : status?.state === 'error' ? 'bad' : 'idle';
    const note = !h.enabled ? i18n.t('settings.proxmox_off')
        : status?.state === 'ok'
            ? i18n.t('settings.proxmox_connected', { nodes: String(status.nodes ?? 0), guests: String(status.guests ?? 0) })
            : status?.state === 'error' ? i18n.t(status.key || 'proxmox.connection_error')
                : status?.state === 'testing' ? i18n.t('settings.proxmox_testing') : h.url;

    return `
    <div class="settings-content__row px-row">
        <span class="px-row__dot px-row__dot--${state}"></span>
        <div class="px-row__body">
            <div class="px-row__name">${esc(h.name || i18n.t('widget.proxmox.name'))}</div>
            <div class="px-row__note px-row__note--${state}">${esc(note)}</div>
        </div>
        <div class="user-actions">
            <button class="user-action-btn edit" data-action="edit-proxmox-host" data-index="${i}"
                    title="${esc(i18n.t('general.edit'))}" aria-label="${esc(i18n.t('general.edit'))}">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="user-action-btn delete" data-action="delete-proxmox-host" data-index="${i}"
                    title="${esc(i18n.t('action.remove'))}" aria-label="${esc(i18n.t('action.remove'))}">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
        </div>
    </div>`;
};

export const proxmoxTemplate = (
    px: { enabled: boolean; hosts: PxSettingsHost[] },
    loaded: boolean,
    failed: boolean,
    status: Record<string, PxHostStatus>,
) => {
    if (!loaded) {
        return `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('widget.proxmox.name')}</h3>
            <p class="settings-content__text-dim" style="font-size:13px;margin:0;">
                ${failed ? i18n.t('settings.proxmox_unavailable') : i18n.t('general.loading')}
            </p>
        </div>
    </div>
`;
    }

    const hosts = px.hosts || [];

    return `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; gap:12px;">
                <h3 class="settings-content__title" style="margin:0;">${i18n.t('widget.proxmox.name')}</h3>
                <app-button variant="primary" data-action="add-proxmox-host" style="width:auto; padding:0 16px;">+ ${i18n.t('settings.proxmox_add')}</app-button>
            </div>
            <p class="settings-content__text-dim" style="font-size: 13px; margin: -12px 0 16px;">${i18n.t('settings.proxmox_desc')}</p>

            <div class="settings-content__user-list">
                ${hosts.map((h, i) => proxmoxRow(h, i, status[h.id || String(i)])).join('')}
            </div>
            ${hosts.length === 0 ? `<p class="settings-content__text-dim">${i18n.t('settings.proxmox_none')}</p>` : ''}
        </div>
    </div>

    <dialog id="proxmox-modal" style="background: var(--paper-bg); backdrop-filter: var(--modal-blur); -webkit-backdrop-filter: var(--modal-blur); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 440px; max-width: calc(100vw - 32px);">
        <div class="modal-header">
            <h3 class="modal-title" id="proxmox-modal-title">${i18n.t('settings.proxmox_add')}</h3>
            <button class="modal-close" data-action="close-modal" data-modal="proxmox-modal" aria-label="${i18n.t('general.close')}">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>

        <input type="hidden" id="proxmox-edit-index" value="-1">

        <div class="settings-content__form-group">
            <label class="settings-content__label">${i18n.t('docker.host_name')}</label>
            <input type="text" id="proxmox-name" class="settings-content__input" spellcheck="false" placeholder="${esc(i18n.t('widget.proxmox.name'))}">
            <p class="settings-content__text-dim" style="font-size: 11px; margin: 5px 0 0 0;">${i18n.t('settings.proxmox_name_desc')}</p>
        </div>

        <div class="settings-content__form-group">
            <label class="settings-content__label">${i18n.t('settings.proxmox_url')}</label>
            <input type="text" id="proxmox-url" class="settings-content__input" spellcheck="false" placeholder="https://192.168.1.10:8006">
        </div>

        <div class="settings-content__form-group">
            <label class="settings-content__label">${i18n.t('settings.proxmox_token_id')}</label>
            <input type="text" id="proxmox-token-id" class="settings-content__input" spellcheck="false" placeholder="lastboard@pve!lastboard">
        </div>

        <div class="settings-content__form-group">
            <label class="settings-content__label">${i18n.t('settings.proxmox_secret')}</label>
            <input type="password" id="proxmox-secret" class="settings-content__input" value="" spellcheck="false" autocomplete="new-password" placeholder="00000000-0000-0000-0000-000000000000">
            <p class="settings-content__text-dim" style="font-size: 11px; margin: 5px 0 0 0;">${i18n.t('settings.proxmox_secret_desc')}</p>
        </div>

        <div class="settings-content__action-group">
            <div class="settings-content__action-row">
                <div class="settings-content__action-info">
                    <h3>${i18n.t('settings.proxmox_enabled')}</h3>
                    <p>${i18n.t('settings.proxmox_enabled_desc')}</p>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="proxmox-enabled">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="settings-content__action-row">
                <div class="settings-content__action-info">
                    <h3>${i18n.t('settings.proxmox_insecure')}</h3>
                    <p>${i18n.t('settings.proxmox_insecure_desc')}</p>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="proxmox-insecure">
                    <span class="slider"></span>
                </label>
            </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button variant="primary" data-action="save-proxmox-host">${i18n.t('general.save')}</app-button>
        </div>
    </dialog>
`;
};

/**
 * The Docker hosts of the account, as a list like the hypervisors above it.
 *
 * A widget only chooses among them, so this is the one place they are added,
 * renamed and switched off. A member can add only agents, which it reaches with
 * the agent's own token; the other kinds are the server's own position and the
 * administrator's.
 */
export type DockerRowStatus = {
    state: 'idle' | 'testing' | 'ok' | 'error';
    containers?: number; version?: string | null; key?: string;
};

const dockerTypeLabel = (type: string) =>
    i18n.t(type === 'agent' ? 'docker.host_tag_agent' : `docker.host_type_${type}`);

const dockerRow = (h: AccountDockerHost, i: number, status: DockerRowStatus | undefined) => {
    const state = !h.usable ? 'bad'
        : !h.enabled ? 'off'
            : status?.state === 'ok' ? 'up'
                : status?.state === 'error' ? 'bad' : 'idle';
    const note = !h.usable ? i18n.t('docker.admin_only')
        : !h.enabled ? i18n.t('settings.docker_off')
            : status?.state === 'ok'
                ? i18n.t('settings.docker_connected', { containers: String(status.containers ?? 0) }) + (status.version ? ` · ${status.version}` : '')
                : status?.state === 'error' ? i18n.t(status.key || 'docker.connection_error')
                    : status?.state === 'testing' ? i18n.t('settings.docker_testing')
                        : `${dockerTypeLabel(h.type)}${h.url ? ` · ${h.url}` : ''}`;

    return `
    <div class="settings-content__row px-row" data-docker-host="${esc(h.id)}">
        <span class="px-row__dot px-row__dot--${state}"></span>
        <div class="px-row__body">
            <div class="px-row__name">${esc(h.name || i18n.t('widget.docker.name'))}</div>
            <div class="px-row__note px-row__note--${state}">${esc(note)}</div>
        </div>
        <div class="user-actions">
            <button class="user-action-btn edit" data-action="edit-docker-host" data-index="${i}"
                    title="${esc(i18n.t('general.edit'))}" aria-label="${esc(i18n.t('general.edit'))}">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="user-action-btn delete" data-action="delete-docker-host" data-index="${i}"
                    title="${esc(i18n.t('action.remove'))}" aria-label="${esc(i18n.t('action.remove'))}">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
        </div>
    </div>`;
};

export const dockerTemplate = (
    dk: { admin: boolean; hosts: AccountDockerHost[] },
    loaded: boolean,
    failed: boolean,
    status: Record<string, DockerRowStatus>,
) => {
    if (!loaded) {
        return `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('widget.docker.name')}</h3>
            <p class="settings-content__text-dim" style="font-size:13px;margin:0;">
                ${failed ? i18n.t('settings.docker_unavailable') : i18n.t('general.loading')}
            </p>
        </div>
    </div>
`;
    }

    const hosts = dk.hosts || [];

    return `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; gap:12px;">
                <h3 class="settings-content__title" style="margin:0;">${i18n.t('widget.docker.name')}</h3>
                <app-button variant="primary" data-action="add-docker-host" style="width:auto; padding:0 16px;">+ ${i18n.t('docker.add_new_host')}</app-button>
            </div>
            <p class="settings-content__text-dim" style="font-size: 13px; margin: -12px 0 16px;">${i18n.t('settings.docker_hosts_desc')}</p>
            ${dk.admin ? '' : `<p class="settings-content__text-dim" style="font-size: 13px; margin: 0 0 16px;">${i18n.t('settings.docker_member_note')}</p>`}

            <div class="settings-content__user-list">
                ${hosts.map((h, i) => dockerRow(h, i, status[h.id])).join('')}
            </div>
            ${hosts.length === 0 ? `<p class="settings-content__text-dim">${i18n.t('settings.docker_none')}</p>` : ''}
        </div>
    </div>

    <dialog id="docker-modal" style="background: var(--paper-bg); backdrop-filter: var(--modal-blur); -webkit-backdrop-filter: var(--modal-blur); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 440px; max-width: calc(100vw - 32px);">
        <div class="modal-header">
            <h3 class="modal-title" id="docker-modal-title">${i18n.t('docker.add_new_host')}</h3>
            <button class="modal-close" data-action="close-modal" data-modal="docker-modal" aria-label="${i18n.t('general.close')}">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>

        <input type="hidden" id="docker-edit-index" value="-1">

        <div class="settings-content__form-group">
            <label class="settings-content__label">${i18n.t('docker.host_name')}</label>
            <input type="text" id="docker-name" class="settings-content__input" spellcheck="false" placeholder="${esc(i18n.t('docker.host_name_placeholder'))}">
        </div>

        <p class="settings-content__text-dim" id="docker-locked-note" style="font-size: 12px; margin: 0 0 16px; display: none;">${i18n.t('docker.admin_only')}</p>

        <div id="docker-connection">
            <div class="settings-content__form-group">
                <label class="settings-content__label">${i18n.t('docker.host_type')}</label>
                <app-select id="docker-type" value="agent"></app-select>
            </div>

            <div class="settings-content__form-group" id="docker-url-row">
                <label class="settings-content__label">${i18n.t('docker.host_url')}</label>
                <input type="text" id="docker-url" class="settings-content__input" spellcheck="false" placeholder="192.168.1.100:9091">
            </div>

            <div class="settings-content__form-group" id="docker-token-row">
                <label class="settings-content__label">${i18n.t('docker.host_token')}</label>
                <input type="password" id="docker-token" class="settings-content__input" value="" spellcheck="false" autocomplete="new-password" placeholder="${esc(i18n.t('docker.host_token_placeholder'))}" data-secret>
                <p class="settings-content__text-dim" style="font-size: 11px; margin: 5px 0 0 0;">${i18n.t('settings.docker_token_desc')}</p>
            </div>
        </div>

        <div class="settings-content__action-group">
            <div class="settings-content__action-row">
                <div class="settings-content__action-info">
                    <h3>${i18n.t('settings.docker_enabled')}</h3>
                    <p>${i18n.t('settings.docker_enabled_desc')}</p>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="docker-enabled">
                    <span class="slider"></span>
                </label>
            </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button variant="primary" data-action="save-docker-host">${i18n.t('general.save')}</app-button>
        </div>
    </dialog>
`;
};

/**
 * Where your icons come from.
 *
 * This card is always here, and that is the point. It used to be drawn only
 * when something was outstanding, which meant a board with nothing pending
 * showed nothing at all — and "nothing to do" looked exactly like "this
 * feature doesn't exist". You could not tell whether opening your dashboard
 * still asked a CDN for the pictures, which is the one question the whole
 * feature exists to answer.
 *
 * So it states the count either way: how many are served from here, and how
 * many are not. The button only appears when there is something to press.
 */
const iconsCard = (pending: number, local: number, busy: boolean) => {
    const outstanding = pending > 0;
    return `
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.icons_local')}</h3>
            <p class="settings-content__text-dim" style="font-size: 13px; margin: -6px 0 16px;">${i18n.t('settings.icons_local_desc')}</p>
            <div class="settings-content__action-group">
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${outstanding
            ? i18n.t('settings.icons_pending', { count: String(pending) })
            : i18n.t('settings.icons_all_local', { count: String(local) })}</h3>
                        <p>${outstanding
            ? i18n.t('settings.icons_pending_desc')
            : i18n.t('settings.icons_all_local_desc')}</p>
                    </div>
                    ${outstanding ? `
                    <app-button variant="primary" data-action="localize-icons" ${busy ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                        ${busy ? i18n.t('settings.icons_storing') : i18n.t('action.store_icons')}
                    </app-button>` : ''}
                </div>
            </div>
        </div>`;
};

/**
 * What a section of Data the account sees. The backup and its restore are the
 * whole server's, so they are the administrator's; storing icons and moving
 * boards are the account's own, each with its permission.
 */
export interface DataSections {
    backup: boolean;
    icons: boolean;
    transfer: boolean;
}

export const dataTemplate = (pendingIcons = 0, localIcons = 0, storingIcons = false,
    show: DataSections = { backup: true, icons: true, transfer: true }) => `
    <div class="bento-grid" style="grid-template-columns: 1fr;">

        ${show.icons ? iconsCard(pendingIcons, localIcons, storingIcons) : ''}

        ${show.backup ? `<!-- Full backup (Lastboard-only, restore is destructive) -->
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.backup_full')}</h3>
            <p class="settings-content__text-dim" style="font-size: 13px; margin: -6px 0 16px;">${i18n.t('settings.backup_full_desc')}</p>
            <div class="settings-content__action-group">
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.export_db')}</h3>
                    </div>
                    <app-button variant="primary" data-action="download-backup">
                        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                        ${i18n.t('action.download_backup')}
                    </app-button>
                </div>
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.import_db')}</h3>
                        <p><span style="color: var(--danger-color); font-weight: 600;">${i18n.t('settings.restore_overwrite_warn')}</span></p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="file" id="backup-upload" accept=".json" style="display: none;" data-change="restore-backup">
                        <app-button data-action="click-file" data-file="backup-upload" style="border-color: var(--danger-color); color: var(--danger-color); background: transparent;">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>
                            ${i18n.t('action.select_file')}
                        </app-button>
                    </div>
                </div>
            </div>
        </div>` : ''}

        ${show.transfer ? `<!-- Portable dashboards import/export (safe: creates new) -->
        <div class="bento-card">
            <h3 class="settings-content__title">${i18n.t('settings.import_export')}</h3>
            <p class="settings-content__text-dim" style="font-size: 13px; margin: -6px 0 16px;">${i18n.t('settings.import_creates_new')}</p>
            <div class="settings-content__action-group">
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.export_native')}</h3>
                    </div>
                    <app-button variant="primary" data-action="export-native">${i18n.t('settings.export_native_btn')}</app-button>
                </div>
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.import_dashboards')}</h3>
                        <p>${i18n.t('settings.import_dashboards_desc')}</p>
                    </div>
                    <app-select id="import-format" value="native"></app-select>
                </div>
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${i18n.t('settings.import_file')}</h3>
                    </div>
                    <input type="file" id="import-file" accept=".yaml,.yml" style="display: none;" data-change="import-file">
                    <app-button data-action="click-file" data-file="import-file">${i18n.t('action.select_file')}</app-button>
                </div>
            </div>
        </div>` : ''}
    </div>
`;

export const advancedTemplate = () => `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <!-- Danger Zone -->
        <div class="settings-content__danger-zone">
             <div>
                <div class="settings-content__danger-title">
                    <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:var(--danger-color);display:block;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    </span>
                    ${i18n.t('settings.factory_reset')}
                </div>
                <p class="settings-content__text-dim" style="font-size: 13px; color: var(--danger-color); opacity: 0.8;">
                    ${i18n.t('settings.reset_desc')}
                </p>
             </div>
             <app-button data-action="factory-reset" style="border-color: var(--danger-color); color: var(--danger-color); background: transparent; transition: all 0.2s;">
                ${i18n.t('action.reset_system')}
             </app-button>
        </div>
    </div>
`;

export const updateStatusTemplate = (isAdmin: boolean, updateInfo: any) => {
    if (!isAdmin) return '';
    if (!updateInfo) return '';

    if (updateInfo.is_docker) {
        return `
            <div style="background: rgba(var(--info-rgb), 0.1); border: 1px solid rgba(var(--info-rgb), 0.3); padding: 16px; border-radius: var(--radius); width: 100%; text-align: left;">
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                    <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: var(--accent); flex-shrink: 0;"><path d="M21 12l-4.37-6.16c-.37-.52-.98-.84-1.63-.84h-3V4c0-1.1-.9-2-2-2s-2 .9-2 2v1H5c-.65 0-1.26.32-1.63.84L-1 12v3h2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h2v-3zm-11 7H7v-3h3v3zm-5 0H2v-3h3v3zm12 0h-3v-3h3v3z"/></svg>
                    <div>
                        <h4 style="margin: 0 0 4px 0; font-size: 14px; color: var(--text-main);">${i18n.t('settings.docker_mode')}</h4>
                        <p style="margin: 0; font-size: 13px; color: var(--text-dim);">
                            ${i18n.t('settings.docker_desc')}<br>
                            ${updateInfo.available ? `<strong style="color: var(--accent);">${i18n.t('settings.new_version_notif')} (${updateInfo.latest_version})</strong>` : i18n.t('settings.up_to_date_docker_msg')}
                        </p>
                    </div>
                    </div>
            </div>
        `;
    }

    // The check could not be made. Said as a warning, never as "up to date":
    // that is the one thing a failed check must not say.
    if (updateInfo.check_error) {
        return `
        <div style="color: var(--warning-color); font-size: 14px; display: flex; align-items: center; gap: 8px; font-weight: 500;">
            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
            <span>${esc(i18n.t(updateInfo.check_error))}</span>
        </div>
    `;
    }

    if (updateInfo.available) {
        return `
            <div class="update-modal">
                <div class="update-modal__glow"></div>
                
                <div class="update-modal__content">
                    <div class="update-modal__header">
                        <div class="update-modal__badge">${i18n.t('settings.update_available')}</div>
                        <h3 class="update-modal__version">${updateInfo.latest_version}</h3>
                    </div>
                    
                    <!-- One button, one decision. What's New used to sit here as
                         well as in the dialog this opens, so you were offered the
                         same link twice in two steps; it belongs with the install
                         confirmation, where reading it can still change your mind. -->
                    <div class="update-modal__footer">
                        <app-button variant="primary" id="btn-update-now" style="flex: 1; justify-content: center;" data-action="perform-update" data-asset-url="${esc(updateInfo.asset_url)}">
                            ${i18n.t('action.update_now')}
                        </app-button>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div style="color: var(--success-color); font-size: 14px; display: flex; align-items: center; gap: 8px; font-weight: 500;">
            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <span>${i18n.t('settings.up_to_date')}</span>
        </div>
    `;
};

export const updateZoneTemplate = (isAdmin: boolean, updateInfo: any, isCheckingUpdates: boolean) => {
    return `
        <div id="update-status-container" style="display: inline-flex; flex-direction: column; gap: 16px; align-items: center; width: 100%; max-width: 480px; min-height: 48px;">
            ${updateStatusTemplate(isAdmin, updateInfo)}
        </div>

        ${isAdmin ? `
        <div style="margin-top: 16px;">
            <app-button variant="ghost"
                        id="btn-check-updates"
                        ?loading="${isCheckingUpdates}"
                        data-action="check-updates">
                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                ${i18n.t('action.check_updates')}
            </app-button>
        </div>
        ` : ''}
    `;
};

export const aboutTemplate = (version: string, updateInfo: any, role: string, betaUpdates: boolean, isCheckingUpdates: boolean) => {
    const isAdmin = role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'administrator';
    return `
    <div>
        <div class="bento-grid" style="grid-template-columns: 1fr;">
            <div class="bento-card settings-content__about-card">
                <img src="/images/logo.png" alt="Lastboard" class="settings-content__about-logo">
                <h2 class="settings-content__about-name">${i18n.t('app.title')}</h2>
                <p id="current-version-label" class="settings-content__about-version">${version || '…'}</p>

                <div id="update-zone-wrapper" class="settings-content__about-update">
                    ${updateZoneTemplate(isAdmin, updateInfo, isCheckingUpdates)}
                </div>
            </div>

            ${isAdmin ? `
            <!-- The beta switch used to float over the corner of the card above,
                 detached from anything and overlapping its edge. It is a setting
                 like any other, so it sits in a row like any other. -->
            <div class="bento-card">
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3 id="beta-text">${i18n.t('settings.beta_tester')}</h3>
                        <p>${i18n.t('settings.beta_updates_desc')}</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="beta-updates-toggle-badge" data-change="beta-toggle" ${betaUpdates ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            ` : ''}

             <div class="settings-content__about-links">
                 <a href="https://git.codigosh.com/CodigoSH/Lastboard" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                     <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
                     ${i18n.t('settings.github')}
                 </a>
                 <a href="https://support.codigosh.com/codigosh/lastboard" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                     <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                     ${i18n.t('action.support')}
                 </a>
                 <a href="https://opencollective.com/codigosh" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                     <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                     ${i18n.t('action.donate')}
                 </a>
             </div>
         </div>
     </div>
        `;
};
