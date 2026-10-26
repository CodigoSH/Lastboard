/**
 * Puts text on the clipboard; true when it got there.
 *
 * Over plain http the clipboard API is not offered, so a hidden field and the
 * old command are the fallback.
 */
export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;inset-block-start:0;inset-inline-start:0;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        ta.remove();
        return ok;
    }
}
