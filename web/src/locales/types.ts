export interface Locale {
    code: string;
    name: string;
    flag: string;
    translations: {
        [key: string]: string;
    };
}

export type TranslationKey = string;
