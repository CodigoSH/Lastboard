/**
 * Settings Content Templates
 */

interface User {
    initials?: string;
    avatar_url?: string;
    username?: string;
    role?: string;
}

interface Prefs {
    accent_color: string;
    language: string;
    [key: string]: any;
}

export const accountTemplate = (user: User) => `
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">Profile / Identity</div>
            <div class="settings-content__profile-header">
                <div class="settings-content__avatar-container" style="cursor: pointer;" onclick="this.nextElementSibling.click()">
                    <app-avatar initials="${user.initials || '??'}" src="${user.avatar_url || ''}" style="width: 80px; height: 80px; font-size: 32px;"></app-avatar>
                    <div class="settings-content__edit-overlay">Change Image</div>
                </div>
                <input type="file" id="avatar-upload" style="display: none;" accept="image/*">
                <div class="settings-content__profile-info">
                    <span class="settings-content__profile-name">${user.username || 'User'}</span>
                    <span class="mono-tag">${user.role || 'Administrator'}</span>
                </div>
            </div>
            
            <div class="settings-content__form-container" style="margin-top: 32px;">
                <div class="settings-content__form-group">
                    <label class="settings-content__label">Display Username</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="username-input" class="settings-content__input" value="${user.username || ''}" placeholder="Enter new username">
                        <app-button onclick="this.getRootNode().host.updateUsername(document.getElementById('username-input').value)">Update</app-button>
                    </div>
                </div>
            </div>
        </div>

        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">Security / Authentication</div>
            <h3 class="settings-content__title">System Password</h3>
            <div class="settings-content__form-group">
                <label class="settings-content__label">New Password</label>
                <input type="password" id="new-password" class="settings-content__input" placeholder="••••••••">
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">Confirm Password</label>
                <input type="password" id="confirm-password" class="settings-content__input" placeholder="••••••••">
            </div>
            <div style="margin-top: 32px;">
                <app-button variant="primary" onclick="this.getRootNode().host.updatePassword(document.getElementById('new-password').value)">Reset Password</app-button>
            </div>
        </div>
    </div>
`;

export const themeTemplate = (prefs: Prefs, colorMap: Record<string, string>, colors: string[], languages: { code: string, name: string }[]) => `
    <div class="bento-grid">
        <div class="bento-card">
             <div class="mono-tag" style="margin-bottom: 8px;">Hardware/Colors</div>
             <h3 class="settings-content__title">Studio Accent</h3>
             <div class="settings-content__color-grid">
                ${colors.map(c => `
                    <div class="settings-content__color-swatch ${prefs.accent_color === c ? 'settings-content__color-swatch--active' : ''}" 
                         style="background-color: ${colorMap[c]}"
                         onclick="this.getRootNode().host.savePrefs({accent_color: '${c}'})">
                         ${prefs.accent_color === c ? '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>' : ''}
                    </div>
                `).join('')}
                <div class="settings-content__color-swatch settings-content__color-swatch--custom ${prefs.accent_color.startsWith('#') ? 'settings-content__color-swatch--active' : ''}" 
                     style="background-color: ${prefs.accent_color.startsWith('#') ? prefs.accent_color : '#333'}">
                     <svg viewBox="0 0 24 24" style="opacity: 0.8; fill: ${prefs.accent_color.startsWith('#') ? '#fff' : 'rgba(255,255,255,0.4)'};">
                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                     </svg>
                     <input type="color" class="settings-content__swatch-picker" value="${prefs.accent_color.startsWith('#') ? prefs.accent_color : '#0078D4'}" 
                            onchange="this.getRootNode().host.savePrefs({accent_color: this.value})">
                </div>
             </div>
        </div>

        <div class="bento-card">
            <div class="mono-tag settings-content__section-spacer" style="margin-bottom: 8px;">System/Locale</div>
            <h3 class="settings-content__title">Localization</h3>
            <div class="settings-content__form-group">
                <label class="settings-content__label">Interface Language</label>
                <select class="settings-content__select" onchange="this.getRootNode().host.savePrefs({language: this.value})">
                    ${languages.map(l => `<option value="${l.code}" ${prefs.language === l.code ? 'selected' : ''}>${l.name}</option>`).join('')}
                </select>
            </div>
        </div>
    </div>
`;

export const personalizationTemplate = (prefs: Prefs, sliderConfigs: { label: string, key: string, min: number, max: number }[]) => `
    <div class="bento-grid">
        <div class="bento-card" style="grid-column: span 2;">
            <div class="mono-tag" style="margin-bottom: 12px;">Interface / Grid Architecture</div>
            <div class="settings-content__personalization-grid">
                ${sliderConfigs.map(cfg => `
                    <div class="settings-content__slider-group">
                        <div class="settings-content__slider-header">
                            <label class="settings-content__slider-label">${cfg.label}</label>
                            <span class="settings-content__slider-value" id="val-${cfg.key}">${prefs[cfg.key] || cfg.min}</span>
                        </div>
                        <input type="range" 
                               min="${cfg.min}" max="${cfg.max}" 
                               value="${prefs[cfg.key] || cfg.min}"
                               oninput="this.getRootNode().host.updateGridPref('${cfg.key}', this.value)"
                               onchange="this.getRootNode().host.commitGridPref('${cfg.key}', this.value)">
                    </div>
                `).join('')}
            </div>
            <p class="settings-content__text-dim" style="font-size: 11px; margin-top: 24px; font-family: var(--font-mono);">
                > Adaptive hardware acceleration active. Changes apply globally.
            </p>
        </div>
    </div>
`;
