export interface LocaleMetadata {
    code: string;
    name: string;
    flag: string;
}

export const availableLocales: LocaleMetadata[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '简体中文', flag: '🇨🇳' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'fa', name: 'Persian', flag: '🇮🇷' },
    { code: 'el', name: 'Greek', flag: '🇬🇷' }
];