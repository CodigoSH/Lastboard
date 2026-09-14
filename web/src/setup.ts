import './components/ui/Paper/Paper';
import { resizeImage } from './services/image';
import './components/ui/Button/Button';
import './components/ui/Avatar/Avatar';
import './components/ui/Notifier/Notifier';
import './components/ui/Select/Select';
import { i18n } from './services/i18n';
import { bootstrap } from './core/bootstrap';
import { ThemeService, asThemeChoice } from './services/ThemeService';
import { setupPasswordToggles } from './services/passwordToggle';

bootstrap(async () => {
    setupPasswordToggles(document.body);
    // --- State ---
    let currentStep = 1;
    const TOTAL_STEPS = 3;
    let selectedAvatar = '/images/default-avatar.svg';

    // --- Elements ---
    const container = document.querySelector('.setup-container') as HTMLElement;
    const nextBtn = document.getElementById('nextBtn') as HTMLElement;
    const backBtn = document.getElementById('backBtn') as HTMLElement;
    const feedback = document.getElementById('feedback') as HTMLElement;

    // Inputs
    const languageSelect = document.getElementById('language') as HTMLSelectElement;
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const pwdInput = document.getElementById('password') as HTMLInputElement;
    const confirmInput = document.getElementById('confirmPassword') as HTMLInputElement;
    const themeBtns = {
        light: document.getElementById('themeLight'),
        dark: document.getElementById('themeDark'),
        system: document.getElementById('themeSystem')
    };

    // --- 1. Init Language & Theme ---
    const availableLocales = i18n.getAvailableLocales();
    let browserLang = navigator.language.split('-')[0];
    // Check if browserLang supported
    if (!availableLocales.find(l => l.code === browserLang)) browserLang = 'en';

    // Populate Lang Dropdown
    if (languageSelect) {
        // Cast to any to access custom properties since we don't have global types set up perfectly here yet
        const appSelect = languageSelect as any;

        appSelect.options = availableLocales.map(loc => ({
            value: loc.code,
            label: `${loc.flag} ${loc.name}`
        }));

        appSelect.value = browserLang;
        i18n.setLanguage(browserLang);

        languageSelect.addEventListener('change', (e: Event) => {
            // AppSelect emits custom event with detail, but also updates .value
            const val = (e.target as any).value;
            i18n.setLanguage(val);
            localize();
        });
    }

    // Init Theme Logic
    ThemeService.init();

    // Mark the stored choice, not the resolved one: somebody who picked
    // "system" on a light device should see "system" highlighted, not "light".
    const markSelected = (mode: string) => {
        Object.entries(themeBtns).forEach(([key, btn]) => {
            if (btn) btn.classList.toggle('selected', key === mode);
        });
    };
    markSelected(ThemeService.stored());

    function setTheme(mode: string) {
        markSelected(mode);
        ThemeService.apply(asThemeChoice(mode));
    }

    Object.entries(themeBtns).forEach(([mode, btn]) => {
        if (btn) btn.addEventListener('click', () => setTheme(mode));
    });

    // --- 2. Avatar Picker ---
    // Avatar Upload Logic
    const avatarInput = document.getElementById('avatarInput') as HTMLInputElement;
    const avatarTrigger = document.getElementById('avatarTrigger');
    const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;
    const avatarUrlInput = document.getElementById('avatarUrl') as HTMLInputElement;

    if (avatarTrigger && avatarInput) {
        avatarTrigger.addEventListener('click', () => avatarInput.click());

        avatarInput.addEventListener('change', async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                // Same 256px as the settings panel. Without this the wizard sent
                // the file untouched, so the very first picture anybody chooses
                // was the only one that went in at full size.
                const resized = await resizeImage(file, 256, 256);
                avatarPreview.setAttribute('src', resized);
                avatarUrlInput.value = resized;
                selectedAvatar = resized;
            } catch {
                // A picture the browser cannot decode leaves the previous one.
            }
        });
    }

    // --- Localize Function ---
    const localize = () => {
        // setText helper handles null checks automatically
        const setText = (id: string, key: string) => {
            const el = document.getElementById(id);
            if (el) el.textContent = i18n.t(key);
        };

        setText('pageSubtitle', 'setup.subtitle');

        // Inputs labels
        const setLabel = (id: string, key: string) => {
            const l = document.querySelector(`label[for="${id}"]`);
            if (l) l.textContent = i18n.t(key);
        };

        setLabel('language', 'settings.language');
        setLabel('username', 'setup.root_user');
        setLabel('password', 'settings.new_password');
        setLabel('confirmPassword', 'settings.confirm_password');

        setText('lblInterfaceTheme', 'setup.interface_theme');
        setText('lblThemeLight', 'settings.light');
        setText('lblThemeDark', 'settings.dark');
        setText('lblThemeSystem', 'settings.theme_system');

        setText('summaryKeyLang', 'settings.language');
        setText('summaryKeyTheme', 'settings.theme');
        setText('summaryKeyAdmin', 'setup.summary_admin');

        // Buttons
        if (currentStep === 3) nextBtn.textContent = i18n.t('setup.create_admin');
        else nextBtn.textContent = i18n.t('general.next');

        if (backBtn) backBtn.textContent = i18n.t('general.back');

        document.querySelectorAll('.pw-toggle').forEach(btn => {
            btn.setAttribute('aria-label', i18n.t('auth.toggle_password'));
        });

        // Dynamic Texts
        setText('changeImageText', 'action.change_image');
        setText('readyMsg', 'setup.ready_msg');
    };
    i18n.subscribe(localize);
    localize();

    // --- Wizard Logic ---

    function updateWizard() {
        // 1. Progress Bar
        const fill = document.getElementById('progressFill');
        if (fill) fill.style.width = `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%`;

        // 2. Dots
        document.querySelectorAll('.step-dot').forEach(d => {
            const step = parseInt(d.getAttribute('data-step') || '0');
            d.classList.remove('active', 'completed');
            if (step === currentStep) d.classList.add('active');
            if (step < currentStep) d.classList.add('completed');
        });

        // 3. Sections
        document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
        document.getElementById(`step${currentStep}`)?.classList.add('active');

        // 4. Buttons
        if (backBtn) backBtn.style.display = currentStep === 1 ? 'none' : 'block';
        // Ensure Back button text is always correct when switching steps
        backBtn.textContent = i18n.t('general.back');

        const nextText = i18n.t('general.next');
        nextBtn.textContent = currentStep === TOTAL_STEPS
            ? i18n.t('setup.create_admin')
            : nextText;

        // 5. Populate Summary (if Step 3)
        if (currentStep === 3) {
            try {
                // Language
                const currentLocale = i18n.getLocale();
                if (currentLocale) {
                    document.getElementById('summaryLang')!.textContent = `${currentLocale.flag} ${currentLocale.name}`;
                }

                // Theme
                let theme = i18n.t('settings.system');
                if (themeBtns.light?.classList.contains('selected')) theme = i18n.t('settings.light');
                if (themeBtns.dark?.classList.contains('selected')) theme = i18n.t('settings.dark');
                document.getElementById('summaryTheme')!.textContent = theme;

                // Username
                document.getElementById('summaryUser')!.textContent = usernameInput.value || 'admin';
            } catch (e) {
                console.error("Error updating summary:", e);
            }
        }

        // Clear errors
        feedback.style.display = 'none';
        nextBtn.removeAttribute('disabled');
    }

    function validateCurrentStep(): boolean {
        feedback.style.display = 'none';

        if (currentStep === 1) return true; // Always valid?

        if (currentStep === 2) {
            const u = usernameInput.value.trim();
            const p = pwdInput.value;
            const c = confirmInput.value;

            if (u.length < 2) {
                notify(i18n.t('setup.error_username'), 'error');
                return false;
            }
            if (p.length < 4) {
                notify(i18n.t('setup.error_password'), 'error');
                return false;
            }
            if (p !== c) {
                notify(i18n.t('notifier.password_mismatch') || "Passwords do not match", 'error');
                return false;
            }
            return true;
        }

        return true;
    }

    // Handlers
    nextBtn.addEventListener('click', async () => {
        if (!validateCurrentStep()) return;

        if (currentStep < TOTAL_STEPS) {
            currentStep++;
            updateWizard();
        } else {
            // FINISH
            await submitSetup();
        }
    });

    backBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateWizard();
        }
    });

    // Enter Key Support (Global)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nextBtn.click();
        }
    });

    // --- Notifier Helper ---
    function notify(msg: string, type: 'success' | 'error' = 'success') {
        if (window.notifier) window.notifier.show(msg, type);
    }

    // --- Submit Logic ---
    async function submitSetup() {
        nextBtn.textContent = i18n.t('setup.creating');
        nextBtn.setAttribute('disabled', 'true');

        // Gather Data. Read the stored choice rather than the highlighted card:
        // the two agree, and only one of them survives somebody adding a fourth
        // card without touching this.
        const theme = ThemeService.stored();

        // Fix Default Avatar Persistence
        // If selectedAvatar is the generic Proxmox one (or any initial default), keep it.
        // It is initialized to '...proxmox.png' but we want our local default if meaningful.
        // Actually, user said "al no seleccionar ... ha guardado la imagen por defecto y aparece texto".
        // This implies backend received empty string.
        // We ensure `selectedAvatar` is never empty.
        // Let's use our local default SVG if the current value is external and we want local preference?
        // User asked "default avatar" -> "/images/default-avatar.svg"
        // Let's set the initial value to that instead of proxmox.png in the variable declaration (Line 12).

        const payload = {
            username: usernameInput.value.trim(),
            password: pwdInput.value,
            language: languageSelect.value,
            theme: theme,
            avatar_url: selectedAvatar
        };

        try {
            const response = await fetch('/api/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                localStorage.setItem('lastboard_lang', payload.language);
                nextBtn.textContent = i18n.t('setup.welcome_admin');
                nextBtn.style.backgroundColor = 'var(--accent-alt, #00f5a0)';

                notify(i18n.t('setup.welcome_admin'), 'success');

                setTimeout(() => window.location.href = '/', 1000);
            } else {
                const errorKey = (await response.text()).trim();
                notify(`${i18n.t('setup.failed')}: ${i18n.t(errorKey) || errorKey}`, 'error');

                nextBtn.removeAttribute('disabled');
                nextBtn.textContent = i18n.t('setup.create_admin');
            }
        } catch (err) {
            console.error(err);
            // showError(i18n.t('setup.error_connection'));
            notify(i18n.t('setup.error_connection'), 'error');
            nextBtn.removeAttribute('disabled');
        }
    }

    // Reveal UI
    requestAnimationFrame(() => container.style.opacity = '1');
});
