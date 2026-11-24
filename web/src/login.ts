// Import necessary logic
import { ThemeService } from './services/ThemeService';
import { i18n } from './services/i18n';
import { bootstrap } from './core/bootstrap';
import { setupPasswordToggles } from './services/passwordToggle';
import { normalizeCode, looksLikeAppCode } from './services/twoFactor';
import { passkeysSupported, requestOptionsFromServer, assertionToFinishBody } from './services/passkeys';
import './components/ui/Notifier/Notifier';

// Logic
bootstrap(async () => {
    setupPasswordToggles(document.body);
    const form = document.getElementById('loginForm') as HTMLFormElement;
    const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;

    // Helper for Toast
    function notify(msg: string, type: 'success' | 'error' = 'success') {
        if (window.notifier) window.notifier.show(msg, type);
    }

    const container = document.querySelector('.setup-container') as HTMLElement;
    if (container) {
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
    }

    if (!form) return;

    // Apply Theme
    ThemeService.init();

    // Demo button: opens the fully isolated demo UI (no backend auth needed)
    const demoBtn = document.getElementById('demoBtn') as HTMLButtonElement;
    if (demoBtn) {
        demoBtn.addEventListener('click', () => {
            window.location.href = '/demo';
        });
    }

    // Second step (two-step sign-in)
    const tfForm = document.getElementById('twoFactorForm') as HTMLFormElement | null;
    const tfCode = document.getElementById('tfCode') as HTMLInputElement | null;
    const tfSubmit = document.getElementById('tfSubmit') as HTMLButtonElement | null;
    const tfSwitch = document.getElementById('tfSwitch') as HTMLButtonElement | null;
    const tfBack = document.getElementById('tfBack') as HTMLButtonElement | null;
    let challenge = '';
    let useRecovery = false;

    const localizeSecondStep = () => {
        const set = (id: string, text: string) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };
        set('tfTitle', i18n.t('two_factor.title'));
        set('tfHint', i18n.t(useRecovery ? 'two_factor.enter_recovery' : 'two_factor.enter_code'));
        set('tfCodeLabel', i18n.t(useRecovery ? 'two_factor.recovery_code' : 'two_factor.code'));
        set('tfSwitch', i18n.t(useRecovery ? 'two_factor.use_app' : 'two_factor.use_recovery'));
        set('tfBack', i18n.t('general.back'));
        set('tfSubmit', i18n.t('auth.sign_in'));
        if (tfCode) tfCode.inputMode = useRecovery ? 'text' : 'numeric';
    };

    const showStep = (step: 'password' | 'code') => {
        form.hidden = step !== 'password';
        if (tfForm) tfForm.hidden = step !== 'code';
        if (step === 'code') {
            localizeSecondStep();
            if (tfCode) { tfCode.value = ''; tfCode.focus(); }
        } else {
            challenge = '';
            useRecovery = false;
            document.getElementById('password')?.focus();
        }
    };

    const shake = () => {
        if (!container) return;
        container.classList.remove('shake');
        void container.offsetWidth; // Trigger reflow
        container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), 500);
    };

    const signedIn = () => {
        notify(i18n.t('auth.welcome'), 'success');
        setTimeout(() => window.location.href = '/', 500);
    };

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
        const rememberText = document.getElementById('rememberMeText');
        if (rememberText) rememberText.textContent = i18n.t('auth.remember_me');
        if (submitBtn) submitBtn.textContent = i18n.t('auth.sign_in');
        const passkeyKey = document.getElementById('passkeyBtn');
        if (passkeyKey) {
            passkeyKey.setAttribute('aria-label', i18n.t('passkey.sign_in'));
            passkeyKey.title = i18n.t('passkey.sign_in');
        }
        document.querySelectorAll('.pw-toggle').forEach(btn => {
            btn.setAttribute('aria-label', i18n.t('auth.toggle_password'));
        });

        localizeSecondStep();

        // Show UI after text update
        requestAnimationFrame(() => {
            if (container) container.style.opacity = '1';
        });
    };
    localize();

    // Enter submits the form natively, through the 'submit' event below, and a browser does not do
    // that while an input method is still composing the text. There is nothing to listen for here.

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset state
        // feedback.style.display = 'none';

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = i18n.t('general.pinging') || "Signing in...";
        }

        const formData = new FormData(form);
        const data: Record<string, unknown> = Object.fromEntries(formData.entries());

        // Convert checkbox to boolean
        data.remember_me = formData.get('remember_me') === 'on';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                // An account with a second step answers with a challenge and no session.
                let body: { two_factor?: boolean; challenge?: string } = {};
                try { body = await response.json(); } catch { /* a plain success has nothing to read */ }
                if (body.two_factor && body.challenge) {
                    challenge = body.challenge;
                    useRecovery = false;
                    submitBtn.disabled = false;
                    submitBtn.textContent = i18n.t('auth.sign_in');
                    showStep('code');
                    return;
                }
                signedIn();
            } else {
                // Login Failed
                const errorKey = (await response.text()).trim();
                const msg = i18n.t(errorKey) || i18n.t('auth.invalid_credentials');
                notify(msg, 'error');

                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = i18n.t('auth.sign_in');
                }

                // Shake effect for feedback
                shake();
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

    // Passkey sign-in: no password and no second step; the device proves who it is. Offered without a
    // button of its own: a key at the end of the username field, and the account's passkeys among the
    // field's suggestions where the browser can list them. Only where a passkey can work at all.
    const passkeyBtn = document.getElementById('passkeyBtn') as HTMLButtonElement | null;
    const usernameField = document.getElementById('username') as HTMLInputElement | null;
    if (passkeyBtn && usernameField && passkeysSupported(window)) {
        passkeyBtn.hidden = false;
        let waiting: AbortController | null = null;

        /** Asks the browser for a passkey and signs in with it: from the key, or from the field's suggestions. */
        const passkeySignIn = async (how: 'button' | 'conditional') => {
            waiting?.abort();
            const control = new AbortController();
            waiting = control;
            const remember = (document.getElementById('remember_me') as HTMLInputElement | null)?.checked ?? false;
            const begin = await fetch('/api/login/passkey/begin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ remember_me: remember })
            });
            if (!begin.ok) {
                const key = (await begin.text()).trim();
                if (key === 'passkey.not_available') passkeyBtn.hidden = true;
                if (how === 'button') notify(i18n.t(key) || i18n.t('auth.connection_error'), 'error');
                return;
            }
            const options = requestOptionsFromServer(await begin.json());
            let credential: PublicKeyCredential | null;
            try {
                credential = await navigator.credentials.get({
                    publicKey: options as unknown as PublicKeyCredentialRequestOptions,
                    signal: control.signal,
                    ...(how === 'conditional' ? { mediation: 'conditional' as CredentialMediationRequirement } : {}),
                }) as PublicKeyCredential | null;
            } catch (err) {
                // Closing the browser's dialog, or the key taking over from the suggestions, is a choice.
                const name = (err as { name?: string })?.name;
                if (name === 'NotAllowedError' || name === 'AbortError') return;
                throw err;
            }
            if (!credential) return;
            const res = credential.response as AuthenticatorAssertionResponse;
            const finish = await fetch('/api/login/passkey/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assertionToFinishBody({
                    rawId: credential.rawId,
                    clientDataJSON: res.clientDataJSON,
                    authenticatorData: res.authenticatorData,
                    signature: res.signature,
                    userHandle: res.userHandle,
                }))
            });
            if (finish.ok) {
                signedIn();
                return;
            }
            const key = (await finish.text()).trim();
            if (key === 'passkey.not_available') passkeyBtn.hidden = true;
            notify(i18n.t(key) || i18n.t('passkey.refused'), 'error');
            shake();
        };
        const fail = (error: unknown) => {
            console.error('Passkey error:', error);
            notify(i18n.t('auth.connection_error'), 'error');
        };

        passkeyBtn.addEventListener('click', () => {
            passkeyBtn.disabled = true;
            passkeySignIn('button').catch(fail).finally(() => { passkeyBtn.disabled = false; });
        });

        // The suggestions: the browser keeps this request open and answers it when a passkey is picked
        // from the list under the field. A browser that cannot do it keeps the key alone.
        usernameField.autocomplete = 'username webauthn';
        const pkc = window.PublicKeyCredential as unknown as { isConditionalMediationAvailable?: () => Promise<boolean> };
        void pkc.isConditionalMediationAvailable?.().then(yes => {
            if (yes) passkeySignIn('conditional').catch(fail);
        });
    }

    // Second step: the code (or a recovery code) that finishes the sign-in.
    if (tfForm && tfCode) {
        tfSwitch?.addEventListener('click', () => {
            useRecovery = !useRecovery;
            tfCode.value = '';
            localizeSecondStep();
            tfCode.focus();
        });
        tfBack?.addEventListener('click', () => showStep('password'));

        tfForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = normalizeCode(tfCode.value);
            if (!code) return;
            if (tfSubmit) tfSubmit.disabled = true;
            try {
                const response = await fetch('/api/login/2fa', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ challenge, code })
                });
                if (response.ok) {
                    signedIn();
                    return;
                }
                const errorKey = (await response.text()).trim();
                if (errorKey === 'auth.challenge_expired') {
                    showStep('password');
                    notify(i18n.t(errorKey), 'error');
                } else {
                    notify(i18n.t(errorKey) || i18n.t('auth.invalid_code'), 'error');
                    // A six-digit code that missed is retyped; a recovery code stays for the fix.
                    if (looksLikeAppCode(tfCode.value)) tfCode.value = '';
                    tfCode.focus();
                }
                shake();
            } catch (error) {
                console.error('Login error:', error);
                notify(i18n.t('auth.connection_error'), 'error');
            }
            if (tfSubmit) tfSubmit.disabled = false;
        });
    }
});
