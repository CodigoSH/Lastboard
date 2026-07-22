/**
 * Shared password-visibility toggle.
 *
 * Replaces the inline `onclick="var w=this.closest('.pw-wrap')…"` handlers that
 * were duplicated across the password fields (and which required CSP
 * 'unsafe-inline'). Attach once per shadow root; a single delegated listener
 * handles every `.pw-toggle` button inside a `.pw-wrap`, surviving re-renders.
 *
 * Expected markup: a `.pw-wrap` containing the <input> and two <svg> icons
 * (index 0 = "show" state, index 1 = "hide" state), plus a `.pw-toggle` button.
 */
export function setupPasswordToggles(root: ShadowRoot | HTMLElement): void {
    root.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('.pw-toggle');
        if (!btn) return;
        const wrap = btn.closest('.pw-wrap');
        if (!wrap) return;
        const input = wrap.querySelector('input') as HTMLInputElement | null;
        if (!input) return;

        const reveal = input.type === 'password';
        input.type = reveal ? 'text' : 'password';

        const svgs = wrap.querySelectorAll('svg');
        if (svgs[0]) svgs[0].style.display = reveal ? 'block' : 'none';
        if (svgs[1]) svgs[1].style.display = reveal ? 'none' : 'block';
    });
}
