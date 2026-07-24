import { template } from './Notifier.template';
import { i18n } from '../../../services/i18n';
import css from './Notifier.css' with { type: 'text' };

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastAction {
    label: string;
    onClick: () => void;
}

interface ToastOptions {
    message: string;
    type?: ToastType;
    action?: ToastAction;
    duration?: number;
}

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 3000;
const ACTION_DURATION = 6000; // toasts with an action stay longer so it can be reached
const EXIT_MS = 260;          // must match the CSS leave transition

interface Timer {
    remaining: number;
    startedAt: number;
    handle: number;
}

class AppNotifier extends HTMLElement {
    private queue: ToastOptions[] = [];
    private timers = new Map<HTMLElement, Timer>();

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        window.notifier = this;
    }

    disconnectedCallback() {
        this.timers.forEach(t => clearTimeout(t.handle));
        this.timers.clear();
    }

    private get container(): HTMLElement | null {
        return this.shadowRoot!.querySelector('.toast-container');
    }

    /**
     * Show a toast.
     * Backward compatible: show('message'), show('message', 'error').
     * New: show({ message, type, action: { label, onClick }, duration }).
     */
    show(input: string | ToastOptions, type: ToastType = 'success') {
        const opts: ToastOptions = typeof input === 'string'
            ? { message: input, type }
            : { type: 'success', ...input };
        if (!opts.message) return;

        // Dedupe non-action toasts (e.g. repeated "Saved"): refresh the existing
        // one's timer instead of stacking duplicates. Action toasts are unique
        // intents, never deduped.
        if (!opts.action) {
            const existing = this.findVisibleByKey(this.keyOf(opts));
            if (existing) {
                this.restart(existing, opts.duration ?? DEFAULT_DURATION);
                return;
            }
        }

        if (this.visibleCount() >= MAX_VISIBLE) {
            this.queue.push(opts);
            return;
        }

        this.renderToast(opts);
    }

    private keyOf(o: ToastOptions): string {
        return `${o.type ?? 'success'}|${o.message}`;
    }

    private visibleCount(): number {
        return this.container?.querySelectorAll('.toast:not(.toast--leaving)').length ?? 0;
    }

    private findVisibleByKey(key: string): HTMLElement | null {
        const toasts = this.container?.querySelectorAll('.toast:not(.toast--leaving)');
        if (!toasts) return null;
        for (const t of Array.from(toasts)) {
            if ((t as HTMLElement).dataset.key === key) return t as HTMLElement;
        }
        return null;
    }

    private renderToast(opts: ToastOptions) {
        const container = this.container;
        if (!container) return;

        const type = opts.type ?? 'success';
        const duration = opts.duration ?? (opts.action ? ACTION_DURATION : DEFAULT_DURATION);

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.dataset.key = this.keyOf(opts);
        // Errors interrupt (assertive); everything else is announced politely.
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.style.setProperty('--toast-duration', `${duration}ms`);

        const msg = document.createElement('span');
        msg.className = 'toast__msg';
        msg.textContent = opts.message;
        toast.appendChild(msg);

        if (opts.action) {
            const btn = document.createElement('button');
            btn.className = 'toast__action';
            btn.type = 'button';
            btn.textContent = opts.action.label;
            btn.addEventListener('click', () => {
                try {
                    opts.action!.onClick();
                } catch (e) {
                    console.error('Toast action handler failed', e);
                }
                this.dismiss(toast);
            });
            toast.appendChild(btn);
        }

        const close = document.createElement('button');
        close.className = 'toast__close';
        close.type = 'button';
        close.setAttribute('aria-label', i18n.t('general.close') || 'Close');
        close.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        close.addEventListener('click', () => this.dismiss(toast));
        toast.appendChild(close);

        const progress = document.createElement('div');
        progress.className = 'toast__progress';
        toast.appendChild(progress);

        // Pause/resume the auto-dismiss timer on hover (the bar pauses via CSS).
        toast.addEventListener('mouseenter', () => this.pause(toast));
        toast.addEventListener('mouseleave', () => this.resume(toast));

        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('toast--visible'));

        this.startTimer(toast, duration);
    }

    private startTimer(toast: HTMLElement, remaining: number) {
        const handle = window.setTimeout(() => this.dismiss(toast), remaining);
        this.timers.set(toast, { remaining, startedAt: Date.now(), handle });
    }

    private pause(toast: HTMLElement) {
        const t = this.timers.get(toast);
        if (!t) return;
        clearTimeout(t.handle);
        t.remaining = Math.max(0, t.remaining - (Date.now() - t.startedAt));
    }

    private resume(toast: HTMLElement) {
        const t = this.timers.get(toast);
        if (!t) return;
        t.startedAt = Date.now();
        t.handle = window.setTimeout(() => this.dismiss(toast), t.remaining);
    }

    /** Refresh a deduped toast: restart both its countdown bar and its timer. */
    private restart(toast: HTMLElement, duration: number) {
        toast.style.setProperty('--toast-duration', `${duration}ms`);
        const p = toast.querySelector('.toast__progress') as HTMLElement | null;
        if (p) {
            p.style.animation = 'none';
            void p.offsetWidth; // force reflow so the animation restarts
            p.style.animation = '';
        }
        const t = this.timers.get(toast);
        if (t) clearTimeout(t.handle);
        this.startTimer(toast, duration);
    }

    private dismiss(toast: HTMLElement) {
        if (toast.classList.contains('toast--leaving')) return;
        const t = this.timers.get(toast);
        if (t) clearTimeout(t.handle);
        this.timers.delete(toast);

        toast.classList.add('toast--leaving');
        toast.classList.remove('toast--visible');
        window.setTimeout(() => {
            toast.remove();
            this.pump();
        }, EXIT_MS);
    }

    private pump() {
        if (!this.queue.length) return;
        if (this.visibleCount() >= MAX_VISIBLE) return;
        const next = this.queue.shift();
        if (next) this.renderToast(next);
    }

    private render() {
        this.shadowRoot!.innerHTML = `
            <style>${css}</style>
            ${template()}
        `;
    }
}

if (!customElements.get('app-notifier')) {
    customElements.define('app-notifier', AppNotifier);
}
