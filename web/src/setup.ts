import './components/ui/Paper/Paper';
import './components/ui/Button/Button';

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('setupForm') as HTMLFormElement;
    const btn = document.getElementById('submitBtn') as HTMLElement;
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const feedback = document.getElementById('feedback') as HTMLElement;

    if (!form || !btn) return;

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
        btn.textContent = 'Creating Environment...';
        btn.setAttribute('disabled', 'true');

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (username.length < 3) {
            showError('Username must be at least 3 characters');
            resetBtn();
            return;
        }

        if (password.length < 8) {
            showError('Password must be at least 8 characters');
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
                btn.textContent = 'Welcome, Admin';
                btn.style.backgroundColor = 'var(--accent-alt, #00f5a0)';
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                const text = await response.text();
                showError(`Setup Failed: ${text}`);
                resetBtn();
            }
        } catch (err) {
            console.error(err);
            showError('Connection Error. Please check the server logs.');
            resetBtn();
        }
    });

    function showError(msg: string) {
        feedback.style.display = 'block';
        feedback.textContent = msg;
        feedback.style.color = '#ff6b6b';
    }

    function resetBtn() {
        btn.textContent = 'Create Administrator';
        btn.removeAttribute('disabled');
    }
});
