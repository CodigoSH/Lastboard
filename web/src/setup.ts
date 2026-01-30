import './components/ui/Paper/Paper';
import './components/ui/Button/Button';
import { i18n } from './services/i18n';
import { bootstrap } from './core/bootstrap';

// Wait for DOM
// Wait for DOM
bootstrap(async () => {
    const form = document.getElementById('setupForm') as HTMLFormElement;
    const btn = document.getElementById('submitBtn') as HTMLElement;
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const languageSelect = document.getElementById('language') as HTMLSelectElement;
    const feedback = document.getElementById('feedback') as HTMLElement;

    if (!form || !btn) return;

    // --- LANGUAGE SETUP ---
    const availableLocales = i18n.getAvailableLocales();
    const browserLang = navigator.language.split('-')[0];
    let defaultLang = 'en';

    // 1. Determine Default
    if (availableLocales.find(l => l.code === browserLang)) {
        defaultLang = browserLang;
    }

    // 2. Populate Dropdown
    if (languageSelect) {
        availableLocales.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc.code;
            opt.textContent = `${loc.flag} ${loc.name}`;
            if (loc.code === defaultLang) {
                opt.selected = true;
            }
            languageSelect.appendChild(opt);
        });

        // 3. Set Initial System Language (Immediate Effect)
        i18n.setLanguage(defaultLang);

        // 4. Handle Change
        languageSelect.addEventListener('change', (e: Event) => {
            const target = e.target as HTMLSelectElement;
            const newLang = target.value;
            i18n.setLanguage(newLang); // UI updates via listener in bootstrap/i18n? 
            // setLanguage triggers listeners, but our localize() function below needs to be hooked up or called.
            localize();
        });
    }

    // Localize UI
    const localize = () => {
        document.querySelector('h1')!.textContent = i18n.t('app.title');
        // app.title is often "CSH Dashboard", might ideally use a setup specific title key

        document.querySelector('.subtitle')!.textContent = i18n.t('setup.subtitle');
        document.querySelector('label[for="username"]')!.textContent = i18n.t('setup.root_user');
        document.querySelector('label[for="password"]')!.textContent = i18n.t('setup.passkey');

        // Update language label if it exists
        const langLabel = document.querySelector('label[for="language"]');
        if (langLabel) langLabel.textContent = i18n.t('settings.language') || "Language";

        if (btn) btn.textContent = i18n.t('setup.create_admin');
    };

    // Subscribe to i18n changes to ensure text updates when language loads
    i18n.subscribe(() => {
        localize();
        // Fade in UI here if we wanted to replicate the login fade-in logic, 
        // but setup.html already has opacity: 0 logic? 
        // Let's ensure visibility:
        const container = document.querySelector('.setup-container') as HTMLElement;
        if (container) {
            requestAnimationFrame(() => container.style.opacity = '1');
        }
    });

    localize();

    // Shadow DOM Button Fix: REMOVED redundant manual trigger
    // AppButton component already handles 'type="submit"' click by calling form.requestSubmit() internally.
    // Having both caused a double-submission race condition (Success + Error).

    // Enable implicit submission via Enter key
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (form.requestSubmit) form.requestSubmit();
            else form.submit(); // Fallback
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset state
        feedback.style.display = 'none';
        feedback.textContent = '';
        btn.textContent = i18n.t('setup.creating');
        btn.setAttribute('disabled', 'true');

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const language = languageSelect ? languageSelect.value : defaultLang;

        if (username.length < 3) {
            showError(i18n.t('setup.error_username'));
            resetBtn();
            return;
        }

        if (password.length < 8) {
            showError(i18n.t('setup.error_password'));
            resetBtn();
            return;
        }

        try {
            const response = await fetch('/api/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, language })
            });

            if (response.ok) {
                // PERSIST LANGUAGE LOCALLY
                localStorage.setItem('csh_lang', language);

                btn.textContent = i18n.t('setup.welcome_admin');
                btn.style.backgroundColor = 'var(--accent-alt, #00f5a0)';
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                const text = await response.text();
                showError(`${i18n.t('setup.failed')}: ${text}`);
                resetBtn();
            }
        } catch (err) {
            console.error(err);
            showError(i18n.t('setup.error_connection'));
            resetBtn();
        }
    });

    function showError(msg: string) {
        feedback.style.display = 'block';
        feedback.textContent = msg;
        feedback.style.color = '#ff6b6b';
    }

    function resetBtn() {
        btn.textContent = i18n.t('setup.create_admin');
        btn.removeAttribute('disabled');
    }
});
