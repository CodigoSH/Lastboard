import { availableLocales } from '../locales/metadata';
import { Locale } from '../locales/types';
import { translate, sortLocales, resolveLanguage, formatDateTime, formatNumber, formatSpan, directionOf } from './i18n.helpers';

class I18nService {
    private currentLanguage: string = 'en';
    private cache: Map<string, Record<string, string>> = new Map();
    private listeners: ((locale: Locale) => void)[] = [];
    private static instance: I18nService;
    private initialized: Promise<void>;

    private constructor() {
        this.initialized = this.init();
    }

    private async init() {
        // Load fallback (English) first, critically important
        await this.loadLocale('en');

        // Detect language
        const saved = localStorage.getItem('lastboard_lang');
        const browserLang = navigator.language.split('-')[0];
        const targetLang = resolveLanguage(saved, browserLang, availableLocales.map(l => l.code));

        if (targetLang !== 'en') {
            await this.loadLocale(targetLang);
        }

        this.currentLanguage = targetLang;
        this.notifyListeners();
    }

    public static getInstance(): I18nService {
        if (!I18nService.instance) {
            I18nService.instance = new I18nService();
        }
        return I18nService.instance;
    }

    public getLocale(): Locale {
        const meta = availableLocales.find(l => l.code === this.currentLanguage) || availableLocales[0];
        return {
            ...meta,
            translations: this.cache.get(this.currentLanguage) || {}
        };
    }

    public getAvailableLocales() {
        // Latin-script names first (alphabetical), then non-Latin (alphabetical).
        return sortLocales(availableLocales);
    }

    public async loadLocale(code: string): Promise<void> {
        if (this.cache.has(code)) return;

        try {
            // Versioned with the build stamp, not the clock: a per-load timestamp
            // made every request a cache miss, re-downloading the whole locale.
            // The stamp is substituted at build time, so guard the identifier for
            // contexts that run the sources directly (tests, ts-node).
            const stamp = typeof __BUILD_STAMP__ !== 'undefined' ? __BUILD_STAMP__ : 'dev';
            const res = await fetch(`/locales/${code}.json?v=${stamp}`);
            if (!res.ok) throw new Error(`Failed to load locale ${code}`);
            const translations = await res.json();
            this.cache.set(code, translations);
        } catch (e) {
            console.error(e);
            // Fallback: if loading fails, ensured 'en' is loaded in init.
        }
    }

    public async setLanguage(code: string) {
        if (availableLocales.find(l => l.code === code)) {
            await this.loadLocale(code);
            this.currentLanguage = code;
            localStorage.setItem('lastboard_lang', code);
            this.notifyListeners();
        } else {
            console.warn(`[I18n] Language ${code} not supported`);
        }
    }

    public t(key: string, params?: Record<string, string>): string {
        return translate(key, this.cache.get(this.currentLanguage), this.cache.get('en'), params);
    }

    /**
     * Format a date in the language the user picked, not the browser's.
     * Accepts a Date or anything Date understands, so callers holding an ISO
     * string from the API do not each parse it their own way.
     */
    public formatDateTime(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
        const date = value instanceof Date ? value : new Date(value);
        return formatDateTime(this.currentLanguage, date, options);
    }

    /** Format a number in the language the user picked. */
    public formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
        return formatNumber(this.currentLanguage, value, options);
    }

    /** How long ago a moment was, as a phrase. Null under a minute. */
    public formatSpan(fromMs: number, nowMs?: number): string | null {
        return formatSpan(this.currentLanguage, fromMs, nowMs);
    }

    public subscribe(listener: (locale: Locale) => void): () => void {
        this.listeners.push(listener);
        // Immediate callback if ready, otherwise wait for init? 
        // For UI responsiveness, we return current state (which might be empty/en).
        listener(this.getLocale());

        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.applyDocumentLanguage();
        const locale = this.getLocale();
        this.listeners.forEach(l => l(locale));
    }

    /**
     * Tell the document what language it is in, and which way it reads.
     *
     * The shell ships lang="en" and no dir at all, so every non-English user
     * was served a page claiming to be English — which is what a screen reader
     * announces it in, and what the browser hyphenates and spellchecks by. For
     * Arabic, Persian and Urdu the missing dir is worse: the text is
     * translated, but the interface still reads left to right.
     */
    private applyDocumentLanguage() {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        root.setAttribute('lang', this.currentLanguage);
        root.setAttribute('dir', directionOf(this.currentLanguage));
    }

    public async ensureInitialized() {
        return this.initialized;
    }
}

export const i18n = I18nService.getInstance();
