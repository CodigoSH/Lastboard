import { i18n } from '../../../services/i18n';
import { userStore } from '../../../store/userStore';
import { accountTemplate, themeTemplate, personalizationTemplate } from './SettingsContent.template';
// @ts-ignore
import css from './SettingsContent.css' with { type: 'text' };

class SettingsContent extends HTMLElement {
    prefs: { accent_color: string; language: string;[key: string]: any };

    static get observedAttributes() {
        return ['section'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.prefs = {
            accent_color: '#0078D4',
            language: 'en'
        };
    }

    connectedCallback() {
        this.fetchPrefs();
        this.render();
    }

    async fetchPrefs() {
        // @ts-ignore
        const u = userStore.getUser();
        if (u) {
            this.prefs = {
                ...(u.preferences || {}),
                accent_color: u.preferences?.accent_color || '#0078D4',
                language: u.preferences?.language || 'en'
            };
            this.render();
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'section' && oldValue !== newValue) {
            this.render();
        }
    }

    // --- Logic Layer Delegates ---

    async savePrefs(newPrefs: any) {
        this.prefs = { ...this.prefs, ...newPrefs };

        if (newPrefs.accent_color) {
            this.applyAccent(newPrefs.accent_color);
        }
        if (newPrefs.language) {
            // @ts-ignore
            i18n.load(newPrefs.language);
        }

        // @ts-ignore
        await userStore.updatePreferences(newPrefs);
        this.render();
    }

    applyAccent(color: string) {
        if (color && color.startsWith('#')) {
            document.documentElement.style.setProperty('--accent', color);
            return;
        }
        const colorMap: Record<string, string> = {
            'blue': '#228be6', 'indigo': '#4c6ef5', 'cyan': '#15aabf',
            'teal': '#12b886', 'orange': '#fd7e14', 'red': '#fa5252', 'grape': '#be4bdb'
        };
        const hex = colorMap[color] || '#0078D4';
        document.documentElement.style.setProperty('--accent', hex);
    }

    updateGridPref(key: string, value: string) {
        const valSpan = this.shadowRoot!.getElementById(`val-${key}`);
        if (valSpan) valSpan.textContent = value;

        const cssVarMap: Record<string, string> = {
            'grid_columns_pc': '--grid-columns-pc',
            'grid_columns_tablet': '--grid-columns-tablet',
            'grid_columns_mobile': '--grid-columns-mobile'
        };
        if (cssVarMap[key]) {
            document.documentElement.style.setProperty(cssVarMap[key], value);
        }
    }

    commitGridPref(key: string, value: string) {
        // @ts-ignore
        userStore.updatePreferences({ [key]: parseInt(value) });
    }

    async updateUsername(newUsername: string) {
        // @ts-ignore
        await userStore.updateProfile({ username: newUsername });
        // @ts-ignore
        if (window.notifier) window.notifier.show('Username updated');
    }

    updatePassword(newPassword: string) {
        // Logic moved to service/store in future phases
        // @ts-ignore
        if (window.notifier) window.notifier.show('Password update initiated');
    }

    // --- Rendering ---

    getContent(section: string) {
        // @ts-ignore
        const user = userStore.getUser() || { preferences: {} };

        switch (section) {
            case 'account':
                return accountTemplate(user);

            case 'theme': {
                const colorMap: Record<string, string> = {
                    'blue': '#228be6', 'indigo': '#4c6ef5', 'cyan': '#15aabf',
                    'teal': '#12b886', 'orange': '#fd7e14', 'red': '#fa5252', 'grape': '#be4bdb'
                };
                const colors = Object.keys(colorMap);
                const languages = [
                    { code: 'en', name: 'English' }, { code: 'es', name: 'Español' }, { code: 'fr', name: 'Français' },
                    { code: 'de', name: 'Deutsch' }, { code: 'it', name: 'Italiano' }, { code: 'pt', name: 'Português' },
                    { code: 'ru', name: 'Русский' }, { code: 'ja', name: '日本語' }, { code: 'zh', name: '中文' },
                    { code: 'ko', name: '한국어' }
                ];
                return themeTemplate(this.prefs, colorMap, colors, languages);
            }

            case 'personalization': {
                const sliderConfigs = [
                    { label: 'PC Columns', key: 'grid_columns_pc', min: 4, max: 12 },
                    { label: 'Tablet Columns', key: 'grid_columns_tablet', min: 2, max: 6 },
                    { label: 'Mobile Columns', key: 'grid_columns_mobile', min: 1, max: 3 }
                ];
                return personalizationTemplate(this.prefs, sliderConfigs);
            }

            default:
                return `<div class="bento-card"><h3>${section}</h3><p class="settings-content__text-dim">Configuration module.</p></div>`;
        }
    }

    render() {
        // CSS is already safely available as string via import
        this.shadowRoot!.innerHTML = `
        <style>${css}</style>
        <div class="fade-in">
            ${this.getContent(this.getAttribute('section') || 'account')}
        </div>
    `;

        this.shadowRoot!.querySelectorAll('.settings-content__checkbox').forEach(cb => {
            cb.addEventListener('click', () => cb.classList.toggle('settings-content__checkbox--checked'));
        });
    }
}

if (!customElements.get('settings-content')) {
    customElements.define('settings-content', SettingsContent);
}
