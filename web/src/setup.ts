import './components/ui/Paper/Paper';
import './components/ui/Button/Button';
import { i18n } from './services/i18n';

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('setupForm') as HTMLFormElement;
    const btn = document.getElementById('submitBtn') as HTMLElement;
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const feedback = document.getElementById('feedback') as HTMLElement;

    if (!form || !btn) return;

    // Localize UI
    const localize = () => {
        document.querySelector('h1')!.textContent = i18n.t('app.title');
        document.querySelector('.subtitle')!.textContent = i18n.t('setup.subtitle');
        document.querySelector('label[for="username"]')!.textContent = i18n.t('setup.root_user');
        document.querySelector('label[for="password"]')!.textContent = i18n.t('setup.passkey');
        if (btn) btn.textContent = i18n.t('setup.create_admin');
    };
    localize();

    // Shadow DOM Button Fix: Manually trigger form submit
    btn.addEventListener('click', () => {
        if (form.checkValidity()) {
            form.requestSubmit();
        } else {
            form.reportValidity();
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
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
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
