import './components/ui/Paper/Paper';
import './components/ui/Button/Button';
import './components/ui/Avatar/Avatar';
import './components/ui/Notifier/Notifier';
import { i18n } from './services/i18n';
import { bootstrap } from './core/bootstrap';
import { ThemeService } from './services/ThemeService';

bootstrap(async () => {
    // --- State ---
    let currentStep = 1;
    const TOTAL_STEPS = 3;
    let selectedAvatar = '/images/default-avatar.svg';

    // --- Elements ---
    const container = document.querySelector('.setup-container') as HTMLElement;
    const form = document.getElementById('setupForm') as HTMLFormElement;
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
        dark: document.getElementById('themeDark')
    };

    // --- 1. Init Language & Theme ---
    const availableLocales = i18n.getAvailableLocales();
    let browserLang = navigator.language.split('-')[0];
    // Check if browserLang supported
    if (!availableLocales.find(l => l.code === browserLang)) browserLang = 'en';

    // Populate Lang Dropdown
    if (languageSelect) {
        availableLocales.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc.code;
            opt.textContent = `${loc.flag} ${loc.name}`;
            if (loc.code === browserLang) opt.selected = true;
            languageSelect.appendChild(opt);
        });
        i18n.setLanguage(browserLang);

        languageSelect.addEventListener('change', (e: Event) => {
            const val = (e.target as HTMLSelectElement).value;
            i18n.setLanguage(val);
            localize();
        });
    }

    // Init Theme Logic
    // ...

    // Init Theme Logic
    ThemeService.init();

    // Set initial active button
    if (ThemeService.isDark()) {
        themeBtns.dark?.classList.add('selected');
        themeBtns.light?.classList.remove('selected');
    } else {
        themeBtns.light?.classList.add('selected');
        themeBtns.dark?.classList.remove('selected');
    }

    function setTheme(mode: string) {
        // Toggle UI buttons
        Object.entries(themeBtns).forEach(([key, btn]) => {
            if (btn) key === mode ? btn.classList.add('selected') : btn.classList.remove('selected');
        });

        if (mode === 'dark') {
            ThemeService.enableDark();
        } else {
            ThemeService.enableLight();
        }
    }

    Object.entries(themeBtns).forEach(([mode, btn]) => {
        if (btn) btn.addEventListener('click', () => setTheme(mode));
    });

    // --- 2. Avatar Picker ---
    const avatars = [
        'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/proxmox.png', // Generic/Default
        'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/pi-hole.png',
        'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/home-assistant.png',
        'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/docker.png'
    ];
    // Avatar Upload Logic
    const avatarInput = document.getElementById('avatarInput') as HTMLInputElement;
    const avatarTrigger = document.getElementById('avatarTrigger');
    const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;
    const avatarUrlInput = document.getElementById('avatarUrl') as HTMLInputElement;

    if (avatarTrigger && avatarInput) {
        avatarTrigger.addEventListener('click', () => avatarInput.click());

        avatarInput.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const result = ev.target?.result as string;
                    if (result) {
                        avatarPreview.setAttribute('src', result);
                        // avatarPreview.style.display = 'block'; // Not needed usually for app-avatar
                        // avatarTrigger.classList.add('has-image');
                        avatarUrlInput.value = result; // Save Base64
                        selectedAvatar = result;
                    }
                };
                reader.readAsDataURL(file);
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

        setText('summaryKeyLang', 'settings.language');
        setText('summaryKeyTheme', 'settings.theme');
        setText('summaryKeyAdmin', 'setup.summary_admin');

        // Buttons
        if (currentStep === 3) nextBtn.textContent = i18n.t('setup.create_admin');
        else nextBtn.textContent = i18n.t('general.next');

        if (backBtn) backBtn.textContent = i18n.t('general.back');

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
            document.getElementById('summaryLang')!.textContent = languageSelect.options[languageSelect.selectedIndex].text;

            let theme = i18n.t('settings.system') || 'System';
            if (themeBtns.light?.classList.contains('selected')) theme = i18n.t('settings.light');
            if (themeBtns.dark?.classList.contains('selected')) theme = i18n.t('settings.dark');
            document.getElementById('summaryTheme')!.textContent = theme;

            document.getElementById('summaryUser')!.textContent = usernameInput.value;
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

            if (u.length < 3) {
                notify(i18n.t('setup.error_username'), 'error');
                return false;
            }
            if (p.length < 8) {
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

    function showError(msg: string) {
        feedback.style.display = 'block';
        feedback.textContent = msg;
        // Shake animation?
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
        // @ts-ignore
        if (window.notifier) window.notifier.show(msg, type);
        else console.log(`[${type}] ${msg}`);
    }

    // --- Submit Logic ---
    async function submitSetup() {
        nextBtn.textContent = i18n.t('setup.creating');
        nextBtn.setAttribute('disabled', 'true');

        // Gather Data
        let theme = 'dark';
        if (themeBtns.light?.classList.contains('selected')) theme = 'light';
        if (themeBtns.dark?.classList.contains('selected')) theme = 'dark';

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
                localStorage.setItem('csh_lang', payload.language);
                nextBtn.textContent = i18n.t('setup.welcome_admin');
                nextBtn.style.backgroundColor = 'var(--accent-alt, #00f5a0)';

                notify(i18n.t('setup.welcome_admin'), 'success');

                setTimeout(() => window.location.href = '/', 1000);
            } else {
                const text = await response.text();
                // showError(`${i18n.t('setup.failed')}: ${text}`);
                notify(`${i18n.t('setup.failed')}: ${text}`, 'error');

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
