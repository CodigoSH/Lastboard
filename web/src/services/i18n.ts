import { availableLocales } from '../locales/metadata';
import { Locale } from '../locales/types';

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
        let targetLang = 'en';

        if (saved && availableLocales.find(l => l.code === saved)) {
            targetLang = saved;
        } else if (availableLocales.find(l => l.code === browserLang)) {
            targetLang = browserLang;
        }

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
        // Sort locales: Latin first (alphabetical), then Non-Latin (alphabetical)
        const isLatin = (str: string) => /^[a-zA-Z]/.test(str);

        const sorted = [...availableLocales].sort((a, b) => {
            const aIsLatin = isLatin(a.name);
            const bIsLatin = isLatin(b.name);

            if (aIsLatin && !bIsLatin) return -1;
            if (!aIsLatin && bIsLatin) return 1;

            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });

        return sorted;
    }

    public async loadLocale(code: string): Promise<void> {
        if (this.cache.has(code)) return;

        try {
            const res = await fetch(`/locales/${code}.json?v=${new Date().getTime()}`);
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
        const currentParams = this.cache.get(this.currentLanguage);
        const enParams = this.cache.get('en');

        let text = currentParams?.[key];

        // Fallback to EN if missing
        if (!text && enParams) {
            text = enParams[key];
        }

        // Return key if still missing
        if (!text) return key;

        // Replace params
        if (params) {
            Object.keys(params).forEach(k => {
                text = text!.replace(`{${k}}`, params[k]);
            });
        }

        return text;
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
        const locale = this.getLocale();
        this.listeners.forEach(l => l(locale));
    }

    public async ensureInitialized() {
        return this.initialized;
    }
}

export const i18n = I18nService.getInstance();
