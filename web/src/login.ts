// Import necessary UI components
import './components/ui/Paper/Paper';
import './components/ui/Button/Button';

// Logic
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm') as HTMLFormElement;
    const feedback = document.getElementById('feedback') as HTMLElement;
    const submitBtn = document.getElementById('submitBtn') as any;

    if (!form) return;

    // Enable implicit submission via Enter key
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Use requestSubmit to properly trigger the 'submit' event we listen to below
            if (form.requestSubmit) form.requestSubmit();
            else form.submit();
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset state
        feedback.style.display = 'none';
        feedback.textContent = '';
        if (submitBtn) submitBtn.loading = true;

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
                window.location.href = '/';
            } else {
                // Login Failed
                const errorText = await response.text();
                feedback.textContent = errorText || 'Invalid credentials';
                feedback.style.display = 'block';
                if (submitBtn) submitBtn.loading = false;

                // Shake effect for feedback
                const container = document.querySelector('.setup-container') as HTMLElement;
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
        } catch (error) {
            console.error('Login error:', error);
            feedback.textContent = 'Connection error. Please try again.';
            feedback.style.display = 'block';
            if (submitBtn) submitBtn.loading = false;
        }
    });
});
