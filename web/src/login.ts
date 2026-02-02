// Import necessary logic
import { ThemeService } from './services/ThemeService';
import { i18n } from './services/i18n';
import { bootstrap } from './core/bootstrap';
import './components/ui/Notifier/Notifier';

// Logic
bootstrap(async () => {
    const form = document.getElementById('loginForm') as HTMLFormElement;
    // const feedback = document.getElementById('feedback') as HTMLElement; // No longer used for text
    const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;

    // Helper for Toast
    function notify(msg: string, type: 'success' | 'error' = 'success') {
        // @ts-ignore
        if (window.notifier) window.notifier.show(msg, type);
        else console.log(`[${type}] ${msg}`);
    }

    const container = document.querySelector('.setup-container') as HTMLElement;
    if (container) {
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
    }

    if (!form) return;

    // Apply Theme
    ThemeService.init();

    // Localize UI
    const localize = () => {
        const titleEl = document.querySelector('.auth-title');
        const subtitleEl = document.querySelector('.auth-subtitle');
        const userLabel = document.querySelector('label[for="username"]');
        const passLabel = document.querySelector('label[for="password"]');

        if (titleEl) titleEl.textContent = i18n.t('auth.welcome');
        if (subtitleEl) subtitleEl.textContent = i18n.t('auth.subtitle');
        if (userLabel) userLabel.textContent = i18n.t('auth.username');
        if (passLabel) passLabel.textContent = i18n.t('auth.password');
        if (submitBtn) submitBtn.textContent = i18n.t('auth.sign_in');

        // Show UI after text update
        requestAnimationFrame(() => {
            if (container) container.style.opacity = '1';
        });
    };
    localize();

    // Enable implicit submission via Enter key
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // No custom logic needed, native submit works or we catch 'submit' event
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset state
        // feedback.style.display = 'none';

        if (submitBtn) {
            submitBtn.disabled = true;
            const originalText = submitBtn.textContent;
            submitBtn.textContent = i18n.t('general.pinging') || "Signing in...";
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                // Login Success
                notify(i18n.t('auth.welcome'), 'success');
                setTimeout(() => window.location.href = '/', 500);
            } else {
                // Login Failed
                const errorText = await response.text();
                const msg = errorText || i18n.t('auth.invalid_credentials');
                notify(msg, 'error');

                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = i18n.t('auth.sign_in');
                }

                // Shake effect for feedback
                if (container) {
                    container.animate([
                        { transform: 'translateX(0)' },
                        { transform: 'translateX(-10px)' },
                        { transform: 'translateX(10px)' },
                        { transform: 'translateX(-10px)' },
                        { transform: 'translateX(0)' }
                    ], {
                        duration: 400,
                        easing: 'ease-in-out'
                    });
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            notify(i18n.t('auth.connection_error'), 'error');

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = i18n.t('auth.sign_in');
            }
        }
    });
});
