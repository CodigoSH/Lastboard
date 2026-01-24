const translations: Record<string, Record<string, string>> = {
    'en': { 'welcome': 'Welcome', 'preferences': 'Preferences', 'save': 'Save Changes' },
    'es': { 'welcome': 'Bienvenido', 'preferences': 'Preferencias', 'save': 'Guardar Cambios' },
    'fr': { 'welcome': 'Bienvenue', 'preferences': 'Préférences', 'save': 'Sauvegarder' }
};

export const i18n = {
    currentLang: 'en',
    load(lang: string): Promise<void> {
        console.log(`Loading language: ${lang}`);
        this.currentLang = lang;
        // In a real app, this would fetch json and update DOM nodes with data-i18n
        // For this demo, we just simulate the event
        document.documentElement.lang = lang;
        return Promise.resolve();
    }
};
